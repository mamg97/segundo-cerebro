import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { progressRingMarkup } from "./progress-ring.js";

function getArc(markup, className) {
  const escaped = className.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const match = markup.match(new RegExp('<path class="' + escaped + '[^"]*"[^>]*data-progress="([^"]+)"[^>]*d="([^"]+)"'));
  return match ? { progress: Number(match[1]), d: match[2] } : null;
}

function getFullCircle(markup, className) {
  const escaped = className.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  return new RegExp('<circle class="' + escaped + '[^"]*progress-ring-full"').test(markup);
}

for (const pct of [16, 26, 37, 60]) {
  const markup = progressRingMarkup(pct, { tone: "mint", label: "test" });
  const arc = getArc(markup, "progress-ring-stroke progress-ring-main");
  assert.ok(arc, pct + "% must render as a partial SVG path, not a full circle");
  assert.equal(arc.progress, pct);
  assert.match(markup, new RegExp('aria-valuenow="' + pct + '"'));
  assert.match(markup, new RegExp('>' + pct + '%<'));
  assert.equal(getFullCircle(markup, "progress-ring-stroke progress-ring-main"), false);
}

const p0 = progressRingMarkup(0, { tone: "violet", label: "hoy" });
assert.equal(getArc(p0, "progress-ring-stroke progress-ring-main"), null);
assert.equal(getFullCircle(p0, "progress-ring-stroke progress-ring-main"), false);

const p100 = progressRingMarkup(100, { tone: "mint" });
assert.equal(getFullCircle(p100, "progress-ring-stroke progress-ring-main"), true);

const p132 = progressRingMarkup(132, { tone: "blue", label: "ref" });
assert.equal(getFullCircle(p132, "progress-ring-stroke progress-ring-main"), true);
const lap132 = getArc(p132, "progress-ring-stroke progress-ring-lap progress-ring-lap-2");
assert.ok(lap132);
assert.equal(lap132.progress, 32);

const p178 = progressRingMarkup(178, { tone: "coral", label: "máx" });
assert.equal(getFullCircle(p178, "progress-ring-stroke progress-ring-main"), true);
const lap178 = getArc(p178, "progress-ring-stroke progress-ring-lap progress-ring-lap-2");
assert.ok(lap178);
assert.equal(lap178.progress, 78);

const p220 = progressRingMarkup(220, { tone: "coral", label: "ref" });
assert.equal(getFullCircle(p220, "progress-ring-stroke progress-ring-main"), true);
assert.equal(getFullCircle(p220, "progress-ring-stroke progress-ring-lap progress-ring-lap-2"), true);
const lap220 = getArc(p220, "progress-ring-stroke progress-ring-lap progress-ring-lap-3");
assert.ok(lap220);
assert.equal(lap220.progress, 20);

// Exact geometric spot checks: these endpoints correspond to the requested angle.
assert.match(progressRingMarkup(26, {}), /d="M 50 14 A 36 36 0 0 1 85\.929 52\.26"/);
assert.match(progressRingMarkup(60, {}), /d="M 50 14 A 36 36 0 1 1 28\.84 79\.125"/);

// Global audit: all percentage rings use the same component/version.
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const adherence = readFileSync(new URL("./adherence.js", import.meta.url), "utf8");
const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const ringSource = readFileSync(new URL("./progress-ring.js", import.meta.url), "utf8");

assert.match(app, /progress-ring\.js\?v=0\.33\.8/);
assert.match(app, /adherence\.js\?v=0\.33\.8/);
assert.match(adherence, /progress-ring\.js\?v=0\.33\.8/);
assert.match(index, /app\.js\?v=0\.34\.1/);
const ringCssStart = css.indexOf("/* v0.31.0 — shared compact progress rings */");
const ringCssEnd = css.indexOf("/* Home: same cards", ringCssStart);
const ringCss = css.slice(ringCssStart, ringCssEnd);
assert.doesNotMatch(ringCss, /stroke-dasharray|stroke-dashoffset/);
assert.doesNotMatch(ringSource, /stroke-dasharray|stroke-dashoffset|pathLength/);
assert.doesNotMatch(css, /\.habit-progress-ring\s*\{/);
assert.doesNotMatch(app, /habit-progress-ring/);
assert.doesNotMatch(index, /habit-progress-ring/);

// Dynamic update path is mandatory: live cards call updateProgressRing and it replaces SVG geometry.
assert.match(ringSource, /function updateRingSvg\([^)]*\)[\s\S]*outerHTML = markup/);
assert.match(app, /updateProgressRing\(ring, percentage/);
assert.match(app, /updateProgressRing\(ring, fillPct/);

for (const marker of [
  "#home-habits-ring",
  "#home-kcal-ring",
  "Progreso de nutrición",
  "Progreso de actividad",
  "Progreso semanal de fuerza",
  "de hábitos completados",
  "nutrition-target-ring-card"
]) {
  assert.ok(app.includes(marker), "Missing audited app ring surface: " + marker);
}
assert.ok(adherence.includes("Adherencia mensual"), "Missing audited adherence ring surface");

console.log("geometric progress rings: static geometry, overflow, dynamic update and all live surfaces OK");
