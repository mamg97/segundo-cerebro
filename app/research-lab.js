// Private, data-driven research dashboard. No synthetic research results in production.
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
let activeView="overview";
let activeTrack=TRACKS.some(t=>t.id===new URLSearchParams(window.location.search).get("track")) ? new URLSearchParams(window.location.search).get("track") : "V2";
let milestoneFilter="TODOS";
let generation=0;

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
    ["EXPERIMENTOS",String(state?.lab.experiments.length||0),"registrados y versionados"],
    ["BRIER PROSPECTIVO",fmt(e.brier,4),String(e.resolved||0)+" predicciones evaluables"]
  ];
  document.getElementById("headline-metrics").innerHTML=data.map(x=>'<article class="metric"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><em>'+esc(x[2])+'</em></article>').join("");
}
function trackCard(id){
  const t=track(id),p=projectFor(id),total=milestones(id).length,done=completed(id),pct=total?Math.round(done/total*100):0;
  return '<button type="button" class="track-card" data-track="'+id+'" aria-pressed="'+String(activeTrack===id)+'" style="--color:'+t.color+'">'+
    '<span class="track-num">'+id+' / MADUREZ '+maturity(id)+'/5</span>'+
    '<strong>'+esc(p?.name||id)+'</strong><p>'+esc(t.subtitle)+'</p>'+
    '<div class="track-bar"><span style="width:'+pct+'%"></span></div>'+
    '<div class="track-foot"><span>'+done+'/'+total+' hitos cerrados</span><span>'+pct+'% de hitos</span></div></button>';
}
function orbit(){
  const coords=[[95,80],[305,80],[95,302],[305,302]];
  let out='<svg viewBox="0 0 400 380" role="img" aria-label="Cuatro vertientes alrededor del núcleo; radios proporcionales a sus hitos verificados">';
  out+='<defs><radialGradient id="glow"><stop stop-color="#22517d"/><stop offset="1" stop-color="#10263f"/></radialGradient></defs>';
  out+='<circle cx="200" cy="190" r="135" fill="none" stroke="#345678" stroke-dasharray="3 9"/>';
  out+='<circle cx="200" cy="190" r="93" fill="none" stroke="#254969"/>';
  coords.forEach(([x,y],i)=>{out+='<path d="M200 190 L'+x+' '+y+'" stroke="#315273" stroke-width="1.5"/>';});
  out+='<circle cx="200" cy="190" r="55" fill="url(#glow)" stroke="#4d86ae"/>';
  out+='<circle cx="200" cy="190" r="41" fill="none" stroke="#ff8a28" stroke-dasharray="2 5"/>';
  out+='<text x="200" y="182" class="orbit-center">NÚCLEO</text><text x="200" y="202" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="800">PSICOHISTORIA</text>';
  coords.forEach(([x,y],i)=>{
    const id=TRACKS[i].id,c=TRACKS[i].color,n=milestones(id).length,d=completed(id),percent=n?d/n:0;
    const radius=38,circ=2*Math.PI*radius;
    out+='<circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="#102740" stroke="#274967" stroke-width="6"/>';
    out+='<circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round" transform="rotate(-90 '+x+' '+y+')" stroke-dasharray="'+(circ*percent).toFixed(2)+' '+circ.toFixed(2)+'"/>';
    out+='<text x="'+x+'" y="'+(y-2)+'" text-anchor="middle" class="orbit-label">'+id+'</text><text x="'+x+'" y="'+(y+15)+'" text-anchor="middle" class="orbit-num">'+d+'/'+n+'</text>';
  });
  return out+'</svg>';
}
function milestoneRow(m){
  const isDone=m.status==="HECHO",isBlocked=m.status==="BLOQUEADO";
  const evidence=url(m.evidence);
  return '<article class="milestone"><span class="bullet'+(isDone?' complete':isBlocked?' block':'')+'"></span><div><small>'+esc(m.phase)+' · '+esc(m.status)+'</small><h4>'+esc(m.title)+'</h4><p>'+esc(m.criteria)+'</p>'+(evidence?'<a href="'+esc(evidence)+'" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#7ecaff">Ver evidencia ↗</a>':'')+'</div></article>';
}
function kpiRow(k){
  const suffix=k.unit==="%"?" %":k.unit==="N"?"":"";
  const val=finite(k.value)?fmt(k.value,4)+suffix:"Sin medición";
  return '<div class="kpi"><div><strong>'+esc(k.name)+'</strong><small>'+esc(k.definition)+'</small></div><b>'+esc(val)+'</b></div>';
}
function overview(){
  const t=track(activeTrack),p=projectFor(activeTrack),ms=milestones(activeTrack),ks=state.lab.kpis.filter(k=>k.track===activeTrack);
  const stage=maturity(activeTrack);
  return heading("ARQUITECTURA ACTIVA","Cuatro líneas, un único laboratorio","Selecciona una vertiente para inspeccionar evidencias")+
    '<div class="overview-layout">'+
      '<section class="panel"><div class="panel-head"><h3>Constelación de investigación</h3><span>Avance real de hitos</span></div><div class="orbit-wrap">'+orbit()+'</div><p class="legend-note">Cada anillo representa hitos cerrados, no precisión predictiva. El tamaño del progreso jamás implica validez científica.</p></section>'+
      '<section class="panel"><div class="panel-head"><h3>Vertientes de trabajo</h3><span>4 módulos interrelacionados</span></div><div class="track-stack">'+TRACKS.map(t=>trackCard(t.id)).join("")+'</div></section>'+
    '</div>'+
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
  const rows=state.lab.experiments||[];
  return heading("AUDITORÍA EPISTÉMICA","¿Funciona realmente?","Primero predicción fuera de muestra, después presentación")+
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
      '<p class="legend-note">Estos indicadores no prueban causalidad. Un score aislado tampoco acredita capacidad predictiva: exigen tamaño muestral, incertidumbre y baseline adecuado.</p></section></div>'+
      '<section class="panel" style="margin-top:17px"><div class="panel-head"><h3>Resultados de experimentos</h3><span>'+rows.length+' registros</span></div>'+
      (rows.length?'<div class="scroll-x"><table><thead><tr><th>Vertiente</th><th>Hipótesis</th><th>Modelo</th><th>Resultado</th><th>Comparador</th><th>Estado</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+esc(r.track)+'</td><td>'+esc(r.hypothesis)+'</td><td>'+esc(r.modelVersion)+'</td><td>'+esc(fmt(r.value))+'</td><td>'+esc(fmt(r.baseline))+'</td><td>'+esc(r.status)+'</td></tr>').join("")+'</tbody></table></div>':
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
  header();metrics();
  root.innerHTML=activeView==="overview"?overview():activeView==="science"?science():activeView==="operations"?operations():roadmap();
  document.querySelectorAll("[data-view]").forEach(x=>{x.classList.toggle("active",x.dataset.view===activeView);x.setAttribute("aria-current",x.dataset.view===activeView?"page":"false");});
  root.querySelectorAll("[data-track]").forEach(x=>x.addEventListener("click",()=>{activeTrack=x.dataset.track;render();}));
  root.querySelectorAll("[data-filter]").forEach(x=>x.addEventListener("click",()=>{milestoneFilter=x.dataset.filter;render();}));
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
