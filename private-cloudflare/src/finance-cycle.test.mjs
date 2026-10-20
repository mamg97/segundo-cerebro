import test from "node:test";
import assert from "node:assert/strict";
import { currentFinanceCycle, ensureCurrentFinanceCycle } from "./finance-cycle.mjs";

test("19 October belongs to September–October; 20 October belongs to October–November in Madrid", () => {
  assert.deepEqual(currentFinanceCycle(new Date("2026-10-19T21:59:59Z")), {
    start: "2026-09-20", end: "2026-10-20", label: "20 sept – 20 oct"
  });
  assert.deepEqual(currentFinanceCycle(new Date("2026-10-19T22:00:00Z")), {
    start: "2026-10-20", end: "2026-11-20", label: "20 oct – 20 nov"
  });
});

test("winter boundary works after Spanish daylight saving ends", () => {
  assert.deepEqual(currentFinanceCycle(new Date("2026-11-19T23:00:00Z")), {
    start: "2026-11-20", end: "2026-12-20", label: "20 nov – 20 dic"
  });
  assert.deepEqual(currentFinanceCycle(new Date("2026-12-19T23:00:00Z")), {
    start: "2026-12-20", end: "2027-01-20", label: "20 dic – 20 ene"
  });
});

test("current source remains untouched, with no fabricated bank changes", () => {
  const value = { periodStart: "2026-10-20", periodEnd: "2026-11-20",
    categories: [{id:"gym",spent:0}], plannedOutflows:100, liquidityAccounts:[{id:"test",balance:33}] };
  const result = ensureCurrentFinanceCycle(value, new Date("2026-10-20T12:00:00Z"));
  assert.deepEqual(result.categories,value.categories);
  assert.equal(result.plannedOutflows,100);
  assert.equal(result.pendingCycle,false);
});

test("stale source cannot be displayed as current spending or budget", () => {
  const older = {period:"2026-09-20/2026-10-20",periodStart:"2026-09-20",periodEnd:"2026-10-20",
    categories:[{id:"food",spent:600}],income:1234,plannedOutflows:2000,commonBudget:1500,
    miguelNet:500,andreaNet:50,liquidityAccounts:[{id:"account",balance:77}]};
  const next = ensureCurrentFinanceCycle(older,new Date("2026-10-20T12:00:00Z"));
  assert.equal(next.periodLabel,"20 oct – 20 nov");
  assert.equal(next.pendingCycle,true);
  assert.deepEqual(next.categories,[]);
  for(const key of ["income","plannedOutflows","commonBudget","miguelNet","andreaNet"])
    assert.equal(next[key],null,key);
  assert.deepEqual(next.liquidityAccounts,older.liquidityAccounts);
  assert.equal(older.categories[0].spent,600);
  assert.equal(older.periodStart,"2026-09-20");
});

test("if the next month rolls and canonical data still lags, no old numbers leak", () => {
  const current={periodStart:"2026-10-20",periodEnd:"2026-11-20",categories:[{spent:125}]};
  const next=ensureCurrentFinanceCycle(current,new Date("2026-11-19T23:00:00Z"));
  assert.equal(next.periodLabel,"20 nov – 20 dic");
  assert.deepEqual(next.categories,[]);
  assert.equal(next.pendingCycle,true);
});
