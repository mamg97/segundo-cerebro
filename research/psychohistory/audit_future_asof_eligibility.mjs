// AV-079: conservative UCDP product/vintage eligibility review for V4.
// No scoring, private country IDs, network access, or prediction issuance.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const REQUIRED_TARGET='UCDP_OrganizedViolenceCY_state_based_total_best_ge25';
export const SOURCES=Object.freeze({
 organizedviolencecy_26_1:Object.freeze({product:'organizedviolencecy',edition:'26.1',releaseYearClaim:2026,observedThrough:2025,exactTarget:true,reference:'https://ucdp.uu.se/downloads/'}),
 ged_24_1:Object.freeze({product:'ged',edition:'24.1',releaseYearClaim:2024,observedThrough:2023,exactTarget:false,reference:'https://ucdp.uu.se/downloads/replication_data.html'}),
 ged_26_1:Object.freeze({product:'ged',edition:'26.1',releaseYearClaim:2026,observedThrough:2025,exactTarget:false,reference:'https://ucdp.uu.se/downloads/'})
});
export const BLOCKERS=Object.freeze({
 RELEASE:'RELEASE_YEAR_NOT_STRICTLY_BEFORE_JANUARY_ISSUE',
 BYTES:'INDEPENDENT_PREISSUE_HISTORICAL_BYTE_TIMESTAMP_NOT_AUTHENTICATED',
 TARGET:'EVENT_LEVEL_GED_IS_NOT_COUNTRY_YEAR_ORGANIZEDVIOLENCECY',
 COVERAGE:'SOURCE_DOES_NOT_COVER_TRAINING_CUTOFF',
 RISK_SET:'COMPLETE_COUNTRY_ROSTER_INCLUDING_ZEROES_UNVERIFIED',
 FEATURES:'EXACT_OLD_FEATURES_AND_LABELS_NOT_REBUILT',
 FREEZE:'HISTORICAL_MODEL_AND_FORECAST_FREEZE_NOT_ATTESTED',
 REVIEW:'MODERN_REVISED_OUTCOMES_NOT_HISTORICALLY_AVAILABLE'
});
export function auditFutureSourceAsOf({origin,cutoff,sourceId,mode='historical_reconstruction'}={}){
 if(!Number.isInteger(origin)||origin<1990||origin>2100||cutoff!==origin-2||
  !Object.hasOwn(SOURCES,sourceId)||
  !['historical_reconstruction','prospective_preparation'].includes(mode))
   throw new Error('INVALID_V4_ASOF_SOURCE_REQUEST');
 const s=SOURCES[sourceId],blockers=[];
 if(s.releaseYearClaim>=origin)blockers.push(BLOCKERS.RELEASE);
 blockers.push(BLOCKERS.BYTES);
 if(!s.exactTarget)blockers.push(BLOCKERS.TARGET);
 if(s.observedThrough<cutoff)blockers.push(BLOCKERS.COVERAGE);
 blockers.push(BLOCKERS.RISK_SET,BLOCKERS.FEATURES,BLOCKERS.FREEZE,BLOCKERS.REVIEW);
 return {schema:'psychohistory.futures.asof_source_gate.v1',target:REQUIRED_TARGET,mode,origin,
  cutoff,issueDateScenario:String(origin)+'-01-01',
  source:{id:sourceId,product:s.product,edition:s.edition,
   claimedReleaseYear:s.releaseYearClaim,observedThroughYear:s.observedThrough,
   presentDayOfficialListing:s.reference},
  releaseYearBeforeIssue:s.releaseYearClaim<origin,
  coversTrainingCutoff:s.observedThrough>=cutoff,
  sameProductTargetCandidate:s.exactTarget,
  sourceByteTimestampAuthenticated:false,
  asOfRiskSetVerified:false,asOfTrainingInputsRebuilt:false,
  modelAndForecastFrozenBeforeOutcome:false,
  vintageCorrectBacktestAuthorized:false,prospectivePredictionEmitted:false,
  selectionOfModelByScoreAuthorized:false,blockers,
  status:'BLOCKED_SOURCE_PROVENANCE_AND_REBUILD',
  nextSteps:[
   'VERIFY_ARCHIVED_EXACT_SOURCE_BYTES_WITH_INDEPENDENT_PRIOR_DATE',
   'RECONSTRUCT_TARGET_FROM_VINTAGE_IF_CROSS_PRODUCT',
   'PIN_COMPLETE_ZERO_AND_NONZERO_COUNTRY_ROSTER',
   'VERIFY_ISSUE_TIME_MODEL_FEATURES_AND_TRAINING_LABELS',
   'REGISTER_FORWARD_FREEZE_BEFORE_OUTCOME'
  ],
  warning:'Today official source listings are not independent as-of witnesses; GED event rows differ from OrganizedViolenceCY country-year data.'};
}
export function auditFutureCatalogAsOf(catalog,sourceId){
 if(!catalog||catalog.runType!=='retrospective_revised_release'||
  catalog.vintageVerified!==false||catalog.prospectiveEligible!==false||
  !Number.isInteger(catalog.origin)||catalog.cutoff!==catalog.origin-2||
  !Array.isArray(catalog.countries)||!catalog.countries.length)
   throw new Error('REVISED_RETROSPECTIVE_CATALOG_REQUIRED');
 const report=auditFutureSourceAsOf({origin:catalog.origin,cutoff:catalog.cutoff,sourceId});
 return {...report,revisedCatalog:{nCountries:catalog.countries.length,
   historicalSourceVintageVerified:false,prospectiveEligible:false,
   countryRowsOrProbabilitiesSerialized:false}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==2){process.stderr.write('Usage: node audit_future_asof_eligibility.mjs <private-catalog.json> <source-id>\n');process.exitCode=2;}
 else {
  const catalog=JSON.parse(readFileSync(args[0],'utf8'));
  process.stdout.write(JSON.stringify(auditFutureCatalogAsOf(catalog,args[1]),null,2)+'\n');
 }
}
