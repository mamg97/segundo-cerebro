import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupeWeeklyMenuRows,
  prepareWeeklyMenuRows,
  weeklyMenuItemIsVisibleServer
} from "./weekly-menu.js";

test("hidden menu rows never reach the UI model", () => {
  assert.equal(weeklyMenuItemIsVisibleServer({ status: "omitido" }), false);
  assert.equal(weeklyMenuItemIsVisibleServer({ status: "Retirada" }), false);
  assert.equal(weeklyMenuItemIsVisibleServer({ status: "planificado" }), true);
});

test("same logical meal is an automatic upsert: newest row wins", () => {
  const rows = [
    { date: "2026-09-30", moment: "Merienda", name: "Batido", status: "planificado", kcal: 200, updatedAt: "2026-09-30T10:00:00+02:00" },
    { date: "2026-09-30", moment: "Merienda", name: "Postre", status: "planificado", kcal: 130, updatedAt: "2026-09-30T10:00:00+02:00" },
    { date: "2026-09-30", moment: "Merienda", name: "Batido", status: "planificado", kcal: 244, updatedAt: "2026-09-30T12:00:00+02:00" }
  ];
  const result = dedupeWeeklyMenuRows(rows);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, "Batido");
  assert.equal(result[0].kcal, 244);
  assert.equal(result[1].name, "Postre");
});

test("different components in the same meal moment are preserved", () => {
  const rows = [
    { date: "2026-09-30", moment: "Merienda", name: "Pan + pavo", status: "planificado" },
    { date: "2026-09-30", moment: "Merienda", name: "Postre proteico", status: "planificado" },
    { date: "2026-09-30", moment: "Merienda", name: "Batido", status: "planificado" }
  ];
  assert.equal(dedupeWeeklyMenuRows(rows).length, 3);
});

test("missing menu macros resolve automatically from a complete recipe master", () => {
  const recipeById = new Map([["rec-1", {
    id: "rec-1",
    servings: 2,
    kcalPerServing: 320,
    proteinPerServing: 28,
    carbsPerServing: 35,
    fatPerServing: 8,
    precision: "alta"
  }]]);
  const ingredientsByRecipeId = new Map([["rec-1", [{
    name: "Ingrediente",
    quantity: 200,
    grams: 200,
    kcal: 640,
    protein: 56
  }]]]);
  const [row] = prepareWeeklyMenuRows([{
    date: "2026-09-30",
    moment: "Cena",
    recipeId: "rec-1",
    name: "Receta",
    quantity: 1,
    unit: "ración",
    status: "planificado",
    kcal: null,
    protein: null,
    carbs: null,
    fat: null
  }], { recipeById, ingredientsByRecipeId });

  assert.equal(row.kcal, 320);
  assert.equal(row.protein, 28);
  assert.equal(row.nutritionStatus, "resolved-from-recipe");
  assert.equal(row.ingredients[0].gramsForMeal, 100);
  assert.equal(row.ingredients[0].kcalForMeal, 320);
});

test("pending recipe never invents macros or exposes stale ingredient assumptions", () => {
  const recipeById = new Map([["rec-pending", {
    id: "rec-pending",
    servings: 2,
    kcalPerServing: null,
    proteinPerServing: null,
    precision: "pendiente",
    note: "Confirmar cantidad real."
  }]]);
  const ingredientsByRecipeId = new Map([["rec-pending", [{
    name: "Huevos",
    quantity: 4,
    kcal: 286,
    protein: 25.2
  }]]]);
  const [row] = prepareWeeklyMenuRows([{
    date: "2026-09-30",
    moment: "Cena",
    recipeId: "rec-pending",
    name: "Tortilla francesa",
    quantity: 1,
    unit: "ración",
    status: "planificado",
    note: "Confirmar cuántos huevos se usan."
  }], { recipeById, ingredientsByRecipeId });

  assert.equal(row.kcal, undefined);
  assert.equal(row.protein, undefined);
  assert.equal(row.nutritionStatus, "pending-confirmation");
  assert.equal(row.nutritionPendingReason, "Confirmar cuántos huevos se usan.");
  assert.deepEqual(row.ingredients, []);
});
