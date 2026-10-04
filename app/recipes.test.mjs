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

test("recipe catalog renders compact image and name cards that open canonical detail", () => {
  assert.match(app, /data-recipe-open=/);
  assert.match(app, /class="recipe-card recipe-catalog-card"/);
  assert.match(app, /class="recipe-photo recipe-catalog-photo"/);
  assert.match(app, /function renderRecipeDetail\(panel, data, recipe, options = \{\}\)/);
  assert.match(app, /data-recipes-back/);
  assert.match(app, /class="recipe-card recipe-detail-card"/);
  assert.match(app, /class="recipe-detail-sections"/);
  assert.match(app, /class="recipe-section recipe-ingredients"/);
  assert.match(app, /class="recipe-section recipe-steps"/);
  assert.match(app, /Preparación pendiente de confirmar/);
  assert.match(app, /Pulsa una receta para abrir su ficha completa/);
  assert.match(app, /health-recipes/);
});

test("recipe catalog mirrors wardrobe density and detail stays responsive", () => {
  assert.match(css, /\.recipes-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.recipes-grid\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.recipes-grid\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 429px\)[\s\S]*?\.recipes-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.recipe-catalog-card > strong\s*\{[\s\S]*?-webkit-line-clamp:\s*3/);
  assert.match(css, /\.recipe-photo\s*\{[\s\S]*?aspect-ratio:\s*16 \/ 9/);
  assert.match(css, /\.recipe-photo img\s*\{[\s\S]*?object-fit:\s*contain[\s\S]*?object-position:\s*center/);
  assert.match(css, /\.recipe-detail-sections\s*\{[\s\S]*?grid-template-columns:\s*minmax\(220px, \.78fr\) minmax\(0, 1\.22fr\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.recipe-detail-sections\s*\{\s*grid-template-columns:\s*1fr/);
});

test("production audit validates catalog density, image loading and detail navigation", () => {
  assert.match(audit, /const recipeImages = panel\.locator\("\.recipe-card img"\)/);
  assert.match(audit, /scrollIntoViewIfNeeded/);
  assert.match(audit, /candidate\?\.complete && candidate\.naturalWidth > 0 && candidate\.naturalHeight > 0/);
  assert.match(audit, /Salud · Recetas carga foto visible/);
  assert.match(audit, /Salud · Recetas conserva foto completa/);
  assert.match(audit, /data-recipe-open/);
  assert.match(audit, /recipe-detail-card/);
  assert.match(audit, /data-recipes-back/);
  assert.match(audit, /Salud · Recetas abre ficha completa/);
  assert.match(audit, /Salud · Recetas vuelve al catálogo completo/);
});
