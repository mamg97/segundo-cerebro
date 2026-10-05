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
