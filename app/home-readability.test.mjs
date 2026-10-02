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

test("Home nutrition card exposes direct Menu and Recipes access", () => {
  assert.match(index, /id="home-nutrition-open"/);
  assert.match(index, /id="home-nutrition-menu"[^>]*>Menú<\/button>/);
  assert.match(index, /id="home-nutrition-recipes"[^>]*>Recetas<\/button>/);
  assert.match(app, /home-nutrition-menu/);
  assert.match(app, /openHealthTabFromHome\("menu"\)/);
  assert.match(app, /home-nutrition-recipes/);
  assert.match(app, /openHealthTabFromHome\("recipes"\)/);
  assert.match(css, /\.home-nutrition-links\s*\{/);
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
