import test from "node:test";
import assert from "node:assert/strict";
import { companionMenuDisplayName, prepareWeeklyMenuRows } from "./weekly-menu.js";

const products = new Map([
  ["small-natural", {
    id: "small-natural", format: "pack 4 × 120 g · 480 g",
    menuDisplayName: "Yogur proteico natural",
    imageUrl: "https://example.org/product-small.jpg"
  }],
  ["small-coco", {
    id: "small-coco", format: "pack 4 × 120 g · 480 g",
    menuDisplayName: "Yogur proteico de coco",
    imageUrl: "https://example.org/product-coco.jpg"
  }],
  ["jar-natural", {
    id: "jar-natural", format: "bote 500 g",
    menuDisplayName: "Yogur proteico natural",
    imageUrl: "https://example.org/product-jar.jpg"
  }]
]);
function menu(foodId, quantity, unit, name, status = "planificado") {
  return {
    date: "2026-01-19", moment: "Merienda", foodId, name,
    quantity, unit, itemRole: "acompanante", companionType: "yogur",
    kcal: 130, protein: 25, carbs: 7.75, fat: 1.25, status
  };
}
test("canonical small yogurt name is identical for 120 g or one vasito", () => {
  const grams = companionMenuDisplayName(menu("small-natural", 120, "g", "Yogur natural (120 g)"), products.get("small-natural"));
  const cups = companionMenuDisplayName(menu("small-natural", 1, "vasito de 120 g", "Un yogur"), products.get("small-natural"));
  assert.equal(grams, "Yogur proteico natural · 1 vasito (120 g)");
  assert.equal(grams, cups);
});

test("two small yogurts render as two cups, without altering the numeric quantity", () => {
  const original = menu("small-coco", 2, "vasitos de 120 g", "Otro texto", "consumido");
  const [resolved] = prepareWeeklyMenuRows([original], { pantryProductById: products });
  assert.equal(resolved.name, "Yogur proteico de coco · 2 vasitos (240 g)");
  assert.equal(resolved.quantity, 2);
  assert.equal(resolved.kcal, 130);
  assert.equal(resolved.protein, 25);
  assert.equal(resolved.status, "consumido");
  assert.equal(resolved.productImageUrl, "https://example.org/product-coco.jpg");
  assert.equal(original.name, "Otro texto");
});

test("legacy 'ud' and 'envase' units are counted as individual cups", () => {
  assert.equal(companionMenuDisplayName(
    menu("small-coco", 1, "ud", "Original"),
    products.get("small-coco")
  ), "Yogur proteico de coco · 1 vasito (120 g)");
  assert.equal(companionMenuDisplayName(
    menu("small-coco", 2, "envases de 120 g", "Original"),
    products.get("small-coco")
  ), "Yogur proteico de coco · 2 vasitos (240 g)");
});

test("historical big-jar weights stay exactly as consumed", () => {
  assert.equal(companionMenuDisplayName(
    menu("jar-natural", 220, "g", "Original", "consumido"),
    products.get("jar-natural")
  ), "Yogur proteico natural · 220 g (tarro grande)");
});

test("large format has same canonical serving across legacy menu names", () => {
  const names = ["Yogur proteico natural (250 g)", "Yogur proteico natural · tarro grande · toma 250 g"];
  const [a,b] = prepareWeeklyMenuRows(names.map((name,i) => ({
    ...menu("jar-natural", 250, "g (medio tarro de 500 g)", name),
    date: i ? "2026-01-20" : "2026-01-19"
  })), { pantryProductById: products });
  assert.equal(a.name, "Yogur proteico natural · 250 g (½ tarro)");
  assert.equal(b.name, a.name);
  assert.equal(a.productImageUrl, "https://example.org/product-jar.jpg");
  assert.equal(a.kcal, 130);
});

test("dessert keeps contextual prefix, but canonical product and units", () => {
  const raw = menu("jar-natural", 250, "g", "Postre: yogur natural +Proteínas (250 g)");
  assert.equal(companionMenuDisplayName(raw, products.get("jar-natural")), "Postre: Yogur proteico natural · 250 g (½ tarro)");
});

test("missing product metadata and non-yogurt foods are never guessed or renamed", () => {
  const unmatched = menu("missing", 1, "vasito", "Yogur no enlazado");
  const [missing] = prepareWeeklyMenuRows([unmatched], { pantryProductById: products });
  assert.equal(missing.name, unmatched.name);
  assert.equal(missing.productImageUrl, null);
  const fruit = { ...unmatched, companionType: "fruta", name: "Plátano" };
  assert.equal(companionMenuDisplayName(fruit, products.get("small-natural")), "Plátano");
});
