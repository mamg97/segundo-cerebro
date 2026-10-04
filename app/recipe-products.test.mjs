import test from "node:test";
import assert from "node:assert/strict";
import { resolveIngredientProduct } from "./recipe-products.js";
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
