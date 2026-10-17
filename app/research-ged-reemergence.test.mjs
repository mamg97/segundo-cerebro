import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGedIncidentPreview,gedIncidentPreviewPanel,GED_PREVIEW_SCHEMA} from './research-ged-reemergence.mjs';
const probabilities={global_reemergence:.05,country_shrinkage:.1,country_history:.2,time_since_last_event:.12};
const item={id:101,cid:11,date:'2022-03-19',country:'FICTIONAL REPUBLIC',place:'FICTIONAL HARBOUR',
  sideA:'FICTIONAL A',sideB:'FICTIONAL B',dyad:'A - B',conflict:'MOCK EVENT',sourceDatesRaw:'',
  best:3,low:2,high:5,wherePrecision:2,positiveWindowCount:2,
  issueMonth:'2020-04',targetEndMonth:'2022-03',probabilities};
const row=(events,index=0,count=1)=>({id:'MOCK-'+index,status:'RETROSPECTIVO_EXPLORATORIO',
  evidence:'https://drive.google.com/file/d/MOCK_FILE/view',
  notes:JSON.stringify({schema:GED_PREVIEW_SCHEMA,gedEdition:'25.1',
    sourceUrl:'https://ucdp.uu.se/downloads/ged/ged251-csv.zip',
    asOfVerified:false,prospectiveEligible:false,eventSpecificForecast:false,
    sourceAvailabilityVerified:false,horizonMonths:24,gedZipSha256:'a'.repeat(64),
    casebookSha256:'b'.repeat(64),batchCount:count,batchIndex:index,
    totalEvents:2,totalWindowLinks:3,archiveTotalEvents:7,archiveTotalWindowLinks:10,events})});
test('fail closed without every canonical batch',()=>{
 assert.equal(parseGedIncidentPreview([row([item],0,2)]).ready,false);
 assert.equal(gedIncidentPreviewPanel([row([item],0,2)]),'');
});
test('valid private chunks show two unique incidents with contextual horizons',()=>{
 const events=[row([item],0,2),row([{...item,id:102,date:'2021-03-17',positiveWindowCount:1}],1,2)];
 const result=parseGedIncidentPreview(events);
 assert.equal(result.ready,true);
 assert.equal(result.cases.length,2);
 assert.match(gedIncidentPreviewPanel(events),/2 de 7 sucesos únicos/);
 assert.match(gedIncidentPreviewPanel(events),/3 de 10 vínculos/);
 assert.match(gedIncidentPreviewPanel(events),/no del suceso concreto/);
});
test('duplicates, altered outcome windows and as-of claims are rejected',()=>{
 const a=row([item],0,2),b=row([{...item,id:102,positiveWindowCount:1}],1,2);
 const wrong=[row([item],0,2),row([{...item,id:102,positiveWindowCount:1,issueMonth:'2021-04'}],1,2)];
 const duplicate=[a,row([{...item,positiveWindowCount:1}],1,2)];
 const fake={...a,notes:a.notes.replace('"asOfVerified":false','"asOfVerified":true')};
 for(const batch of [[a,b,fake],wrong,duplicate])assert.equal(parseGedIncidentPreview(batch).ready,false);
});

test('HTML entities in external fields are escaped before rendering',()=>{
 const fake={...item,place:'MOCK & SAFE',issueMonth:'2020-04',targetEndMonth:'2022-03'};
 const other={...item,id:102,positiveWindowCount:1,date:'2021-03-17'};
 const html=gedIncidentPreviewPanel([row([fake],0,2),row([other],1,2)]);
 assert.match(html,/MOCK &amp; SAFE/);
 assert.doesNotMatch(html,/MOCK & SAFE/);
});
