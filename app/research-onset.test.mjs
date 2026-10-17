import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOnsetSummaries,onsetSummaryPanel} from './research-onset.mjs';

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
