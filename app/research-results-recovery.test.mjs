import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRecoverySimulations} from './research-results.mjs';
const digest='0'.repeat(64);
const valid={schema:'psychohistory.abm.recovery.v1',evidenceType:'synthetic_simulation_only',
  empiricalFit:null,calendarMapping:null,codeSha256:digest,protocolSha256:digest,seeds:[0,1],nRuns:2,
  groups:[{initialShare:.1,threshold:.25,recovery:.1,mean:.3,q05:.2,q95:.4,min:.1,max:.5,sd:.1,seeds:2,reproducedSeed0:true}]};
const rows=x=>[{id:'synthetic',notes:JSON.stringify(x)}];
test('recoveries parse as synthetic evidence only',()=>{
  assert.equal(parseRecoverySimulations(rows(valid)).length,1);
  assert.equal(parseRecoverySimulations(rows(valid))[0].groups[0].mean,.3);
  assert.equal(parseRecoverySimulations(rows({...valid,empiricalFit:{score:.9}})).length,0);
  assert.equal(parseRecoverySimulations(rows({...valid,calendarMapping:'years'})).length,0);
  assert.equal(parseRecoverySimulations(rows({...valid,nRuns:3})).length,0);
  assert.equal(parseRecoverySimulations(rows({...valid,groups:[{...valid.groups[0],q95:.9}]})).length,0);
  assert.equal(parseRecoverySimulations(rows({...valid,groups:[{...valid.groups[0],reproducedSeed0:false}]})).length,0);
});
test('lab static imports are present and cache revision is updated',()=>{
  const js=readFileSync(new URL('./research-lab.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./research-lab.html',import.meta.url),'utf8');
  assert.match(js,/parseRecoverySimulations/);
  assert.ok(js.includes('research-results.mjs?v=0.4.1'));
  assert.ok(/research-lab\\.js\\?v=\\d+\\.\\d+\\.\\d+/.test(html));
});
