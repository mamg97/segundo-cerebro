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
  assert.match(app, /Pulsa una receta para ver su ficha, modificarla o archivarla/);
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


test("recetario filtra por ingrediente y mantiene las fotos primero",()=>{
  assert.match(app,/recipeCatalogItems\(recipes, selectedIngredient, selectedCategory, archived\)/);
  assert.match(app,/recipeIngredientChoices\(visibleCollection\)/);
  assert.match(app,/data-recipe-ingredient-select/);
  assert.match(css,/\.recipes-filter-controls/);
  assert.match(audit,/Salud · Recetas ordena primero las que tienen imagen/);
  assert.match(audit,/Salud · Recetas selector de ingredientes filtra por filas canónicas/);
  assert.match(audit,/Salud · Recetas restaura filtro Todos/);
});


test("recipe product drill-down audit uses original canonical identity, not first photo-sorted tile",()=>{
  assert.match(audit,/firstCanonicalRecipe = healthNutritionSnapshot\?\.recipes\?\.\[0\]\?\.id/);
  assert.match(audit,/canonicalIndex = await catalogCards\.evaluateAll/);
  assert.match(audit,/catalogCards\.nth\(Math\.max\(0, canonicalIndex\)\)\.click\(\)/);
  assert.match(audit,/RECIPE_CATALOG_DIAG/);
});


test("catalog card shows separate Modify and Delete controls on active private recipes", () => {
  assert.match(app, /<article class="recipe-catalog-item">/);
  assert.match(app, /<button class="recipe-card recipe-catalog-card" type="button"/);
  assert.match(app, /<\/button>\s*\$\{!archived && privateModeKind === "remote" \?/);
  assert.match(app, /class="recipe-catalog-actions"/);
  assert.match(app, /data-recipe-card-edit="\$\{escapeHtml\(recipe\.id \|\| ""\)\}"/);
  assert.match(app, /data-recipe-card-delete="\$\{escapeHtml\(recipe\.id \|\| ""\)\}"/);
  assert.match(app, /aria-label="Modificar \$\{escapeHtml\(recipe\.name \|\| "Receta"\)\}"/);
  assert.match(app, /aria-label="Eliminar \$\{escapeHtml\(recipe\.name \|\| "Receta"\)\}"/);
  // The main button closes before its sibling action controls; no nested buttons.
  const start = app.indexOf('<article class="recipe-catalog-item">');
  const end = app.indexOf('</article>', start);
  assert.ok(start >= 0 && end > start);
  const card = app.slice(start, end);
  const mainEnd = card.indexOf('</button>');
  const actionsStart = card.indexOf('class="recipe-catalog-actions"');
  assert.ok(mainEnd >= 0 && actionsStart > mainEnd);
  assert.match(css, /\.recipe-catalog-actions\s*\{\s*display:\s*grid/);
  assert.match(css, /\.recipe-catalog-action\s*\{[\s\S]*?min-height:\s*36px/);
});

test("card Modify opens editor directly and Delete reuses historical-safe soft-delete", () => {
  const editBinding = app.indexOf('panel.querySelectorAll("[data-recipe-card-edit]")');
  const deleteBinding = app.indexOf('panel.querySelectorAll("[data-recipe-card-delete]")');
  assert.ok(editBinding >= 0 && deleteBinding > editBinding);
  const handlers = app.slice(editBinding, app.indexOf('\nfunction renderNutritionEntries', deleteBinding));
  assert.match(handlers, /recipes\.find\(candidate => String\(candidate\.id \|\| ""\) === String\(button\.dataset\.recipeCardEdit \|\| ""\)\)/);
  assert.match(handlers, /renderRecipeEditor\(panel, recipe/);
  assert.match(handlers, /onBack: \(\) => renderRecipesPanel\(data\)/);
  assert.match(handlers, /onSaved: refreshRecipeCatalog/);
  assert.match(handlers, /deleteRecipeFromCatalog\(recipe, refreshRecipeCatalog\)/);
  assert.match(handlers, /if \(!recipe \|\| archived \|\| privateModeKind !== "remote"/);
  assert.match(handlers, /button\.disabled = true/);
  assert.match(handlers, /role", "alert"/);
  assert.doesNotMatch(handlers, /\/api\/nutrition\/recipes\/edit/);
});
