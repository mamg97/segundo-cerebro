import test from 'node:test';
import assert from 'node:assert/strict';
import {lossDistributions,renderLossDistributions} from './research-loss-distribution.mjs';
const metadata=()=>({schema:'psychohistory.market-loss-distribution.v1',runType:'adaptive_historical_screen',forecastIssued:false,skillDemonstrated:false,currentRiskEstimated:false,horizonSessions:20,target:'MAX_CLOSE_LOSS_FROM_ORIGIN_WITHIN_20_SESSIONS',n:40,inputThrough:'2020-01-01',source:'Fuente ficticia',criterion:'Mejorar los dos umbrales.',decision:'rejected',methods:[{label:'Candidato ficticio',quantiles:{q90:{pinball:.02,exceedances:8},q95:{pinball:.01,exceedances:4}}},{label:'Referencia ficticia',quantiles:{q90:{pinball:.019,exceedances:4},q95:{pinball:.012,exceedances:2}}}]});
const row=(n=metadata(),changes={})=>({id:'SYNTHETIC-LOSS',date:'2020-02-01',hypothesis:'Ensayo ficticio',metric:'quantile_pinball',value:n.methods?.[0]?.quantiles?.q90?.pinball,baseline:n.methods?.[1]?.quantiles?.q90?.pinball,notes:JSON.stringify(n),...changes});
test('keeps both quantiles and the joint rejection when q95 alone improves',()=>{
 const html=renderLossDistributions({experiments:[row()]});
 assert.match(html,/Descartado por el criterio conjunto/);assert.match(html,/Umbral del 90 %/);assert.match(html,/Umbral del 95 %/);assert.match(html,/8 de 40 casos/);assert.match(html,/ni constituye una predicción emitida/);assert.doesNotMatch(html,/style=|NaN|Infinity/);
});
test('never fabricates a comparison from legacy or contradictory records',()=>{
 for(const change of [{notes:'invalid'},{notes:'{}'},{metric:'brier'},{value:.03},{baseline:null},{date:'2020-02-30'}])assert.deepEqual(lossDistributions([row(metadata(),change)]),[]);
 for(const change of [{currentRiskEstimated:true},{forecastIssued:true},{skillDemonstrated:true},{n:0},{n:1.5},{inputThrough:'2021-01-01'},{inputThrough:'2020-02-30'},{target:'MAX_DRAWDOWN'},{horizonSessions:21}])assert.deepEqual(lossDistributions([row({...metadata(),...change})]),[]);
});
test('rejects missing quantiles, invalid counts, unbounded scores, null methods and incomplete notes',()=>{
 for(const change of [{pinball:-1},{pinball:1.01},{pinball:null},{exceedances:41},{exceedances:-1},{exceedances:2.5}]){
  const n=metadata();Object.assign(n.methods[0].quantiles.q95,change);assert.equal(lossDistributions([row(n)]).length,0);
 }
 for(const methods of [[null,null],[metadata().methods[0]],[]])assert.equal(lossDistributions([row({...metadata(),methods})]).length,0);
 const n=metadata();delete n.methods[0].quantiles.q95;assert.equal(lossDistributions([row(n)]).length,0);
 assert.equal(lossDistributions([row(metadata(),{notes:' '.repeat(12001)})]).length,0);
});
test('escapes canonical strings and limits evidence to the reviewed public repository',()=>{
 const n=metadata();n.methods[0].label='<img onerror=bad>';n.criterion='<script>bad</script>';
 const html=renderLossDistributions({experiments:[row(n,{hypothesis:'<svg onload=bad>',evidence:'javascript:alert(1)'})]});
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script|<img|<svg onload|javascript:/);
 assert.doesNotMatch(renderLossDistributions({experiments:[row(n,{evidence:'https://github.com/other/repo/pull/1'})]}),/href=/);
});
test('excludes ambiguous duplicate IDs and preserves empty, sorted and limited views',()=>{
 const r=row(),b=row(metadata(),{id:'SYNTHETIC-NEW',date:'2020-03-01'});
 assert.equal(lossDistributions([r,r,b]).length,1);assert.equal(lossDistributions([r,b])[0].id,b.id);
 assert.equal(renderLossDistributions({experiments:[]}), '');
 assert.equal((renderLossDistributions({experiments:[r,b]},{limit:1}).match(/class="loss-trial"/g)||[]).length,1);
});
