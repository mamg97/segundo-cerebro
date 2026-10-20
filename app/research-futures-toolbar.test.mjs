import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {futureFilterBar} from './research-futures.mjs';

const catalog={
 id:'SYNTHETIC2016',origin:2016,cutoff:2014,maxHorizon:10,
 countries:[{id:230,name:'Spain'},{id:220,name:'Portugal'}],
 models:{markov:'Markov global',v2:'Regresión V2'}
};
const alternate={...catalog,id:'SYNTHETIC2020',origin:2020,cutoff:2018,maxHorizon:6};
const render=(extra={})=>futureFilterBar({
 catalogs:[catalog,alternate],catalog,country:230,model:'markov',
 question:'entry',observed:false,canShowObserved:true,loading:false,...extra
});

test('all inputs in exactly one toolbar; no duplicate question panel or origin cards',()=>{
 const html=render();
 assert.match(html,/^<form class="future-controls future-controls-single-row"/);
 assert.match(html,/<\/form>$/);
 assert.equal((html.match(/<form /g)||[]).length,1);
 for(const input of ['country','catalog','model','prediction-question']){
  assert.equal((html.match(new RegExp('name="'+input+'"','g'))||[]).length,1,input);
 }
 assert.equal((html.match(/name="observed"/g)||[]).length,1);
 assert.equal((html.match(/class="future-calculate"/g)||[]).length,1);
 assert.match(html,/value="entry" selected/);
 assert.match(html,/2016 · información ≤ 2014/);
 assert.match(html,/2020 · información ≤ 2018/);
 assert.match(html,/aria-label="Calcular predicción retrospectiva"/);
 assert.doesNotMatch(html,/future-question-bar|future-tree-index|data-ftree/);
});
test('observed availability and loading state have explicit disabled controls',()=>{
 const hidden=render({canShowObserved:false,loading:true});
 assert.match(hidden,/name="observed" disabled/);
 assert.match(hidden,/class="future-calculate" aria-label="Calcular predicción retrospectiva" disabled/);
 assert.match(hidden,/Calculando…/);
 assert.match(render({observed:true}),/name="observed" checked/);
});
test('toolbar escapes real country/model text and leaves unsupported questions disabled',()=>{
 const injected={...catalog,countries:[{id:230,name:'<img src=x onerror=alert(1)>'}],models:{markov:'<script>bad</script>'}};
 const html=render({catalog:injected});
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/<option disabled>Inicio de una guerra nueva/);
});
test('question changes are local, other inputs continue to query private engine',()=>{
 const js=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
 assert.match(js,/futureFilterBar\(\{catalogs,catalog,country,model,question,observed/);
 assert.match(js,/futureGraphGuide\(result,horizon,question\)/);
 assert.match(js,/futureNodeRail\(question\)/);
 assert.match(js,/\.future-controls select\[name="country"\]/);
 assert.match(js,/\[name="prediction-question"\]/);
 assert.match(js,/question=e\.target\.value/);
 assert.match(js,/render\('\[name="prediction-question"\]'\)/);
 assert.match(js,/\[name="observed"\]/);
 assert.doesNotMatch(js,/predictionTreeIndex\(catalogs,catalog\.id\)/);
 assert.doesNotMatch(js,/class="future-question-bar"/);
});
