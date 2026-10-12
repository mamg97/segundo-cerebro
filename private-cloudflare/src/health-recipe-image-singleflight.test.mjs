import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const code = await readFile(new URL("./index.js", import.meta.url), "utf8");
const first = code.indexOf("async function fetchHealthRecipePhotoMeta(");
const last = code.indexOf("function decodeRecipePreview(", first);
if (first < 0 || last <= first) throw Error("RECIPE_IMAGE_HELPERS_MISSING");
const helpers = code.slice(first, last);
const env = { HEALTH_SHEET_ID: "sheet-id-fixture", GOOGLE_CLIENT_ID: "fixture" };

function harness({
  previewResponse = () => ({ ok: true, status: 200 }),
  metaResponse = () => ({ ok: true, status: 200 })
} = {}) {
  let metaReads = 0;
  let previewReads = 0;
  const syntheticRows = [
    { recipe_id: "rec-synthetic-1", foto_drive_file_id: "drive-fixture-only",
      foto_mime_type: "image/png", foto_updated_at: "fixture-date",
      mime_type: "image/png", base64_preview: "QQ==", width: 1, height: 1,
      sha256: "fixture-sha", updated_at: "fixture-updated" }
  ];
  const respond = async (mock) => {
    await Promise.resolve();
    const state = mock();
    return { ok: state.ok, status: state.status, json: async () => ({ values: [["header"]] }) };
  };
  const mockGoogle = async (url) => {
    if (String(url).includes("RecipeMedia")) {
      previewReads++;
      return respond(previewResponse);
    }
    if (String(url).includes("Recetas")) {
      metaReads++;
      return respond(metaResponse);
    }
    throw Error("UNEXPECTED_ENDPOINT");
  };
  const ctx = vm.createContext({
    Map, Date, encodeURIComponent,
    hasHealthGoogleConfig: () => true,
    getGoogleAccessToken: async () => "synthetic-token",
    googleReadFetch: mockGoogle,
    parseTableRows: () => syntheticRows,
    toNumber: Number,
    fetch: async (url) => mockGoogle(url)
  });
  vm.runInContext(`
    let recipePhotoCache = { value: new Map(), expiresAt: 0, inFlight: null };
    let recipePreviewCache = { value: new Map(), expiresAt: 0, inFlight: null };
  ` + helpers, ctx);
  const invoke = (name) => vm.runInContext(
    `${name}(${JSON.stringify(env)}, "rec-synthetic-1")`, ctx);
  return { invoke, counts: () => ({ metaReads, previewReads }) };
}

test("25 simultaneous preview image requests share exactly one Google Sheets read", async () => {
  const h = harness();
  const rows = await Promise.all(Array.from({ length: 25 }, () => h.invoke("fetchHealthRecipePreview")));
  assert.equal(h.counts().previewReads, 1);
  assert.equal(rows.length, 25);
  assert.ok(rows.every((x) => x?.mimeType === "image/png"));
  assert.ok(rows.every((x) => x?.base64 === "QQ=="));
  await h.invoke("fetchHealthRecipePreview");
  assert.equal(h.counts().previewReads, 1, "refresh obeys the one-minute TTL");
});

test("25 simultaneous original-reference requests share one metadata read", async () => {
  const h = harness();
  const rows = await Promise.all(Array.from({ length: 25 }, () => h.invoke("fetchHealthRecipePhotoMeta")));
  assert.equal(h.counts().metaReads, 1);
  assert.ok(rows.every((x) => x?.fileId === "drive-fixture-only"));
  await h.invoke("fetchHealthRecipePhotoMeta");
  assert.equal(h.counts().metaReads, 1);
});

for (const status of [400, 404]) {
  test("optional preview tab missing HTTP " + status + " is temporarily cached, never treated as an image", async () => {
    const h = harness({ previewResponse: () => ({ ok: false, status }) });
    const data = await Promise.all(Array.from({ length: 25 }, () => h.invoke("fetchHealthRecipePreview")));
    assert.equal(h.counts().previewReads, 1);
    assert.ok(data.every((x) => x === null));
    assert.equal(await h.invoke("fetchHealthRecipePreview"), null);
    assert.equal(h.counts().previewReads, 1);
  });
}

test("a temporary preview 503 never poisons the cache; a later request retries", async () => {
  let calls = 0;
  const h = harness({ previewResponse: () => (++calls === 1
    ? { ok: false, status: 503 } : { ok: true, status: 200 }) });
  const failures = await Promise.allSettled(
    Array.from({ length: 20 }, () => h.invoke("fetchHealthRecipePreview")));
  assert.ok(failures.every((x) => x.status === "rejected"));
  assert.ok(failures.every((x) => /HEALTH_RECIPE_MEDIA_503/.test(String(x.reason))));
  assert.equal(h.counts().previewReads, 1);
  const retry = await h.invoke("fetchHealthRecipePreview");
  assert.equal(retry?.base64, "QQ==");
  assert.equal(h.counts().previewReads, 2);
});

test("a failed Recetas metadata refresh is not cached and can recover", async () => {
  let calls = 0;
  const h = harness({ metaResponse: () => (++calls === 1
    ? { ok: false, status: 503 } : { ok: true, status: 200 }) });
  await assert.rejects(h.invoke("fetchHealthRecipePhotoMeta"), /HEALTH_RECIPE_PHOTOS_503/);
  const retry = await h.invoke("fetchHealthRecipePhotoMeta");
  assert.equal(retry?.fileId, "drive-fixture-only");
  assert.equal(h.counts().metaReads, 2);
});

test("recipe image diagnostics do not include private recipe IDs", () => {
  assert.doesNotMatch(code, /console\.warn\("Recipe preview decode failed", recipeId/);
  assert.match(code, /console\.warn\("Recipe preview decode failed", String\(error\?\.message/);
});
