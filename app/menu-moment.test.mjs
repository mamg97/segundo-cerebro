import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

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
  const headerEnd = app.indexOf("function renderHomeWeeklyMenu", headerStart);
  const header = app.slice(headerStart, headerEnd);
  assert.match(header, /<small>Subtotal <\/small>/);
});
