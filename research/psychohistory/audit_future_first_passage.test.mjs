import test from 'node:test';import assert from 'node:assert/strict';
import {firstPassageDistribution,observedFirstPassage,firstPassageScores,auditFirstPassage} from './audit_future_first_passage.mjs';
import {transitionMatrix} from '../../private-cloudflare/src/research-futures-engine.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,a+' vs '+b);
const catalog={
 runType:'retrospective_revised_release',vintageVerified:false,origin:2016,cutoff:2014,maxHorizon:2,priorStrength:20,
 global:{frequency:[100,10],transitions:[[90,10],[2,8]],memory:[[90,10],[3,7],[9,1],[2,8]]},
 countries:[
 {id:1,name:'FICTION-A',initial:3,counts:[[23,1],[1,5]],observedStates:[3,3,3,2]},
 {id:2,name:'FICTION-B',initial:0,counts:[[20,2],[2,1]],observedStates:[0,0,0,0]},
 {id:3,name:'FICTION-C',initial:2,counts:[[14,0],[1,1]],observedStates:[2,1,3,3]},
 {id:4,name:'FICTION-MISSING',initial:0,counts:[[22,2],[2,1]],observedStates:[0,null,0,0]}]
};
test('first-passage distribution preserves mass, stops at first threshold flip',()=>{
 const matrix=transitionMatrix(catalog,catalog.countries[0],'markov');
 const p=firstPassageDistribution(matrix,3,3);
 const exit=(2+1)/(2+8+2);
 close(p.event[0],exit);close(p.event[1],(1-exit)*exit);
 close(p.event[2],(1-exit)**2*exit);
 close(p.censored,(1-exit)**3);
 close(p.distribution.reduce((a,b)=>a+b,0),1);
 assert.equal(p.initialHigh,true);
 const fixed=firstPassageDistribution(transitionMatrix(catalog,catalog.countries[0],'persistence'),3,3);
 assert.deepEqual(fixed.distribution,[0,0,0,1]);
 assert.equal(firstPassageScores(fixed,2).logLoss,-Math.log(1e-12));
});
test('memory2 has different first-step risk after a one-year entry/exit state',()=>{
 const initial=1,c=catalog.countries[0],m=transitionMatrix(catalog,c,'memory2');
 const p=firstPassageDistribution(m,initial,3);
 const from1=m[1][2];
 const from3=m[3][2];
 close(p.event[0],from1);
 close(p.event[1],(1-from1)*from3);
});
test('classifies bridge, later event, right censor and missing as distinct labels',()=>{
 assert.equal(observedFirstPassage([3,3,3,2],3,3),2);
 assert.equal(observedFirstPassage([2,1,3,3],2,3),0);
 assert.equal(observedFirstPassage([0,0,0,0],0,3),3);
 assert.equal(observedFirstPassage([0,null,0,0],0,3),null);
 assert.equal(observedFirstPassage([3,3],3,3),null);
 assert.equal(observedFirstPassage([0,1,0,0],3,3),null);
});
test('full audit treats each country once; missing cases excluded; baselines aligned',()=>{
 const r=auditFirstPassage(catalog);
 assert.equal(r.cohorts.all.nCountries,3);
 assert.equal(r.cohorts.all.nTransitions,2);
 assert.equal(r.cohorts.all.nCensored,1);
 assert.equal(r.cohorts.all.nBridgeTransitions,1);
 assert.equal(r.cohorts.initialHigh.nCountries,1);
 assert.equal(r.cohorts.initialLow.nCountries,2);
 for(const model of ['frequency','persistence','markov','country_shrinkage','memory2']){
   assert.ok(r.cohorts.all.models[model].meanEventTimeBrier>=0);
   assert.ok(Number.isFinite(r.cohorts.all.models[model].meanEventTimeLogLossCapped));
 }
 assert.equal(r.cohorts.all.models.persistence.zeroAssignedToObserved,2);
 assert.equal(r.vintageVerified,false);
 assert.equal(r.prospectiveEligible,false);
 assert.doesNotMatch(JSON.stringify(r),/FICTION-A|FICTION-B|FICTION-MISSING/);
});
test('refuses prospectives and mismatched cutoff; cumulative event score is proper',()=>{
 assert.throws(()=>auditFirstPassage({...catalog,runType:'prospective'}),/RETROSPECTIVE/);
 assert.throws(()=>auditFirstPassage({...catalog,cutoff:2015}),/RETROSPECTIVE/);
 const matrix=transitionMatrix(catalog,catalog.countries[0],'markov');
 const p=firstPassageDistribution(matrix,3,3);
 const s=firstPassageScores(p,2);
 const manual=p.cumulative.reduce((v,f,i)=>v+(f-Number(2<=i))**2,0)/3;
 close(s.cumulativeBrier,manual);
});
