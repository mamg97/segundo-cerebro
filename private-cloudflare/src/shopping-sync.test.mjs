import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeShoppingName,
  planAppleActionsForMissingSecondBrainRow,
  planAppleActionsForRow,
  planShoppingDryRun
} from "./shopping-sync.js";

function row(rowNumber, values) {
  return { rowNumber, record: values };
}

test("normalization deduplicates casing, accents and surrounding spacing", () => {
  assert.equal(normalizeShoppingName("  HUEVOS  "), "huevos");
  assert.equal(normalizeShoppingName("Café"), normalizeShoppingName("cafe"));
});

test("normalization does not merge semantically distinct products", () => {
  assert.notEqual(normalizeShoppingName("café"), normalizeShoppingName("café descafeinado"));
});

test("dry run links an existing active row instead of creating a duplicate", () => {
  const report = planShoppingDryRun([
    { reminderId: "apple-1", title: "Huevos", completed: false, modifiedAt: "2026-09-28T08:00:00Z" }
  ], [
    row(2, { nombre: "huevos ", estado: "COMPRAR", apple_reminder_id: "" })
  ]);
  assert.equal(report.matched, 1);
  assert.equal(report.appleOnly, 0);
  assert.equal(report.segundoCerebroOnly, 0);
});

test("dry run reports ambiguous normalized matches as a conflict", () => {
  const report = planShoppingDryRun([
    { reminderId: "apple-1", title: "Leche", completed: false, modifiedAt: "2026-09-28T08:00:00Z" }
  ], [
    row(2, { nombre: "Leche", estado: "COMPRAR" }),
    row(3, { nombre: " leche ", estado: "REVISAR" })
  ]);
  assert.equal(report.potentialConflicts, 1);
  assert.equal(report.appleOnly, 0);
});

test("unknown Apple products remain Apple-only without an invented product id", () => {
  const report = planShoppingDryRun([
    { reminderId: "apple-2", title: "Producto desconocido", completed: false, modifiedAt: "2026-09-28T08:00:00Z" }
  ], [], [{ id: "product-known", name: "Huevos" }]);
  assert.equal(report.appleOnly, 1);
  assert.equal(report.details[0].knownProductId, null);
});

test("a confirmed Segundo Cerebro row is counted for Apple creation", () => {
  const report = planShoppingDryRun([], [
    row(2, { nombre: "Huevos", estado: "COMPRAR" }),
    row(3, { nombre: "Leche", estado: "REVISAR" }),
    row(4, { nombre: "Café", estado: "COMPRADO" })
  ]);
  assert.equal(report.segundoCerebroOnly, 1);
});

test("REVISAR never creates an Apple reminder", () => {
  assert.deepEqual(planAppleActionsForRow({ state: "REVISAR" }, null), []);
});

test("COMPRAR creates exactly one missing Apple reminder", () => {
  assert.deepEqual(
    planAppleActionsForRow({ state: "COMPRAR", normalizedName: "huevos" }, null),
    [{ type: "create", desiredCompleted: false }]
  );
});

test("COMPRADO and CANCELADO complete an active linked reminder", () => {
  const link = { apple_completed: 0, apple_missing: 0 };
  for (const state of ["COMPRADO", "CANCELADO"]) {
    assert.deepEqual(
      planAppleActionsForRow({ state }, link),
      [{ type: "setCompleted", desiredCompleted: true }]
    );
  }
});

test("a physically removed Segundo Cerebro row completes its linked Apple reminder", () => {
  assert.deepEqual(
    planAppleActionsForMissingSecondBrainRow({
      apple_reminder_id: "apple-1",
      apple_completed: 0,
      apple_missing: 0
    }),
    [{ type: "setCompleted", desiredCompleted: true }]
  );
});

test("a removed row does not repeat completion for an already terminal Apple reminder", () => {
  for (const link of [
    { apple_reminder_id: "apple-1", apple_completed: 1, apple_missing: 0 },
    { apple_reminder_id: "apple-1", apple_completed: 0, apple_missing: 1 },
    { apple_reminder_id: null, apple_completed: 0, apple_missing: 0 }
  ]) {
    assert.deepEqual(planAppleActionsForMissingSecondBrainRow(link), []);
  }
});
