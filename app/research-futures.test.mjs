import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {futureGraph, historicalCasePanel, historicalCaseSummary, historicalObservedTimeline, historicalCaseComparison, observedCaseAvailable, historicalEventCards, phenomenaScopePanel, preferredFutureCountry, futureGraphGuide} from './research-futures.mjs';
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
  assert.ok(js.includes("container.innerHTML = phenomenaTree(onsetExperiments,selectedPhenomenon,true) +"), 'phenomenon tree precedes the selected scientific network');
  assert.ok(js.indexOf('const controlsAboveGraph =') < js.indexOf('container.innerHTML = phenomenaTree(onsetExperiments,selectedPhenomenon,true) +'));
  assert.ok(js.indexOf('const graphFirst = result ?') < js.indexOf('const annualHTML = controlsAboveGraph + graphFirst'));
  assert.ok(js.includes('<div class="future-selection"><div class="section-heading">'));
  assert.ok(js.includes('<form class="future-controls">'));
  assert.ok(js.includes('Calcular predicción retrospectiva'));
  assert.equal((js.match(/<form class="future-controls">/g) || []).length, 1, 'only one selection form');
  assert.ok(js.includes('historicalEventCards(result,horizon)'));
  assert.ok(js.includes('data-fevent'));
  assert.ok(js.includes('observed = observedCaseAvailable(data.result,horizon)'));
});

test('annotated real-line markers and evidence cards expose historical outcomes on graph',()=>{
  const sample=historicalFixture();
  const svg=futureGraph(sample,3,null,true);
  assert.match(svg,/future-event-marker/);
  assert.match(svg,/data-fevent="4"/);
  const annotated=historicalEventCards(sample,3);
  assert.match(annotated,/2001 · PUENTE EX POST/);
  assert.match(annotated,/2002 · AÑO OBJETIVO/);
  assert.match(annotated,/Entrada en episodio agregado/);
  assert.match(annotated,/Persistencia del episodio agregado/);
  assert.match(annotated,/Consultando datos oficiales UCDP/);
  assert.doesNotMatch(historicalEventCards({...sample,observedStates:[0,null,null]},1),/data-fevent/);
});

test('verified official source evidence is escaped, specific, and not a fabricated event',()=>{
  const sample=historicalFixture();
  sample.observedEvidence=[{year:2002,sbDeathsBest:37,sbDyadCount:1,
    dyadNames:['Government of SYNTHETIC - <ENEMY>'],
    sourceUrl:'https://ucdp.uu.se/downloads/'}];
  const html=historicalEventCards(sample,1);
  assert.match(html,/37 muertes estatales/);
  assert.match(html,/Government of SYNTHETIC - &lt;ENEMY&gt;/);
  assert.doesNotMatch(html,/<ENEMY>/);
  assert.equal((html.match(/37 muertes estatales/g)||[]).length,1);
});

test('target scope separates current retrospective scores from not-yet-evaluated onsets',()=>{
  const html=phenomenaScopePanel();
  assert.match(html,/DISPONIBLE · RETROSPECTIVO/);
  assert.match(html,/Episodio agregado de violencia estatal/);
  assert.match(html,/Inicio de conflicto armado interno/);
  assert.match(html,/Inicio de conflicto entre Estados/);
  assert.equal((html.match(/SIN PROBABILIDADES REALES TODAVÍA/g)||[]).length,2);
  assert.doesNotMatch(html,/100 % de acierto|predicción prospectiva validada/);
  const source=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('container.innerHTML = phenomenaTree(onsetExperiments,selectedPhenomenon,true) +'));
  assert.ok(source.includes('phenomenonDetails(onsetExperiments,selectedPhenomenon)'));
});

test('country, catalog and model changes immediately calculate rather than leaving the tree blank',()=>{
  const source=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
  const selectorStart=source.indexOf("container.querySelectorAll('.future-controls select').forEach");
  const selectorEnd=source.indexOf("container.querySelector('[name=\"horizon\"]')?.addEventListener",selectorStart);
  assert.ok(selectorStart>=0 && selectorEnd>selectorStart);
  const handler=source.slice(selectorStart,selectorEnd);
  assert.match(handler,/select\.name === 'catalog'/);
  assert.match(handler,/select\.name === 'country'/);
  assert.match(handler,/void load\('\[name="/);
  assert.doesNotMatch(handler,/payload = null; playing = false; observed = false; error = ''/);
  assert.match(source,/async function load\(focus = null\)/);
  assert.match(source,/render\(focus\)/);
  assert.match(source,/render\(\); load\(\);/);
  assert.match(source,/abort\?\.abort\(\); abort = new AbortController\(\)/);
  assert.match(source,/if \(mine !== request \|\| disposed\) return/);
});

test('Spain ID 230 is the default if present, with safe fallback if missing',()=>{
  const withSpain={countries:[{id:11,name:'SYNTHETIC REPUBLIC'},
    {id:230,name:'Spain'},{id:12,name:'SYNTHETIC OTHER'}],suggestedCountryId:11};
  assert.equal(preferredFutureCountry(withSpain),230);
  assert.equal(preferredFutureCountry({countries:[{id:11,name:'SYNTHETIC REPUBLIC'}],suggestedCountryId:11}),11);
  assert.equal(preferredFutureCountry({countries:[{id:5,name:'SYNTHETIC OTHER'}]}),5);
  assert.equal(preferredFutureCountry({countries:[]}),null);
  const source=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
  assert.match(source,/country = preferredFutureCountry\(catalog\)/);
  assert.match(source,/if \(!catalog\.countries\.some\(c => String\(c\.id\) === String\(country\)\)\) country = preferredFutureCountry\(catalog\)/);
});

test('graph guide states the exact 25-death binary target and each transition',()=>{
  const fixture={country:{name:'SYNTHETIC <PLACE>'},cutoff:2018,origin:2020,
    snapshots:[{endYear:2020,distribution:[.70,.10,.15,.05]},
      {endYear:2021,distribution:[.65,.15,.10,.10]},
      {endYear:2022,distribution:[.60,.20,.10,.10]}]};
  const html=futureGraphGuide(fixture,3);
  assert.match(html,/¿Se registrarán 25 o más muertes/);
  assert.match(html,/2022/);
  assert.match(html,/30 %/); // 01+11: current year at or above threshold
  assert.match(html,/70 %/); // 00+10: below threshold
  assert.match(html,/60 %/); // most likely pair of annual states
  assert.match(html,/2018/);
  assert.match(html,/2019 es puente sin observar/);
  for(const label of ['Bajo → bajo','Entrada','Salida','Persistencia'])
    assert.match(html,new RegExp(label));
  assert.match(html,/no equivale a predecir una guerra o un ataque específico/);
  assert.match(html,/SYNTHETIC &lt;PLACE&gt;/);
  assert.doesNotMatch(html,/<PLACE>/);
  assert.equal(futureGraphGuide({...fixture,snapshots:[{endYear:2020,distribution:[.5,.5,.5,.5]}]},1),'');
});

test('quick interpretation appears before SVG, no duplicate distant legend',()=>{
 const source=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
 const start=source.indexOf('const graphFirst = result ?');
 const end=source.indexOf('const controlsAboveGraph =',start);
 const graph=source.slice(start,end);
 assert.ok(graph.indexOf('futureGraphGuide(result,horizon)')<graph.indexOf('futureGraph(result,horizon,selection,observed)'));
 assert.doesNotMatch(source,/future-after-network.*future-legend/);
 assert.match(source,/la trayectoria real se superpone a posteriori/);
});
