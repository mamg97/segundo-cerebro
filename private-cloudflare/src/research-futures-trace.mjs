// Explainer for an ALREADY computed private, revised-release Futures run.
// Every frame is a mathematical replay of returned engine values, not fake progress.
import {transitionMatrix, forward, FUTURE_STATES, FUTURES_VERSION} from './research-futures-engine.mjs';

export const TRACE_SCHEMA = 'psychohistory.futures.computation_trace.v1';
const EPS=1e-10;
const close=(a,b)=>typeof a==='number'&&typeof b==='number'&&
  Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<EPS;
const sum=values=>values.reduce((a,b)=>a+b,0);
const same=(xs,ys)=>Array.isArray(xs)&&Array.isArray(ys)&&xs.length===ys.length&&xs.every((x,i)=>close(x,ys[i]));

export function buildComputationTrace(catalog, result) {
  // A trace may NEVER be used to change the reported probability.
  if(result.version!==FUTURES_VERSION||result.runType!=='retrospective_revised_release'||
     result.vintageVerified!==false||result.prospectiveEligible!==false||
     catalog.runId!==result.runId||catalog.protocolSha256!==result.protocolSha256||
     catalog.codeSha256!==result.codeSha256||result.cutoff!==catalog.origin-2||
     !Number.isInteger(result.initial)||result.initial<0||result.initial>3)
    throw new Error('TRACE_SOURCE_INELIGIBLE');
  const country=catalog.countries.find(c=>c.id===result.country.id);
  if(!country||country.initial!==result.initial)throw new Error('TRACE_COUNTRY_MISMATCH');
  const M=transitionMatrix(catalog,country,result.model);
  if(M.length!==4||M.some((row,i)=>!same(row,result.matrix[i])))throw new Error('TRACE_MATRIX_MISMATCH');
  const levels=forward(result.initial,M,result.maxHorizon+1);
  if(levels.length!==result.levels.length||levels.some((level,i)=>!same(level.distribution,result.levels[i].distribution)))
    throw new Error('TRACE_PROPAGATION_MISMATCH');
  const baseline=transitionMatrix(catalog,country,'frequency');
  const baselineLevels=forward(result.initial,baseline,result.maxHorizon+1);
  const counts=result.trainingCounts;
  if(result.model!=='persistence'&&!Array.isArray(counts))throw new Error('TRACE_COUNTS_MISSING');
  const frames=[
    {kind:'source',index:0,title:'Fuente y corte temporal',
      origin:result.origin,cutoff:result.cutoff,unknownBridgeYear:result.origin-1,
      datasetVersion:result.datasetVersion,runId:result.runId,protocolSha256:result.protocolSha256,
      codeSha256:result.codeSha256,model:result.model,modelLabel:result.modelLabel,
      flag:'RETROSPECTIVE_REVISED_RELEASE_NOT_AS_OF'},
    {kind:'counts',index:1,title:'Parámetros ajustados al pasado',
      observedState:result.initial,trainingCounts:counts,
      smoothing:'Beta(1,1) para modelos globales; contracción a tasas globales con prior 20; persistencia determinista.',
      flag:'HISTORICAL_COUNTS_NO_FUTURE_OUTCOMES_USED'},
    {kind:'matrix',index:2,title:'Matriz de transición condicional',
      states:FUTURE_STATES,matrix:M,flag:'STOCHASTIC_4X4_CONSERVES_MASS'},
  ];
  for(let k=1;k<levels.length;k++){
    const previous=levels[k-1].distribution;
    const terms=Array.from({length:4},(_,target)=>Array.from({length:4},(_,state)=>({
      from:state,to:target,previous:previous[state],conditional:M[state][target],
      product:previous[state]*M[state][target]})));
    const next=terms.map(column=>sum(column.map(term=>term.product)));
    if(!same(next,levels[k].distribution)||!close(sum(next),1))throw new Error('TRACE_TERMS_MISMATCH');
    frames.push({kind:k===1?'bridge':'propagate',index:frames.length,
      title:k===1?'Año puente no observado':'Propagación al año '+(result.cutoff+k),
      year:result.cutoff+k,fromYear:result.cutoff+k-1,
      previous,terms,next,formula:'p_(t+1)(j) = Σ_i p_t(i) × P(i→j)',
      flag:k===1?'BRIDGE_INTEGRATED_UNCONDITIONALLY':'UNCONDITIONAL_FORWARD_STEP'});
  }
  frames.push({kind:'compare',index:frames.length,title:'Distribución final y benchmark',
    model:result.model,modelLabel:result.modelLabel,baseline:'frequency',
    horizonYears:result.maxHorizon,
    endYear:result.origin+result.maxHorizon-1,
    selected:levels.at(-1).distribution,
    frequencyBaseline:baselineLevels.at(-1).distribution,
    scoreUnavailable:'No hay Brier prospectivo: requiere desenlace posterior y emisión sellada.',
    flag:'SAME_ORIGIN_HORIZON_NOT_EVIDENCE_OF_SKILL'});
  return {schema:TRACE_SCHEMA,kind:'RETROSPECTIVE_COMPUTATION_REPLAY',
    isLiveProgress:false,hasIndependentIssueSeal:false,vintageCorrect:false,
    runId:result.runId,model:result.model,countryId:country.id,
    cutoff:result.cutoff,origin:result.origin,frameCount:frames.length,frames};
}
