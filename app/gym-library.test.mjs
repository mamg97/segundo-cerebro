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
  assert.equal(match("Press de Banca").key, "press-banca-plano-barra");
  assert.equal(match("Press de banca con mancuernas"), null);
  assert.equal(match("Press de Banca Declinado con Barra"), null);
  assert.equal(match("Press Inclinado (Barra)"), null);
  assert.equal(match("Press de Banca Plano (Barra) agarre cerrado"), null);
  assert.equal(match("Press Militar").key, "military-press");
  assert.equal(match("Press militar con mancuernas"), null);
  assert.equal(match(""), null);
});

test("The actual wger bench card shows the GIF instead of the real-person video", () => {
  const grid = { innerHTML: "", querySelectorAll: () => [] };
  const status = {};
  const context = animationContext({
    document: { querySelector: (selector) => ({ "#gym-library-results": grid, "#gym-library-status": status }[selector] || null) },
    escapeHtml: String
  });
  vm.runInContext(context.source, context);
  vm.runInContext(app.slice(app.indexOf("function gymLibraryPreview("), app.indexOf("async function loadGymExerciseLibrary(")), context);
  vm.runInContext('renderGymLibraryResults([{id: "library-bench", name: "Press de Banca", hasVideo: true, videos: [{url: "/example-video.mp4"}], muscles: [{name: "Chest"}], equipment: [{name: "Barbell"}, {name: "Bench"}]}])', context);
  assert.match(grid.innerHTML, /press-banca-plano-barra-v5\.gif/);
  assert.match(grid.innerHTML, />Animación<\/b>/);
  assert.doesNotMatch(grid.innerHTML, /<video/);
});

test("Every published GIF has 16 transparent full-size frames and a matching poster", async () => {
  const context = animationContext();
  vm.runInContext(context.source, context);
  for (const animation of vm.runInContext("GYM_CUSTOM_ANIMATIONS", context)) {
    const data = await readFile(new URL(animation.animationUrl, import.meta.url));
    assert.equal(data.toString("ascii", 0, 6), "GIF89a", animation.key);
    assert.equal(data.readUInt16LE(6), 360);
    assert.equal(data.readUInt16LE(8), 480);
    let offset = 13 + ((data[10] & 128) ? 3 * (1 << ((data[10] & 7) + 1)) : 0);
    let frames = 0, transparent = false, delay = 0;
    const skipBlocks = () => {
      while (data[offset]) {
        offset += 1 + data[offset];
        assert.ok(offset < data.length, "GIF block stays in file");
      }
      offset++;
    };
    while (offset < data.length) {
      const marker = data[offset++];
      if (marker === 0x3b) break;
      if (marker === 0x21) {
        const kind = data[offset++];
        if (kind === 0xf9) {
          transparent = Boolean(data[offset + 1] & 1);
          delay = data.readUInt16LE(offset + 2);
        }
        skipBlocks();
      } else if (marker === 0x2c) {
        assert.equal(data.readUInt16LE(offset + 4), 360);
        assert.equal(data.readUInt16LE(offset + 6), 480);
        assert.equal(transparent, true, `${animation.key} frame ${frames} transparency`);
        assert.equal(delay, 7);
        const packed = data[offset + 8];
        offset += 9 + ((packed & 128) ? 3 * (1 << ((packed & 7) + 1)) : 0);
        offset++; // LZW minimum code size
        skipBlocks();
        frames++;
        transparent = false;
      } else {
        assert.fail(`Unexpected GIF marker ${marker}`);
      }
    }
    assert.equal(frames, 16, animation.key);
    const poster = await readFile(new URL(animation.posterUrl, import.meta.url));
    assert.equal(poster.toString("ascii", 1, 4), "PNG");
    assert.equal(poster.readUInt32BE(16), 360);
    assert.equal(poster.readUInt32BE(20), 480);
  }
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

test("A medically paused Gym still displays canonical series, reps, loads and technique notes", () => {
  const begin = app.indexOf("function formatGymPlanReferenceLoad(");
  const end = app.indexOf("function renderGymPlanView(", begin);
  assert.ok(begin >= 0 && end > begin, "paused plan renderer exists");
  const context = vm.createContext({
    escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    formatTarget: ({ setsTarget, repsTarget }) => `${setsTarget} series × ${repsTarget} repeticiones`,
    formatGymLoad: (value, unit) => `${value} ${unit || "kg"}`,
    gymCustomAnimationFor: () => null
  });
  vm.runInContext(app.slice(begin, end), context);

  const plan = [{
    id: "example", title: "Día de ejemplo", focus: "Prueba",
    exercises: [
      { id: "barbell", name: "Prensa de ejemplo", setsTarget: 3, repsTarget: "8-12", loadValue: 25,
        loadUnit: "kg/lado", loadNote: "25 kg/lado; si es otra máquina usar otro peso",
        coachingNote: "No buscar el fallo." },
      { id: "bodyweight", name: "Fondos de ejemplo", setsTarget: 4, repsTarget: "10-12",
        loadValue: null, loadNote: "Peso corporal" },
      { id: "unresolved", name: "Ejercicio por confirmar", setsTarget: 3, repsTarget: "10",
        loadValue: null, loadNote: "27 o 49 kg: confirmar máquina" },
      { id: "unknown", name: "Sin carga asignada", setsTarget: 3, repsTarget: "12",
        loadValue: null, loadNote: "<script>invalid</script>" },
      { id: "zero", name: "Carga cero", setsTarget: 2, repsTarget: "5",
        loadValue: 0, loadUnit: "kg extra" }
    ]
  }];

  const html = vm.runInContext(`renderGymPlanReference(${JSON.stringify(plan)})`, context);
  assert.match(html, /3 series × 8-12 repeticiones/);
  assert.match(html, /Carga de referencia: 25 kg\/lado/);
  assert.match(html, /otra máquina usar otro peso/);
  assert.match(html, /No buscar el fallo/);
  assert.match(html, /Carga de referencia: Peso corporal/);
  assert.match(html, /Carga de referencia: 27 o 49 kg: confirmar máquina/);
  assert.match(html, /Carga de referencia: 0 kg extra/);
  assert.match(html, /&lt;script&gt;invalid&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(css, /\.gym-plan-reference-exercise small\.gym-plan-reference-load/);

  const pauseAt = app.indexOf("if (trainingStatus.paused)", end);
  const activeAt = app.indexOf("const lastDayId", pauseAt);
  assert.ok(pauseAt > end && activeAt > pauseAt);
  const pausedBranch = app.slice(pauseAt, activeAt);
  assert.match(pausedBranch, /renderGymPlanReference\(plan\)/);
  assert.doesNotMatch(pausedBranch, /gym-session-form/);
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
  assert.match(css, /\.gym-library-preview-animation\s*\{[^}]*position: absolute;[^}]*inset: 0;[^}]*width: 100%;[^}]*height: 100%;[^}]*aspect-ratio: auto;/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.gym-library-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.gym-library-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.gym-exercise-detail-card\s*\{[\s\S]*?grid-template-columns:/);
});


