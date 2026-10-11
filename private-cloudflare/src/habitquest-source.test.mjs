import test from "node:test";
import assert from "node:assert/strict";
import {
  habitQuestHasGoogleAuth,
  resolveHabitQuestSheetId,
  resetHabitQuestSourceCacheForTests
} from "./habitquest-source.js";

const env = {
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
  GOOGLE_REFRESH_TOKEN: "test-refresh"
};
const id = "testHabitQuestCanonicalId123456789";
const backup = "testHabitQuestHistoricalBackup123456789";
const otherId = "testDuplicateCanonicalSheet123456789";
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});
const metadata = (files) => ({ files });
const canonical = { id, name: "HabitQuest Data", mimeType: "application/vnd.google-apps.spreadsheet" };
const historical = { id: backup, name: "HabitQuest Data — backup pre-migration 2026-09-21",
  mimeType: "application/vnd.google-apps.spreadsheet" };

test("source requires Google OAuth; never treats a missing Sheet ID as missing OAuth", async () => {
  resetHabitQuestSourceCacheForTests();
  assert.equal(habitQuestHasGoogleAuth(env), true);
  assert.equal(habitQuestHasGoogleAuth({ ...env, GOOGLE_REFRESH_TOKEN: "" }), false);
  await assert.rejects(resolveHabitQuestSheetId({}, "t", async () => response({})),
    /HABITQUEST_OAUTH_NOT_CONFIGURED/);
});

test("a configured private ID remains authoritative and no discovery call is needed", async () => {
  resetHabitQuestSourceCacheForTests();
  let calls = 0;
  const result = await resolveHabitQuestSheetId({ ...env, HABITQUEST_SHEET_ID: id }, "token",
    async () => { calls++; throw Error("should not query Google"); });
  assert.equal(result, id);
  assert.equal(calls, 0);
  await assert.rejects(resolveHabitQuestSheetId({ ...env, HABITQUEST_SHEET_ID: "invalid" }, "token"),
    /HABITQUEST_INVALID_SHEET_ID/);
});

test("private registry is preferred over Drive and never written", async () => {
  resetHabitQuestSourceCacheForTests();
  const urls = [];
  const chosen = await resolveHabitQuestSheetId({
    ...env, FINANCE_SHEET_ID: "testFinanceSheetId123456789012345"
  }, "token", async (url, request) => {
    urls.push(url);
    assert.equal(request.headers.Authorization, "Bearer token");
    assert.equal(request.method, undefined);
    return response({ values: [["PANTRY_SHEET_ID", backup], ["HABITQUEST_SHEET_ID", id]] });
  });
  assert.equal(chosen, id);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /IntegracionesPrivadas/);
});

test("exact original-title discovery excludes backup and caches the unique canonical source", async () => {
  resetHabitQuestSourceCacheForTests();
  const seen = [];
  const fetchStub = async (url, request) => {
    seen.push(url);
    assert.equal(request.headers.Authorization, "Bearer t");
    return response(metadata([historical, canonical]));
  };
  assert.equal(await resolveHabitQuestSheetId(env, "t", fetchStub), id);
  assert.equal(await resolveHabitQuestSheetId(env, "t", fetchStub), id);
  assert.equal(seen.length, 1, "Successful sheet ID is cached, not fetched on every Home refresh");
  const u = new URL(seen[0]);
  assert.equal(u.hostname, "www.googleapis.com");
  assert.match(u.searchParams.get("q"), /name = 'HabitQuest Data'/);
  assert.match(u.searchParams.get("q"), /trashed = false/);
});

test("duplicate exact originals or incomplete Drive listing fail closed", async () => {
  for (const data of [
    metadata([canonical, { ...canonical, id: otherId }]),
    { ...metadata([canonical]), nextPageToken: "opaque" }
  ]) {
    resetHabitQuestSourceCacheForTests();
    await assert.rejects(resolveHabitQuestSheetId(env, "t", async () => response(data)),
      /HABITQUEST_SOURCE_AMBIGUOUS/);
  }
});

test("not found or Drive permissions are reported distinctly, not fabricated as zero habits", async () => {
  resetHabitQuestSourceCacheForTests();
  await assert.rejects(resolveHabitQuestSheetId(env, "t",
    async () => response(metadata([historical]))), /HABITQUEST_SOURCE_NOT_FOUND/);
  resetHabitQuestSourceCacheForTests();
  await assert.rejects(resolveHabitQuestSheetId(env, "t",
    async () => response({}, 403)), /HABITQUEST_DRIVE_403/);
});

test("private registry conflicting IDs block any fallback to an arbitrary Sheet", async () => {
  resetHabitQuestSourceCacheForTests();
  const financeEnv = { ...env, FINANCE_SHEET_ID: "testFinanceSheetId123456789012345" };
  const calls = [];
  await assert.rejects(resolveHabitQuestSheetId(financeEnv, "t", async (url) => {
    calls.push(url);
    return response({ values: [["HABITQUEST_SHEET_ID", id], ["HABITQUEST_SHEET_ID", otherId]] });
  }), /HABITQUEST_SOURCE_AMBIGUOUS/);
  assert.equal(calls.length, 1);
});

test("source module never embeds real IDs or modifies Google Sheets", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(new URL("./habitquest-source.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /POST|PATCH|DELETE|batchClear|batchUpdate/);
  assert.match(source, /name = '"/);
  const worker = await fs.readFile(new URL("./index.js", import.meta.url), "utf8");
  assert.match(worker, /resolveHabitQuestSheetId\(env, token\)/);
  assert.doesNotMatch(worker, /encodeURIComponent\(env\.HABITQUEST_SHEET_ID\)/);
});
