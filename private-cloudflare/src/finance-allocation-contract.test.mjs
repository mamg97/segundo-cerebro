import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isFundedFinanceAllocation,requireFinanceReservationSource} from "./finance-allocation-contract.js";
const worker=readFileSync(new URL("./index.js",import.meta.url),"utf8");
test("funded allocations exclude uncovered budgets and settled holds",()=>{
  const a={accountId:"fixture",amount:120};
  assert.equal(isFundedFinanceAllocation({...a,status:"active",kind:"budget_envelope"}),true);
  assert.equal(isFundedFinanceAllocation({...a,status:"active",kind:"card_hold"}),true);
  assert.equal(isFundedFinanceAllocation({...a,status:"unfunded",kind:"budget_funding_gap"}),false);
  assert.equal(isFundedFinanceAllocation({...a,status:"active",kind:"budget_funding_gap"}),false);
  assert.equal(isFundedFinanceAllocation({...a,status:"executed",kind:"card_hold"}),false);
});
test("missing reservation source cannot masquerade as zero allocations",()=>{
  const accounts=[["account_id"],["fixture"]];
  const reservations=[["account_id","amount","status","kind"]];
  assert.doesNotThrow(()=>requireFinanceReservationSource(accounts,reservations));
  assert.throws(()=>requireFinanceReservationSource(accounts,[]),{code:"FINANCE_RESERVATIONS_UNAVAILABLE"});
});
test("Worker integrates source validation and funded-only rows",()=>{
  assert.match(worker,/requireFinanceReservationSource\(accountRows, accountAllocationRows\)/);
  assert.match(worker,/\.filter\(\(item\) => isFundedFinanceAllocation\(item\)\)/);
});
