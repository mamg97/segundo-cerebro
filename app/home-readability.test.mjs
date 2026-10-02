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

test("Home Health card uses four progress rings plus static weight", () => {
  assert.match(index, /id="home-health-card"/);
  assert.doesNotMatch(index, /id="home-habits-card"|id="home-nutrition-card"/);
  for (const id of ["habits", "kcal", "protein", "gym", "weight"]) {
    assert.match(index, new RegExp(`id="home-health-${id}-main"`));
  }
  for (const id of ["habits", "kcal", "protein", "gym"]) {
    assert.match(index, new RegExp(`id="home-health-${id}-ring"`));
  }
  assert.doesNotMatch(index, /id="home-health-weight-ring"/);
  assert.match(index, /class="home-health-metric home-health-weight-metric"/);
  assert.doesNotMatch(index, /home-health-activity-main|home-health-macros-main/);
  for (const label of ["Resumen", "Hábitos", "Médicos", "Gimnasio", "Nutrición", "Recetas", "Menú"]) {
    assert.ok(index.includes(">" + label + "</button>"), "Missing Health shortcut: " + label);
  }
  assert.match(app, /async function renderHomeHealthCard\(\)/);
  assert.match(app, /function renderHomeGymSummary/);
  assert.match(app, /home-health-medical/);
  assert.match(app, /openHealthTabFromHome\("recipes"\)/);
  assert.match(css, /\.home-health-card\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
  assert.match(css, /v0\.41\.4 — compact balanced Home \+ unified typography/);
  assert.match(css, /\.home-health-metrics\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.home-health-links\s*\{[\s\S]*?justify-content:\s*flex-start/);
});

test("Home Health shows freshness, brief Gym status and latest real weight", () => {
  for (const id of ["habits", "kcal", "protein", "gym", "weight"]) {
    assert.match(index, new RegExp(`id="home-health-${id}-updated"`));
  }
  assert.match(app, /function shortHomeGymReason/);
  assert.match(app, /Recuperación médica/);
  assert.match(app, /const latestWeightSample = body\.weightToday \|\| weightSamples\.at\(-1\)/);
  assert.doesNotMatch(app, /const displayedWeight = weightToday \?\? weightAverage/);
  assert.match(app, /latestWeightSample\?\.source/);
  assert.match(css, /\.home-health-updated\s*\{/);
  assert.match(css, /-webkit-line-clamp:\s*2/);
});

test("Home lower cards are compact and expose section shortcuts", () => {
  for (const id of [
    "home-pantry-inventory", "home-shopping-list",
    "home-objects-inventory", "home-objects-wardrobe-link", "home-objects-looks", "home-objects-kits",
    "home-wealth-detail", "home-wealth-evolution", "home-wealth-midas",
    "home-debt-detail", "home-debt-credit"
  ]) {
    assert.match(index, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(index, /class="credit-panel"/);
  assert.match(app, /home-debt-credit-summary/);
  assert.match(app, /no se suma de nuevo al total/);
  assert.match(css, /#home-pantry-card,[\s\S]*?#home-objects-card\s*\{[\s\S]*?height:\s*100% !important[\s\S]*?align-self:\s*stretch !important/);
  assert.match(css, /\.money-horizon\s*\{[\s\S]*?align-items:\s*stretch !important[\s\S]*?grid-auto-rows:\s*auto !important/);
  assert.match(css, /\.home-card-links\s*\{/);
  assert.doesNotMatch(css, /Iowan Old Style/);
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
