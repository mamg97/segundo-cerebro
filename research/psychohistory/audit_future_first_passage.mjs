// AV-077 — FIRST PASSAGE of the annual >=25 UCDP state-based deaths threshold.
// Pure retrospective evaluation. Uses the original, fixed, four-state kernel.
// Never conditions predictions on an observed bridge or a later annual outcome.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {FUTURE_MODELS,transitionMatrix,validateMatrix} from '../../private-cloudflare/src/research-futures-engine.mjs';

const MODELS=Object.keys(FUTURE_MODELS);
const sum=a=>a.reduce((x,y)=>x+y,0);
const isState=x=>Number.isInteger(x)&&x>=0&&x<=3;
const clip=(x)=>Math.max(1e-12,Math.min(1,x));

// Bin 0 is the first post-cutoff year (including the retrospective bridge);
// last bin is NO first transition through end of follow-up.
export function firstPassageDistribution(matrix,initial,steps){
 validateMatrix(matrix);
 if(!isState(initial)||!Number.isInteger(steps)||steps<1||steps>11)
   throw new Error('INVALID_FIRST_PASSAGE_HORIZON');
 const original=initial%2;
 let survivors=[0,0,0,0];survivors[initial]=1;
 const event=[];
 for(let t=1;t<=steps;t++){
   const next=[0,0,0,0];let crossed=0;
   for(let s=0;s<4;s++){
     if(!survivors[s])continue;
     for(let j=0;j<4;j++){
       const mass=survivors[s]*matrix[s][j];
       if(j%2!==original)crossed+=mass;
       else next[j]+=mass;
     }
   }
   event.push(crossed);
   survivors=next;
 }
 const censored=sum(survivors),distribution=[...event,censored];
 if(Math.abs(sum(distribution)-1)>1e-8 || distribution.some(x=>x<0||x>1))
   throw new Error('FIRST_PASSAGE_MASS_NOT_CONSERVED');
 return {initialHigh:original===1,event,censored,distribution,
    cumulative:event.map((_,i)=>sum(event.slice(0,i+1)))};
}

// The source's observation series may be revised ex post; never call this
// availability verified at the historical origin. NULL => non-evaluable.
export function observedFirstPassage(states,initial,steps){
 if(!isState(initial)||!Number.isInteger(steps)||steps<1||steps>11 ||
   !Array.isArray(states)||states.length<steps+1||states[0]!==initial||
   states.slice(1,steps+1).some(x=>!isState(x)))return null;
 const first=states.slice(1,steps+1).findIndex(x=>x%2!==initial%2);
 return first<0?steps:first; // 0-based event bin; steps denotes censored.
}
export function firstPassageScores(probabilities,outcome){
 const {distribution,cumulative}=probabilities;
 if(!Number.isInteger(outcome)||outcome<0||outcome>=distribution.length)
   throw new Error('INVALID_FIRST_PASSAGE_OBSERVATION');
 const binCount=distribution.length-1;
 const brier=distribution.reduce((v,p,i)=>v+(p-Number(outcome===i))**2,0);
 const logLoss=-Math.log(clip(distribution[outcome]));
 const cumulativeBrier=cumulative.reduce((v,p,i)=>v+(p-Number(outcome<=i))**2,0)/binCount;
 return {brier,logLoss,cumulativeBrier,probabilityObserved:distribution[outcome]};
}
function group(){
 return {countries:0,events:0,censored:0,bridgeEvents:0,
  models:Object.fromEntries(MODELS.map(id=>[id,{brierSum:0,logLossSum:0,cumulativeBrierSum:0,
      impossibleEvents:0,probabilityObservedSum:0}]))};
}
export function auditFirstPassage(catalog){
 if(catalog?.runType!=='retrospective_revised_release' || catalog?.vintageVerified!==false ||
   !Number.isInteger(catalog.maxHorizon)||catalog.maxHorizon<1||catalog.maxHorizon>10 ||
   !Number.isInteger(catalog.origin)||catalog.cutoff!==catalog.origin-2||
   !Array.isArray(catalog.countries)||!catalog.countries.length)
   throw new Error('FIRST_PASSAGE_REVISED_RETROSPECTIVE_ONLY');
 const steps=catalog.maxHorizon+1;
 const cohorts={all:group(),initialLow:group(),initialHigh:group()};
 for(const country of catalog.countries){
   const outcome=observedFirstPassage(country.observedStates,country.initial,steps);
   if(outcome===null)continue;
   const selected=country.initial%2?'initialHigh':'initialLow';
   const predictions=Object.fromEntries(MODELS.map(id=>[
     id,firstPassageDistribution(transitionMatrix(catalog,country,id),country.initial,steps)]));
   for(const bucket of [cohorts.all,cohorts[selected]]){
     bucket.countries++;
     if(outcome===steps)bucket.censored++;else bucket.events++;
     if(outcome===0)bucket.bridgeEvents++;
     for(const id of MODELS){
       const prob=predictions[id],scored=firstPassageScores(prob,outcome),score=bucket.models[id];
       score.brierSum+=scored.brier;
       score.logLossSum+=scored.logLoss;
       score.cumulativeBrierSum+=scored.cumulativeBrier;
       score.probabilityObservedSum+=scored.probabilityObserved;
       if(scored.probabilityObserved===0)score.impossibleEvents++;
     }
   }
 }
 if(!cohorts.all.countries)throw new Error('NO_EVALUABLE_FIRST_PASSAGE_COUNTRIES');
 const format=bucket=>({
   nCountries:bucket.countries,nTransitions:bucket.events,nCensored:bucket.censored,
   nBridgeTransitions:bucket.bridgeEvents,
   models:Object.fromEntries(MODELS.map(id=>{
     const m=bucket.models[id],n=bucket.countries;
     return [id,n?{
       meanEventTimeBrier:m.brierSum/n,
       meanEventTimeLogLossCapped:m.logLossSum/n,
       meanCumulativeBrier:m.cumulativeBrierSum/n,
       zeroAssignedToObserved:m.impossibleEvents,
       meanProbabilityObserved:m.probabilityObservedSum/n}:null];
   }))
 });
 return {
   schema:'psychohistory.futures.first_passage_audit.v1',origin:catalog.origin,cutoff:catalog.cutoff,
   horizonYears:steps,firstForecastYear:catalog.cutoff+1,lastForecastYear:catalog.cutoff+steps,
   event:'FIRST_FLIP_OF_THRESHOLD_25_AFTER_CUTOFF',observedBridgeIncludedOnlyInRetrospectiveScoring:true,
   cohorts:Object.fromEntries(Object.entries(cohorts).map(([k,v])=>[k,format(v)])),
   periodValidation:'retrospective_revised_release',vintageVerified:false,
   prospectiveEligible:false,independentOrigins:false,
   caveat:'One dependent time-to-first-transition observation per country per origin; origins overlap. Zero-probability log loss is numerically capped only for diagnostics. Data as-of historical origin is not verified.'};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==1){process.stderr.write('Usage: node audit_future_first_passage.mjs <private-catalog.json>\n');process.exitCode=2;}
 else {
   const value=JSON.parse(readFileSync(args[0],'utf8'));
   process.stdout.write(JSON.stringify(auditFirstPassage(value),null,2)+'\n');
 }
}
