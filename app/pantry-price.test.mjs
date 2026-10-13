import assert from "node:assert/strict";
import test from "node:test";
import { shoppingPriceLabel } from "./pantry.js";

test("shopping price shows unit basis when quantity is unknown", () => {
  assert.equal(
    shoppingPriceLabel({ estimatedCost: null, estimatedUnitPrice: 2, priceBase: "€/kg" }),
    "2,00 €/kg"
  );
});

test("shopping price prefers total cost when available", () => {
  assert.equal(
    shoppingPriceLabel({ estimatedCost: 4, estimatedUnitPrice: 2, priceBase: "€/kg" }),
    "4,00 €"
  );
});

test("shopping price remains unknown only when there is no unit price", () => {
  assert.equal(
    shoppingPriceLabel({ estimatedCost: null, estimatedUnitPrice: null, priceBase: null }),
    "Sin precio"
  );
});
