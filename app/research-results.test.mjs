import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBacktests,comparableGroups,parseSimulations} from './research-results.mjs';
const meta={schema:'psychohistory.backtest.v1',runType:'retrospective_revised_release',partition:'test',
  vintageVerified:false,prospectiveEligible:false,runId:'SYNTHETIC',taskId:'SYNTHETIC',horizon:'1 year',
  sampleSha256:'a'.repeat(64),protocolSha256:'b'.repeat(64),n:2,events:1,brier:.04,logLoss:.3,
  averagePrecision:1,ece:.2,calibration:[{count:2,meanProbability:.5,eventRate:.5}],
  yearly:[{year:2000,n:2,events:1,brier:.04,meanProbability:.5}]};
const record=(changes={})=>({id:'SYNTHETIC',value:.04,modelVersion:'SYNTHETIC',notes:JSON.stringify({...meta,...changes})});
test('only internally consistent historical reports are accepted',()=>{
  assert.equal(parseBacktests([record()]).accepted.length,1);
  for(const bad of [{n:3},{events:2},{brier:.1},{vintageVerified:true},{prospectiveEligible:true},
    {calibration:[{count:2,meanProbability:2,eventRate:.5}]},{yearly:[]}]) {
    assert.equal(parseBacktests([record(bad)]).rejected.length,1);
  }
  assert.equal(parseBacktests([{notes:'invalid'}]).accepted.length,0);
});
test('leaderboard never compares different populations or protocols',()=>{
  const a=parseBacktests([record(),record({sampleSha256:'c'.repeat(64)}),record({taskId:'different'})]).accepted;
  assert.equal(comparableGroups(a).length,3);
  assert.equal(comparableGroups([a[0],{...a[0],model:'other'}]).length,1);
});
test('synthetic simulation cannot be presented as empirical fit',()=>{
  const value={schema:'psychohistory.abm.v1',evidenceType:'synthetic_simulation_only',empiricalFit:null,
    groups:[{threshold:.2,initial_share:.1,mean_final:.5,min_final:0,max_final:1,seeds:5}]};
  assert.equal(parseSimulations([{notes:JSON.stringify(value)}]).length,1);
  assert.equal(parseSimulations([{notes:JSON.stringify({...value,empiricalFit:.9})}]).length,0);
});
