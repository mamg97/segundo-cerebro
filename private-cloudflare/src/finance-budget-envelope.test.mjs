import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reconcileBudgetEnvelopeForDisplay} from "./finance-budget-envelope.mjs";
const worker=readFileSync(new URL("./index.js",import.meta.url),"utf8");
const categories=new Map([
 ["salud-gimnasio",{budgeted:60,spent:0,committed:0}],
 ["salud-medicinas",{budgeted:0,spent:13.95,committed:0}],
 ["hogar-comida",{budgeted:450,spent:98.74,committed:0}],
 ["transporte-gasolina",{budgeted:300,spent:74.16,committed:36.90}]
]);
test("unbudgeted pharmacy never appears as bank funding despite an obsolete active source row",()=>{
 const a=reconcileBudgetEnvelopeForDisplay({kind:"medicine_budget_envelope",amount:53.05},categories);
 assert.equal(a.amount,0);
 assert.equal(a.budgetEnvelopeComplete,true);
});
test("gym remains reserved until real expense appears, then declines and vanishes",()=>{
 const input={kind:"gym_budget_envelope",amount:60};
 assert.equal(reconcileBudgetEnvelopeForDisplay(input,categories).amount,60);
 const after=new Map(categories);
 after.set("salud-gimnasio",{budgeted:60,spent:25,committed:0});
 assert.equal(reconcileBudgetEnvelopeForDisplay(input,after).amount,35);
 after.set("salud-gimnasio",{budgeted:60,spent:60,committed:0});
 assert.equal(reconcileBudgetEnvelopeForDisplay(input,after).amount,0);
});
test("remaining funded grocery is not reduced twice and partial transport is capped",()=>{
 assert.equal(reconcileBudgetEnvelopeForDisplay({kind:"grocery_budget_envelope",amount:351.26},categories).amount,351.26);
 assert.equal(reconcileBudgetEnvelopeForDisplay({kind:"transport_partial_funded_envelope",amount:107.94},categories).amount,107.94);
});
test("unknown categories, card holds and missing category sources are preserved without fabricated payments",()=>{
 assert.equal(reconcileBudgetEnvelopeForDisplay({kind:"card_hold",amount:32},categories).amount,32);
 assert.equal(reconcileBudgetEnvelopeForDisplay({kind:"gym_budget_envelope",amount:60},new Map()).amount,60);
});
test("worker reads budget categories before generating effective reserved envelopes",()=>{
 assert.match(worker,/reconcileBudgetEnvelopeForDisplay/);
 assert.match(worker,/\.filter\(\(item\) => item\.amount > 0\.005\)/);
});
