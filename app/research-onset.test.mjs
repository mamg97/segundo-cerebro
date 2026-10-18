import {readFileSync} from 'node:fs';
import {phenomenaScopePanel} from './research-futures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOnsetSummaries,onsetSummaryPanel,onsetObservedAnnualChart,parseOnsetCasebook,onsetCasebookPanel} from './research-onset.mjs';

const makeCase=(name,range,nYears)=>{
  const n=nYears*10, events=nYears;
  const base=.02, country=.0198;
  return {name,years:range,n,events,excluded:0,
    baselineBrier:base,countryBrier:country,countrySkill:1-country/base,
    baselineAveragePrecision:.03,averagePrecision:.07,topDecileRecall:.3,topDecileLift:3,
    logLoss:.1,baselineLogLoss:.11,skillInterval95:[-.08,.08],
    annual:Array.from({length:nYears},(_,i)=>({year:range[0]+i,n:10,events:1}))};
};
const report={
  schema:'psychohistory.onset.summary.v1',datasetVersion:'25.1',target:'onset1',kind:'intrastate_country',
  runType:'retrospective_revised_release_exploratory',sourceAsOfVerified:false,prospectiveEligible:false,
  sourceIndependentShaPinning:false,sourceSha256:'b'.repeat(64),
  informationLagYears:2,historyYears:5,models:['global_frequency','country_shrinkage'],
  validation:makeCase('validation',[2010,2015],6),
  test:makeCase('test',[2016,2024],9),
};
function row(data=report,extra={}){
 return {id:'SYNTHETIC-1',status:'RETROSPECTIVO_EXPLORATORIO',
   evidence:'https://drive.google.com/file/d/FAKE_SOURCE_ID/view',notes:JSON.stringify(data),...extra};
}
test('private onset summary checks integrity of sample, results and provenance flags',()=>{
 const x=parseOnsetSummaries([row()]);
 assert.equal(x.accepted.length,1);
 assert.equal(x.rejected.length,0);
 assert.equal(x.accepted[0].test.n,90);
 assert.match(onsetSummaryPanel([row()]),/Inicios de conflictos/);
 assert.match(onsetSummaryPanel([row()]),/2016–2024/);
 assert.match(onsetSummaryPanel([row()]),/1,00 %/);
 assert.match(onsetSummaryPanel([row()]),/Informe completo privado/);
});
test('reject mislabeled prospective, corrupted partition and fake Drive evidence',()=>{
 const wrongs=[
  {...report,sourceAsOfVerified:true},
  {...report,prospectiveEligible:true},
  {...report,test:{...report.test,events:4}},
  {...report,test:{...report.test,countrySkill:.9}},
  {...report,test:{...report.test,annual:report.test.annual.slice(1)}},
  {...report,models:['country_shrinkage','global_frequency']},
  {...report,sourceSha256:'not hash'}
 ];
 for(const wrong of wrongs){
  const x=parseOnsetSummaries([row(wrong)]);
  assert.equal(x.accepted.length,0);
  assert.equal(x.rejected.length,1);
 }
 assert.equal(parseOnsetSummaries([row(report,{evidence:'https://evil.example/?x=1'})]).accepted.length,0);
});
test('missing report does not fabricate probabilities, names or scores',()=>{
 assert.equal(onsetSummaryPanel([]),'');
 assert.equal(parseOnsetSummaries([{id:'x',notes:'not a json',status:'x'}]).accepted.length,0);
});
test('escape rich text and link safety while keeping two independent objectives',()=>{
 const synthetic={...report,kind:'interstate_country'};
 const body=onsetSummaryPanel([row(report),row(synthetic,{id:'SYNTHETIC-2'})]);
 assert.equal((body.match(/future-onset-report-title/g)||[]).length,2);
 assert.match(body,/conflicto interno/);
 assert.match(body,/conflicto interestatal/);
 assert.doesNotMatch(body,/vintage-correct validated|prospective skill proven/);
});

test('capability labels reflect validated private experiments and distinguish unissued forecasts',()=>{
  const html=phenomenaScopePanel([row(report)]);
  assert.equal((html.match(/RESULTADOS RETROSPECTIVOS · NO PROSPECTIVOS/g)||[]).length,1);
  assert.equal((html.match(/SIN PROBABILIDADES REALES TODAVÍA/g)||[]).length,1);
  const both=phenomenaScopePanel([row(report),row({...report,kind:'interstate_country'},{id:'SYNTHETIC-2'})]);
  assert.equal((both.match(/RESULTADOS RETROSPECTIVOS · NO PROSPECTIVOS/g)||[]).length,2);
  assert.doesNotMatch(both,/SIN PROBABILIDADES REALES TODAVÍA/);
  assert.equal((phenomenaScopePanel().match(/SIN PROBABILIDADES REALES TODAVÍA/g)||[]).length,2);
});

