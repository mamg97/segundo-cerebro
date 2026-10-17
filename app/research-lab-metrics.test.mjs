import test from 'node:test';
import assert from 'node:assert/strict';
import {isResearchScore} from './research-lab-metrics.mjs';
test('context rows do not inflate research score counters',()=>{
 assert.equal(isResearchScore({status:'RETROSPECTIVO_EXPLORATORIO',metric:'contexto'}),false);
 assert.equal(isResearchScore({status:'RETROSPECTIVO_EXPLORATORIO',modelVersion:'ged-context-v1'}),false);
 assert.equal(isResearchScore({status:'CATALOGO_RETROSPECTIVO'}),false);
 assert.equal(isResearchScore({status:'RETROSPECTIVO_EXPLORATORIO',metric:'brier'}),true);
 assert.equal(isResearchScore({status:'SIMULACION_SINTETICA',metric:'escenarios'}),true);
});
