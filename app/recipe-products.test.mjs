import test from "node:test";
import assert from "node:assert/strict";
import { resolveIngredientProduct, unresolvedIngredientProduct } from "./recipe-products.js";
import {readFileSync} from "node:fs";
import { renderProductDetail } from "./pantry.js";

test("ingredient identity uses a stable ID and never fuzzy-matches a different product", () => {
  const products = [{ id: "a", name: "Queso" }, { id: "b", name: "Queso light" }];
  assert.equal(resolveIngredientProduct({ productId: "b", name: "Queso" }, products).id, "b");
  assert.equal(resolveIngredientProduct({ productId: "missing", name: "Queso" }, products), null);
  assert.equal(resolveIngredientProduct({ name: "QUESO" }, products).id, "a");
  assert.equal(resolveIngredientProduct({ name: "Queso", }, [...products, { id: "c", name: "queso" }]), null);
  assert.equal(resolveIngredientProduct({ name: "Queso fresco" }, products), null);
});

test("product card preserves ingredient context, unknown values, dates and a safe return action", () => {
  let callback;
  const container = { innerHTML: "", querySelector(selector) { return selector === "#pantry-back" ? { addEventListener(event, fn) { callback = fn; } } : null; } };
  const onBack = () => {};
  renderProductDetail({ name: "<script>bad</script>", nutrition: { kcal100g: 0 }, productUrl: "javascript:alert(1)", latestPrice: { price: 2.25, date: "2026-01-03", source: "Ticket", priceBase: "envase" } }, { summary: { currency: "EUR" } }, { container, onBack, backLabel: "← Volver a la receta", ingredient: { name: "sample", recipeName: "fictitious", amount: "30 g", kcal: null, protein: 0 } });
  assert.equal(callback, onBack);
  assert.match(container.innerHTML, /← Volver a la receta/);
  assert.match(container.innerHTML, /Cantidad registrada/);
  assert.match(container.innerHTML, /Kcal: Pendiente · Proteína: 0 g/);
  assert.match(container.innerHTML, /por 100 g/);
  assert.match(container.innerHTML, /envase · 3 ene · Ticket/);
  assert.doesNotMatch(container.innerHTML, /href="javascript:|<script>/);
  assert.match(container.innerHTML, /Imagen pendiente/);
  assert.match(container.innerHTML, /Enlace comercial pendiente/);
});

test("Pantry outage fallback never invents a commercial match, price or nutrition facts", () => {
  const item = unresolvedIngredientProduct({
    name: "Example fruit", note: "Synthetic example", kcal: 250, protein: 20
  });
  assert.deepEqual(item, {name: "Example fruit", notes: "Synthetic example", nutrition: {}});
  const src = readFileSync(new URL("./recipe-products.js", import.meta.url), "utf8");
  assert.match(src, /new AbortController\(\)/);
  assert.match(src, /REQUEST_TIMEOUT_MS = 9000/);
  assert.match(src, /ingredientPantryState = "fallback"/);
  assert.match(src, /if \(!loading\.isConnected\) return/);
  assert.match(src, /Ficha comercial detallada temporalmente no disponible/);
});

test("nutrition refresh preserves active recipe/ingredient navigation without mutating the canonical model", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /recipeView\?\.querySelector\("\.recipe-detail-card, \[data-ingredient-back\], \[data-ingredient-detail\]"\)/);
  assert.match(app, /panel\.dataset\.ingredientPantryState = "module-error"/);
});

test("ingredient opens a cancelable loading view before any asynchronous lazy import", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const view = app.indexOf('panel.dataset.ingredientPantryState = "loading";');
  const lazy = app.indexOf('import("./recipe-products.js?v=0.42.2")');
  assert.ok(view > 0 && lazy > view);
  assert.match(app, /data-recipe-ingredient-pending/);
  assert.match(app, /INGREDIENT_MODULE_TIMEOUT/);
  assert.match(app, /if \(!pending\?\.isConnected\) return/);
  assert.match(app, /clearTimeout\(timer\)/);
  assert.match(app, /data-ingredient-retry/);
});

test("recipe ingredient handling is delegated to a stable panel with cancellable listeners", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /const recipeIngredientClickControllers = new WeakMap\(\)/);
  assert.match(app, /recipeIngredientClickControllers\.get\(panel\)\?\.abort\(\)/);
  assert.match(app, /panel\.dataset\.recipeIngredientHandler = "delegated"/);
  assert.match(app, /panel\.addEventListener\("click", async \(event\) =>/);
  assert.match(app, /event\.target\?\.closest\?\.\("\[data-recipe-ingredient\]"\)/);
  assert.match(app, /capture: true, signal: clickController\.signal/);
  assert.match(app, /ingredientPantryState = "invalid-reference"/);
  assert.doesNotMatch(app, /panel\.querySelectorAll\("\[data-recipe-ingredient\]"\)\.forEach/);
});

test("production audit selects buttons inside real recipe ingredient rows", () => {
  const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");
  assert.match(audit, /\.recipe-detail-card \.recipe-ingredients li \[data-recipe-ingredient\]/);
  assert.match(audit, /OUTSIDE_RECIPE_ROWS/);
  assert.match(audit, /INVALID_INGREDIENT_INDEX/);
});
