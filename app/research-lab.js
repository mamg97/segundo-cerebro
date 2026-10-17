// Private, data-driven research dashboard. Simulations are explicitly separated.
import {mountFutureExplorer} from './research-futures.mjs?v=0.4.5';
import {mountNeural} from './research-neural.mjs?v=0.3.0';
import {parseBacktests, comparableGroups, parseSimulations, parseRecoverySimulations} from './research-results.mjs?v=0.4.1';
const TRACKS=[
  {id:"V1",color:"#ff8a28",subtitle:"Hipótesis históricas y regularidades"},
  {id:"V2",color:"#62baf5",subtitle:"Probabilidades y validación temporal"},
  {id:"V3",color:"#80d7bc",subtitle:"Mecanismos micro-macro simulados"},
  {id:"V4",color:"#bca6ff",subtitle:"Evidencias, scoring y orquestación"}
];
const PHASES=["DISEÑO","DATOS","MVP","VALIDACIÓN","SHADOW"];
const root=document.getElementById("view");
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const finite=(n)=>typeof n==="number"&&Number.isFinite(n);
const fmt=(n,d=2)=>finite(n)?n.toLocaleString("es-ES",{maximumFractionDigits:d}):"Sin datos";
const url=(s)=>typeof s==="string"&&/^https:\/\/[^ \r\n]+$/.test(s)?s:null;
let state=null;
let activeView="futures";
let activeTrack=TRACKS.some(t=>t.id===new URLSearchParams(window.location.search).get("track")) ? new URLSearchParams(window.location.search).get("track") : "V2";
let milestoneFilter="TODOS";
let generation=0;
let selectedTask='';
let selectedModel='';
let disposeNeural=()=>{};
let motionPaused=false;
let disposeFutures=()=>{};

