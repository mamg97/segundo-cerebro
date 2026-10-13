import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeShoppingName,
  planAppleActionsForMissingSecondBrainRow,
  planAppleActionsForRow,
  planShoppingDryRun,
  shoppingReminderDetails,
  shouldReplayShoppingEvent,
  stateAfterMissingAppleReminder,
  stateAfterAppleEvent,
  supportsShoppingReminderDetails
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

test("a changed active purchase refreshes title, quantity notes and URL in one Apple action", () => {
  assert.deepEqual(
    planAppleActionsForRow(
      {
        state: "COMPRAR",
        normalizedName: "huevos",
        secondBrainModifiedAt: "2026-10-13T16:06:00Z"
      },
      {
        apple_completed: 0,
        apple_missing: 0,
        apple_title: "Huevos",
        last_synced_at: "2026-10-13T15:00:00Z"
      },
      { supportsDetails: true }
    ),
    [{ type: "updateDetails", desiredCompleted: null }]
  );
});

test("legacy agents keep the old title-only action while 1.1+ supports details", () => {
  const row = {
    state: "COMPRAR",
    normalizedName: "cafe",
    secondBrainModifiedAt: "2026-10-13T16:06:00Z"
  };
  const link = {
    apple_completed: 0,
    apple_missing: 0,
    apple_title: "Café",
    last_synced_at: "2026-10-13T15:00:00Z"
  };
  assert.deepEqual(planAppleActionsForRow(row, link), [{ type: "updateTitle", desiredCompleted: null }]);
  assert.deepEqual(
    planAppleActionsForRow(row, link, { supportsDetails: true }),
    [{ type: "updateDetails", desiredCompleted: null }]
  );
  assert.equal(supportsShoppingReminderDetails("1.0.0"), false);
  assert.equal(supportsShoppingReminderDetails("1.1.0"), true);
  assert.equal(supportsShoppingReminderDetails("2.0.0"), true);
  assert.equal(supportsShoppingReminderDetails(""), false);
});

test("shopping reminder details expose purchase quantity and exact Mercadona URL", () => {
  assert.deepEqual(
    shoppingReminderDetails(
      { nombre: "Huevos", cantidad_objetivo: 1, unidad: "pack 12 ud" },
      { name: "Huevos grandes L", productUrl: "https://tienda.mercadona.es/product/31504/huevos-grandes-l-paquete" }
    ),
    {
      notes: "Cantidad: 1 pack 12 ud",
      url: "https://tienda.mercadona.es/product/31504/huevos-grandes-l-paquete"
    }
  );
});

test("shopping reminder details fall back to a Mercadona search without inventing a SKU", () => {
  const details = shoppingReminderDetails(
    { nombre: "Bacalao lomos", cantidad_objetivo: 1, unidad: "envase ≥400 g" },
    null
  );
  assert.equal(details.notes, "Cantidad: 1 envase ≥400 g");
  assert.equal(
    details.url,
    "https://tienda.mercadona.es/search-results?query=Bacalao%20lomos"
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

test("retry an event still marked received after a transient Sheets error", () => {
  assert.equal(shouldReplayShoppingEvent("received"), true);
  assert.equal(shouldReplayShoppingEvent("applied"), false);
  assert.equal(shouldReplayShoppingEvent("conflict"), false);
  assert.equal(shouldReplayShoppingEvent(undefined), false);
});

test("missing Apple reminders never erase the shopping need", () => {
  assert.equal(stateAfterMissingAppleReminder("COMPRADO"), "COMPRADO");
  assert.equal(stateAfterMissingAppleReminder("COMPRAR"), "COMPRAR");
  assert.equal(stateAfterMissingAppleReminder("REVISAR"), "REVISAR");
  assert.equal(stateAfterMissingAppleReminder("CANCELADO"), "CANCELADO");
});

test("old completed Apple snapshot cannot overwrite newer restored COMPRAR state", () => {
  assert.equal(
    stateAfterAppleEvent("COMPRAR", "2026-10-13T17:15:00Z", "2026-10-13T16:42:00Z", "COMPRADO"),
    "COMPRAR"
  );
  assert.equal(
    stateAfterAppleEvent("COMPRAR", "2026-10-13T17:15:00Z", "2026-10-13T16:42:00Z", "CANCELADO"),
    "COMPRAR"
  );
  assert.equal(
    stateAfterAppleEvent("COMPRAR", "2026-10-13T17:15:00Z", "2026-10-13T17:17:00Z", "COMPRADO"),
    "COMPRADO"
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

test("dry run resolves exact household alias to canonical identity", () => {
  const report = planShoppingDryRun([
    {reminderId:"apple-alias",title:"Galletas para la oficina",completed:false,modifiedAt:"2026-04-05T12:00:00Z"}
  ], [], [{id:"prod-aliased",name:"Galletas de trigo",familyNames:["galletas para la oficina"]}]);
  assert.equal(report.details[0].knownProductId, "prod-aliased");
});

test("alias matching is accent and case independent but never fuzzy", () => {
  const products = [{id:"milk-almond",name:"Bebida de almendra",familyNames:["bebida de almendra con azúcar"]}];
  const exact = planShoppingDryRun([
    {reminderId:"apple-1",title:"BEBIDA DE ALMENDRA CON AZUCAR",modifiedAt:"2026-04-05T12:00:00Z"}
  ], [], products);
  const fuzzy = planShoppingDryRun([
    {reminderId:"apple-2",title:"bebida",modifiedAt:"2026-04-05T12:00:00Z"}
  ], [], products);
  assert.equal(exact.details[0].knownProductId,"milk-almond");
  assert.equal(fuzzy.details[0].knownProductId,null);
});

test("ambiguous aliases are not linked to an arbitrary product", () => {
  const products = [
    {id:"first",name:"Salsa picante roja",familyNames:["salsa"]},
    {id:"second",name:"Salsa suave verde",familyNames:["salsa"]}
  ];
  const report = planShoppingDryRun([
    {reminderId:"apple-3",title:"Salsa",modifiedAt:"2026-04-05T12:00:00Z"}
  ], [], products);
  assert.equal(report.details[0].knownProductId,null);
});
