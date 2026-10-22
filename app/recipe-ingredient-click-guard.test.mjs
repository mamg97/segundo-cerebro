import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveRecipeIngredientButton } from "./recipe-ingredient-click-guard.mjs";

function makePanel(button, detailActive = true) {
  // The panel's data-recipe-ingredient is the catalogue filter, not an
  // ingredient link. This collision caused camera/gallery clicks to erase
  // the editor and display "Ingrediente no encontrado".
  return {
    dataset: { recipeIngredient: "" },
    querySelector: (selector) => selector === ".recipe-detail-card" && detailActive
      ? { contains: (candidate) => candidate === button }
      : null
  };
}
test("ingredient clicks only resolve inside the visible recipe detail", () => {
  const button = { getAttribute: () => "0" };
  const panel = makePanel(button);
  const target = { closest: (selector) => selector === "button.recipe-ingredient-link[data-recipe-ingredient]" ? button : null };
  assert.equal(resolveRecipeIngredientButton(target, panel), button);
  assert.equal(resolveRecipeIngredientButton(target, makePanel(button, false)), null);
  assert.equal(resolveRecipeIngredientButton(target, makePanel({})), null);
});
test("iOS gallery/camera interaction must not match the panel filter attribute", () => {
  const filterPanel = { dataset: { recipeIngredient: "" }, querySelector: () => ({contains: () => true}) };
  // A broad [data-recipe-ingredient] selector returns the ancestor panel.
  const camera = { closest: (selector) => selector === "[data-recipe-ingredient]" ? filterPanel : null };
  assert.equal(resolveRecipeIngredientButton(camera, filterPanel), null);
  assert.equal(resolveRecipeIngredientButton(null, filterPanel), null);
});
test("an async Nutrition refresh keeps the photo editor mounted", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /recipeView\?\.querySelector\("[^"]*\.recipe-edit-form/);
  assert.match(app, /resolveRecipeIngredientButton\(event\.target, panel\)/);
  assert.match(app, /recipeIngredientClickControllers\.get\(panel\)\?\.abort\(\);\s*recipeIngredientClickControllers\.delete\(panel\);\s*renderRecipeEditor/);
  assert.doesNotMatch(app, /event\\.target\\?\\.closest\\?\\.\\("\\[data-recipe-ingredient\\]"\\)/);
});
