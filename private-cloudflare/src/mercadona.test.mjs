import test from "node:test";
import assert from "node:assert/strict";
import { mercadonaProductId, mercadonaImageUrl, fetchMercadonaReference } from "./mercadona.js";

test("external reference accepts only an exact official catalogue product URL", () => {
  assert.equal(mercadonaProductId("https://tienda.mercadona.es/product/123/sample"), "123");
  for (const url of ["http://tienda.mercadona.es/product/123", "https://tienda.mercadona.es.attacker.test/product/123", "https://user:secret@tienda.mercadona.es/product/123", "https://tienda.mercadona.es:444/product/123", "https://example.test/123", "javascript:alert(1)"]) {
    assert.equal(mercadonaProductId(url), null);
  }
  assert.equal(mercadonaImageUrl("https://prod-mercadona.imgix.net/images/sample.jpg"), "https://prod-mercadona.imgix.net/images/sample.jpg");
  assert.equal(mercadonaImageUrl("https://evil.test/image.jpg"), null);
});

test("public enrichment never sends private ingredient, stock or Google authorization", async () => {
  const result = await fetchMercadonaReference({ productUrl: "https://tienda.mercadona.es/product/991001/sample", notes: "private", nutrition: { kcal100g: 123 } }, async (url, options) => {
    assert.equal(url, "https://tienda.mercadona.es/api/products/991001/");
    assert.deepEqual(options.headers, { Accept: "application/json" });
    assert.equal(options.redirect, "error");
    assert.equal(options.body, undefined);
    return Response.json({ id: "991001", thumbnail: "https://prod-mercadona.imgix.net/images/sample.jpg", price_instructions: { unit_price: "2.25" } });
  });
  assert.equal(result.cataloguePrice.price, 2.25);
  assert.match(result.cataloguePrice.date, /^\d{4}-/);
  assert.equal(result.nutrition, undefined);
});

test("missing or mismatched public data does not fabricate an image or price", async () => {
  const wrong = await fetchMercadonaReference({ productUrl: "https://tienda.mercadona.es/product/991002/sample" }, async () => Response.json({ id: "different", thumbnail: "https://prod-mercadona.imgix.net/images/sample.jpg" }));
  assert.equal(wrong, null);
  const failure = await fetchMercadonaReference({ productUrl: "https://tienda.mercadona.es/product/991003/sample" }, async () => { throw new Error("unavailable"); });
  assert.equal(failure, null);
  const missing = await fetchMercadonaReference({ productUrl: "https://tienda.mercadona.es/product/991004/sample" }, async () => Response.json({ id: "991004", thumbnail: "https://evil.test/image.jpg", price_instructions: { unit_price: "" } }));
  assert.deepEqual(missing, { imageUrl: null, cataloguePrice: null });
});
