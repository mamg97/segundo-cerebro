import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {researchFuturesResponse} from './research-futures.js';
import {buildComputationTrace} from './research-futures-trace.mjs';
import {buildFutures} from './research-futures-engine.mjs';
import {parseComputationReplay,explainableReplayPanel} from '../../app/research-explainable.mjs';

function catalog(){
 return {schema:'psychohistory.futures.catalog.v1',version:'ucdp-futures-v1',
  runType:'retrospective_revised_release',vintageVerified:false,prospectiveEligible:false,
  runId:'a'.repeat(64),protocolSha256:'b'.repeat(64),codeSha256:'c'.repeat(64),
  datasetVersion:'SYNTHETIC_COHORT',origin:2012,cutoff:2010,observedThrough:2024,
  maxHorizon:3,priorStrength:20,seed:54117,
  global:{frequency:[80,20],transitions:[[70,10],[5,15]],memory:[[60,5],[3,7],[10,5],[2,8]]},
  countries:[{id:1,name:'SYNTHETIC COUNTRY',initial:0,counts:[[12,2],[1,3]]}]};
}
const response=(c=catalog())=>researchFuturesResponse([{id:'CATALOG-SYNTHETIC',notes:JSON.stringify(c)}],
 new URLSearchParams('catalog=CATALOG-SYNTHETIC&country=1&model=markov'));
test('real engine builds a 4x4 trace with exactly conserved mass',()=>{
 const p=response();assert.equal(p.status,200);
 const {result,trace}=p.body;
 assert.equal(trace.isLiveProgress,false);assert.equal(trace.vintageCorrect,false);
 assert.equal(trace.hasIndependentIssueSeal,false);
 assert.equal(trace.frames[0].kind,'source');
 assert.equal(trace.frames[3].kind,'bridge');
 assert.equal(trace.frames.at(-1).kind,'compare');
 assert.equal(trace.frameCount,result.levels.length+3);
 assert.ok(parseComputationReplay(trace,result));
 for(let k=1;k<result.levels.length;k++){
   const f=trace.frames[k+2];
   for(let j=0;j<4;j++)assert.ok(Math.abs(
    f.terms[j].reduce((s,t)=>s+t.product,0)-result.levels[k].distribution[j])<1e-12);
 }
 assert.match(explainableReplayPanel(trace,result,3),/Año puente no observado/);
 assert.match(explainableReplayPanel(trace,result,trace.frames.length-1),/Benchmark/);
 assert.match(explainableReplayPanel(trace,result,0),/no ejecución en directo/);
 assert.doesNotMatch(explainableReplayPanel(trace,result,0),/prospectiva emitida y validada/);
});
test('future labels are never predictors, and the trace is deterministic',()=>{
 const c=catalog(),baseline=buildFutures(c,1,'markov'),old=buildComputationTrace(c,baseline);
 c.countries[0].observedStates=[0,1,3,2,0];
 const again=buildFutures(c,1,'markov');
 assert.deepEqual(old,buildComputationTrace(c,again));
});
test('any altered trace, origin, matrix, or probability fails closed',()=>{
 const p=response().body,{result,trace}=p;
 for(const change of [
  t=>t.frames[3].terms[0][0].product+=.005,
  t=>t.frames[3].next[0]+=.01,
  t=>t.frames[0].cutoff=2011,
  t=>t.vintageCorrect=true,
  t=>t.frames.at(-1).selected=[.25,.25,.25,.25],
  t=>t.frames[2].matrix[0][0]=.99,
 ]){
  const copy=structuredClone(trace);change(copy);
  assert.equal(parseComputationReplay(copy,result),null);
  assert.equal(explainableReplayPanel(copy,result,0),'');
 }
 assert.equal(parseComputationReplay(trace,{...result,prospectiveEligible:true}),null);
});
test('browser replays authenticated trace rather than faking progress',()=>{
 const js=readFileSync(new URL('../../app/research-futures.mjs',import.meta.url),'utf8');
 const renderer=readFileSync(new URL('../../app/research-explainable.mjs',import.meta.url),'utf8');
 assert.match(js,/explainableReplayPanel\(payload\?\.trace,result,traceStep\)/);
 assert.match(js,/data-trace-next/);
 assert.doesNotMatch(renderer,/setInterval|Math\.random|style\s*=/);
 assert.match(renderer,/RETROSPECTIVE_COMPUTATION_REPLAY/);
 assert.match(js,/future-network-first/);
});
