import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, app, css] = await Promise.all([
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8")
]);

test("Home no longer renders the unused Próximos movimientos block", () => {
  assert.doesNotMatch(index, /Próximos movimientos/);
  assert.doesNotMatch(index, /id="focus-overview"|id="focus-list"|id="loop-count"|id="focus-goals"/);
  assert.doesNotMatch(app, /\brenderFocus\(\);/);
  assert.match(index, /aria-label="Agenda semanal"/);
});

test("Home weekly menu keeps a readable meal-by-day matrix", () => {
  const start = app.indexOf("function renderHomeWeeklyMenu(data)");
  const end = app.indexOf("function renderNutritionEntries", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);
  assert.match(renderer, /home-weekly-menu-table-scroll/);
  assert.match(renderer, /home-weekly-menu-table-cell/);
  assert.match(renderer, /weeklyMenuMatrixMoments\(model\.days\)/);
  assert.match(renderer, /renderHomeWeeklyMenuDayHeader\(day, model\)/);
  assert.match(renderer, /renderHomeWeeklyMenuMatrixCell\(rows\)/);
  assert.doesNotMatch(renderer, /class="home-weekly-menu-grid"/);
});

test("Home uses primary-only top navigation and keeps the orb without quick query", () => {
  assert.doesNotMatch(index, /id="ask-form"|id="ask-input"|id="query-submit"/);
  assert.match(index, /id="system-orb"/);
  assert.match(css, /\.sidebar\s*\{[\s\S]*?position:\s*sticky[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(css, /\.area-nav\s*\{[\s\S]*?flex-direction:\s*row[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.nav-subnav,[\s\S]*?\.nav-link-child\s*\{[\s\S]*?display:\s*none !important/);
  assert.doesNotMatch(app, /<div class="nav-subnav"/);
});

test("Home Health card uses five circular daily summaries", () => {
  assert.match(index, /id="home-health-card"/);
  assert.doesNotMatch(index, /id="home-habits-card"|id="home-nutrition-card"/);
  for (const id of ["habits", "kcal", "protein", "gym", "weight"]) {
    assert.match(index, new RegExp(`id="home-health-${id}-main"`));
    assert.match(index, new RegExp(`id="home-health-${id}-ring"`));
  }
  assert.doesNotMatch(index, /home-health-activity-main|home-health-macros-main/);
  for (const label of ["Resumen", "Hábitos", "Médicos", "Gimnasio", "Nutrición", "Recetas", "Menú"]) {
    assert.ok(index.includes(">" + label + "</button>"), "Missing Health shortcut: " + label);
  }
  assert.match(app, /async function renderHomeHealthCard\(\)/);
  assert.match(app, /function renderHomeGymSummary/);
  assert.match(app, /home-health-medical/);
  assert.match(app, /openHealthTabFromHome\("recipes"\)/);
  assert.match(css, /\.home-health-card\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
  assert.match(css, /v0\.41\.1 — circular daily Health summary/);
  assert.match(css, /\.home-health-metrics\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.home-health-links\s*\{[\s\S]*?justify-content:\s*flex-start/);
});

test("weekly matrix is larger but remains compact and internally scrollable", () => {
  assert.match(css, /v0\.40\.20 — readable weekly matrix \+ private recipe book/);
  assert.match(css, /body\s*\{\s*font-size:\s*14px/);
  assert.match(css, /\.home-weekly-menu-table-scroll\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.home-weekly-menu-table\s*\{[\s\S]*?grid-template-columns:\s*118px repeat\(7, minmax\(160px, 1fr\)\)/);
  assert.match(css, /\.home-weekly-menu-table-cell \.weekly-menu-group-item-copy strong\s*\{[\s\S]*?font-size:\s*10\.5px/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(min-width: 1560px\)[\s\S]*?min-width:\s*0/);
});
