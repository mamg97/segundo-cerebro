import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, css, audit] = await Promise.all([
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8")
]);

test("Health exposes a recipes tab backed by nutrition data", () => {
  assert.match(app, /data-health-tab="recipes">Recetas/);
  assert.match(app, /data-health-panel="recipes"/);
  assert.match(app, /id="recipes-panel"/);
  assert.match(app, /function renderRecipesPanel\(data\)/);
  assert.match(app, /renderRecipesPanel\(payload\)/);
  assert.match(app, /Array\.isArray\(data\?\.recipes\)/);
});

test("recipe cards render photo, ingredients and confirmed preparation", () => {
  assert.match(app, /class="recipe-photo"/);
  assert.match(app, /recipe\.photoUrl/);
  assert.match(app, /class="recipe-section recipe-ingredients"/);
  assert.match(app, /class="recipe-section recipe-steps"/);
  assert.match(app, /Preparación pendiente de confirmar/);
  assert.match(app, /Los pasos pendientes no se completan por inferencia/);
  assert.match(app, /health-recipes/);
});

test("recipe book remains responsive and readable", () => {
  assert.match(css, /\.recipes-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.recipe-photo\s*\{[\s\S]*?aspect-ratio:\s*16 \/ 9/);
  assert.match(css, /\.recipe-photo img\s*\{[\s\S]*?object-fit:\s*contain[\s\S]*?object-position:\s*center/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.recipes-grid\s*\{\s*grid-template-columns:\s*1fr/);
});


test("production audit scrolls lazy recipe photos into view before judging load state", () => {
  assert.match(audit, /const recipeImages = panel\.locator\("\.recipe-card img"\)/);
  assert.match(audit, /scrollIntoViewIfNeeded/);
  assert.match(audit, /candidate\?\.complete && candidate\.naturalWidth > 0 && candidate\.naturalHeight > 0/);
  assert.match(audit, /Salud · Recetas carga foto visible/);
});
