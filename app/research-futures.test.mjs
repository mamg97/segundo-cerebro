import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {futureGraph, historicalCasePanel, historicalCaseSummary, historicalObservedTimeline, historicalCaseComparison, observedCaseAvailable} from './research-futures.mjs';
import {forward,retainedPaths} from '../private-cloudflare/src/research-futures-engine.mjs';

const matrix = [[.8,.2,0,0],[0,0,.3,.7],[.8,.2,0,0],[0,0,.3,.7]];
const result = {initial:0,cutoff:2000,states:['SYNTHETIC 00','SYNTHETIC 01','SYNTHETIC 10','SYNTHETIC 11'],
  levels:forward(0,matrix,4).map((level,i)=>({...level,year:2000+i})),
  snapshots:[1,2,3].map(h=>retainedPaths(0,matrix,h+1)),observedStates:[0,1,3,2,0]};

test('graph labels and widths represent supplied marginal, conditional and joint probabilities',()=>{
  const svg=futureGraph(result,3);
  assert.match(svg,/probabilidad marginal 64 %/);
  assert.match(svg,/condicional 80 %; flujo 80 %/);
  assert.ok(svg.includes('stroke-width="'+(.5+.8*14)+'"'));
  assert.match(svg,/puente no observado/);
  assert.doesNotMatch(svg,/future-observed"/);
  assert.match(futureGraph(result,3,null,true),/future-observed"/);
  assert.match(futureGraph(result,3,{kind:'path',index:0}),/future-flow selected/);
});

test('interactive explorer honors CSP and reads probabilities from the private engine',()=>{
  const js=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(js,/style\s*=/i);
  assert.doesNotMatch(js,/Math\.random|localStorage|setInterval/);
  assert.match(js,/\/api\/research-futures/);
  assert.match(js,/abort\?\.abort/);
  assert.match(js,/observer\.disconnect/);
  assert.match(js,/prefers-reduced-motion/);
});


function historicalFixture() {
  return {country:{name:'SYNTHETIC <PLACE>'},origin:2002,cutoff:2000,model:'markov',modelLabel:'Markov global',
    caseEvaluations:[{available:true,endYear:2002,actualState:3,actualLabel:'SYNTHETIC <EVENT>',
      models:{markov:{label:'Markov global',probabilityActual:.3,brier:.72,logLoss:1.204},
        frequency:{label:'Frecuencia',probabilityActual:.2,brier:.9,logLoss:1.609}}}],
    observedStates:[0,1,3,2,0],levels:result.levels,snapshots:result.snapshots,initial:0};
}

test('historical outcome is the first scientific panel and visible by default',()=>{
  const sample=historicalFixture();
  assert.equal(observedCaseAvailable(sample,1),true);
  assert.equal(observedCaseAvailable(sample,3),false);
  const summary=historicalCaseSummary(sample,1);
  assert.match(summary,/CASO HISTÓRICO/);
  assert.match(summary,/ESTADO REAL REGISTRADO/);
  assert.match(summary,/SYNTHETIC &lt;EVENT&gt;/);
  assert.match(summary,/30 %/);
  assert.match(summary,/Brier individual/);
  assert.match(summary,/as-of/);
  assert.doesNotMatch(summary,/<EVENT>|<PLACE>/);
  const full=historicalCasePanel(sample,1);
  assert.ok(full.indexOf('ESTADO REAL REGISTRADO')<full.indexOf('Los cinco modelos'));
});

test('actual historical trajectory is shown on the graph, without conditioning predicted flows',()=>{
  const caseResult=historicalFixture();
  const hidden=futureGraph(caseResult,3,null,false);
  const actual=futureGraph(caseResult,3,null,true);
  assert.doesNotMatch(hidden,/future-observed-halo|REAL · FINAL/);
  assert.match(actual,/future-observed-halo/);
  assert.match(actual,/future-real-ring/);
  assert.match(actual,/REAL · FINAL/);
  assert.match(actual,/Recorrido realmente observado después/);
  assert.ok(actual.includes('stroke-width="'+(.5+.8*14)+'"'), 'probabilistic edge width is unchanged by real overlay');
});

test('per-year chronicle labels cutoff, latent bridge and observed threshold events',()=>{
  const sample=historicalFixture();
  const rendered=historicalObservedTimeline(sample,3);
  assert.match(rendered,/2000/);
  assert.match(rendered,/2001/);
  assert.match(rendered,/2002/);
  assert.match(rendered,/AÑO PUENTE/);
  assert.match(rendered,/No conocido al emitir/);
  assert.match(rendered,/Entrada/);
  assert.match(rendered,/Persistencia/);
  assert.match(rendered,/Salida/);
  assert.match(rendered,/No implica|no implica|por debajo/);
});

test('all models compare on same observed event; unknown outcomes never receive false scores',()=>{
  const sample=historicalFixture();
  const compare=historicalCaseComparison(sample,1);
  assert.match(compare,/Markov global/);
  assert.match(compare,/Frecuencia/);
  assert.match(compare,/30 %/);
  const missing={...sample,caseEvaluations:[{available:false,endYear:2002,reason:'INCOMPLETE_OBSERVED_SEQUENCE'}]};
  assert.equal(observedCaseAvailable(missing,1),false);
  assert.doesNotMatch(historicalCaseSummary(missing,1),/30 %|Log-loss individual/);
  assert.doesNotMatch(historicalCaseComparison(missing,1),/30 %|Markov global/);
  assert.match(historicalCaseSummary(missing,1),/No se puede puntuar/);
  const unresolved={...sample,caseEvaluations:[]};
  assert.match(historicalCaseSummary(unresolved,1),/Pronóstico sin desenlace verificable/);
  assert.doesNotMatch(historicalCaseSummary(unresolved,1),/30 %/);
});

test('app launches directly into research cases without covering initial viewport',()=>{
  const labJs=readFileSync(new URL('./research-lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('./research-lab.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
  assert.ok(labJs.includes('activeView="futures"'));
  assert.ok(labJs.includes('document.body.dataset.labView = activeView'));
  assert.ok(css.includes('body[data-lab-view="futures"] .hero'));
  assert.ok(js.includes('observed = observedCaseAvailable(data.result,horizon)'));
  assert.ok(js.includes('historicalCaseSummary(result, horizon)'));
  assert.ok(js.includes('historicalObservedTimeline(result, horizon)'));
  assert.ok(js.indexOf('historicalCaseSummary(result, horizon) +') < js.indexOf('futureGraph(result, horizon, selection, observed)'));
});