test("Gym saves only exercise rows explicitly marked as performed, never all prefilled targets", async () => {
  assert.match(app, /class="gym-input-done" type="checkbox"/);
  assert.ok(css.includes(".gym-exercise-row .gym-exercise-completed"));

  const begin = app.indexOf("async function saveGymSessionFromForm(");
  const end = app.indexOf("function renderGymProgress(", begin);
  assert.ok(begin >= 0 && end > begin, "Gym session submit handler exists");

  const status = { textContent: "" };
  const marked = { checked: false };
  const makeRow = (exerciseId, checkedRef, sets, reps, load) => ({
    dataset: { exerciseId },
    querySelector(selector) {
      return ({
        ".gym-input-done": checkedRef,
        ".gym-input-sets": { value: sets },
        ".gym-input-reps": { value: reps },
        ".gym-input-load": { value: load },
        ".gym-input-note": { value: "" }
      })[selector] || null;
    }
  });
  const notMarked = { checked: false };
  const rows = [
    makeRow("real", marked, "2", "10,9", "22.5"),
    makeRow("unperformed", notMarked, "3", "12", "25")
  ];
  const fields = new Map([
    ["#gym-day-id", { value: "push" }],
    ["#gym-session-date", { value: "2026-01-15" }],
    ["#gym-session-notes", { value: "" }],
    ["#gym-save-status", status]
  ]);
  const calls = [];
  const context = vm.createContext({
    document: {
      querySelector(selector) { return fields.get(selector) || null; },
      querySelectorAll(selector) {
        assert.equal(selector, ".gym-exercise-row");
        return rows;
      }
    },
    planById: new Map([["push", { id: "push", title: "Ejemplo", exercises: [
      { id: "real", name: "Press de ejemplo", loadUnit: "kg/lado" },
      { id: "unperformed", name: "Otro ejercicio", loadUnit: "kg/lado" }
    ] }]]),
    renderGymPanel() {},
    console: { warn: () => { throw Error("Unexpected console warning"); } },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ ok: true }) };
    }
  });
  vm.runInContext(app.slice(begin, end), context);
  await vm.runInContext("saveGymSessionFromForm(planById)", context);
  assert.match(status.textContent, /Marca como realizado/);
  assert.equal(calls.length, 0, "No exercises marked means no write");

  marked.checked = true;
  await vm.runInContext("saveGymSessionFromForm(planById)", context);
  const post = calls.find((call) => call.url === "/api/gym/session");
  assert.ok(post, "Save POST is sent");
  const payload = JSON.parse(post.init.body);
  assert.equal(payload.entries.length, 1, "Unperformed exercise is excluded");
  assert.equal(payload.entries[0].exerciseId, "real");
  assert.equal(payload.entries[0].setsDone, "2");
  assert.equal(payload.entries[0].repsDone, "10,9");
  assert.equal(payload.entries[0].loadValue, "22.5");
  assert.equal(payload.entries[0].loadUnit, "kg/lado");
  assert.equal(status.textContent, "Entrenamiento guardado ✓");
});
