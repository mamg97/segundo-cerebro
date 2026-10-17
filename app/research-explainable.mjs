// Private Futures trace viewer: deterministic REPLAY, never timed fake computation.
// Invalid/missing traces disappear (fail closed). No synthetic results as fallback.
export const EXPLAINABLE_TRACE_SCHEMA='psychohistory.futures.computation_trace.v1';
const EPS=1e-9;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=n=>typeof n==='number'&&Number.isFinite(n);
const close=(a,b)=>num(a)&&num(b)&&Math.abs(a-b)<EPS;
const probabilities=a=>Array.isArray(a)&&a.length===4&&a.every(n=>num(n)&&n>=0&&n<=1)&&close(a.reduce((x,y)=>x+y,0),1);
const vectorClose=(a,b)=>probabilities(a)&&probabilities(b)&&a.every((x,i)=>close(x,b[i]));
const percentage=n=>(100*n).toLocaleString('es-ES',{maximumFractionDigits:2})+' %';
const vector=a=>'<div class="explain-vector">'+a.map((n,i)=>'<div><small>Estado '+['00','01','10','11'][i]+'</small><strong>'+percentage(n)+'</strong><i class="explain-bar"><span style="--mass:'+Math.round(n*100)+'%"></span></i></div>').join('')+'</div>';
export function parseComputationReplay(trace,result){
  if(!trace||!result||trace.schema!==EXPLAINABLE_TRACE_SCHEMA||
     trace.kind!=='RETROSPECTIVE_COMPUTATION_REPLAY'||trace.isLiveProgress!==false||
     trace.hasIndependentIssueSeal!==false||trace.vintageCorrect!==false||
     result.runType!=='retrospective_revised_release'||result.prospectiveEligible!==false||
     trace.runId!==result.runId||trace.model!==result.model||trace.countryId!==result.country?.id||
     trace.cutoff!==result.cutoff||trace.origin!==result.origin||
     !Array.isArray(trace.frames)||trace.frameCount!==trace.frames.length||
     trace.frameCount!==result.levels?.length+3||!Array.isArray(result.matrix)||
     result.matrix.length!==4)return null;
  const M=result.matrix;
  if(M.some((row,i)=>!Array.isArray(row)||row.length!==4||!row.every(x=>num(x)&&x>=0&&x<=1)||
     !close(row.reduce((a,b)=>a+b,0),1)||row.some((p,j)=>(j>>1)!==(i%2)&&p!==0)))return null;
  const [src,counts,matrix,...rest]=trace.frames;
  if(src?.kind!=='source'||src.cutoff!==result.cutoff||src.origin!==result.origin||
     src.codeSha256!==result.codeSha256||src.protocolSha256!==result.protocolSha256||
     src.runId!==result.runId||src.unknownBridgeYear!==result.origin-1||
     src.datasetVersion!==result.datasetVersion||src.flag!=='RETROSPECTIVE_REVISED_RELEASE_NOT_AS_OF'||
     counts?.kind!=='counts'||counts.observedState!==result.initial||
     JSON.stringify(counts.trainingCounts)!==JSON.stringify(result.trainingCounts)||
     matrix?.kind!=='matrix'||JSON.stringify(matrix.matrix)!==JSON.stringify(M)||
     matrix.flag!=='STOCHASTIC_4X4_CONSERVES_MASS')return null;
  for(let k=1;k<result.levels.length;k++){
    const frame=rest[k-1],prior=result.levels[k-1]?.distribution,next=result.levels[k]?.distribution;
    if(!frame||frame.kind!==(k===1?'bridge':'propagate')||
       frame.year!==result.cutoff+k||frame.fromYear!==result.cutoff+k-1||
       !vectorClose(frame.previous,prior)||!vectorClose(frame.next,next)||
       !Array.isArray(frame.terms)||frame.terms.length!==4||
       frame.flag!==(k===1?'BRIDGE_INTEGRATED_UNCONDITIONALLY':'UNCONDITIONAL_FORWARD_STEP'))return null;
    for(let j=0;j<4;j++){
      const column=frame.terms[j];
      if(!Array.isArray(column)||column.length!==4)return null;
      let total=0;
      for(let i=0;i<4;i++){
        const t=column[i];
        if(!t||t.from!==i||t.to!==j||!close(t.previous,prior[i])||
           !close(t.conditional,M[i][j])||!close(t.product,prior[i]*M[i][j]))return null;
        total+=t.product;
      }
      if(!close(total,next[j]))return null;
    }
  }
  const final=trace.frames.at(-1);
  if(final?.kind!=='compare'||final.horizonYears!==result.maxHorizon||
     final.endYear!==result.origin+result.maxHorizon-1||
     final.baseline!=='frequency'||!vectorClose(final.selected,result.levels.at(-1).distribution)||
     !probabilities(final.frequencyBaseline)||final.flag!=='SAME_ORIGIN_HORIZON_NOT_EVIDENCE_OF_SKILL')return null;
  return trace;
}
export function explainableReplayPanel(trace,result,step=-1){
  const valid=parseComputationReplay(trace,result);
  if(!valid)return '';
  const total=valid.frames.length;
  const index=Number.isInteger(step)?Math.max(-1,Math.min(total-1,step)):-1;
  const frame=valid.frames[index];
  let content='';
  if(frame?.kind==='source')
    content='<p><b>Serie:</b> '+esc(frame.datasetVersion)+' · <b>Corte:</b> '+frame.cutoff+
      ' · <b>Origen retrospectivo:</b> '+frame.origin+
      ' · <b>Puente sin observar:</b> '+frame.unknownBridgeYear+'</p>'+
      '<p>El motor trabajó sobre un catálogo retrospectivo revisado; este paso no acredita datos disponibles entonces.</p>';
  else if(frame?.kind==='counts')
    content='<p>Estado de partida: <b>'+['00','01','10','11'][frame.observedState]+'</b>. Conteos históricos usados por el modelo elegido:</p>'+
      '<pre>'+esc(JSON.stringify(frame.trainingCounts))+'</pre><small>'+esc(frame.smoothing)+'</small>';
  else if(frame?.kind==='matrix')
    content='<p>Matriz P(i→j): cada fila suma 1. Solo se admiten transiciones compatibles con el último estado binario.</p>'+
      '<div class="explain-matrix">'+frame.matrix.map((r,i)=>'<div><b>'+['00','01','10','11'][i]+'</b>'+r.map(x=>'<span>'+percentage(x)+'</span>').join('')+'</div>').join('')+'</div>';
  else if(frame?.kind==='bridge'||frame?.kind==='propagate')
    content='<p><b>'+frame.fromYear+' → '+frame.year+'</b> · <code>'+esc(frame.formula)+'</code>'+
      (frame.kind==='bridge'?' · El año puente se integra sin usar su resultado observado.':'')+'</p>'+
      '<div class="explain-equation">'+[0,1,2,3].map(j=>'<div><b>p('+['00','01','10','11'][j]+')</b> = '+
        frame.terms[j].map(t=>t.previous.toFixed(4)+' × '+t.conditional.toFixed(4)).join(' + ')+
        ' = <strong>'+frame.next[j].toFixed(6)+'</strong></div>').join('')+'</div>'+vector(frame.next);
  else if(frame?.kind==='compare')
    content='<p>Horizonte hasta '+frame.endYear+'. Ambas distribuciones corresponden al mismo país y origen; no representan habilidades prospectivas acreditadas.</p>'+
      '<h4>'+esc(frame.modelLabel)+'</h4>'+vector(frame.selected)+
      '<h4>Benchmark · frecuencia histórica</h4>'+vector(frame.frequencyBaseline)+
      '<p><small>'+esc(frame.scoreUnavailable)+'</small></p>';
  return '<section class="panel explainable-panel" aria-label="Ejecución explicable del motor retrospectivo">'+
    '<div class="panel-head"><div><span class="eyebrow">REPRODUCCIÓN MATEMÁTICA VERIFICADA</span>'+
    '<h3>Cómo calcula Futuros</h3></div><span>Traza retrospectiva · no ejecución en directo</span></div>'+
    '<p class="chart-note">La traza procede del motor privado y reproduce sus operaciones reales. '+
    'No es una barra de progreso de CPU, ni una predicción prospectiva emitida.</p>'+
    (index<0?'<button type="button" data-trace-next>▶ Inspeccionar cálculo</button>':
      '<div class="explain-progress"><span>Paso '+(index+1)+' de '+total+'</span>'+
      '<progress value="'+(index+1)+'" max="'+total+'"></progress></div>'+
      '<div class="explain-stage" aria-live="polite"><h4>'+esc(frame.title)+'</h4>'+content+'</div>'+
      '<div class="explain-controls">'+
      '<button type="button" data-trace-prev'+(index===0?' disabled':'')+'>← Anterior</button>'+
      '<button type="button" data-trace-next'+(index===total-1?' disabled':'')+'>Siguiente operación →</button>'+
      '<button type="button" data-trace-reset>Reiniciar reproducción</button></div>')+
    '<p class="chart-note">Run '+esc(trace.runId.slice(0,14))+'… · sin sello de emisión histórico independiente · '+
    'la visualización no altera scores, modelos ni datos.</p></section>';
}
