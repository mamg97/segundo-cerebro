import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const segment = app.slice(app.indexOf("const GYM_CUSTOM_ANIMATIONS"), app.indexOf("function gymPlanExerciseLinkMap"));

function context(extra = {}) {
  const ctx = vm.createContext({ gymVideoInventory: new Map(), gymVideoChecks: new Map(), gymMediaInventoryRunning: false, ...extra });
  vm.runInContext(segment, ctx);
  return ctx;
}

test("all fifteen reviewed exercises have an independent Library ficha and the correct animation", () => {
  const ctx = context();
  const rows = vm.runInContext("gymLibraryWithIllustrations([], { featured: 'video' }, {}, [])", ctx);
  assert.equal(rows.length, 15);
  assert.equal(new Set(rows.map((row) => row.id)).size, 15);
  assert.equal(rows.filter((row) => row.source.provider === "segundo-cerebro-illustrations").length, 15);
  const pecDeck = rows.find((row) => row.animationKey === "aperturas-maquina-mariposa");
  assert.equal(pecDeck.name, "Aperturas plano (máquina mariposa)");
  assert.equal(vm.runInContext(`gymCustomAnimationFor(${JSON.stringify(pecDeck)})?.animationUrl`, ctx),
    "./assets/gym-animations/aperturas-maquina-mariposa-v2-white.gif");
  const quad = rows.find((row) => row.animationKey === "extension-cuadriceps-maquina");
  assert.equal(quad.name, "Extensiones de cuádriceps en máquina");
  assert.equal(vm.runInContext(`gymCustomAnimationFor(${JSON.stringify(quad)})?.animationUrl`, ctx),
    "./assets/gym-animations/extension-cuadriceps-maquina-v3-white.gif");
  const legPress = rows.find((row) => row.animationKey === "prensa-piernas-inclinada-45");
  assert.equal(legPress.name, "Prensa de piernas inclinada a 45°");
  assert.equal(vm.runInContext(`gymCustomAnimationFor(${JSON.stringify(legPress)})?.animationUrl`, ctx),
    "./assets/gym-animations/prensa-piernas-inclinada-45-v5-white.gif");
  for (const row of rows) {
    assert.match(row.id, /^illustration:/);
    assert.equal(vm.runInContext(`gymCustomAnimationFor(${JSON.stringify(row)})?.key`, ctx), row.animationKey);
    assert.equal(row.hasVideo, false, "GIFs are never mislabelled as wger videos");
  }
});

test("when a real wger ficha represents the exact exercise, use its card once with local GIF", () => {
  const ctx = context();
  const wger = [
    { id: 55, name: "Press de Banca", videos: [{ url: "/video" }], description: "Remote exercise", source: { provider: "wger" } },
    { id: 56, name: "Press de banca con mancuernas", source: { provider: "wger" } }
  ];
  const rows = vm.runInContext(`gymLibraryWithIllustrations(${JSON.stringify(wger)}, {}, {}, [])`, ctx);
  assert.equal(rows.length, 16, "One genuine wger match plus fourteen local fichas plus one unrelated wger");
  assert.equal(rows.filter((x) => x.id === 55).length, 1);
  assert.equal(rows.filter((x) => x.animationKey === "press-banca-plano-barra").length, 0);
  assert.equal(rows.filter((x) => x.id === 56).length, 1);
  assert.equal(vm.runInContext("gymCustomAnimationFor({id:56,name:'Press de banca con mancuernas'})", ctx), null);
});

test("query and wger muscle/equipment selection also filter curated exercises", () => {
  const ctx = context();
  const meta = {
    muscles: [{ id: "1", name: "Chest" }, { id: "2", name: "Biceps" }],
    equipment: [{ id: "3", name: "Barbell" }, { id: "4", name: "Machine" }]
  };
  const evaluate = (filters) => vm.runInContext(
    `gymLibraryWithIllustrations([], ${JSON.stringify(filters)}, ${JSON.stringify(meta)}, [])`, ctx
  );
  const chest = evaluate({ muscle: "1" });
  assert.deepEqual([...chest.map((x) => x.animationKey)].sort(), [
    "aperturas-maquina-mariposa", "fondos-paralelas", "press-banca-plano-barra", "press-inclinado-barra"
  ]);
  const chestBarbell = evaluate({ muscle: "1", equipment: "3" });
  assert.equal(chestBarbell.length, 2);
  const search = evaluate({ query: "dominadas" });
  assert.deepEqual([...search.map((x) => x.animationKey)], ["dominadas-explosivas"]);
  assert.equal(evaluate({ query: "press inclinado mancuernas" }).length, 0);
});

test("being on the plan only changes the badge; never the existence or media of a GIF ficha", () => {
  const ctx = context();
  const plan = [{ id: "one", exercises: [{ id: "my-dips", name: "Fondos en paralelas" }] }];
  const rows = vm.runInContext(`gymLibraryWithIllustrations([], {}, {}, ${JSON.stringify(plan)})`, ctx);
  assert.equal(rows.length, 15);
  const dips = rows.find((row) => row.animationKey === "fondos-paralelas");
  assert.equal(dips.inPlan, true);
  assert.equal(rows.find((row) => row.animationKey === "curl-martillo-polea").inPlan, false);
});

