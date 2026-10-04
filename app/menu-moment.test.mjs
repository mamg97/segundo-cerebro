import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

test("weekly menu folds dessert and snack into canonical parent meals", () => {
  assert.match(app, /function canonicalWeeklyMenuMoment\(item\)/);
  assert.match(app, /\^postre\\b/);
  assert.match(app, /return "Cena"/);
  assert.match(app, /\^snack\\b/);
  assert.match(app, /return "Media mañana"/);
  assert.match(app, /return "Merienda"/);
  assert.match(app, /\^cierre\\b/);
  assert.match(app, /canonicalWeeklyMenuMoment\(item\)/);
});

test("nutrition quick-add offers canonical meal moments only", () => {
  const start = app.indexOf('<select name="moment">');
  const end = app.indexOf("</select>", start);
  assert.ok(start >= 0 && end > start);
  const select = app.slice(start, end);
  for (const moment of ["Desayuno", "Media mañana", "Comida", "Merienda", "Cena", "Otro"]) {
    assert.ok(select.includes("<option>" + moment + "</option>"), "missing " + moment);
  }
  assert.doesNotMatch(select, /<option>Snack<\/option>|<option>Postre<\/option>|<option>Cierre<\/option>/);
});

test("daily nutrition grouping also folds legacy components", () => {
  const start = app.indexOf("function renderNutritionEntries(entries)");
  const end = app.indexOf("function renderNutritionHistory", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);
  assert.match(renderer, /canonicalWeeklyMenuMoment\(\{ moment: entry\.moment, itemName: entry\.itemName, note: entry\.note \}\)/);
  assert.doesNotMatch(renderer, /"Snack"|"Postre"|"Cierre"/);
});


test("incomplete grouped meals and day totals are labeled as known subtotals", () => {
  assert.match(app, /weekly-menu-group-subtotal/);
  assert.match(app, /Subtotal conocido/);
  const headerStart = app.indexOf("function renderHomeWeeklyMenuDayHeader");
  const headerEnd = app.indexOf("function renderHomeWeeklyMenu(data)", headerStart);
  const header = app.slice(headerStart, headerEnd);
  assert.match(header, /<small>Subtotal <\/small>/);
});


test("expanded menu meals deep-link to recipes and Pantry product cards", () => {
  assert.match(app, /data-menu-recipe-open=/);
  assert.match(app, /Abrir receta/);
  assert.match(app, /data-menu-product-open=/);
  assert.match(app, /Ver alimento en Despensa/);
  assert.match(app, /function bindMenuEntityLinks\(panel, data\)/);
  assert.match(app, /data-health-tab="recipes"/);
  assert.match(app, /backLabel: "← Volver al menú"/);
});

test("recipe detail can preserve a menu-specific return action", () => {
  const start = app.indexOf("function renderRecipeDetail(panel, data, recipe, options = {})");
  const end = app.indexOf("function renderRecipesPanel", start);
  assert.ok(start >= 0 && end > start);
  const detail = app.slice(start, end);
  assert.match(detail, /typeof options\.onBack === "function"/);
  assert.match(detail, /options\.backLabel \|\| "← Volver al recetario"/);
  assert.match(detail, /renderRecipeDetail\(panel, data, recipe, options\)/);
});


test("linked meals expose a large tappable title on the detailed mobile menu", () => {
  assert.match(app, /function renderWeeklyMenuItemTitle\(item, interactive = true\)/);
  assert.match(app, /weekly-menu-title-link/);
  assert.match(app, /data-menu-recipe-open=/);
  assert.match(app, /data-menu-product-open=/);
  assert.match(app, /renderWeeklyMenuItemTitle\(item, !compact\)/);
  assert.match(css, /\.weekly-menu-title-link\s*\{[\s\S]*?min-height:\s*40px/);
  assert.match(css, /touch-action:\s*manipulation/);
});


test("home weekly menu recipe names open the canonical recipe", () => {
  assert.match(app, /data-home-menu-recipe-open=/);
  assert.match(app, /function bindHomeWeeklyMenuRecipeLinks\(content, data\)/);
  assert.match(app, /function openHomeWeeklyMenuRecipe\(data, recipeId\)/);
  assert.match(app, /openHealthDetail\(\{ skipNutritionLoad: true \}\)/);
  assert.match(app, /backLabel: "← Volver al resumen"/);
  assert.match(app, /bindHomeWeeklyMenuRecipeLinks\(content, data\)/);
  assert.match(css, /\.home-weekly-menu-recipe-link\s*\{[\s\S]*?min-height:\s*40px/);
});

test("opening a recipe from Home does not race the regular nutrition loader", () => {
  const start = app.indexOf("function openHealthDetail(options = {})");
  const end = app.indexOf("async function loadHealthOverview", start);
  assert.ok(start >= 0 && end > start);
  const healthDetail = app.slice(start, end);
  assert.match(healthDetail, /options\.skipNutritionLoad !== true/);
});


test("Home renders a recipe link from recipe_id even when the light menu payload has no recipe object", () => {
  const start = app.indexOf("function renderHomeWeeklyMenuMatrixCell(items)");
  const end = app.indexOf("async function openHomeWeeklyMenuRecipe", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);
  assert.match(renderer, /const recipeId = String\(item\?\.recipeId \|\| ""\)\.trim\(\)/);
  assert.match(renderer, /const title = recipeId\s*\?/);
  assert.doesNotMatch(renderer, /recipeId && item\?\.recipe/);
  assert.match(renderer, /data-home-menu-recipe-open=/);
});

test("Home recipe navigation lazily loads the full nutrition payload when needed", () => {
  const start = app.indexOf("async function openHomeWeeklyMenuRecipe(data, recipeId)");
  const end = app.indexOf("function bindHomeWeeklyMenuRecipeLinks", start);
  assert.ok(start >= 0 && end > start);
  const opener = app.slice(start, end);
  assert.match(opener, /if \(!recipe\) \{/);
  assert.match(opener, /fetch\("\/api\/nutrition\?date="/);
  assert.match(opener, /HOME_RECIPE_NOT_FOUND/);
});
