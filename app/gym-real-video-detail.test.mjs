import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [app, css] = await Promise.all([
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8")
]);
const curatedFunctions = app.slice(app.indexOf("const GYM_CUSTOM_ANIMATIONS"), app.indexOf("function gymPlanExerciseLinkMap"));
const libraryRenderer = app.slice(app.indexOf("function gymExerciseLicenseText("), app.indexOf("function getLatestGymEntries("));
const htmlEscape = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function scenario(extra = {}) {
  const ctx = vm.createContext({ escapeHtml: htmlEscape, gymPanelData: { plan: [] }, gymVideoInventory: new Map(), gymVideoChecks: new Map(), gymMediaInventoryRunning: false, ...extra });
  vm.runInContext(curatedFunctions, ctx);
  return ctx;
}
const realBench = {
  id: 91, name: "Press de Banca", description: "Baja la barra con control y mantén la postura.",
  source: { provider: "wger" }, category: { name: "Chest" },
  muscles: [{ name: "Chest" }], equipment: [{ name: "Barbell" }],
  images: [{ id: 33, isMain: true, previewUrl: "/api/gym/exercises/91/media/image/33" }],
  videos: [{ id: 14, isMain: true, url: "/api/gym/exercises/91/media/video/14", license: { title: "CC BY", author: "wger uploader" } }]
};

test("same wger exercise detail retains primary GIF, then real video and textual instructions", () => {
  const detail = { hidden: true, innerHTML: "" };
  const grid = { hidden: false };
  const status = { textContent: "" };
  const ctx = scenario({
    document: { querySelector: (q) => ({
      "#gym-library-detail": detail, "#gym-library-results": grid, "#gym-library-status": status
    })[q] || null }
  });
  vm.runInContext(libraryRenderer, ctx);
  vm.runInContext("renderGymLibraryDetail(" + JSON.stringify(realBench) + ")", ctx);
  assert.equal(detail.hidden, false);
  const gif = detail.innerHTML.indexOf("press-banca-plano-barra-v5-white.gif");
  const video = detail.innerHTML.indexOf('src="/api/gym/exercises/91/media/video/14"');
  assert.ok(gif >= 0 && video > gif, "GIF stays above the real-person video");
  assert.match(detail.innerHTML, /<video[^>]*controls[^>]*playsinline[^>]*preload="none"/);
  assert.match(detail.innerHTML, /Vídeo real · wger/);
  assert.match(detail.innerHTML, /Cómo realizar el ejercicio/);
  assert.match(detail.innerHTML, /Descripción de wger/);
  assert.match(detail.innerHTML, /CC BY/);
  assert.match(detail.innerHTML, /wger uploader/);
  assert.match(detail.innerHTML, /Fuente libre: wger/);
});

test("never misassign wger video of dumbbell/machine or forge an external raw URL", () => {
  const ctx = scenario();
  const bench = vm.runInContext("GYM_CUSTOM_ANIMATIONS[0]", ctx);
  const wrong = { ...realBench, name: "Press de banca con mancuernas" };
  assert.equal(vm.runInContext("gymCustomAnimationFor(" + JSON.stringify(wrong) + ")", ctx), null);
  assert.equal(vm.runInContext("gymRealVideoMarkup(" + JSON.stringify(wrong) +
    ", GYM_CUSTOM_ANIMATIONS[0])", ctx), "");
  const fakeUrl = { ...realBench, videos: [{ url: "https://example.org/unsafe.mp4" }] };
  assert.equal(vm.runInContext("gymRealVideoMarkup(" + JSON.stringify(fakeUrl) +
    ", GYM_CUSTOM_ANIMATIONS[0])", ctx), "");
  assert.equal(bench.key, "press-banca-plano-barra");
});

