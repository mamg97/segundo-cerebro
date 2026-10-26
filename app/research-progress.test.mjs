import test from 'node:test';
import assert from 'node:assert/strict';
import {progressFacts,renderResearchProgress} from './research-progress.mjs';
const now=new Date('2030-02-20T12:00:00Z');
test('unavailable progress is not invented zero achievement',()=>assert.equal(progressFacts({},now),null));
test('counts completed calendar days, preserves incomplete criteria and escapes source text',()=>{
  const lab={progress:{status:'ok',phases:[{fase_id:'TEST-01',dominio:'<img onerror=x>',fase_madurez:'Data',estado:'COMPLETADA',criterio_superado:'NO'}],advances:[{fecha:'2030-02-20'},{fecha:'2030-02-19'},{fecha:'2030-02-13'},{fecha:'2030-02-12'},{fecha:'2030-02-06'},{fecha:'2030-02-05'}]}};
  assert.deepEqual(progressFacts(lab,now).counts,[2,4]);
  const html=renderResearchProgress(lab,now);assert.match(html,/0 de 1 etapas/);assert.match(html,/Revisar evidencia/);assert.doesNotMatch(html,/<img/);
});
test('unresolved issued forecasts alone provide next resolution; drafts do not',()=>{
  const lab={progress:{status:'ok',phases:[],advances:[]},predictions:[{status:'BORRADOR',outcome:null,resolutionAt:'2030-02-21'}, {status:'EMITIDA_EXPERIMENTAL',outcome:null,resolutionAt:'2030-03-01',phenomenon:'Synthetic target'},{status:'EMITIDA',outcome:0,resolutionAt:'2030-02-22'}]};
  assert.equal(progressFacts(lab,now).upcoming.length,1);assert.match(renderResearchProgress(lab,now),/1\/3\/2030/);
});
