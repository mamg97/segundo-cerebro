import assert from "node:assert/strict";
import test from "node:test";
import { estimateShoppingCost, summarizeShoppingCostCoverage } from "./pantry.js";

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


test("80 g of drained melva costs one 1.85 EUR tin, not 148 EUR", () => {
  assert.equal(estimateShoppingCost({
    unitPrice: 1.85, priceBase: "€/ud", targetQuantity: 80,
    targetUnit: "g aprox.", productFormat: "lata 120 g netos / 80 g escurridos"
  }), 1.85);
  assert.equal(estimateShoppingCost({
    unitPrice: 1.85, priceBase: "€/ud", targetQuantity: 160,
    targetUnit: "g", productFormat: "lata 120 g netos / 80 g escurridos"
  }), 3.7);
});

test("mass units are never multiplied by unit prices without confirmed packaging", () => {
  assert.equal(estimateShoppingCost({
    unitPrice: 1.85, priceBase: "€/ud", targetQuantity: 80,
    targetUnit: "g aprox.", productFormat: "bandeja peso variable"
  }), null);
});

test("per kilogram prices support weights expressed in grams or kilograms", () => {
  assert.equal(estimateShoppingCost({
    unitPrice: 2, priceBase: "€/kg", targetQuantity: 250, targetUnit: "g"
  }), 0.5);
  assert.equal(estimateShoppingCost({
    unitPrice: 2, priceBase: "€/kg", targetQuantity: 0.5, targetUnit: "kg"
  }), 1);
});

test("per litre and per 100 g prices are converted explicitly", () => {
  assert.equal(estimateShoppingCost({
    unitPrice: 1.2, priceBase: "€/l", targetQuantity: 500, targetUnit: "ml"
  }), 0.6);
  assert.equal(estimateShoppingCost({
    unitPrice: 0.5, priceBase: "€/100 g", targetQuantity: 200, targetUnit: "g"
  }), 1);
});

test("a number of commercial packages is safe but unknown units are not", () => {
  assert.equal(estimateShoppingCost({
    unitPrice: 1.85, priceBase: "€/ud", targetQuantity: 2, targetUnit: "latas"
  }), 3.7);
  assert.equal(estimateShoppingCost({
    unitPrice: 1.85, priceBase: "€/ud", targetQuantity: 2, targetUnit: "raciones"
  }), null);
  assert.equal(estimateShoppingCost({
    unitPrice: 1.85, priceBase: "€/ud", targetQuantity: null, targetUnit: "latas"
  }), null);
});
