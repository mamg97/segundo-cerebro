import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {supportedQuestionIds,questionSummary,questionSelect,futureNodeRail} from './research-futures-questions.mjs';
import {futureGraphGuide} from './research-futures.mjs';
const masses=[.70,.10,.15,.05],fixture={
 country:{name:'SYNTHETIC <PLACE>'},cutoff:2018,origin:2020,maxHorizon:3,
 snapshots:[{endYear:2020,distribution:masses},{endYear:2021,distribution:masses},{endYear:2022,distribution:masses}]
};
test('all supported questions are exact sums of frozen four-state probabilities',()=>{
 const expected={atleast25:.15,below25:.85,entry:.10,exit:.15,persistence:.05,stable_low:.70};
 assert.deepEqual([...supportedQuestionIds].sort(),Object.keys(expected).sort());
 for(const [id,value] of Object.entries(expected)){
  const s=questionSummary(masses,2022,id);
  assert.ok(Math.abs(s.answer-value)<1e-12,id);
  assert.ok(Math.abs(s.complement-(1-value))<1e-12,id);
 }
 assert.equal(questionSummary([.1,.1,.1,.1],2022),null);
 assert.equal(questionSummary([.7,.1,.15,-.05],2022),null);
 assert.equal(questionSummary(masses,2022,'fake-id').id,'atleast25');
});
test('question changes label and summary but no mathematical graph input',()=>{
 const a=futureGraphGuide(fixture,3,'entry');
 assert.match(a,/de menos de 25 muertes estatales en 2021 a 25 o más en 2022/);
 assert.match(a,/10 %/);assert.match(a,/Entrada \(01\)/);
 const b=futureGraphGuide(fixture,3,'atleast25');
 assert.match(b,/¿Se registrarán 25 o más muertes/);assert.match(b,/15 %/);
 assert.notEqual(a,b);assert.doesNotMatch(a,/<PLACE>/);
});
test('right-aligned row meanings have correct two-year semantics and YES highlighting',()=>{
 const rail=futureNodeRail('entry');
 assert.equal((rail.match(/class="future-rail-state/g)||[]).length,4);
 for(const label of ['00 · Bajo → bajo','01 · Entrada','10 · Salida','11 · Persistencia'])assert.ok(rail.includes(label));
 assert.match(rail,/Año anterior &lt;25 · actual ≥25/);
 assert.match(rail,/future-rail-1 is-answer/);
 assert.equal((rail.match(/Responde SÍ/g)||[]).length,1);
 assert.equal((futureNodeRail('atleast25').match(/Responde SÍ/g)||[]).length,2);
});
test('other prediction branches are explicitly disabled until scientifically modelled',()=>{
 const html=questionSelect('persistence');
 assert.match(html,/name="prediction-question"/);assert.match(html,/value="persistence" selected/);
 assert.match(html,/<option disabled>Inicio de una guerra nueva/);
 assert.match(html,/<option disabled>Decisiones políticas/);
 assert.match(html,/<option disabled>Mercados y empresas/);
 assert.doesNotMatch(html,/value="markets"/);
 const js=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
 for(const name of ['questionSelect(question)','futureNodeRail(question)','questionSummary(masses,snapshot.endYear,question)'])assert.ok(js.includes(name),name);
 assert.match(js,/\[name="prediction-question"\]/);
});
