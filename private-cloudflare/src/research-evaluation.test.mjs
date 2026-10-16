import test from "node:test";
import assert from "node:assert/strict";
import { validatedProspectiveRows, brierScore, brierSkill, calibrationBins, prospectiveSummary } from "./research-evaluation.js";
const row=(v={})=>({id:"SYNTHETIC",status:"RESUELTA",issuedAt:"2026-01-01",resolutionAt:"2026-06-01",probability:0.8,outcome:1,asOf:"2025-12-31",...v});
const receipts=new Map([["SYNTHETIC",{verified:true,payloadMatched:true,independentTimestamp:true,timestamp:"2025-12-31T23:00:00Z"}]]);
test("requires strictly prospective dates and valid probabilities",()=>{
  const rows=validatedProspectiveRows([row(),row({issuedAt:"2026-07-01"}),row({probability:1.5}),row({asOf:"2026-03-01"}),row({status:"PRUEBA"})],receipts);
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
  const summary=prospectiveSummary([row({baselineProbability:0.5}),row({outcome:0,probability:0.1})],receipts);
  assert.equal(summary.resolved,2);
  assert.equal(summary.pairedCount,1);
  assert.ok(summary.brierSkill > 0);
  assert.equal(summary.calibration.reduce((a,b)=>a+b.count,0),2);
});
test("editable assertions and backdated rows never prove prospectivity",()=>{
  const summary=prospectiveSummary([row({sealVerified:true,sealHash:"claimed",baselineProbability:.5})]);
  assert.equal(summary.resolved,0);
  assert.equal(summary.unsealed,1);
  assert.equal(summary.brier,null);
  const late=new Map([["SYNTHETIC",{verified:true,payloadMatched:true,independentTimestamp:true,timestamp:"2026-06-02"}]]);
  assert.equal(validatedProspectiveRows([row()],late).length,0);
  const wrong=new Map([["SYNTHETIC",{...receipts.get("SYNTHETIC"),payloadMatched:false}]]);
  assert.equal(validatedProspectiveRows([row()],wrong).length,0);
  assert.equal(validatedProspectiveRows([row({resolutionAt:"2099-01-01"})],receipts).length,0);
  assert.equal(validatedProspectiveRows([row({asOf:null})],receipts).length,0);
});
