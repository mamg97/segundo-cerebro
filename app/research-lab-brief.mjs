// AV-061: first-screen research briefing, based ONLY on private lab metadata.
// No country-level probabilities, private URLs or synthetic forecasts in Git.
import {approvedPrivateRankingLink} from "./research-shadow2027.mjs";

const escapeHtml = input => String(input??"").replace(/[&<>"']/g,
 c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number = input => Number.isFinite(input) && input>=0 ? input : 0;
const dayString = date => date.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"});
export const POLICY={
  target:"Presencia anual de ≥25 muertes por violencia estatal",
  notTarget:"No es una predicción del comienzo de una guerra.",
  freezeDeadline:"2027-01-01",
  firstScoreYear:2028,
};
export function briefingFacts(lab,now=new Date()){
  const experiments=Array.isArray(lab?.experiments)?lab.experiments:[];
  const predictions=Array.isArray(lab?.predictions)?lab.predictions:[];
  const shadow=Boolean(approvedPrivateRankingLink(experiments));
  const evaluated=number(lab?.evaluation?.resolved);
  const actual=predictions.length;
  const deadline=new Date(POLICY.freezeDeadline+"T00:00:00Z");
  const time=now instanceof Date&&Number.isFinite(now.getTime())?now.getTime():Date.now();
  const before= time<deadline.getTime();
  const remaining=before?Math.ceil((deadline.getTime()-time)/86400000):0;
  return {shadow,issued:actual,resolved:evaluated,before,remaining,
    canShowShadow:shadow,forecastCount:shadow?1176:0,countryCount:shadow?196:0,
    modelCount:shadow?6:0,deadline:dayString(deadline)};
}
function chip(text,kind="neutral"){return '<span class="brief-chip '+kind+'">'+escapeHtml(text)+'</span>';}
function card(icon,label,title,detail,kind="default"){
  return '<article class="brief-status-card '+kind+'"><span class="brief-card-icon" aria-hidden="true">'+
    icon+'</span><div><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(title)+
    '</strong><p>'+escapeHtml(detail)+'</p></div></article>';
}
export function renderResearchBriefing(lab,now=new Date()){
  const f=briefingFacts(lab,now);
  const availability=f.shadow?
    card("◉","CONSULTA ACTUAL","2027 ya se puede explorar",
      "196 países · 6 modelos · datos experimentales, sin validación futura.","ready"):
    card("◌","CONSULTA ACTUAL","Ranking no disponible",
      "No consta una fuente privada válida. No se muestran probabilidades de ejemplo.","blocked");
  const prospective= f.resolved>0?
    card("↗","EVALUACIÓN",""+f.resolved+" resultados evaluables",
      "Comprueba su procedencia y sus métricas en Evidencia."):
    card("◎","EVALUACIÓN","Aún sin resultados prospectivos",
      "El ranking actual no demuestra precisión ni anticipación real.","waiting");
  const issuedText=f.issued>0?
    f.issued+" registros de emisión · revisar estado":
    "0 emisiones registradas";
  const stepItems=[
    {num:"01",title:"Datos",sub:"Edición observada",kind:"done"},
    {num:"02",title:"Modelos",sub:f.shadow?"Cohorte experimental":"Sin cohorte verificable",kind:f.shadow?"done":"pending"},
    {num:"03",title:"Emitir",sub:f.issued>0?"Registro existente; verificar sello":"Falta sello y fecha verificable",kind:"pending"},
    {num:"04",title:"Evaluar",sub:f.resolved>0?"Consultar resultados":"Después de conocer 2027",kind:f.resolved>0?"done":"pending"}
  ];
  const tips=[
    {label:"PRIORIDAD 1",title:"Congelar las predicciones",body:f.before?
      "Objetivo antes del 1 ene 2027; exige sello externo y fuente as-of. No hay garantía hasta superar las pruebas.":
      "El plazo de emisión anterior a 2027 ya pasó. No atribuir retroactivamente validez prospectiva.",
      kind:"decision"},
    {label:"BLOQUEO",title:"Demostrar que no hubo filtración temporal",body:
      "Hay que acreditar qué datos estaban disponibles cuando se formuló cada predicción.",
      kind:"warning"},
    {label:"DECISIÓN ESTRATÉGICA",title:"Separar presencia de nuevos conflictos",body:
      "La cohorte 2027 estima presencia de violencia, no estallidos nuevos. Para alertas a 30–90 días hace falta otro modelo.",
      kind:"insight"}
  ];
  return '<section class="brief-hub" aria-label="Resumen ejecutivo del laboratorio">'+
    '<div class="brief-top"><div><span class="brief-kicker">PSICOHISTORIA / EN 10 SEGUNDOS</span>'+
    '<h2>Qué sabemos. Qué falta. Qué sigue.</h2>'+
    '<p>De los datos históricos a predicciones que puedan comprobarse.</p></div>'+
    chip(f.shadow?"Exploración disponible":"Fuente experimental pendiente",f.shadow?"ready":"muted")+
    '</div>'+
    '<div class="brief-signal"><span class="brief-signal-indicator" aria-hidden="true">●</span>'+
    '<div><strong>Estado científico: todavía no validado</strong>'+
    '<p>Ver un riesgo no significa que sepamos anticiparlo. '+escapeHtml(issuedText)+
    ' · '+escapeHtml(String(f.resolved))+' resultados prospectivos evaluables.</p></div></div>'+
    '<div class="brief-summary-grid">'+availability+
    card("◷","PRÓXIMA PUERTA",f.before?"Emisión antes de 2027":"Emisión 2027 no acreditada",
      f.before?f.remaining+" días hasta el 1 ene 2027 · condicionado a superar verificaciones.":
      "Sin sello anterior al periodo, las estimaciones no son prospectivas.","focus")+
    prospective+'</div>'+
    '<section class="brief-process" aria-label="Fases del experimento"><div class="brief-section-head">'+
    '<h3>El proceso, de un vistazo</h3><span>Los pasos 01–02 no prueban precisión</span></div>'+
    '<ol class="brief-stepper">'+stepItems.map(x=>'<li class="'+x.kind+'">'+
    '<span class="brief-step-no">'+x.num+'</span><strong>'+escapeHtml(x.title)+'</strong>'+
    '<small>'+escapeHtml(x.sub)+'</small></li>').join("")+'</ol></section>'+
    '<div class="brief-actions">'+
    '<button type="button" class="brief-primary" data-brief-go="shadow2027">Ver riesgos de 2027 →</button>'+
    '<button type="button" class="brief-secondary" data-brief-go="science">¿Funcionan los modelos?</button>'+
    '<button type="button" class="brief-secondary" data-brief-go="overview">Ver mapa del proyecto</button>'+
    '<button type="button" class="brief-secondary" data-brief-go="ideas">Explorar líneas y sinergias</button>'+
    '</div>'+
    '<section class="brief-strategy"><div class="brief-section-head">'+
    '<h3>Comentarios estratégicos</h3><span>Qué merece nuestra atención</span></div>'+
    '<div class="brief-strategy-grid">'+tips.map(t=>
    '<article class="brief-strategy-item '+t.kind+'"><small>'+escapeHtml(t.label)+
    '</small><h4>'+escapeHtml(t.title)+'</h4><p>'+escapeHtml(t.body)+
    '</p></article>').join("")+'</div></section>'+
    '<details class="brief-method"><summary>¿Cuándo serán útiles de verdad? <span aria-hidden="true">⌄</span></summary>'+
    '<div><p><strong>Ahora:</strong> sirven para explorar riesgos relativos, no para tomar decisiones de seguridad o inversión.</p>'+
    '<p><strong>Antes del 1 ene 2027:</strong> podemos intentar una emisión sellada, pero solo si quedan acreditadas las fuentes, el universo y el timestamp independiente.</p>'+
    '<p><strong>En 2028 (orientativo):</strong> podríamos medir la exactitud de 2027 cuando se publique la fuente completa. Publicación y validación aún no garantizadas.</p>'+
    '<p><strong>Alertas de nuevos conflictos a corto plazo:</strong> sin fecha científica, requieren experimentos mensuales separados y comparación con referencias externas.</p>'+
    '<p><strong>Objetivo actual:</strong> '+escapeHtml(POLICY.target)+'. '+escapeHtml(POLICY.notTarget)+'</p></div>'+
    '</details>'+
  '</section>';
}
