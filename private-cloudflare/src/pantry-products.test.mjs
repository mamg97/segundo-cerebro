import test from "node:test";
import assert from "node:assert/strict";
import { buildPayload } from "./pantry.js";

test("catalogue-only products retain dated prices, images and unknown macros without inventing stock", () => {
  const payload = buildPayload([
    { values: [["producto_id", "nombre_canonico", "kcal_100g", "proteinas_g_100", "imagen_url"], ["sample", "Fictitious product", 0, "", "https://example.test/image.jpg"]] },
    { values: [] },
    { values: [["producto_id", "precio", "fecha_precio", "fuente", "ticket_id"], ["sample", 2, "2026-01-02", "ticket", "receipt"], ["sample", 1.5, "2026-01-01", "catalogue", ""]] }
  ]);
  assert.equal(payload.items.length, 0);
  const product = payload.products[0];
  assert.equal(product.latestPrice.price, 2);
  assert.equal(product.lastPurchaseDate, "2026-01-02");
  assert.equal(product.nutrition.kcal100g, 0);
  assert.equal(product.nutrition.protein100g, null);
  assert.equal(product.imageUrl, "https://example.test/image.jpg");
  assert.equal(product.stockStatus, undefined);
});
