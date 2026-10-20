import test from 'node:test';import assert from 'node:assert/strict';
import {auditFirstPassagePairedBands} from './audit_future_first_passage_bootstrap.mjs';
const catalog={runType:'retrospective_revised_release',vintageVerified:false,
 origin:2016,cutoff:2014,maxHorizon:2,priorStrength:20,
 global:{frequency:[100,10],transitions:[[90,10],[2,8]],memory:[[90,10],[3,7],[9,1],[2,8]]},
 countries:[
 {id:101,name:'SYNTHETIC-A',initial:3,counts:[[10,1],[1,2]],observedStates:[3,3,3,2]},
 {id:102,name:'SYNTHETIC-B',initial:0,counts:[[20,2],[2,1]],observedStates:[0,0,0,0]},
 {id:103,name:'SYNTHETIC-C',initial:2,counts:[[10,2],[1,1]],observedStates:[2,1,3,3]},
 {id:104,name:'INCOMPLETE',initial:3,counts:[[12,1],[1,2]],observedStates:[3,null,3,3]}
 ]};
test('paired stratified resampling deterministic, reports honest uncertainty',()=>{
 const a=auditFirstPassagePairedBands(catalog,{replicates:256,seed:54117});
 const b=auditFirstPassagePairedBands(catalog,{replicates:256,seed:54117});
 assert.deepEqual(a,b);
 assert.equal(a.nCountries,3);assert.equal(a.initialLow,2);assert.equal(a.initialHigh,1);
 assert.equal(a.baseline,'persistence');assert.equal(a.confirmatory,false);
 assert.equal(a.regionalDependenceModelled,false);assert.equal(a.prospectiveSkillProven,false);
 for(const k of ['frequency','markov','country_shrinkage','memory2']){
  const m=a.models[k];assert.equal(m.percentile95.length,2);
  assert.ok(m.percentile95[0]<=m.percentile95[1]);
  assert.ok(m.deltaBrier>=-2&&m.deltaBrier<=2);
  assert.equal(typeof m.excludesZero,'boolean');
 }
 assert.doesNotMatch(JSON.stringify(a),/SYNTHETIC|INCOMPLETE|"id":10[1234]/);
});
test('rejects forecasts, incomplete or invalid resampling parameters',()=>{
 assert.throws(()=>auditFirstPassagePairedBands({...catalog,runType:'prospective'}),/INVALID/);
 assert.throws(()=>auditFirstPassagePairedBands({...catalog,vintageVerified:true}),/INVALID/);
 assert.throws(()=>auditFirstPassagePairedBands(catalog,{replicates:10}),/INVALID/);
 assert.throws(()=>auditFirstPassagePairedBands(catalog,{replicates:10001}),/INVALID/);
 assert.throws(()=>auditFirstPassagePairedBands({...catalog,countries:[catalog.countries[3]]}),/NO_EVALUABLE/);
});
