import assert from "node:assert/strict";
import test from "node:test";
import { summarizeShoppingCostCoverage } from "./pantry.js";

test("known unit price with unknown quantity is not counted as missing price", () => {
  const summary = summarizeShoppingCostCoverage([
    { estimatedUnitPrice: 2, estimatedCost: null },
    { estimatedUnitPrice: null, estimatedCost: null },
    { estimatedUnitPrice: 1.5, estimatedCost: 3 }
  ]);

  assert.equal(summary.estimatedBasketTotal, 3);
  assert.equal(summary.missingPriceCount, 1);
  assert.equal(summary.missingCostCount, 2);
  assert.equal(summary.missingQuantityCostCount, 1);
});

test("all fully-costed shopping rows have complete coverage", () => {
  const summary = summarizeShoppingCostCoverage([
    { estimatedUnitPrice: 1.2, estimatedCost: 1.2 },
    { estimatedUnitPrice: 2.5, estimatedCost: 5 }
  ]);

  assert.equal(summary.estimatedBasketTotal, 6.2);
  assert.equal(summary.missingPriceCount, 0);
  assert.equal(summary.missingCostCount, 0);
  assert.equal(summary.missingQuantityCostCount, 0);
});
