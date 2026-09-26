import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { progressRingMarkup } from "./progress-ring.js";

function circleStyle(markup, className) {
  const escaped = className.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const match = markup.match(new RegExp('<circle class="' + escaped + '"[^>]*style="([^"]*)"'));
  assert.ok(match, "Missing circle " + className);
  return Object.fromEntries(match[1].split(";").filter(Boolean).map((item) => {
    const index = item.indexOf(":");
    return [item.slice(0, index), item.slice(index + 1)];
  }));
}

function expectedOffset(radius, percent) {
  const circle = 2 * Math.PI * radius;
  return circle * (1 - Math.max(0, Math.min(100, percent)) / 100);
}

function assertOffset(markup, className, radius, percent) {
  const style = circleStyle(markup, className);
  const actual = Number(style["stroke-dashoffset"]);
  const expected = expectedOffset(radius, percent);
  assert.ok(Number.isFinite(actual), className + " has a numeric dash offset");
  assert.ok(Math.abs(actual - expected) < 0.002, className + " expected " + expected + " got " + actual);
}

for (const pct of [0, 16, 26, 37, 60, 100]) {
  const markup = progressRingMarkup(pct, { tone: "mint", label: "test" });
  assertOffset(markup, "progress-ring-stroke progress-ring-main", 36, pct);
  assert.match(markup, new RegExp('aria-valuenow="' + pct + '"'));
  assert.match(markup, new RegExp('>' + pct + '%<'));
}

const p132 = progressRingMarkup(132, { tone: "blue", label: "ref" });
assertOffset(p132, "progress-ring-stroke progress-ring-main", 36, 100);
assertOffset(p132, "progress-ring-stroke progress-ring-lap progress-ring-lap-2", 44, 32);
assert.match(p132, /aria-valuenow="132"/);
assert.match(p132, />132%</);

const p178 = progressRingMarkup(178, { tone: "coral", label: "máx" });
assertOffset(p178, "progress-ring-stroke progress-ring-main", 36, 100);
assertOffset(p178, "progress-ring-stroke progress-ring-lap progress-ring-lap-2", 44, 78);

const p220 = progressRingMarkup(220, { tone: "coral", label: "ref" });
assertOffset(p220, "progress-ring-stroke progress-ring-main", 36, 100);
assertOffset(p220, "progress-ring-stroke progress-ring-lap progress-ring-lap-2", 44, 100);
assertOffset(p220, "progress-ring-stroke progress-ring-lap progress-ring-lap-3", 48, 20);
assert.match(p220, />220%</);

// Global surface audit: every visible percentage circle must use the same component/version.
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const adherence = readFileSync(new URL("./adherence.js", import.meta.url), "utf8");
const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

assert.match(app, /progress-ring\.js\?v=0\.33\.7/);
assert.match(app, /adherence\.js\?v=0\.33\.7/);
assert.match(adherence, /progress-ring\.js\?v=0\.33\.7/);
assert.match(index, /app\.js\?v=0\.33\.7/);
assert.doesNotMatch(css, /\.progress-ring-stroke\s*\{[^}]*stroke-dashoffset\s*:/s);
assert.doesNotMatch(css, /\.habit-progress-ring\s*\{/);
assert.doesNotMatch(app, /habit-progress-ring/);
assert.doesNotMatch(index, /habit-progress-ring/);

// Known live surfaces that must remain on the shared ring component.
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

console.log("progress-ring geometry and all live ring surfaces OK");
