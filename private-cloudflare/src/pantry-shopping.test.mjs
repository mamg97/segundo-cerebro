import assert from "node:assert/strict";
import test from "node:test";
import { buildPayload } from "./pantry.js";

test("shopping payload exposes exact household alias and canonical product URL", () => {
  const payload = buildPayload([
    {
      values: [
        ["producto_id", "nombre_canonico", "marca", "comercio", "categoria", "formato", "ean", "url_producto", "kcal_100g", "proteinas_g_100", "carbohidratos_g_100", "grasas_g_100", "fuente_nutricional", "fuente_producto", "verificacion", "notas", "updated_at", "imagen_url", "nombres_familiares"],
        ["prod-1", "Huevos grandes L · pack 12 ud", "Mercadona", "Mercadona", "alimentacion", "12 ud", "", "https://tienda.mercadona.es/product/31504/huevos-grandes-l-paquete", "", "", "", "", "", "", "sí", "", "2026-10-05", "", "huevos | huevos grandes | huevos l"]
      ]
    },
    { values: [["inventario_id", "producto_id"]] },
    { values: [["producto_id", "precio"]] },
    { values: [["fecha", "ticket"]] },
    {
      values: [
        ["producto_id", "nombre", "estado", "prioridad", "cantidad_objetivo", "unidad", "motivo", "precio_estimado", "coste_estimado", "fuente", "updated_at"],
        ["prod-1", "Huevos grandes L · pack 12 ud", "COMPRAR", "alta", 1, "pack 12 ud", "Reposición", 2.8, 2.8, "test", "2026-10-05"]
      ]
    }
  ]);

  assert.equal(payload.shoppingList.length, 1);
  assert.equal(payload.shoppingList[0].familyName, "huevos");
  assert.deepEqual(payload.shoppingList[0].familyNames, ["huevos", "huevos grandes", "huevos l"]);
  assert.equal(
    payload.shoppingList[0].productUrl,
    "https://tienda.mercadona.es/product/31504/huevos-grandes-l-paquete"
  );
  assert.deepEqual(payload.summary.previewItems, ["huevos"]);
});

test("unlinked reminder inherits a dated observed price from a unique household alias", () => {
  const data = buildPayload([
    {values:[["producto_id","nombre_canonico","nombres_familiares"],["sku-one","Fictitious snack packet","office snack | paper snack"]]},
    {values:[]},
    {values:[["producto_id","nombre","precio","base_precio","fecha_precio","fuente","ticket_id"],["sku-one","Fictitious snack packet",2.4,"€/ud","2026-03-12","ticket","receipt-example"]]},
    {values:[]},
    {values:[["producto_id","nombre","estado","cantidad_objetivo","unidad","precio_estimado","coste_estimado"],["","OfFiCe SnAcK","COMPRAR",2,"packs","",""]]}
  ]);
  assert.equal(data.shoppingList.length,1);
  assert.equal(data.shoppingList[0].productId,"sku-one");
  assert.equal(data.shoppingList[0].estimatedUnitPrice,2.4);
  assert.equal(data.shoppingList[0].estimatedCost,4.8);
  assert.equal(data.summary.estimatedBasketPartial,false);
});

test("unknown or ambiguous shopping names never get fabricated product or price", () => {
  const data = buildPayload([
    {values:[["producto_id","nombre_canonico","nombres_familiares"],["sku-a","Red sandwich cheese","cheese"],["sku-b","Soft white cheese","cheese"]]},
    {values:[]},
    {values:[["producto_id","precio"],["sku-a",2],["sku-b",3]]},
    {values:[]},
    {values:[["producto_id","nombre","estado"],["","Cheese","COMPRAR"],["","Completely unknown item","COMPRAR"]]}
  ]);
  assert.deepEqual(data.shoppingList.map(x=>x.productId),["",""]);
  assert.deepEqual(data.shoppingList.map(x=>x.estimatedCost),[null,null]);
  assert.equal(data.summary.missingPriceCount,2);
});

test("historical price per kilogram is displayed but does not fabricate the basket total", () => {
  const payload = buildPayload([
    {values:[["producto_id","nombre_canonico","nombres_familiares"],["sku-weight","Fictitious seasonal vegetable","vegetable"]]},
    {values:[]},
    {values:[["producto_id","precio","base_precio","fecha_precio","fuente","ticket_id"],["sku-weight",2.1,"€/kg","2026-04-08","Ticket","sample-3"]]},
    {values:[]},
    {values:[["producto_id","nombre","estado","cantidad_objetivo","unidad"],["","Vegetable","COMPRAR","",""]]}
  ]);
  assert.equal(payload.shoppingList[0].estimatedUnitPrice,2.1);
  assert.equal(payload.shoppingList[0].priceBase,"€/kg");
  assert.equal(payload.shoppingList[0].estimatedCost,null);
  assert.equal(payload.summary.missingPriceCount,1);
});

test("kilogram quantity permits a transparent computed estimated cost", () => {
  const payload = buildPayload([
    {values:[["producto_id","nombre_canonico","nombres_familiares"],["sku-weight","Fictitious seasonal vegetable","vegetable"]]},
    {values:[]},
    {values:[["producto_id","precio","base_precio","fecha_precio","fuente","ticket_id"],["sku-weight",2.1,"€/kg","2026-04-08","Ticket","sample-3"]]},
    {values:[]},
    {values:[["producto_id","nombre","estado","cantidad_objetivo","unidad"],["","Vegetable","COMPRAR",1.5,"kg"]]}
  ]);
  assert.equal(payload.shoppingList[0].estimatedCost,3.1500000000000004);
});