function scientificPlot(points,{title,xLabel,yLabel,lines=[],diagonal=false}={}){
  if(!points.length)return empty('Sin datos', 'Pendiente de validación');
  const years=points.map(p=>p.x),lo=Math.min(...years),hi=Math.max(...years);
  const x=v=>50+(v-lo)/(hi-lo||1)*450,y=v=>230-Math.max(0,Math.min(1,v))*190;
  let out='<svg viewBox="0 0 540 280" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title>';
  for(let i=0;i<=4;i++){const v=i/4;out+='<line x1="50" y1="'+y(v)+'" x2="500" y2="'+y(v)+'" stroke="#25415e"/><text x="42" y="'+(y(v)+4)+'" text-anchor="end" fill="#a5b8ce" font-size="11">'+v+'</text>';}
  for(const v of [...new Set([lo,Math.round((lo+hi)/2),hi])])out+='<text x="'+x(v)+'" y="250" text-anchor="middle" fill="#a5b8ce" font-size="11">'+v+'</text>';
  if(diagonal)out+='<path d="M50 230 L500 40" stroke="#a5b8ce" stroke-dasharray="5 5" fill="none"/>';
  for(const line of lines){
    const pairs=points.filter(p=>finite(p[line.key]));
    if(!pairs.length)continue;
    out+='<polyline points="'+pairs.map(p=>x(p.x)+','+y(p[line.key])).join(' ')+'" fill="none" stroke="'+line.color+'" stroke-width="2.5"/>';
    for(const p of pairs)out+='<circle cx="'+x(p.x)+'" cy="'+y(p[line.key])+'" r="4" fill="'+line.color+'"><title>'+esc(line.label)+' · '+p.x+': '+fmt(p[line.key],4)+' · N='+p.n+'</title></circle>';
  }
  out+='<text x="270" y="276" text-anchor="middle" fill="#a5b8ce" font-size="11">'+esc(xLabel)+'</text><text x="50" y="20" fill="#a5b8ce" font-size="11">'+esc(yLabel)+'</text></svg>';
  return out+'<p class="chart-note">'+lines.map(l=>'<span>'+esc(l.label)+'</span>').join(' · ')+'</p>';
}
function retrospective(){
  const parsed=parseBacktests(state.lab.experiments),groups=comparableGroups(parsed.accepted);
  if(!groups.length)return '<section class="panel top-gap">'+empty('Backtests: sin datos auditados','El registro espera un informe histórico reproducible con muestra, protocolo y métricas coherentes.')+'</section>';
  const keyFor=g=>[g[0].runId,g[0].taskId,g[0].horizon,g[0].protocolSha256,g[0].sampleSha256].join('|');
  let group=groups.find(g=>keyFor(g)===selectedTask)||groups[0];
  selectedTask=keyFor(group);
  const selected=group.find(r=>r.model===selectedModel)||group[0];selectedModel=selected.model;
  const first=group[0];
  const cohort=first.n+' país-año · '+first.events+' eventos · '+esc(first.horizon);
  const timeline=selected.yearly.map(r=>({x:r.year,observed:r.events/r.n,predicted:r.meanProbability,n:r.n}));
  const bins=selected.calibration.filter(b=>b.count>0).map(b=>({x:b.meanProbability,observed:b.eventRate,n:b.count}));
  // Fixed axes 0..1 for calibration; anchors do not become observations.
  const calibration=scientificPlot([{x:0,n:0},...bins,{x:1,n:0}],{title:'Calibración histórica',xLabel:'Probabilidad estimada',yLabel:'Frecuencia observada',diagonal:true,lines:[{key:'observed',label:'Observado',color:'#ff8a28'}]});
  const ci=(r)=>Array.isArray(r.skillMarkov95)&&r.skillMarkov95.length===2?r.skillMarkov95.map(x=>fmt(x,3)).join(' / '):'Sin datos';
  return heading('EVIDENCIA RETROSPECTIVA','Comparadores sobre la misma muestra',cohort)+
    '<p class="legend-note">Versión revisada '+esc(first.datasetVersion)+'. Disponibilidad histórica sin verificar. Experimento exploratorio: estos resultados no acreditan forecasting prospectivo. '+esc(first.caveat||'')+'</p>'+
    '<div class="filter-row">'+groups.map(g=>'<button data-task="'+esc(keyFor(g))+'" class="'+(selectedTask===keyFor(g)?'active':'')+'">'+esc(g[0].taskLabel)+' · '+esc(g[0].runId.slice(0,8))+'</button>').join('')+'</div>'+
    '<section class="panel"><div class="panel-head"><h3>Leaderboard histórico</h3><span>'+cohort+'</span></div><div class="scroll-x"><table><thead><tr><th>Modelo</th><th>Brier ↓</th><th>Skill / frecuencia</th><th>Skill / Markov</th><th>IC 95% / Markov</th><th>Log loss ↓</th><th>PR-AUC (AP) ↑</th><th>ECE ↓</th></tr></thead><tbody>'+
    group.map(r=>'<tr><td><button class="model-select" data-model="'+esc(r.model)+'" aria-pressed="'+(selected.model===r.model)+'">'+esc(r.model)+'</button></td><td>'+fmt(r.brier,5)+'</td><td>'+fmt(r.skillFrequency,3)+'</td><td>'+fmt(r.skillMarkov,3)+'</td><td>'+ci(r)+'</td><td>'+fmt(r.logLoss,4)+'</td><td>'+fmt(r.averagePrecision,4)+'</td><td>'+fmt(r.ece,4)+'</td></tr>').join('')+'</tbody></table></div><p class="legend-note">Selecciona un modelo para inspeccionar sus gráficos. Skill = 1 − Brier(modelo)/Brier(referencia). Intervalos: bloques temporales pareados, condicionados a modelos ya ajustados; no cubren revisiones ni búsqueda de especificaciones.</p></section>'+
    '<div class="two-col top-gap"><section class="panel"><div class="panel-head"><h3>Observado frente a estimado</h3><span>'+esc(selected.model)+'</span></div>'+scientificPlot(timeline,{title:'Tasa anual de eventos y probabilidad media',xLabel:'Año objetivo',yLabel:'Fracción de países',lines:[{key:'observed',label:'Observado (naranja)',color:'#ff8a28'},{key:'predicted',label:'Probabilidad media (azul)',color:'#65b9f7'}]})+'<p class="chart-note">Son medias agregadas del backtest; no predicciones individuales ni un pronóstico de la fecha actual.</p></section><section class="panel"><div class="panel-head"><h3>Calibración histórica</h3><span>'+esc(selected.model)+'</span></div>'+calibration+'<p class="chart-note">Cinco intervalos de probabilidad fijos. Pasa el cursor por los puntos para ver N. ECE depende de estos intervalos.</p></section></div>'+
    '<p class="chart-note">Protocolo: '+esc(first.protocolSha256)+' · Muestra: '+esc(first.sampleSha256)+' · '+parsed.rejected.length+' informes inconsistentes excluidos.</p>';
}
function simulation(){
  const run=parseSimulations(state.lab.experiments).at(-1);
  if(!run)return '';
  const ts=[...new Set(run.groups.map(g=>g.threshold))].sort((a,b)=>a-b),ss=[...new Set(run.groups.map(g=>g.initial_share))].sort((a,b)=>a-b);
  let svg='<svg viewBox="0 0 530 300" role="img" aria-label="Sensibilidad sintética a umbral e inicialización">';
  for(const g of run.groups){const x=110+ts.indexOf(g.threshold)*100,y=50+ss.indexOf(g.initial_share)*65;svg+='<rect x="'+x+'" y="'+y+'" width="84" height="50" rx="8" fill="#ff8a28" fill-opacity="'+(.1+.9*g.mean_final)+'" stroke="#355575"><title>Media '+fmt(g.mean_final,3)+'; rango '+fmt(g.min_final,3)+' a '+fmt(g.max_final,3)+'; '+g.seeds+' semillas</title></rect><text x="'+(x+42)+'" y="'+(y+31)+'" text-anchor="middle" fill="#fff" font-size="13">'+fmt(g.mean_final*100,1)+' %</text>';}
  ts.forEach((v,i)=>{svg+='<text x="'+(152+i*100)+'" y="265" text-anchor="middle" fill="#a5b8ce" font-size="12">'+v+'</text>';});
  ss.forEach((v,i)=>{svg+='<text x="95" y="'+(81+i*65)+'" text-anchor="end" fill="#a5b8ce" font-size="12">'+v+'</text>';});
  svg+='<text x="310" y="295" text-anchor="middle" fill="#a5b8ce" font-size="12">Umbral de activación</text><text x="15" y="25" fill="#a5b8ce" font-size="12">Fracción inicial</text></svg>';
  return '<section class="panel top-gap"><div class="panel-head"><h3>V3 · Sensibilidad de mecanismos</h3><span>SIMULACIÓN SINTÉTICA</span></div>'+svg+'<p class="legend-note">'+esc(run.nRuns)+' escenarios · '+esc(run.seeds)+' semillas por celda. La red irreversible estudia contagio, no cese de conflictos. Ajuste empírico: pendiente. No mide riesgo de países.</p></section>';
}
function recoverySimulation(){
  const run=parseRecoverySimulations(state.lab.experiments).at(-1);
  if(!run)return '';
  return '<section class="panel top-gap"><div class="panel-head"><h3>V3 · Contagio con recuperación</h3><span>SIMULACIÓN SINTÉTICA · '+run.nRuns+' ejecuciones</span></div><p class="subtext">La recuperación permite desactivaciones y reactivaciones. Son pasos artificiales, sin equivalencia a años ni probabilidades de países.</p><div class="scroll-x"><table><thead><tr><th>Fracción inicial</th><th>Umbral</th><th>Recuperación / paso</th><th>Media final</th><th>Dispersión p5–p95</th><th>Semillas</th></tr></thead><tbody>'+run.groups.map(g=>'<tr><td>'+fmt(g.initialShare,2)+'</td><td>'+fmt(g.threshold,2)+'</td><td>'+fmt(g.recovery,2)+'</td><td>'+fmt(g.mean,4)+'</td><td>'+fmt(g.q05,4)+' / '+fmt(g.q95,4)+'</td><td>'+g.seeds+'</td></tr>').join('')+'</tbody></table></div><p class="legend-note">Cuantiles entre semillas, no intervalos de una probabilidad real. Reproducción de semilla 0 verificada por celda. Calibración empírica y correspondencia con episodios históricos: pendientes.</p></section>';
}

