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
