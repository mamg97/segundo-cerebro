import test from 'node:test';import assert from 'node:assert/strict';
import {externalViewsReference,renderExternalReferences} from './research-external-references.mjs';
const data={schema:'psychohistory.external_views_monthly_readonly.v1',status:'EXTERNAL_PUBLISHED_FORECAST_NOT_PSICOHISTORIA',ourForecastIssued:false,windowAggregateConflictProbabilityAvailable:false,annualUcdpTargetComparable:false,countries:2,release:'fatalities003_2030_08_t01',inputThrough:'2030-08',forecastMonths:['2030-11','2030-12','2031-01']};
const row=(d=data)=>({id:'views-external-monthly-20261028',status:'REFERENCIA_EXTERNA',notes:JSON.stringify(d),evidence:'https://docs.google.com/spreadsheets/d/SYNTHETIC_PRIVATE/edit#gid=123'});
test('explicit external source with old input month is never own skill or issuance',()=>{
 assert.equal(externalViewsReference([row()]).countries,2);
 const html=renderExternalReferences({experiments:[row()]});
 assert.match(html,/agosto de 2030/);assert.match(html,/enero de 2031/);assert.match(html,/No son predicciones propias/);assert.doesNotMatch(html,/Brier|emitida|valor validado/);
});
test('missing duplicate, fabricated own issuance, joint probabilities, bad dates or untrusted links hide reference',()=>{
 assert.equal(externalViewsReference([]),null);assert.equal(externalViewsReference([row(),row()]),null);
 for(const changes of [{ourForecastIssued:true},{windowAggregateConflictProbabilityAvailable:true},{annualUcdpTargetComparable:true},{inputThrough:'2030-10'},{forecastMonths:['2030-11','2031-01','2031-02']},{countries:0},{forecastMonths:['2030-13','2031-01','2031-02']}])assert.equal(externalViewsReference([row({...data,...changes})]),null);
 for(const evidence of ['javascript:alert(1)','https://evil.example/sheet','https://docs.google.com.evil.example/spreadsheets/d/x/edit','https://docs.google.com/spreadsheets/d/x/edit?export=1'])assert.equal(externalViewsReference([{...row(),evidence}]),null);
});
