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

test("all twelve reviewed exercises have an independent Library ficha and the correct animation", () => {
  const ctx = context();
  const rows = vm.runInContext("gymLibraryWithIllustrations([], { featured: 'video' }, {}, [])", ctx);
  assert.equal(rows.length, 12);
  assert.equal(new Set(rows.map((row) => row.id)).size, 12);
  assert.equal(rows.filter((row) => row.source.provider === "segundo-cerebro-illustrations").length, 12);
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
  assert.equal(rows.length, 13, "One genuine wger match plus eleven local fichas plus one unrelated wger");
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
    "fondos-paralelas", "press-banca-plano-barra", "press-inclinado-barra"
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
  assert.equal(rows.length, 12);
  const dips = rows.find((row) => row.animationKey === "fondos-paralelas");
  assert.equal(dips.inPlan, true);
  assert.equal(rows.find((row) => row.animationKey === "curl-martillo-polea").inPlan, false);
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
