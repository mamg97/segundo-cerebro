import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGedContextBatches,gedCaseCell,gedContextSummary} from './research-ged-events.mjs';

const id='e256f1fb20a579d8b2f910e5bae212f486d3002adaa2e4359ace740c737da05d';
const book={cases:[{kind:'intrastate_country',countryId:365,year:2022},
  {kind:'interstate_country',countryId:2,year:2024}]};
const incident={
 gedEventId:9,countryId:365,year:2022,violenceType:1,
 dateStart:'2022-02-12',dateEnd:'2022-02-13',datePrecision:2,locationPrecision:3,
 location:'SYNTHETIC <TOWN>',dyad:'SYNTHETIC A <SCRIPT> - SYNTHETIC B',
 conflict:'SYNTHETIC',bestDeaths:17,lowDeaths:15,highDeaths:19,latitude:12.3,longitude:-25.4
};
const cases=[{kind:'intrastate_country',countryId:365,year:2022,onset:1,
  stateBasedEventsWithinBorders:1,examples:[incident],
  matchingRelation:'same_country_id_and_calendar_year_only',
  eventSelection:'top_3_by_best_reported_deaths_not_onset_attribution'},
  {kind:'interstate_country',countryId:2,year:2024,onset:1,
  stateBasedEventsWithinBorders:0,examples:[],
  matchingRelation:'same_country_id_and_calendar_year_only',
  eventSelection:'top_3_by_best_reported_deaths_not_onset_attribution'}];
function row(c,batchIndex=0,batchCount=1){
 return {id:'SYNTHETIC-'+batchIndex,status:'RETROSPECTIVO_EXPLORATORIO',
  evidence:'https://drive.google.com/file/d/SYNTHETIC_SOURCE/view',
  notes:JSON.stringify({schema:'psychohistory.onset.ged_context_batch.v1',
    datasetVersion:'25.1',gedEdition:'25.1',onsetEdition:'25.1',gedZipSha256:id,
    gedSource:'https://ucdp.uu.se/downloads/ged/ged251-csv.zip',
    asOfVerified:false,prospectiveEligible:false,notAnOnsetEventLink:true,
    batchIndex,batchCount,cases:c})};
}
test('complete independently checked GED evidence renders sourced events, not an onset cause',()=>{
 const result=parseGedContextBatches([row(cases)],book);
 assert.equal(result.ready,true);
 assert.equal(result.accepted.length,2);
 const html=gedCaseCell(book.cases[0],result);
 assert.match(html,/17/);
 assert.match(html,/GED #9/);
 assert.match(html,/Precisión de fecha 2/);
 assert.match(html,/SYNTHETIC &lt;TOWN&gt;/);
 assert.doesNotMatch(html,/<SCRIPT>|<TOWN>/);
 assert.match(html,/no los primeros incidentes ni/);
 assert.match(gedCaseCell(book.cases[1],result),/No implica ausencia de conflicto/);
 assert.match(gedContextSummary(result),/1 de 2 casos/);
});
test('missing or tampered batches suppress ALL case context rather than presenting incomplete population',()=>{
 assert.equal(parseGedContextBatches([],book).ready,false);
 const malformed=[
  [row([cases[0]],0,1)],
  [row(cases,0,2)],
  [row(cases,0,1),row(cases,0,1)],
  [row(cases.map((c,i)=>i===0?{...c,examples:[{...incident,year:2023}]}:c))],
  [row(cases.map((c,i)=>i===0?{...c,examples:[{...incident,dateStart:'2022-14-42'}]}:c))],
  [row(cases.map((c,i)=>i===0?{...c,matchingRelation:'proved_to_cause_onset'}:c))],
 ];
 for(const bad of malformed){const output=parseGedContextBatches(bad,book);assert.equal(output.ready,false);}
 assert.match(gedCaseCell(book.cases[0],{ready:false}),/archivo por validar/);
});
test('multiple distinct chunks join only with all canonical case identities present',()=>{
 const success=parseGedContextBatches([row([cases[1]],1,2),row([cases[0]],0,2)],book);
 assert.equal(success.ready,true);
 const badRow=row([cases[0]],0,2);
 const corrupted={...JSON.parse(badRow.notes),gedZipSha256:'0'.repeat(64)};
 const spoof=parseGedContextBatches([row([cases[1]],1,2),
   {...badRow,notes:JSON.stringify(corrupted)}],book);
 assert.equal(spoof.ready,false);
});
test('ged labels reject incident dates with false year, and no access outside verified books',()=>{
 const wrongCases=[{...cases[0],examples:[{...incident,dateEnd:'2023-01-01'}]},cases[1]];
 assert.equal(parseGedContextBatches([row(wrongCases)],book).ready,false);
 assert.equal(parseGedContextBatches([row(cases)],null).ready,false);
 assert.equal(parseGedContextBatches([row(cases)],{cases:[book.cases[0]]}).ready,false);
});
