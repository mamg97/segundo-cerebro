import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {futureGraph, historicalCasePanel} from './research-futures.mjs';
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

test('historical case is hidden by default, escaped, and scores only verified labels',()=>{
  const result={country:{name:'SYNTHETIC'},cutoff:2008,model:'markov',
    caseEvaluations:[{available:true,endYear:2010,actualLabel:'SYNTHETIC <EVENT>',
      models:{markov:{label:'Markov global',probabilityActual:.3,brier:.72,logLoss:1.204},
        frequency:{label:'Frecuencia',probabilityActual:.2,brier:.9,logLoss:1.609}}}]};
  const hidden=historicalCasePanel(result,1,false);
  assert.match(hidden,/Revelar desenlace y evaluar modelos/);
  assert.doesNotMatch(hidden,/SYNTHETIC &lt;EVENT&gt;/);
  const revealed=historicalCasePanel(result,1,true);
  assert.match(revealed,/SYNTHETIC &lt;EVENT&gt;/);
  assert.match(revealed,/Brier individual/);
  assert.match(revealed,/Markov global/);
  assert.doesNotMatch(revealed,/<EVENT>/);
  assert.match(historicalCasePanel({...result,caseEvaluations:[{available:false,endYear:2010}]},1),/no tienen una secuencia observada completa/);
});
