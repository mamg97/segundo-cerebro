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
  assert.match(css, /v0\.41\.5 — Health overview mirrors Home semantics/);
  assert.match(css, /\.health-dashboard-status\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.health-metric-freshness\s*\{/);
});


test("Health overview exposes a reliable seven-day calorie balance table", () => {
  const start = app.indexOf("function renderHealthCalorieBalance(history = [])");
  const end = app.indexOf("function renderHealthOverview(data, gymData = {})", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);

  for (const label of ["Balance calórico", "Gasto", "Ingesta", "Diferencia", "Estado"]) {
    assert.match(renderer, new RegExp(label));
  }
  assert.match(renderer, /\["full", "live"\]\.includes\(coverageQuality\)/);
  assert.match(renderer, /consumedEntryCount/);
  assert.match(renderer, /Diferencia = ingesta − gasto total/);
  assert.match(app, /renderHealthCalorieBalance\(data\.nutritionHistory \|\| \[\]\)/);
  assert.match(css, /\.health-calorie-balance-card\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
  assert.match(css, /\.health-calorie-table-wrap\s*\{[\s\S]*?overflow-x:\s*auto/);
});


test("Health workspace lazy-loads heavy tabs and avoids duplicate startup reads", () => {
  const openStart = app.indexOf("function openHealthDetail(options = {})");
  const overviewStart = app.indexOf("async function loadHealthOverview", openStart);
  assert.ok(openStart >= 0 && overviewStart > openStart);
  const openBlock = app.slice(openStart, overviewStart);
  assert.match(openBlock, /void loadHealthOverview\(localDateKey\(\)\)/);
  assert.doesNotMatch(openBlock, /void loadMedicalAppointments\(\)/);
  assert.doesNotMatch(openBlock, /void loadGymPanel\(\)/);
  assert.doesNotMatch(openBlock, /loadNutritionPanel\(localDateKey\(\)\)/);

  const overviewEnd = app.indexOf("function renderHealthCalorieBalance", overviewStart);
  const overviewBlock = app.slice(overviewStart, overviewEnd);
  assert.match(overviewBlock, /fetch\("\/api\/health\/overview\?date="/);
  assert.doesNotMatch(overviewBlock, /fetch\("\/api\/gym"/);

  const tabsStart = app.indexOf("function bindHealthTabs()");
  const tabsEnd = app.indexOf("function renderMedicalSection", tabsStart);
  const tabsBlock = app.slice(tabsStart, tabsEnd);
  assert.match(tabsBlock, /tab === "gym"/);
  assert.match(tabsBlock, /ensureHealthNutritionPanels\(localDateKey\(\)\)/);
  assert.match(tabsBlock, /\["nutrition", "recipes", "menu"\]\.includes\(tab\)/);
});
