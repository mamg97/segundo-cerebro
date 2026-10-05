import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [app, css, worker, libraryWorker] = await Promise.all([
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/src/gym-library.js", import.meta.url), "utf8")
]);

function animationContext(extra = {}) {
  const source = app.slice(app.indexOf("const GYM_CUSTOM_ANIMATIONS"), app.indexOf("function gymPlanExerciseLinkMap"));
  return vm.createContext({ ...extra, source });
}

test("Local animation matching is exact and never substitutes another bench variant", () => {
  const context = animationContext();
  vm.runInContext(context.source, context);
  const match = (name) => vm.runInContext(`gymCustomAnimationFor(${JSON.stringify({ name })})`, context);
  assert.equal(match("Press de Banca Plano (Barra)").key, "press-banca-plano-barra");
  assert.equal(match("Press Inclinado (Barra)"), null);
  assert.equal(match("Press de Banca Plano (Barra) agarre cerrado"), null);
  assert.equal(match(""), null);
});

test("Opening a curated plan GIF does not require the external library", async () => {
  const detail = { hidden: true, innerHTML: "", scrollIntoView() {} };
  const context = animationContext({
    document: { querySelector: (selector) => selector === "#gym-plan-animation-detail" ? detail : null },
    escapeHtml: (value) => String(value),
    setGymPanelView: (view) => assert.equal(view, "plan"),
    openGymExternalTechnique: () => { throw new Error("Unexpected external lookup"); }
  });
  vm.runInContext(context.source, context);
  vm.runInContext(app.slice(app.indexOf("async function openGymTechniqueForPlanExercise"), app.indexOf("async function openGymExternalTechnique")), context);
  await vm.runInContext('openGymTechniqueForPlanExercise({ id: "bench-flat", name: "Press de Banca Plano (Barra)" })', context);
  assert.equal(detail.hidden, false);
  assert.match(detail.innerHTML, /press-banca-plano-barra-v5\.gif/);
  assert.match(detail.innerHTML, /ilustración orientativa/);
});

test("Gym exposes a free visual exercise library beside the canonical plan", () => {
  assert.match(app, /data-gym-view="plan">Mi plan/);
  assert.match(app, /data-gym-view="library">Biblioteca de ejercicios/);
  assert.match(app, /Biblioteca libre · wger · 0 €/);
  assert.match(app, /data-gym-library-featured="video"/);
  assert.match(app, /data-gym-technique-id/);
});

test("Gym library uses attractive looping media and keeps attribution visible", () => {
  assert.match(app, /muted loop playsinline autoplay preload="metadata"/);
  assert.match(app, /GYM_CUSTOM_ANIMATIONS/);
  assert.match(app, /press-banca-plano-barra-v5\.gif/);
  assert.match(app, /press-banca-plano-barra-poster-v5\.png/);
  assert.match(app, /Animación propia en bucle/);
  assert.match(app, /gym-exercise-hero-media/);
  assert.match(app, /Demostración en bucle/);
  assert.match(app, /Fuente libre: wger/);
  assert.match(app, /gymExerciseLicenseText/);
});

test("Gym library can map current plan exercises and add new canonical plan rows", () => {
  assert.match(app, /\/api\/gym\/exercise-link/);
  assert.match(app, /\/api\/gym\/plan\/exercise/);
  assert.match(worker, /"GimnasioPlan!A:N"/);
  assert.match(worker, /GYM_PLAN_EXERCISE_NOT_FOUND/);
  assert.match(libraryWorker, /gym_exercise_links/);
});

test("Gym library is responsive and uses the v0.42.14 locked-frame anatomical GIF contract", () => {
  assert.match(css, /v0\.42\.14 — locked-frame 16-phase anatomical Gym GIF demonstrations/);
  assert.match(css, /gym-exercise-animation-gif/);
  assert.match(css, /gym-exercise-animation-poster/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.gym-library-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.gym-library-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.gym-exercise-detail-card\s*\{[\s\S]*?grid-template-columns:/);
});
