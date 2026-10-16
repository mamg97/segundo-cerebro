import test from "node:test";
import assert from "node:assert/strict";
import { validatedProspectiveRows, brierScore, brierSkill, calibrationBins, prospectiveSummary } from "./research-evaluation.js";
const row=(v={})=>({status:"RESUELTA",issuedAt:"2026-01-01",resolutionAt:"2026-06-01",probability:0.8,outcome:1,asOf:"2025-12-31",...v});
test("requires strictly prospective dates and valid probabilities",()=>{
  const rows=validatedProspectiveRows([row(),row({issuedAt:"2026-07-01"}),row({probability:1.5}),row({asOf:"2026-03-01"}),row({status:"PRUEBA"})]);
  assert.equal(rows.length,1);
});
test("Brier score is proper and skill compares matching pairs",()=>{
  assert.equal(brierScore([row({probability:0.8}),row({probability:0.2,outcome:0})]),0.039999999999999994);
  assert.equal(brierSkill(0.12,0.24),0.5);
  assert.equal(brierSkill(0.12,0),null);
});
test("no evidence never produces fabricated score",()=>{
  const summary=prospectiveSummary([]);
  assert.equal(summary.brier,null);
  assert.equal(summary.brierSkill,null);
  assert.equal(summary.resolved,0);
  assert.deepEqual(summary.calibration,[]);
});
test("paired baselines cannot be compared on different samples",()=>{
  const summary=prospectiveSummary([row({baselineProbability:0.5}),row({outcome:0,probability:0.1})]);
  assert.equal(summary.resolved,2);
  assert.equal(summary.pairedCount,1);
  assert.ok(summary.brierSkill > 0);
  assert.equal(summary.calibration.reduce((a,b)=>a+b.count,0),2);
});