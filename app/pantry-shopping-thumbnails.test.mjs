import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { pantryShoppingRowMarkup } from "./pantry.js";
import { buildPayload } from "../private-cloudflare/src/pantry.js";

test("a shopping item displays only its matching canonical product image", () => {
  const img = "https://prod-mercadona.imgix.net/images/fake-example.jpg?fit=crop&h=600&w=600";
  const markup = pantryShoppingRowMarkup({
    productId: "demo-product",
    name: "Producto inventado",
    familyName: "producto familiar",
    imageUrl: img,
    productUrl: "https://tienda.mercadona.es/product/9999/producto-ficticio",
    state: "COMPRAR",
    targetQuantity: 2,
    targetUnit: "paquetes",
    estimatedCost: 4
  });
  assert.match(markup, /class="pantry-shopping-row is-link"/);
  assert.match(markup, /class="pantry-product-thumb" data-photo="available"/);
  assert.match(markup, /fake-example\.jpg\?fit=crop&amp;h=600&amp;w=600/);
  assert.match(markup, /alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/);
  assert.match(markup, /class="pantry-shopping-info"/);
  assert.match(markup, /producto familiar/);
  assert.match(markup, /2 paquetes/);
  assert.match(markup, /state-comprar/);
  assert.match(markup, /tienda\.mercadona\.es\/product\/9999/);
});

test("shopping rows with missing, unsafe, or unlinked photos show a visible placeholder", () => {
  for (const url of [null, "", "http://insecure.invalid/a.png", "javascript:alert(1)"]) {
    const markup = pantryShoppingRowMarkup({
      name: "Nombre familiar",
      imageUrl: url,
      productUrl: "https://tienda.mercadona.es/product/12345/producto",
      state: "COMPRAR"
    });
    assert.match(markup, /data-photo="pending"/);
    assert.match(markup, /Sin foto/);
    assert.doesNotMatch(markup, /<img/);
  }
});

test("shopping API forwards the photo of an exact producto_id even with no current inventory", () => {
  const imageUrl = "https://example.com/identified-product.jpg";
  const payload = buildPayload([
    {values:[
      ["producto_id","nombre_canonico","imagen_url","url_producto","nombres_familiares"],
      ["prod-one","Demo product",imageUrl,"https://tienda.mercadona.es/product/11111/demo","demo alias"]
    ]},
    {values:[["inventario_id","producto_id"]]},
    {values:[["producto_id","precio"]]},
    {values:[["fecha","ticket"]]},
    {values:[
      ["producto_id","nombre","estado","cantidad_objetivo","unidad"],
      ["prod-one","demo alias","COMPRAR",1,"pack"]
    ]}
  ]);
  assert.equal(payload.items.length, 0);
  assert.equal(payload.shoppingList[0].imageUrl, imageUrl);
  assert.equal(payload.shoppingList[0].productUrl, "https://tienda.mercadona.es/product/11111/demo");
  assert.equal(payload.shoppingList[0].state, "COMPRAR");
});

test("mobile layout has thumbnail, title, state and price without hiding content", async () => {
  const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("./pantry.js", import.meta.url), "utf8");
  assert.match(css, /\.pantry-shopping-row\.is-link > \.pantry-product-thumb/);
  assert.match(css, /\.pantry-shopping-row\.is-link > \.pantry-shopping-info/);
  assert.match(css, /\.pantry-shopping-row\.is-link > \.purchase-state/);
  assert.match(css, /\.pantry-shopping-row\.is-link > \.pantry-shopping-price/);
  assert.match(css, /grid-template-columns:\s*44px minmax\(0, 1fr\) auto/);
  assert.match(app, /body\.querySelectorAll\("\.pantry-product-thumb img"\)/);
  assert.match(app, /pantryShoppingRowMarkup\(item, currency\)/);
});
