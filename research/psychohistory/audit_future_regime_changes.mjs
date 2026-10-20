// AV-076: deterministic aggregate retrospective cohort diagnostics (no country-level output).
// Input files contain canonical private catalog JSON exported with authorization;
// CI uses synthetic fixtures. Does not modify files or return country identifiers.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {scoreHistoricalCases,forward,transitionMatrix,FUTURE_MODELS} from '../../private-cloudflare/src/research-futures-engine.mjs';

const MODELS=Object.keys(FUTURE_MODELS);
export function auditRegimeCohort(catalog){
 if(!Number.isInteger(catalog?.origin)||!Number.isInteger(catalog?.maxHorizon)||catalog.maxHorizon<1||
  !Array.isArray(catalog.countries)||catalog.countries.length<1||
  catalog.runType!=='retrospective_revised_release'||catalog.vintageVerified!==false)
    throw new Error('Only retrospective revised-release catalogs are allowed');
 const errors=Object.fromEntries(MODELS.map(m=>[m,{evaluations:0,brierTotal:0,modalDivergences:0}]));
 const stateCounts=[0,0,0,0],exit={n:0,modalMisses:0,probabilityObservedTotal:0};
 let evaluated=0,missed=0;
 for(const country of catalog.countries){
  const cases=scoreHistoricalCases(catalog,country);
  const levels=Object.fromEntries(MODELS.map(m=>[m,forward(country.initial,transitionMatrix(catalog,country,m),catalog.maxHorizon+1)]));
  for(const c of cases){
   if(!c.available)continue;
   evaluated++;
   const actual=c.actualState;
   stateCounts[actual]++;
   for(const model of MODELS){
    const row=c.models[model]; const dist=levels[model][c.horizon+1].distribution;
    if(!row||Math.abs(dist[actual]-row.probabilityActual)>1e-9)throw new Error('Invalid scoring alignment');
    errors[model].evaluations++;errors[model].brierTotal+=row.brier;
    if(dist.indexOf(Math.max(...dist))!==actual)errors[model].modalDivergences++;
   }
   if(actual===2){
    exit.n++;
    const v=levels.markov[c.horizon+1].distribution;
    if(v.indexOf(Math.max(...v))!==2)exit.modalMisses++;
    exit.probabilityObservedTotal+=v[2];
   }
  }
 }
 if(!evaluated)throw new Error('No evaluable historical outcomes');
 return {schema:'psychohistory.futures.regime_audit.v1',origin:catalog.origin,maxHorizon:catalog.maxHorizon,
  countries:catalog.countries.length,evaluatedCountryYears:evaluated,
  target:'UCDP_4state_presence_threshold_25',stateCounts,
  markovExit:{actualExitCountryYears:exit.n,modalMisses:exit.modalMisses,
    meanAssignedProbabilityOnExitCases:exit.n?exit.probabilityObservedTotal/exit.n:null},
  models:Object.fromEntries(MODELS.map(m=>[m,{n:errors[m].evaluations,
    meanMulticlassBrier:errors[m].brierTotal/errors[m].evaluations,
    modalDivergences:errors[m].modalDivergences}])),
  sourceAsOfVerified:false,prospectiveSkillDemonstrated:false,
  independentAnnualSamples:false,postHocFailureAnalysis:true,
  caveat:'Shared dependent country-years and overlapping historical test periods. Mode correctness is not calibration or probabilistic skill.'};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==1){process.stderr.write('Usage: node audit_future_regime_changes.mjs <canonical-catalog.json>\n');process.exitCode=2;}
 else {
  const d=JSON.parse(readFileSync(args[0],'utf8'));
  process.stdout.write(JSON.stringify(auditRegimeCohort(d),null,2)+'\n');
 }
}
