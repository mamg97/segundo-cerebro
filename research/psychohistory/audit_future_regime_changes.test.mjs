import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRegimeCohort} from './audit_future_regime_changes.mjs';
const catalog={
 runType:'retrospective_revised_release',vintageVerified:false,origin:2016,cutoff:2014,maxHorizon:2,
 global:{frequency:[100,10],transitions:[[90,10],[2,8]],memory:[[90,10],[3,7],[9,1],[2,8]]},
 priorStrength:20,
 countries:[
  {id:101,initial:3,counts:[[23,1],[1,5]],observedStates:[3,3,3,2]},
  {id:102,initial:0,counts:[[20,2],[2,1]],observedStates:[0,0,0,0]},
  {id:103,initial:3,counts:[[10,0],[1,5]],observedStates:[3,null,3,2]}
 ]};
test('audit emits only aggregated model scores, no country identities',()=>{
 const r=auditRegimeCohort(catalog);
 assert.equal(r.countries,3);
 assert.equal(r.evaluatedCountryYears,4);
 assert.deepEqual(r.stateCounts,[2,0,1,1]);
 assert.equal(r.markovExit.actualExitCountryYears,1);
 assert.equal(r.markovExit.modalMisses,1);
 assert.equal(r.models.markov.n,4);
 assert.equal(r.models.persistence.n,4);
 assert.equal(r.sourceAsOfVerified,false);
 assert.equal(r.prospectiveSkillDemonstrated,false);
 assert.doesNotMatch(JSON.stringify(r),/"id":(101|102|103)|Tunisia/);
});
test('audit rejects operational/prospective data and no complete outcome',()=>{
 assert.throws(()=>auditRegimeCohort({...catalog,runType:'prospective'}),/retrospective/);
 assert.throws(()=>auditRegimeCohort({...catalog,vintageVerified:true}),/retrospective/);
 assert.throws(()=>auditRegimeCohort({...catalog,countries:[{...catalog.countries[2]}]}),/No evaluable/);
});
