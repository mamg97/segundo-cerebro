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


test("Health overview exposes a reliable thirty-day divergent calorie chart", () => {
  const start = app.indexOf("function renderHealthCalorieBalance(history = [])");
  const end = app.indexOf("function renderHealthOverview(data, gymData = {})", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);

  for (const label of ["Balance calórico", "Déficit · balance negativo", "Superávit · balance positivo"]) {
    assert.match(renderer, new RegExp(label));
  }
  assert.match(renderer, /\["full", "live"\]\.includes\(coverageQuality\)/);
  assert.match(renderer, /consumedEntryCount/);
  assert.match(renderer, /balance < 0/);
  assert.match(renderer, /balance > 0/);
  assert.doesNotMatch(renderer, /balance < -50|balance > 50/);
  assert.match(renderer, /health-calorie-chart-days/);
  assert.match(renderer, /data-balance=/);
  assert.match(renderer, /slice\(-30\)/);
  assert.match(renderer, /tabindex="0"/);
  assert.match(renderer, /Últimos 30 días/);
  assert.match(renderer, /level-\$\{barLevel\}/);
  assert.doesNotMatch(renderer, /style="height:/);
  assert.match(renderer, /Verde = déficit \(negativo\); rojo = superávit \(positivo\)/);
  assert.match(app, /renderHealthCalorieBalance\(data\.nutritionHistory \|\| \[\]\)/);

  assert.match(css, /\.health-calorie-balance-card\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
  assert.match(css, /\.health-calorie-chart-days\s*\{[\s\S]*?grid-template-columns:\s*repeat\(30, minmax\(24px, 1fr\)\)/);
  assert.match(css, /\.health-calorie-chart\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.health-calorie-bar\.is-deficit\s*\{[\s\S]*?background:\s*var\(--mint\)/);
  assert.match(css, /\.health-calorie-bar\.is-surplus\s*\{[\s\S]*?background:\s*var\(--coral\)/);
  assert.match(css, /\.health-calorie-zero-line\s*\{/);
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


test("Health adherence lives inside Summary instead of a top-level tab", () => {
  const openStart = app.indexOf("function openHealthDetail(options = {})");
  const overviewStart = app.indexOf("async function revealHealthAdherenceDetail", openStart);
  assert.ok(openStart >= 0 && overviewStart > openStart);
  const workspace = app.slice(openStart, overviewStart);

  assert.doesNotMatch(workspace, /data-health-tab="adherence"/);
  assert.doesNotMatch(workspace, /data-health-panel="adherence"/);

  const summaryStart = app.indexOf("function renderHealthOverview(data, gymData = {})");
  const summaryEnd = app.indexOf("async function loadHealthHistory", summaryStart);
  const summary = app.slice(summaryStart, summaryEnd);
  assert.match(summary, /health-adherence-overview-card/);
  assert.match(summary, /id="health-overview-adherence"/);
  assert.match(summary, /id="adherence-panel"/);
  assert.match(summary, /Seguimiento mensual/);

  const loadStart = app.indexOf("async function loadHealthOverview");
  const loadEnd = app.indexOf("function renderHealthCalorieBalance", loadStart);
  const loader = app.slice(loadStart, loadEnd);
  assert.match(loader, /await loadHealthAdherenceOverview()/);
  assert.ok(loader.includes('loadHealthHistory("365"'));
  assert.ok(loader.indexOf("await loadHealthAdherenceOverview()") < loader.indexOf('loadHealthHistory("365"'));
});
