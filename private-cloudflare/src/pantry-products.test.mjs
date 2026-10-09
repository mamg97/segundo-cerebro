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

test("canonical receipts project latest ticket and observations without creating stock or payments", () => {
  const payload = buildPayload([
    { values: [["producto_id","nombre_canonico"],["p-one","Product one"],["p-two","Product two"]] },
    { values: [] },
    { values: [["producto_id","nombre","precio","base_precio","fecha_precio","fuente","ticket_id"],["p-one","Product one",3.25,"€/ud","2026-10-08","Ticket real","sample-receipt"],["p-two","Product two",8.80,"€/ud","2026-10-08","Ticket real","sample-receipt"]] },
    { values: [["fecha","ticket","tienda","importe_total","n_lineas","archivo_ticket","fuente"],["2026-10-08","sample-receipt","Shop",12.05,2,"test.pdf","Email"]] },
    { values: [] }
  ]);
  assert.equal(payload.items.length, 0);
  assert.equal(payload.recentTickets.length,1);
  assert.equal(payload.recentTickets[0].amount,12.05);
  assert.equal(payload.recentTickets[0].priceObservations.length,2);
  assert.equal(payload.latestTicketIntegrity.hasUniqueHeader,true);
  assert.equal(payload.latestTicketIntegrity.priceCoverageComplete,true);
  assert.equal(payload.latestTicketIntegrity.allPricesLinked,true);
  assert.equal(payload.products.length,2);
});

test("receipt integration reports partial writes without silently declaring coverage", () => {
  const payload = buildPayload([
    { values: [["producto_id","nombre_canonico"],["p-one","Product one"]] },
    { values: [] },
    { values: [["producto_id","precio","fecha_precio","ticket_id"],["p-one",2,"2026-10-08","sample-receipt"]] },
    { values: [["fecha","ticket","importe_total","n_lineas"],["2026-10-08","sample-receipt",12.05,2],["2026-10-08","sample-receipt",12.05,2]] },
    { values: [] }
  ]);
  assert.equal(payload.latestTicketIntegrity.hasUniqueHeader,false);
  assert.equal(payload.latestTicketIntegrity.priceCoverageComplete,false);
});
