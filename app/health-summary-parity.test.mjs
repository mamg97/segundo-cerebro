import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, css] = await Promise.all([
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8")
]);

test("Health overview mirrors the five Home health summaries", () => {
  const start = app.indexOf("function renderHealthOverview(data, gymData = {})");
  const end = app.indexOf("async function loadHealthHistory", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);

  for (const key of ["habits", "kcal", "protein", "gym", "weight"]) {
    assert.match(renderer, new RegExp(`data-health-summary="${key}"`));
    assert.match(renderer, new RegExp(`id="health-summary-${key}-main"`));
  }

  assert.doesNotMatch(renderer, /nutritionChecks|activityChecks|nutritionDone|activityDone/);
  assert.match(renderer, /deriveGymTodaySummary\(data, gymData\)/);
  assert.match(renderer, /healthWeightSummary\(body, data\.date \|\| localDateKey\(\)\)/);
});

test("Home and Health share guarded weight trend semantics", () => {
  assert.match(app, /function healthWeightSummary\(body = \{\}, selectedDate = localDateKey\(\)\)/);
  assert.match(app, /currentDays >= 5 && previousDays >= 5/);
  assert.match(app, /const weightSummary = healthWeightSummary\(body, data\.date \|\| localDateKey\(\)\)/);
  assert.match(app, /cobertura " \+ weightSummary\.currentDays \+ "\/7 días"/);
  assert.match(app, /<small>Último peso<\/small>/);
  assert.match(app, /health-metric-freshness/);
});

test("Health summary layout supports five equal desktop metrics", () => {
  assert.match(css, /v0\.41\.6 — Health overview mirrors Home semantics/);
  assert.match(css, /\.health-dashboard-status\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.health-metric-freshness\s*\{/);
});