function track(id){return TRACKS.find(t=>t.id===id)||TRACKS[0];}
function projectFor(id){
  const index={V1:"prj-psico-cliodinamica",V2:"prj-psico-forecast",V3:"prj-psico-agentes",V4:"prj-psico-metalab"};
  return state?.projects.find(p=>p.id===index[id])||null;
}
function milestones(id){return (state?.lab.milestones||[]).filter(m=>!id||m.track===id).sort((a,b)=>(a.order??99)-(b.order??99));}
function completed(id){return milestones(id).filter(m=>m.status==="HECHO").length;}
function maturity(id){
  const list=milestones(id);
  let n=0;
  for(const phase of PHASES){
    const subset=list.filter(m=>m.phase===phase);
    if(subset.length===0||subset.some(m=>m.status!=="HECHO"))break;
    n++;
  }
  return n;
}
function heading(kicker,title,detail=""){
  return '<div class="section-heading"><div><span class="eyebrow">'+esc(kicker)+'</span><h2>'+esc(title)+'</h2></div>'+(detail?'<p>'+esc(detail)+'</p>':"")+'</div>';
}
function empty(title,sub){
  return '<div class="empty"><strong>'+esc(title)+'</strong><p>'+esc(sub)+'</p></div>';
}
function header(){
  const p=state?.projects.find(x=>x.id==="prj-psicohistoria");
  document.getElementById("project-title").textContent=p?.name||"Laboratorio de investigación";
  document.getElementById("project-summary").textContent=p?.summary||"Investigación estructurada mediante cuatro vertientes comparables.";
  document.getElementById("as-of").textContent="Consulta privada · "+new Date().toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"});
}
function metrics(){
  const m=state?.lab.milestones||[];
  const e=state?.lab.evaluation||{};
  const data=[
    ["VERTIENTES",String(TRACKS.length),"líneas de investigación"],
    ["HITOS VERIFICADOS",completed()+"/"+m.length,"sin ponderación artificial"],
    ["EVALUACIONES",String((state?.lab.experiments||[]).filter(e=>e.status!=="CATALOGO_RETROSPECTIVO").length),"registros modelo / objetivo"],
    ["BRIER PROSPECTIVO",fmt(e.brier,4),String(e.resolved||0)+" predicciones evaluables"]
  ];
  document.getElementById("headline-metrics").innerHTML=data.map(x=>'<article class="metric"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><em>'+esc(x[2])+'</em></article>').join("");
}
function trackCard(id){
  const t=track(id),p=projectFor(id),total=milestones(id).length,done=completed(id),pct=total?Math.round(done/total*100):0;
  return '<button type="button" class="track-card" data-track="'+id+'" aria-pressed="'+String(activeTrack===id)+'">'+
    '<span class="track-num">'+id+' / MADUREZ '+maturity(id)+'/5</span>'+
    '<strong>'+esc(p?.name||id)+'</strong><p>'+esc(t.subtitle)+'</p>'+
    '<progress class="track-bar" value="'+done+'" max="'+(total||1)+'" aria-label="'+esc(id)+' hitos completados"></progress>'+
    '<div class="track-foot"><span>'+done+'/'+total+' hitos cerrados</span><span>'+pct+'% de hitos</span></div></button>';
}
function neuralObservatory(){
  const p=projectFor(activeTrack),total=milestones(activeTrack).length,done=completed(activeTrack);
  const names={V1:'Cliodinámica',V2:'Forecasting',V3:'Simulación',V4:'Meta-Lab'};
  return '<section class="neural-observatory" aria-label="Núcleo neuronal del laboratorio">'+
    '<div class="neural-top"><div><span class="eyebrow">NEURAL OBSERVATORY / 01</span><h3>La forma de una idea</h3></div><span class="neural-mode">RED CONCEPTUAL</span></div>'+
    '<div class="neural-layout"><div class="neural-stage" data-motion="paused">'+
      '<div class="neural-grid" aria-hidden="true"></div><canvas class="neural-canvas" aria-hidden="true">Red conceptual de las cuatro vertientes.</canvas>'+
      '<div class="neural-crosshair" aria-hidden="true">+</div>'+
      TRACKS.map(t=>'<button type="button" class="neural-orb" data-track="'+t.id+'" aria-pressed="'+String(activeTrack===t.id)+'" aria-label="Seleccionar '+names[t.id]+' ('+t.id+')"><span class="orb-sphere" aria-hidden="true"><span>'+t.id+'</span></span><strong>'+names[t.id]+'</strong></button>').join('')+
      '<div class="neural-signature" aria-hidden="true"><span>PSICOHISTORIA</span><small>CUATRO MÉTODOS · UNA PREGUNTA</small></div>'+
      '<button type="button" class="motion-toggle" data-motion-toggle aria-pressed="false">Ⅱ Pausar movimiento</button>'+
    '</div><aside class="neural-context" data-track="'+activeTrack+'">'+
      '<span class="neural-selection">'+activeTrack+' / FOCO DE INVESTIGACIÓN</span><h4>'+esc(p?.name||names[activeTrack])+'</h4><p>'+esc(track(activeTrack).subtitle)+'</p>'+
      '<div class="neural-fact"><strong>'+done+'<span> / '+total+'</span></strong><small>hitos cerrados en el registro</small></div>'+
      '<progress class="track-bar" value="'+done+'" max="'+(total||1)+'" aria-label="Hitos de '+activeTrack+'"></progress>'+
      '<span class="status-chip">'+esc(p?.status||'Sin estado')+'</span>'+
      '<button type="button" class="neural-evidence" data-open-science>Explorar evidencia <span aria-hidden="true">↗</span></button>'+
      '<p class="neural-disclaimer">Visualización conceptual. Los pulsos no representan cálculos en ejecución. El avance mide hitos, no precisión predictiva.</p>'+
    '</aside></div></section>';
}
function milestoneRow(m){
  const isDone=m.status==="HECHO",isBlocked=m.status==="BLOQUEADO";
  const evidence=url(m.evidence);
  return '<article class="milestone"><span class="bullet'+(isDone?' complete':isBlocked?' block':'')+'"></span><div><small>'+esc(m.phase)+' · '+esc(m.status)+'</small><h4>'+esc(m.title)+'</h4><p>'+esc(m.criteria)+'</p>'+(evidence?'<a href="'+esc(evidence)+'" target="_blank" rel="noopener noreferrer" class="evidence-link">Ver evidencia ↗</a>':'')+'</div></article>';
}
function kpiRow(k){
  const suffix=k.unit==="%"?" %":k.unit==="N"?"":"";
  const val=finite(k.value)?fmt(k.value,4)+suffix:"Sin medición";
  return '<div class="kpi"><div><strong>'+esc(k.name)+'</strong><small>'+esc(k.definition)+'</small></div><b>'+esc(val)+'</b></div>';
}
function overview(){
  const t=track(activeTrack),p=projectFor(activeTrack),ms=milestones(activeTrack),ks=state.lab.kpis.filter(k=>k.track===activeTrack);
  const stage=maturity(activeTrack);
  return heading("INTELIGENCIA COLECTIVA","Cuatro líneas, un único laboratorio","Toca un orbe para explorar su vertiente")+
    neuralObservatory()+
    '<section class="track-deck" aria-label="Vertientes de investigación">'+TRACKS.map(t=>trackCard(t.id)).join("")+'</section>'+
    '<div class="detail-panels">'+
      '<section class="panel"><div class="panel-head"><h3>'+esc(p?.name||activeTrack)+'</h3><span class="status-chip">'+esc(p?.status||"Sin estado")+'</span></div>'+
        '<p class="subtext">'+esc(p?.summary||"Sin descripción")+'</p>'+
        '<div class="stage">'+PHASES.map((x,i)=>'<span class="'+(i<stage?'done':'')+'" title="'+esc(x)+'"></span>').join("")+'</div>'+
        '<p class="subtext">Madurez '+stage+'/5 · fase actual: '+esc(PHASES[Math.min(stage,PHASES.length-1)])+'. La fase solo se completa cuando todos sus criterios están cerrados.</p>'+
        '<div class="milestones">'+(ms.length?ms.map(milestoneRow).join(""):empty("Sin hitos","Completa el registro canónico PsicoHitos."))+'</div></section>'+
      '<section class="panel"><div class="panel-head"><h3>Indicadores de '+activeTrack+'</h3><span>Definiciones auditables</span></div>'+
      '<div class="kpi-list">'+(ks.length?ks.map(kpiRow).join(""):empty("Sin KPIs","Todavía no existen indicadores definidos."))+'</div>'+
      '<p class="legend-note">Los campos sin medición se mantienen vacíos. No se inventan scores, accuracy ni una clasificación global de vertientes.</p></section>'+
    '</div>';
}
function chart(){
  const b=state.lab.evaluation?.calibration||[];
  const usable=b.filter(x=>x.count>0&&finite(x.meanProbability)&&finite(x.eventRate));
  if(!usable.length)return empty("Todavía no hay calibración medible","Registra predicciones prospectivas RESUELTAS con emisión anterior al desenlace, probabilidades y etiquetas 0/1.");
  const w=330,h=240,pad=35;
  const sx=x=>pad+x*(w-2*pad),sy=y=>h-pad-y*(h-2*pad);
  let out='<svg viewBox="0 0 330 240" role="img" aria-label="Diagrama de calibración observado por probabilidades agregadas"><line x1="'+pad+'" y1="'+sy(0)+'" x2="'+(w-pad)+'" y2="'+sy(1)+'" stroke="#83a4c8" stroke-dasharray="4 6"/>';
  for(let i=0;i<=4;i++){const v=i/4;out+='<text x="'+sx(v)+'" y="'+(h-10)+'" text-anchor="middle" fill="#8bb5d3" font-size="10">'+v.toFixed(2)+'</text>';}
  out+='<text x="165" y="237" text-anchor="middle" fill="#96b5d0" font-size="10">Probabilidad estimada</text>';
  for(const q of usable)out+='<circle cx="'+sx(q.meanProbability)+'" cy="'+sy(q.eventRate)+'" r="'+Math.min(14,4+Math.sqrt(q.count))+'" fill="#ff8a28" stroke="#ffddad" stroke-width="1.5"><title>'+q.count+' observaciones</title></circle>';
  return out+'</svg>';
}
function science(){
  const e=state.lab.evaluation||{};
  const rows=(state.lab.experiments||[]).filter(r=>r.status!=="CATALOGO_RETROSPECTIVO");
  return retrospective()+simulation()+recoverySimulation()+heading("REGISTRO PROSPECTIVO","Evidencia emitida antes del desenlace","Sellado independiente obligatorio")+
    '<div class="two-col">'+
      '<section class="panel"><div class="panel-head"><h3>Calibración prospectiva</h3><span>'+Number(e.resolved||0)+' resueltas válidas</span></div>'+
      '<div class="chart">'+chart()+'</div>'+
      '<p class="chart-note">La diagonal representa calibración perfecta. Los círculos solo existen cuando hay resultados verificables.</p></section>'+
      '<section class="panel"><div class="panel-head"><h3>Scoring probabilístico</h3><span>Métrica propia</span></div>'+
      '<div class="kpi-list">'+[
        ["Brier score",fmt(e.brier,4),"Menor es mejor; solo pronósticos prospectivos válidos"],
        ["Brier del modelo, muestra pareada",fmt(e.modelPairedBrier,4),"Mismas observaciones que el baseline"],
        ["Brier del baseline pareado",fmt(e.baselinePairedBrier,4),"No comparar muestras distintas"],
        ["Brier Skill Score",fmt(e.brierSkill,4),"1 − Brier modelo / Brier baseline"],
        ["Observaciones pareadas",fmt(e.pairedCount,0),"Con referencia probabilística completa"],
        ["Resueltas excluidas",fmt(e.rejectedResolved,0),"Incumplen fechas, estado o rango"]
      ].map(a=>'<div class="kpi"><div><strong>'+esc(a[0])+'</strong><small>'+esc(a[2])+'</small></div><b>'+esc(a[1])+'</b></div>').join("")+'</div>'+
      '<p class="legend-note">El Sheet es editable. Sin comprobación independiente del sello y del contenido original no se evalúa ninguna fila como prospectiva. '+Number(e.unsealed||0)+' emisiones sin sello verificado.</p></section></div>'+
      '<section class="panel top-gap"><div class="panel-head"><h3>Resultados de experimentos</h3><span>'+rows.length+' registros</span></div>'+
      (rows.length?'<div class="scroll-x"><table><thead><tr><th>Vertiente</th><th>Hipótesis</th><th>Modelo</th><th>Resultado</th><th>Comparador</th><th>Estado</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+esc(r.track)+'</td><td>'+esc(r.hypothesis)+'</td><td>'+esc(r.modelVersion)+'</td><td>'+esc(r.metric)+': '+esc(fmt(r.value,5))+'</td><td>'+esc(fmt(r.baseline,5))+'</td><td>'+esc(r.status)+(url(r.evidence)?'<br><a href="'+esc(url(r.evidence))+'" target="_blank" rel="noopener noreferrer">Evidencia ↗</a>':'')+'</td></tr>').join("")+'</tbody></table></div>':
      empty("No se ha ejecutado todavía ningún experimento registrado","Los prototipos y modelos no deben aparecer como evaluados antes de tener evidencia versionada."))+'</section>';
}
function operations(){
  const exps=state.lab.experiments,ps=state.lab.predictions,e=state.lab.evaluation||{};
  return heading("EJECUCIÓN Y TRAZABILIDAD","Operaciones del laboratorio","Sin automatización que altere fuentes originales")+
  '<div class="two-col">'+
    '<section class="panel"><div class="panel-head"><h3>Registro de predicciones</h3><span>'+ps.length+' emisiones</span></div>'+
      (ps.length?'<div class="scroll-x"><table><thead><tr><th>Vertiente</th><th>Fenómeno</th><th>Horizonte</th><th>Prob.</th><th>Emisión</th><th>Estado</th></tr></thead><tbody>'+
      ps.map(p=>'<tr><td>'+esc(p.track)+'</td><td>'+esc(p.phenomenon)+'</td><td>'+esc(p.horizon)+'</td><td>'+esc(finite(p.probability)?(p.probability*100).toFixed(1)+" %":"—")+'</td><td>'+esc(p.issuedAt||"—")+'</td><td>'+esc(p.status)+'</td></tr>').join("")+'</tbody></table></div>':
      empty("Cero predicciones emitidas","Las predicciones futuras deberán guardarse con fecha, probabilidad y versión de modelo antes del desenlace."))+
    '</section>'+
    '<section class="panel"><div class="panel-head"><h3>Control de calidad</h3><span>Laboratorio v0.1</span></div>'+
      '<div class="kpi-list">'+[
        ["Experimentos documentados",String(exps.length),"Versionado requerido"],
        ["Predicciones registradas",String(ps.length),"Sin retrospectivos camuflados"],
        ["Predicciones evaluadas",String(e.resolved||0),"Solo RESUELTA válida"],
        ["Resultados rechazados",String(e.rejectedResolved||0),"Control automático de fechas"],
        ["KPIs definidos",String(state.lab.kpis.length),"No equivale a KPIs medidos"]
      ].map(a=>'<div class="kpi"><div><strong>'+esc(a[0])+'</strong><small>'+esc(a[2])+'</small></div><b>'+esc(a[1])+'</b></div>').join("")+'</div>'+
      '<p class="legend-note">Persistencia: registro privado de Google Sheets; lecturas mediante Worker autenticado. Actualización manual para limitar llamadas y coste.</p></section>'+
    '</div>';
}
function roadmap(){
  const ms=milestones().filter(m=>milestoneFilter==="TODOS"||m.track===milestoneFilter);
  return heading("DEL DISEÑO A LA PRODUCCIÓN","Hoja de ruta verificable","No se da por terminada una etapa sin evidencia")+
    '<div class="filter-row"><button data-filter="TODOS" class="'+(milestoneFilter==="TODOS"?'active':'')+'">Todas</button>'+
    TRACKS.map(t=>'<button data-filter="'+t.id+'" class="'+(milestoneFilter===t.id?'active':'')+'">'+t.id+'</button>').join("")+'</div>'+
    '<section class="panel"><div class="milestones">'+ms.map(m=>'<div><span class="eyebrow">'+esc(m.track)+' / '+esc(m.id)+'</span>'+milestoneRow(m)+'</div>').join("")+'</div></section>';
}
function render(){
  if(!state)return;
  document.body.dataset.labView = activeView;
  disposeNeural();
  disposeFutures();
  header();metrics();
  root.innerHTML=activeView==="futures"?'<div id="future-explorer"></div>':activeView==="overview"?overview():activeView==="science"?science():activeView==="operations"?operations():roadmap();
  document.querySelectorAll("[data-view]").forEach(x=>{x.classList.toggle("active",x.dataset.view===activeView);x.setAttribute("aria-current",x.dataset.view===activeView?"page":"false");});
  if(activeView==="futures")disposeFutures=mountFutureExplorer(root.querySelector('#future-explorer'),state.lab.futuresCatalogs,{onTrack:id=>{activeTrack=id;activeView='overview';render();}});
  if(activeView==="overview")disposeNeural=mountNeural(root.querySelector('.neural-stage'),{activeTrack,paused:motionPaused,onPause:value=>{motionPaused=value;}});
  root.querySelectorAll("button[data-track]").forEach(x=>x.addEventListener("click",()=>{
    const source=x.classList.contains('neural-orb')?'neural-orb':'track-card';
    activeTrack=x.dataset.track;render();
    root.querySelector('.'+source+'[data-track="'+activeTrack+'"]').focus({preventScroll:true});
  }));
  root.querySelector('[data-open-science]')?.addEventListener('click',()=>{
    activeView='science';render();document.querySelector('[data-view="science"]').focus({preventScroll:true});
  });
  root.querySelectorAll("[data-filter]").forEach(x=>x.addEventListener("click",()=>{milestoneFilter=x.dataset.filter;render();}));
  root.querySelectorAll('[data-task]').forEach(x=>x.addEventListener('click',()=>{selectedTask=x.dataset.task;selectedModel='';render();}));
  root.querySelectorAll('[data-model]').forEach(x=>x.addEventListener('click',()=>{selectedModel=x.dataset.model;render();}));
}
async function load(){
  const mine=++generation;
  const refresh=document.getElementById("refresh");
  const status=document.getElementById("status");
  refresh.disabled=true;
  status.textContent="Consultando fuentes privadas…";
  try{
    const options={credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}};
    const [projectsRes,labRes]=await Promise.all([fetch("/api/projects",options),fetch("/api/research-lab",options)]);
    if(!projectsRes.ok||!labRes.ok)throw new Error("No se puede acceder a las fuentes privadas");
    const [projectsPayload,lab]=await Promise.all([projectsRes.json(),labRes.json()]);
    if(mine!==generation)return;
    if(!projectsPayload.ok||!lab.ok||!["ok-live","ok-cache"].includes(lab.status))throw new Error("Fuente todavía no disponible");
    state={projects:projectsPayload.projects||[],lab};
    status.textContent="Datos obtenidos del registro privado · "+(lab.status==="ok-cache"?"caché reciente":"lectura actual")+" · "+state.lab.milestones.length+" hitos";
    render();
  }catch(error){
    if(mine!==generation)return;
    status.innerHTML='<span class="error">No se ha podido obtener el estado del laboratorio.</span>';
    if(!state)root.innerHTML=empty("No disponible","Verifica el acceso privado y vuelve a pulsar Actualizar. No se muestran resultados simulados.");
    console.warn("Research laboratory unavailable",String(error?.message||"read failure"));
  }finally{if(mine===generation)refresh.disabled=false;}
}
document.getElementById("refresh").addEventListener("click",load);
document.querySelectorAll("[data-view]").forEach(x=>x.addEventListener("click",()=>{activeView=x.dataset.view;render();}));
load();
