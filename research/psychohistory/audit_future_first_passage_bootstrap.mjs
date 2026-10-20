// AV-078: exploratory, paired country bootstrap for first-passage Brier differences.
// Preserves the initial LOW/HIGH country counts. Countries and revised historical
// data are NOT guaranteed independent; the bands are descriptive, NOT validation.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {FUTURE_MODELS,transitionMatrix} from '../../private-cloudflare/src/research-futures-engine.mjs';
import {firstPassageDistribution,firstPassageScores,observedFirstPassage} from './audit_future_first_passage.mjs';

const MODELS=Object.keys(FUTURE_MODELS).filter(m=>m!=='persistence');
const quantile=(data,p)=>{
 const sorted=[...data].sort((a,b)=>a-b);
 const pos=p*(sorted.length-1),lo=Math.floor(pos),hi=Math.ceil(pos);
 return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);
};
function seeded(seed){
 let s=seed>>>0||1;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
}
export function auditFirstPassagePairedBands(catalog,{replicates=2000,seed=54117}={}){
 if(catalog?.runType!=='retrospective_revised_release'||catalog.vintageVerified!==false ||
  !Number.isInteger(catalog.origin)||catalog.cutoff!==catalog.origin-2||
  !Number.isInteger(catalog.maxHorizon)||catalog.maxHorizon<1||catalog.maxHorizon>10||
  !Array.isArray(catalog.countries)||!catalog.countries.length||
  !Number.isInteger(replicates)||replicates<100||replicates>10000||
  !Number.isInteger(seed))throw new Error('INVALID_FIRST_PASSAGE_BOOTSTRAP_REQUEST');
 const steps=catalog.maxHorizon+1, strata=[[],[]];
 for(const c of catalog.countries){
  const actual=observedFirstPassage(c.observedStates,c.initial,steps);
  if(actual===null)continue;
  const baseline=firstPassageScores(firstPassageDistribution(transitionMatrix(catalog,c,'persistence'),c.initial,steps),actual).brier;
  const differences=Object.fromEntries(MODELS.map(m=>{
    const dist=firstPassageDistribution(transitionMatrix(catalog,c,m),c.initial,steps);
    return [m,firstPassageScores(dist,actual).brier-baseline];
  }));
  strata[c.initial%2].push(differences);
 }
 const n=strata[0].length+strata[1].length;
 if(!n)throw new Error('NO_EVALUABLE_COUNTRIES');
 const means=Object.fromEntries(MODELS.map(m=>[m,strata.reduce((v,g)=>v+g.reduce((s,c)=>s+c[m],0),0)/n]));
 const values=Object.fromEntries(MODELS.map(m=>[m,[]]));
 const random=seeded(seed+catalog.origin);
 for(let r=0;r<replicates;r++){
  const sums=Object.fromEntries(MODELS.map(m=>[m,0]));
  for(const group of strata){
   for(let j=0;j<group.length;j++){
    const sample=group[Math.floor(random()*group.length)];
    for(const m of MODELS)sums[m]+=sample[m];
   }
  }
  for(const m of MODELS)values[m].push(sums[m]/n);
 }
 return {schema:'psychohistory.futures.first_passage_paired_bands.v1',
   origin:catalog.origin,nCountries:n,initialLow:strata[0].length,initialHigh:strata[1].length,
   baseline:'persistence',metric:'event_time_multiclass_brier_difference_negative_is_better',
   bootstrap:{replicates,seed,method:'paired_stratified_resampling_of_countries'},
   models:Object.fromEntries(MODELS.map(m=>[m,{
     deltaBrier:means[m],percentile95:[quantile(values[m],.025),quantile(values[m],.975)],
     excludesZero:quantile(values[m],.025)>0||quantile(values[m],.975)<0}])),
   vintageVerified:false,independentCountriesAssumedForInterval:true,
   regionalDependenceModelled:false,prospectiveSkillProven:false,confirmatory:false,
   caveat:'Descriptive post-hoc uncertainty only: countries are linked, catalog vintages are revised, and two origins overlap. Do not select a winner or claim significance.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==1){process.stderr.write('Usage: node audit_future_first_passage_bootstrap.mjs <private-catalog.json>\n');process.exitCode=2;}
 else {
  const d=JSON.parse(readFileSync(args[0],'utf8'));
  process.stdout.write(JSON.stringify(auditFirstPassagePairedBands(d),null,2)+'\n');
 }
}
