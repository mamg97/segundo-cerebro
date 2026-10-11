import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const segment = app.slice(app.indexOf("const GYM_CUSTOM_ANIMATIONS"), app.indexOf("function gymPlanExerciseLinkMap"));
const escapeHtml = (value) => String(value).replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;");

function setup(extra = {}) {
  const state = {
    escapeHtml, gymVideoInventory: new Map(), gymVideoChecks: new Map(),
    gymMediaInventoryRunning: false, gymLibraryState: { results: [] },
    ...extra
  };
  const ctx = vm.createContext(state);
  vm.runInContext(segment, ctx);
  return ctx;
}

function makeWger(name, id, video = true) {
  return {
    id, name, source: { provider: "wger" }, equipment: [{ name: "Barbell" }],
    description: "Técnica real",
    videos: video ? [{ id: 8, url: "/api/gym/exercises/" + id + "/media/video/8",
      license: { title: "CC BY" } }] : []
  };
}

test("matrix lists exactly all twelve reviewed GIF files with honest unverified video status", () => {
  const ctx = setup();
  const table = vm.runInContext("gymMediaInventoryMarkup()",ctx);
  const keys = [...table.matchAll(/data-gym-media-open="([^"]+)"/g)].map((row)=>row[1]);
  assert.equal(keys.length, 12);
  assert.equal(new Set(keys).size, 12);
  assert.equal((table.match(/Sí · subido/g) || []).length, 12);
  assert.equal((table.match(/Pendiente de comprobación/g) || []).length, 12);
  assert.match(table,/Vídeo en Segundo Cerebro/);
  assert.match(table,/Pullover en polea alta/);
  assert.match(table,/Press inclinado \(barra\)/);
});

test("video flags distinguish matching proxy links from unrelated or missing videos", async () => {
  const ctx = setup({ fetch: async () => ({ ok: true, json: async () => ({
    exercises: [makeWger("Press de Banca",91)]
  }) }) });
  const result = await vm.runInContext("gymCheckVideoAvailability(GYM_CUSTOM_ANIMATIONS[0])",ctx);
  assert.equal(result.id,91);
  const linked = vm.runInContext("gymVideoInventory.get('press-banca-plano-barra')",ctx);
  assert.equal(linked.status,"linked");
  assert.match(vm.runInContext("gymVideoStateMarkup('press-banca-plano-barra')",ctx),/Sí · enlazado/);
  assert.equal(await vm.runInContext("gymCheckVideoAvailability(GYM_CUSTOM_ANIMATIONS[0])",ctx),result);
});

test("missing compatible wger media is explicitly not located, never marked as proven absent everywhere", async () => {
  const ctx = setup({ fetch: async () => ({ ok: true, json: async () => ({
    exercises:[makeWger("Press de banca con mancuernas",92)]
  }) }) });
  const result = await vm.runInContext("gymCheckVideoAvailability(GYM_CUSTOM_ANIMATIONS[0])",ctx);
  assert.equal(result,null);
  assert.equal(vm.runInContext("gymVideoInventory.get('press-banca-plano-barra').status",ctx),"not_found");
  const label = vm.runInContext("gymVideoInventoryLabel(gymVideoInventory.get('press-banca-plano-barra'))",ctx);
  assert.match(label,/No · vídeo no localizado/);
});

test("offline lookup remains unknown, not a false negative", async () => {
  const ctx = setup({ fetch: async () => { throw Error("offline"); } });
  const result = await vm.runInContext("gymCheckVideoAvailability(GYM_CUSTOM_ANIMATIONS[0])",ctx);
  assert.equal(result,null);
  assert.equal(vm.runInContext("gymVideoInventory.get('press-banca-plano-barra').status",ctx),"unknown");
  assert.match(vm.runInContext("gymVideoInventoryLabel(gymVideoInventory.get('press-banca-plano-barra'))",ctx),
    /Sin verificar/);
});

test("success metadata and real loaded media are different statuses", () => {
  const ctx = setup();
  assert.equal(vm.runInContext("gymVideoInventoryLabel({status:'linked'})",ctx),"Sí · enlazado (wger)");
  assert.equal(vm.runInContext("gymVideoInventoryLabel({status:'playable'})",ctx),"Sí · reproducción comprobada");
  assert.equal(vm.runInContext("gymVideoInventoryLabel({status:'broken'})",ctx),"Error · vídeo no reproducible");
});

test("integration includes table and explicit video status for both Gym views", () => {
  const plan = app.slice(app.indexOf("async function openGymTechniqueForPlanExercise("),
    app.indexOf("async function openGymExternalTechnique("));
  const detail = app.slice(app.indexOf("function renderGymLibraryDetail("),
    app.indexOf("function getLatestGymEntries("));
  const library = app.slice(app.indexOf("function renderGymLibraryShell("),
    app.indexOf("function bindGymTechniqueButtons("));
  assert.match(library,/id="gym-media-inventory"/);
  assert.match(plan,/gymVideoStateMarkup\(animation.key\)/);
  assert.match(plan,/gymCheckVideoAvailability\(animation, exercise\)/);
  assert.match(detail,/gymVideoStateMarkup\(customAnimation.key\)/);
  assert.match(detail,/gymCheckVideoAvailability\(animation\)/);
  assert.match(app,/gymBindVideoPlaybackCheck\(detail\)/);
});
