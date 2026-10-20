import test from 'node:test';import assert from 'node:assert/strict';
import {auditFutureSourceAsOf,auditFutureCatalogAsOf,SOURCES,BLOCKERS} from './audit_future_asof_eligibility.mjs';
const catalog={runType:'retrospective_revised_release',vintageVerified:false,prospectiveEligible:false,origin:2016,cutoff:2014,countries:[{id:616,name:'FICTIONAL TUNISIA'}]};
test('UCDP country-year edition 26.1 cannot be historic training bytes in 2016/2020',()=>{
 for(const [origin,cutoff] of [[2016,2014],[2020,2018]]){
  const a=auditFutureSourceAsOf({origin,cutoff,sourceId:'organizedviolencecy_26_1'});
  assert.ok(a.blockers.includes(BLOCKERS.RELEASE));
  assert.equal(a.sameProductTargetCandidate,true);
  assert.equal(a.vintageCorrectBacktestAuthorized,false);
  assert.equal(a.prospectivePredictionEmitted,false);
 }
});
test('older GED 24.1 is a chronological candidate for 2025 but a DIFFERENT product',()=>{
 const a=auditFutureSourceAsOf({origin:2025,cutoff:2023,sourceId:'ged_24_1'});
 assert.equal(a.releaseYearBeforeIssue,true);
 assert.equal(a.coversTrainingCutoff,true);
 assert.equal(a.sameProductTargetCandidate,false);
 assert.ok(a.blockers.includes(BLOCKERS.TARGET));
 assert.ok(a.blockers.includes(BLOCKERS.RISK_SET));
 assert.equal(a.asOfTrainingInputsRebuilt,false);
});
test('OrganizedViolenceCY 24.1 is the SAME product and a plausible but unverified 2025-era source',()=>{
 const a=auditFutureSourceAsOf({origin:2025,cutoff:2023,sourceId:'organizedviolencecy_24_1'});
 assert.equal(a.releaseYearBeforeIssue,true);
 assert.equal(a.coversTrainingCutoff,true);
 assert.equal(a.sameProductTargetCandidate,true);
 assert.equal(a.vintageCorrectBacktestAuthorized,false);
 assert.ok(a.blockers.includes(BLOCKERS.BYTES));
 assert.ok(a.blockers.includes(BLOCKERS.FREEZE));
 const later=auditFutureSourceAsOf({origin:2025,cutoff:2023,sourceId:'organizedviolencecy_25_1'});
 assert.ok(later.blockers.includes(BLOCKERS.RELEASE));
});
test('a hypothetical 2027 issue with a 2026 listing is still unapproved',()=>{
 const a=auditFutureSourceAsOf({origin:2027,cutoff:2025,sourceId:'organizedviolencecy_26_1',mode:'prospective_preparation'});
 assert.equal(a.releaseYearBeforeIssue,true);
 assert.equal(a.sameProductTargetCandidate,true);
 assert.ok(a.blockers.includes(BLOCKERS.BYTES));
 assert.ok(a.blockers.includes(BLOCKERS.FREEZE));
 assert.equal(a.prospectivePredictionEmitted,false);
});
test('user-supplied source claims cannot promote or expose countries',()=>{
 const a=auditFutureCatalogAsOf({...catalog,operatorClaimsAsOf:true},'organizedviolencecy_26_1');
 assert.equal(a.revisedCatalog.nCountries,1);
 assert.equal(a.revisedCatalog.countryRowsOrProbabilitiesSerialized,false);
 assert.doesNotMatch(JSON.stringify(a),/FICTIONAL TUNISIA|616/);
 assert.throws(()=>auditFutureCatalogAsOf({...catalog,vintageVerified:true},'organizedviolencecy_26_1'),/REVISED/);
 assert.throws(()=>auditFutureCatalogAsOf({...catalog,prospectiveEligible:true},'organizedviolencecy_26_1'),/REVISED/);
});
test('reject unsupported sources, broken cutoffs and empty countries',()=>{
 assert.equal(Object.keys(SOURCES).length,5);
 assert.throws(()=>auditFutureSourceAsOf({origin:2016,cutoff:2015,sourceId:'ged_24_1'}),/INVALID/);
 assert.throws(()=>auditFutureSourceAsOf({origin:2016,cutoff:2014,sourceId:'forged_verified'}),/INVALID/);
 assert.throws(()=>auditFutureCatalogAsOf({...catalog,countries:[]},'organizedviolencecy_26_1'),/REVISED/);
});