test("provider description and names are escaped before rendering", () => {
  const ctx = scenario();
  const malicious = {
    ...realBench,
    description: "<script>alert('x')</script>",
    videos: [{ ...realBench.videos[0], license: { title: "<img src=x>", author: "user" } }]
  };
  const html = vm.runInContext("gymTechniqueInstructionsMarkup(GYM_CUSTOM_ANIMATIONS[0], " +
    JSON.stringify(malicious) + ")", ctx);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  const video = vm.runInContext("gymRealVideoMarkup(" +
    JSON.stringify(malicious) + ", GYM_CUSTOM_ANIMATIONS[0])", ctx);
  assert.match(video, /&lt;img src=x&gt;/);
  assert.doesNotMatch(video, /<img src=x>/);
});

test("a publicly verified wger ID is revalidated against name, variant and video at the private API", async () => {
  const calls = [];
  const observed = {
    ...realBench, id: 73, videos: [{ ...realBench.videos[0], url: "/api/gym/exercises/73/media/video/21" }]
  };
  const ctx = scenario({
    fetch: async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ exercise: observed }) };
    }
  });
  const result = await vm.runInContext("gymLoadVerifiedWgerTechnique(GYM_CUSTOM_ANIMATIONS[0])", ctx);
  assert.equal(result.id, 73);
  assert.deepEqual(calls, ["/api/gym/exercises/73"]);
  assert.doesNotMatch(calls.join(" "), /illustration:|GimnasioPlan|health/i);
});

test("no equivalent verified wger video means local GIF and guidance still work", async () => {
  const calls = [];
  const ctx = scenario({
    fetch: async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ exercises: [{
        ...realBench, name: "Press de banca con mancuernas"
      }] }) };
    }
  });
  assert.equal(await vm.runInContext("gymLoadVerifiedWgerTechnique(GYM_CUSTOM_ANIMATIONS[0])", ctx), null);
  assert.match(vm.runInContext("gymTechniqueInstructionsMarkup(GYM_CUSTOM_ANIMATIONS[0])", ctx),
    /Cómo realizar el ejercicio/);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /\/api\/gym\/exercises\/73$/);
  assert.match(calls[1], /\?q=/);
});

test("real video lookup failing offline cannot prevent existing GIF", async () => {
  const ctx = scenario({ fetch: async () => { throw new Error("offline"); } });
  assert.equal(await vm.runInContext("gymLoadVerifiedWgerTechnique(GYM_CUSTOM_ANIMATIONS[0])", ctx), null);
  const html = vm.runInContext("gymCustomAnimationMarkup(GYM_CUSTOM_ANIMATIONS[0], 'Banca')", ctx);
  assert.match(html, /press-banca-plano-barra-v5-white\.gif/);
});

