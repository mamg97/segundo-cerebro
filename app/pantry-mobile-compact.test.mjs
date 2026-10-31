import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { requestedPantryView, pantryShoppingRowMarkup } from "./pantry.js";

test("the first mobile shopping tap selects compra even before cache refresh", () => {
  assert.equal(requestedPantryView("inventory", "#/despensa/compra"), "shopping");
  assert.equal(requestedPantryView("inventory", "#/despensa/tickets"), "tickets");
  assert.equal(requestedPantryView("shopping", "#/despensa/inventario"), "inventory");
  assert.equal(requestedPantryView("shopping", "#/despensa"), "inventory");
  assert.equal(requestedPantryView("shopping", "#/inicio"), "shopping");
  assert.equal(requestedPantryView("bad-value", "#/inicio"), "inventory");
});

test("shopping item keeps data and controls, but removes redundant labels", () => {
  const markup = pantryShoppingRowMarkup({
    productId: "demo-one",
    name: "Café descafeinado ficticio",
    state: "COMPRAR",
    targetQuantity: null,
    targetUnit: "",
    reason: "",
    estimatedCost: null
  });
  assert.match(markup, /Café descafeinado ficticio/);
  assert.match(markup, /Sin precio/);
  assert.match(markup, /data-shopping-available="demo-one"/);
  assert.match(markup, /aria-label="Ya está en despensa:/);
  assert.doesNotMatch(markup, /COMPRAR|Cantidad por definir|Sin motivo/);

  const withQuantity = pantryShoppingRowMarkup({
    name: "Patatas de prueba",
    state: "COMPRAR",
    targetQuantity: 2,
    targetUnit: "kg",
    reason: "Menú"
  });
  assert.match(withQuantity, /2 kg · Menú/);
});

test("mobile compact layout preserves close control, product photos and actions", async () => {
  const [mobileCss, pantryJs] = await Promise.all([
    readFile(new URL("./mobile-navigation.css", import.meta.url), "utf8"),
    readFile(new URL("./pantry.js", import.meta.url), "utf8")
  ]);
  assert.match(mobileCss, /#detail-dialog\.pantry-dialog\[open\]:not\(\.wealth-dialog\)\{[\s\S]*?padding-top:8px!important/);
  assert.match(mobileCss, /\.pantry-shopping-list-item\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 44px/);
  assert.match(mobileCss, /\.pantry-product-thumb\[data-photo="pending"\]\{[\s\S]*?display:none/);
  assert.match(mobileCss, /\.pantry-confirm-label\{display:none\}/);
  assert.match(mobileCss, /\.pantry-review-item\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(pantryJs, /data-pantry-active-view/);
  assert.match(pantryJs, /requestedPantryView\(cached \? pantryActiveView : requestedView\)/);
  assert.match(pantryJs, /data-shopping-add-toggle/);
});
