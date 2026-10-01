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

test("Home weekly menu uses readable day cards instead of the compressed matrix", () => {
  const start = app.indexOf("function renderHomeWeeklyMenu(data)");
  const end = app.indexOf("function renderNutritionEntries", start);
  assert.ok(start >= 0 && end > start);
  const renderer = app.slice(start, end);
  assert.match(renderer, /class="home-weekly-menu-grid"/);
  assert.match(renderer, /class="home-weekly-menu-day/);
  assert.doesNotMatch(renderer, /home-weekly-menu-table-scroll|home-weekly-menu-table-cell|weeklyMenuMatrixMoments/);
  assert.match(renderer, /groupWeeklyMenuItemsByMoment\(day\.items\)/);
});

test("shared readability pass keeps larger text and responsive menu cards", () => {
  assert.match(css, /v0\.40\.19 — global readability and Home weekly-menu repair/);
  assert.match(css, /body\s*\{\s*font-size:\s*14px/);
  assert.match(css, /\.section-heading h2\s*\{[\s\S]*?font-size:\s*22px/);
  assert.match(css, /\.home-weekly-menu-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(230px, 1fr\)\)/);
  assert.match(css, /\.home-weekly-menu-day > header strong\s*\{[\s\S]*?font-size:\s*14px/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.home-weekly-menu-grid\s*\{\s*grid-template-columns:\s*1fr/);
});