test("both plan and library details enrich the video without changing list tiles or plan data", () => {
  const plan = app.slice(app.indexOf("async function openGymTechniqueForPlanExercise("),
    app.indexOf("async function openGymExternalTechnique("));
  const library = app.slice(app.indexOf("function renderGymLibraryDetail("),
    app.indexOf("function getLatestGymEntries("));
  assert.match(plan, /gymCustomAnimationMarkup\(animation/);
  assert.match(plan, /gymTechniqueInstructionsMarkup\(animation\)/);
  assert.match(plan, /gymCheckVideoAvailability\(animation, exercise\)/);
  assert.match(plan, /gymRealVideoMarkup\(provider, animation\)/);
  assert.match(library, /customAnimation && !isOwnIllustration \? gymRealVideoMarkup\(exercise, customAnimation\)/);
  assert.match(library, /gymCheckVideoAvailability\(animation\)/);
  const preview = app.slice(app.indexOf("function gymLibraryPreview("), app.indexOf("async function loadGymExerciseLibrary("));
  assert.match(preview, /return gymCustomAnimationMarkup\(animation/);
  assert.doesNotMatch(preview, /gymRealVideoMarkup/);
  assert.match(css, /\.gym-real-video > \.gym-exercise-hero-media/);
  assert.match(css, /\.gym-technique-explanation/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("incline wger English naming matches barbell only, never dumbbell versions", () => {
  const ctx = scenario();
  const key = (item) => vm.runInContext("gymCustomAnimationFor(" + JSON.stringify(item) + ")?.key || null", ctx);
  const barbell = { ...realBench, id: 704, name: "Incline Bench Press", equipment: [{ name: "Barbell" }] };
  const dumbbell = { ...barbell, id: 705, equipment: [{ name: "Dumbbell" }] };
  const ambiguous = { ...barbell, equipment: [] };
  assert.equal(key(barbell), "press-inclinado-barra");
  assert.equal(key(dumbbell), null);
  assert.equal(key(ambiguous), null);
  assert.equal(key({ ...barbell, name: "Incline Dumbbell Bench Press" }), null);
  assert.equal(key({ ...barbell, name: "Incline Barbell Bench Press" }), "press-inclinado-barra");
});

test("incline video lookup first tries English, falls back to Spanish and requires exact variant", async () => {
  const calls = [];
  const matching = {
    ...realBench, id: 704, name: "Incline Bench Press", equipment: [{ name: "Barbell" }],
    videos: [{ ...realBench.videos[0], url: "/api/gym/exercises/704/media/video/14" }]
  };
  const ctx = scenario({
    fetch: async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ exercises: [matching] }) };
    }
  });
  const match = await vm.runInContext(
    "gymLoadVerifiedWgerTechnique(GYM_CUSTOM_ANIMATIONS.find((x)=>x.key==='press-inclinado-barra'))", ctx);
  assert.equal(match?.id, matching.id);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /\/api\/gym\/exercises\/538$/);
  assert.match(calls[1], /q=incline&limit=48/);

  const fallbackCalls = [];
  const otherCtx = scenario({
    fetch: async (url) => {
      fallbackCalls.push(url);
      return { ok: true, json: async () => ({ exercises: url.includes("q=incline")
        ? [{ ...matching, equipment: [{ name: "Dumbbell" }] }]
        : [matching] }) };
    }
  });
  const selected = await vm.runInContext(
    "gymLoadVerifiedWgerTechnique(GYM_CUSTOM_ANIMATIONS.find((x)=>x.key==='press-inclinado-barra'))", otherCtx);
  assert.equal(selected?.id, matching.id);
  assert.equal(fallbackCalls.length, 3);
  assert.match(fallbackCalls[0], /\/api\/gym\/exercises\/538$/);
  assert.match(fallbackCalls[2], /q=press%20inclinado/);
});

test("user sees explicit video availability or loading state, even when wger has no match", () => {
  const section = app.slice(app.indexOf("function renderGymLibraryDetail("),
    app.indexOf("function getLatestGymEntries("));
  const plan = app.slice(app.indexOf("async function openGymTechniqueForPlanExercise("),
    app.indexOf("async function openGymExternalTechnique("));
  assert.match(section, /gymVideoStateMarkup\(customAnimation\.key\)/);
  assert.match(section, /gymVideoStateMarkup\(customAnimation\.key\)/);
  assert.match(plan, /gymVideoStateMarkup\(animation\.key\)/);
  assert.match(plan, /gymCheckVideoAvailability\(animation, exercise\)/);
  assert.match(css, /\.gym-real-video-status/);
});

test("the three known provider hints never cause a mismatched exercise or unlicensed video to display", async () => {
  const ctx = scenario({
    fetch: async (url) => ({ ok: true, json: async () => {
      if (/\/73$/.test(url)) return { exercise: {
        ...realBench, id: 73, name:"Press de banca con mancuernas",
        videos:[{ url:"/api/gym/exercises/73/media/video/21", license:{title:"CC BY"} }]
      } };
      return { exercises: [] };
    } })
  });
  assert.equal(await vm.runInContext("gymLoadVerifiedWgerTechnique(GYM_CUSTOM_ANIMATIONS[0])",ctx),null);
  assert.deepEqual([...vm.runInContext("Object.values(GYM_WGER_VERIFIED_VIDEO_HINTS)",ctx)].sort((a,b)=>a-b),[73,194,538]);
  assert.match(app, /Ficha multimedia · v0\.44\.30/);
});