test("a GIF is visible in active and paused plan rows, while videos stay in the detail", () => {
  const day = { id: "push", title: "Día 1", focus: "Pecho", restSeconds: 90, exercises: [
    { id: "fly", name: "Aperturas plano", setsTarget: 3, repsTarget: "12", loadValue: 107, loadUnit: "kg" },
    { id: "quad", name: "Extensiones de cuádriceps en máquina", setsTarget: 3, repsTarget: "12-15", loadValue: 50, loadUnit: "kg" },
    { id: "leg-press", name: "Prensa de piernas", setsTarget: 3, repsTarget: "10", loadValue: 0, loadUnit: "kg" }
  ] };
  const row = { innerHTML: "", querySelectorAll: () => [] };
  const ctx = context({
    document: { querySelector: (selector) => selector === "#gym-day-detail" ? row : null },
    escapeHtml: String,
    formatRestSeconds: () => "1:30 min",
    formatTarget: () => "3 series × 12 repeticiones",
    formatGymLoad: (value) => String(value),
    formatGymPlanReferenceLoad: () => "107 kg",
    renderMobilePickerOptions: () => "",
    renderMobileRepOptions: () => "",
    bindGymTechniqueButtons: () => {}
  });
  vm.runInContext(app.slice(app.indexOf("function renderGymDay("), app.indexOf("function renderMobileRepOptions(")), ctx);
  vm.runInContext(app.slice(app.indexOf("function renderGymPlanReference("), app.indexOf("function renderGymPlanView(")), ctx);
  vm.runInContext(`renderGymDay(${JSON.stringify(day)}, new Map())`, ctx);
  assert.match(row.innerHTML, /gym-plan-inline-animation/);
  assert.match(row.innerHTML, /aperturas-maquina-mariposa-v2-white\.gif/);
  assert.match(row.innerHTML, /extension-cuadriceps-maquina-v3-white\.gif/);
  assert.match(row.innerHTML, /prensa-piernas-inclinada-45-v5-white\.gif/);
  assert.doesNotMatch(row.innerHTML, /<video/);
  const paused = vm.runInContext(`renderGymPlanReference([${JSON.stringify(day)}])`, ctx);
  assert.match(paused, /gym-plan-inline-animation/);
  assert.match(paused, /aperturas-maquina-mariposa-v2-white\.gif/);
  assert.match(paused, /extension-cuadriceps-maquina-v3-white\.gif/);
  assert.match(paused, /prensa-piernas-inclinada-45-v5-white\.gif/);
  assert.doesNotMatch(paused, /<video/);
});

test("opening an independent GIF ficha never looks up an invented provider ID or offers a wger write", async () => {
  const resultGrid = { hidden: false };
  const detail = { hidden: true, innerHTML: "", querySelector: () => null };
  const status = { textContent: "" };
  const doc = {
    querySelector(selector) {
      return {
        "#gym-library-results": resultGrid,
        "#gym-library-detail": detail,
        "#gym-library-status": status
      }[selector] || null;
    }
  };
  const ctx = context({
    document: doc,
    escapeHtml: (value) => String(value),
    gymPanelData: { plan: [] },
    gymLibraryMeta: {},
    console: { warn: () => { throw Error("Unexpected failure"); } },
    fetch: () => { throw Error("Local GIF must never call wger detail endpoint"); }
  });
  const local = vm.runInContext("gymLibraryWithIllustrations([], {}, {}, [])[5]", ctx);
  const library = vm.runInContext("gymLibraryWithIllustrations([], {}, {}, [])", ctx);
  vm.runInContext("gymLibraryState.results = " + JSON.stringify(library), ctx);
  const detailCode = app.slice(app.indexOf("function renderGymLibraryDetail("), app.indexOf("function getLatestGymEntries("));
  vm.runInContext(detailCode, ctx);
  await vm.runInContext(`openGymLibraryExercise(${JSON.stringify(local.id)}, null)`, ctx);
  assert.equal(detail.hidden, false);
  assert.match(detail.innerHTML, /gym-exercise-hero-animation/);
  assert.match(detail.innerHTML, /Ilustración propia · Segundo Cerebro/);
  assert.doesNotMatch(detail.innerHTML, /Fuente libre: wger/);
  assert.doesNotMatch(detail.innerHTML, /id="gym-library-add"/);
  assert.doesNotMatch(detail.innerHTML, /id="gym-link-current-exercise"/);
});

test("library fetch integrates the local fichas without new data writes or API endpoints", () => {
  const block = app.slice(app.indexOf("async function loadGymExerciseLibrary"), app.indexOf("function gymExerciseLicenseText"));
  assert.match(block, /gymLibraryWithIllustrations\(/);
  assert.match(block, /renderGymLibraryResults\(combined\)/);
  assert.match(block, /gymPanelData\?\.plan \|\| \[\]/);
  const open = app.slice(app.indexOf("async function openGymLibraryExercise("), app.indexOf("function getLatestGymEntries"));
  assert.match(open, /!gymOwnIllustration\(exercise\)/);
});
