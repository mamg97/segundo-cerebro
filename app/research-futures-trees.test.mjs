import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {predictionTreeIndex,predictionYearStrip} from './research-futures-trees.mjs';
import {futureGraph} from './research-futures.mjs';
import {forward,retainedPaths} from '../private-cloudflare/src/research-futures-engine.mjs';
test('two recorded origins yield exactly two independent tree entries',()=>{
 const catalogs=[{id:'a',origin:2020,cutoff:2018,maxHorizon:3,countries:[{id:230}]},
 {id:'b',origin:2016,cutoff:2014,maxHorizon:2,countries:[{id:230}]}];
 const t=predictionTreeIndex(catalogs,'a');
 assert.equal((t.match(/data-ftree=/g)||[]).length,2);
 assert.match(t,/2014 → 2017/);assert.match(t,/2018 → 2022/);
 assert.ok(t.indexOf('ÁRBOL 2016')<t.indexOf('ÁRBOL 2020'));
 assert.match(t,/data-ftree="a" aria-pressed="true"/);
 assert.doesNotMatch(t,/ÁRBOL 2017/);
});
test('every target year remains in full annual strip when inspecting first target',()=>{
 const html=predictionYearStrip({cutoff:2018,origin:2020,maxHorizon:3},1);
 for(const year of [2018,2019,2020,2021,2022])assert.match(html,new RegExp(year));
 assert.equal((html.match(/data-fyear=/g)||[]).length,3);
 assert.match(html,/data-fyear="1" aria-pressed="true"/);
 assert.match(html,/puente no observado/);
});
test('complete SVG tree spans identical years at horizon 1 or 3, observations optional',()=>{
 const matrix=[[.8,.2,0,0],[0,0,.3,.7],[.8,.2,0,0],[0,0,.3,.7]];
 const r={initial:0,cutoff:2000,maxHorizon:3,observedStates:[0,1,3,2,0],
 levels:forward(0,matrix,4).map((l,i)=>({...l,year:2000+i})),
 snapshots:[1,2,3].map(i=>retainedPaths(0,matrix,i+1))};
 const a=futureGraph(r,1,null,false,true),b=futureGraph(r,3,null,false,true);
 assert.equal((a.match(/class="future-year"/g)||[]).length,5);
 assert.equal((b.match(/class="future-year"/g)||[]).length,5);
 for(const y of [2000,2001,2002,2003,2004])assert.match(a,new RegExp('>'+y+'<'));
 assert.match(a,/proyección seleccionada/);
 assert.doesNotMatch(a,/future-observed-halo/);
 assert.match(futureGraph(r,1,null,true,true),/future-observed-halo/);
});
test('UI changes inspection while preserving full graph and scientific year detail',()=>{
 const js=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
 assert.match(js,/futureGraph\(result,horizon,selection,observed,true\)/);
 assert.match(js,/predictionYearStrip\(result,horizon\)/);
 assert.match(js,/historicalObservedTimeline\(result, result\.maxHorizon\)/);
 assert.match(js,/historicalCaseSummary\(result, horizon\)/);
 assert.match(js,/name="catalog"/);
 assert.doesNotMatch(js,/predictionTreeIndex\(catalogs,catalog\.id\)/);
 assert.match(js,/button\[data-fyear\]/);
});
