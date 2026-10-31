import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reconcileCreditReceiptProvisions } from "./finance-credit-reconciliation.js";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");

function fixture() {
  return {
    periodStart: "2027-02-20", periodEnd: "2027-03-20",
    creditAccounts: [{ id: "card-fixture", status: "active", linkedPaymentAccount: "bank-fixture",
      estimatedNextReceipt: 99.2, products: [
        { id: "product-a" }, { id: "product-b" }, { id: "product-c" }
      ] }],
    creditFuture: [
      { dueDate: "2027-02-28", componentId: "product-a", grossAmount: 14.2 },
      { dueDate: "2027-02-28", componentId: "product-b", grossAmount: 30 },
      { dueDate: "2027-02-28", componentId: "product-c", grossAmount: 55 }
    ],
    liquidityAccounts: [{ id: "bank-fixture", allocations: [
      { kind: "eci_installment", amount: 14.2 },
      { kind: "eci_revolving", amount: 30 },
      { kind: "eci_third_party", amount: 55 }
    ] }]
  };
}
test("all credit receipt components must reconcile exactly to the private financing schedule", () => {
  const result = reconcileCreditReceiptProvisions(fixture());
  assert.equal(result.status, "ok");
  assert.equal(result.checks[0].code, "OK");
  assert.equal(result.checks[0].componentCount, 3);
  assert.equal(result.checks[0].reservedGross, 99.2);
});
test("missing revolving plus approximate installment is flagged without rewriting money", () => {
  const input = fixture();
  input.liquidityAccounts[0].allocations.splice(1, 1);
  input.liquidityAccounts[0].allocations[0].amount = 14.3;
  const result = reconcileCreditReceiptProvisions(input);
  assert.equal(result.status, "mismatch");
  assert.equal(result.checks[0].code, "RESERVATIONS_TOTAL_MISMATCH");
  assert.equal(result.checks[0].reservedGross, 69.3);
});
test("compensating component errors cannot pass solely because totals match", () => {
  const input = fixture();
  input.liquidityAccounts[0].allocations[0].amount = 15.2;
  input.liquidityAccounts[0].allocations[1].amount = 29;
  const result = reconcileCreditReceiptProvisions(input);
  assert.equal(result.status, "mismatch");
  assert.equal(result.checks[0].code, "RESERVATIONS_COMPONENT_MISMATCH");
});
test("a contradictory credit-card statement projection is not marked reconciled", () => {
  const input = fixture();
  input.creditAccounts[0].estimatedNextReceipt = 99.21;
  assert.equal(reconcileCreditReceiptProvisions(input).checks[0].code, "SCHEDULE_TOTAL_MISMATCH");
});
test("unavailable source cannot produce a false green validation", () => {
  const input = fixture();
  input.liquidityAccounts = [];
  assert.equal(reconcileCreditReceiptProvisions(input).status, "unverified");
});
test("only due components of the active cycle and credit products are compared", () => {
  const input = fixture();
  input.creditFuture.push({ dueDate: "2027-03-31", componentId: "product-a", grossAmount: 800 });
  input.creditFuture.push({ dueDate: "2027-02-28", componentId: "different-card", grossAmount: 500 });
  assert.equal(reconcileCreditReceiptProvisions(input).status, "ok");
});
test("private Worker and Finance UI both consume the reconciliation result", () => {
  assert.match(worker, /reconcileCreditReceiptProvisions\(/);
  assert.match(worker, /value\.creditReceiptReconciliation/);
  assert.match(app, /creditReceiptReconciliation/);
  assert.match(app, /finance-reconciliation-warning/);
});
