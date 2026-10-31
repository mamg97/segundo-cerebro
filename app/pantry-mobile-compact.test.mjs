import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pantryShoppingRowMarkup} from "./pantry.js";

const source=(name)=>readFileSync(new URL(name,import.meta.url),"utf8");

test("the first Pantry load honors Compra even when there is no cached payload",()=>{
  const pantry=source("./pantry.js");
  const app=source("./app.js");
  assert.match(pantry,/const requestedView = normalizePantryView\(initialView\);/);
  assert.match(pantry,/pantryActiveView = requestedView;/);
  assert.match(pantry,/if\(cached\) renderWorkspace\(cached, requestedView\);/);
  assert.match(pantry,/renderWorkspace\(result.value, pantryActiveView\);/);
  assert.match(app,/openPantryDetail\(routedPantryTabId==="compra"\?"shopping"/);
  assert.match(app,/window.location.hash===hash && hash===hrefForPantryTab\("compra"\)/);
  assert.match(app,/void openPantryDetail\("shopping"\);/);
});

test("purchase rows drop placeholder explanations but keep price and confirmation",()=>{
  const row=pantryShoppingRowMarkup({
    productId:"fixture-123",
    name:"Producto ficticio",
    state:"COMPRAR",
    estimatedCost:2.5
  });
  assert.match(row,/Producto ficticio/);
  assert.match(row,/pantry-shopping-price/);
  assert.match(row,/data-shopping-available="fixture-123"/);
  assert.match(row,/✓ En casa/);
  assert.doesNotMatch(row,/Cantidad por definir|Sin motivo/);
});

test("mobile Pantry is compact while retaining inventory, tickets, source link and desktop",()=>{
  const css=source("./pantry-mobile-compact.css");
  const page=source("./index.html");
  const pantry=source("./pantry.js");
  assert.match(css,/@media \(max-width: 760px\)/);
  assert.match(css,/\.pantry-shopping-list-item/);
  assert.match(css,/grid-template-columns: minmax\(0,1fr\) auto/);
  assert.match(css,/\.pantry-shopping-list-item \.pantry-confirm-inventory/);
  assert.match(css,/min-height: 40px/);
  assert.match(css,/\.pantry-shopping-review/);
  assert.match(css,/#detail-dialog\.pantry-dialog\[open\]:not\(\.wealth-dialog\) \{[\s\S]*?padding-top: 8px !important/);
  assert.match(css,/#detail-dialog\.pantry-dialog\[open\]:not\(\.wealth-dialog\)::before/);
  assert.match(css,/\.pantry-shopping-list-item \.pantry-confirm-inventory::after/);
  assert.match(css,/\.pantry-shopping-row\.is-link:has\(>\.pantry-product-thumb\[data-photo="pending"\]\)/);
  assert.doesNotMatch(css,/@media \(min-width:/);
  assert.match(page,/pantry-mobile-compact\.css\?v=0\.1\.1/);
  assert.match(page,/app\.js\?v=0\.44\.111/);
  assert.match(pantry,/data-pantry-view="inventory"/);
  assert.match(pantry,/data-pantry-view="tickets"/);
  assert.match(pantry,/Maestro de productos/);
  assert.doesNotMatch(pantry,/Fuente actual: ListaCompra de Segundo Cerebro/);
  assert.match(pantry,/const requestedView = normalizePantryView/);
});