test('year-by-year observed onset counts come from accepted retrospective rows only',()=>{
  const intra=parseOnsetSummaries([row()]).accepted[0];
  const inter=parseOnsetSummaries([row({...report,kind:'interstate_country'},{id:'SYNTHETIC-2'})]).accepted[0];
  const svg=onsetObservedAnnualChart([intra,inter]);
  assert.match(svg,/2016/);
  assert.match(svg,/2024/);
  assert.match(svg,/Inicios o reanudaciones de conflicto observados/);
  assert.match(svg,/2016 · Inicio o reanudación de conflicto interno: 1 de 10 países observados/);
  assert.match(svg,/2016 · Inicio o reanudación de conflicto interestatal: 1 de 10 países observados/);
  assert.match(svg,/No representan guerras independientes/);
  assert.equal((svg.match(/<rect /g)||[]).length,18);
  const panel=onsetSummaryPanel([row()]);
  assert.ok(panel.indexOf('Acontecimientos observados por año')<panel.indexOf('future-onset-reports'));
});
test('annual plot hides absent or inconsistent scores without inventing an event',()=>{
  assert.equal(onsetObservedAnnualChart([]),'');
  assert.equal(onsetObservedAnnualChart([{...report,test:{...report.test,events:999}}]),'');
  assert.doesNotMatch(onsetSummaryPanel([]),/Acontecimientos observados por año/);
});

function syntheticCasebook(){
 const sources={intrastate_country:'b'.repeat(64),interstate_country:'b'.repeat(64)};
 return {
  schema:'psychohistory.onset.casebook.v1',datasetVersion:'25.1',target:'onset1',
  runType:'retrospective_revised_release_exploratory',sourceAsOfVerified:false,
  prospectiveEligible:false,sourceIndependentShaPinning:false,informationLagYears:2,
  models:['global_frequency','country_shrinkage'],yearRange:[2016,2024],
  sourceSha256:sources,
  cases:['intrastate_country','interstate_country'].flatMap(kind=>
    Array.from({length:9},(_,i)=>({
      kind,year:2016+i,countryId:kind==='intrastate_country'?100+i:200+i,
      country:i===0?'SYNTHETIC <EVENT>':'SYNTHETIC COUNTRY '+i,
      cutoffYear:2014+i,onset:1,pCountry:.02,pGlobal:.03
    })))
 };
}
function caseRows(data=syntheticCasebook()){
 return [row(),row({...report,kind:'interstate_country'},{id:'SYNTHETIC-2'}),
   row(data,{id:'SYNTHETIC-BOOK'})];
}
test('strictly grounded casebook matches independent official summary event counts for each year',()=>{
 const result=parseOnsetCasebook(caseRows());
 assert.equal(result.accepted.length,1);
 assert.equal(result.accepted[0].cases.length,18);
 const html=onsetCasebookPanel(caseRows());
 assert.match(html,/2016/);
 assert.match(html,/2024/);
 assert.match(html,/Países y años/);
 assert.match(html,/SYNTHETIC &lt;EVENT&gt;/);
 assert.doesNotMatch(html,/<EVENT>/);
 assert.equal((html.match(/data-onset-case /g)||[]).length,18);
 assert.match(html,/P. modelo país/);
 assert.match(html,/P. frecuencia global/);
 assert.match(html,/No son guerras independientes/);
 assert.ok(onsetSummaryPanel(caseRows()).indexOf('Países y años')<
           onsetSummaryPanel(caseRows()).indexOf('future-onset-reports'));
});
test('casebook rejects a tampered source, missing year, forged odds or invented onset count',()=>{
 const variants=[
  {...syntheticCasebook(),sourceAsOfVerified:true},
  {...syntheticCasebook(),sourceSha256:{...syntheticCasebook().sourceSha256,interstate_country:'0'.repeat(64)}},
  {...syntheticCasebook(),cases:syntheticCasebook().cases.slice(1)},
  {...syntheticCasebook(),cases:[...syntheticCasebook().cases,syntheticCasebook().cases[0]]},
  {...syntheticCasebook(),cases:syntheticCasebook().cases.map((c,i)=>i===0?{...c,cutoffYear:c.year-1}:c)},
  {...syntheticCasebook(),cases:syntheticCasebook().cases.map((c,i)=>i===0?{...c,pCountry:1.1}:c)},
  {...syntheticCasebook(),cases:syntheticCasebook().cases.map((c,i)=>i===0?{...c,onset:0}:c)}
 ];
 for(const data of variants){
  const checked=parseOnsetCasebook(caseRows(data));
  assert.equal(checked.accepted.length,0);
  assert.equal(checked.rejected.length,1);
 }
 assert.equal(onsetCasebookPanel(caseRows().slice(0,2)),'');
 assert.equal(onsetCasebookPanel([]),'');
});

test('versioned source of the Onset chart and historical casebook cannot be stale',()=>{
  const fs=requireForTest();
  const view=fs('research-lab.html');
  const loader=fs('research-lab.js');
  const futures=fs('research-futures.mjs');
  const v='0.5.12';
  assert.ok(view.includes('v'+v),'html must expose current version');
  assert.ok(loader.includes('research-futures.mjs?v='+v),'lab loader must bust futures cache');
  assert.ok(futures.includes('research-onset.mjs?v='+v),'futures must bust onset cache');
});
function requireForTest(){
  return file=>requireFileText(file);
}
function requireFileText(file){
  const url=new URL('./'+file,import.meta.url);
  return readFileSync(url,'utf8');
}
