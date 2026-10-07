export const CAREER_DEMO = {
  profile: {
    current_employer: { value: "Empresa tecnológica ficticia" },
    current_role: { value: "Data Scientist · Risk Analytics" },
    location: { value: "Madrid" },
    transition_principle: { value: "Transición ordenada y handover completo" }
  },
  summary: { currentEmployer: "Empresa tecnológica ficticia", currentRole: "Data Scientist · Risk Analytics", location: "Madrid", fixedSalary: null, nextAction: "Obtener condiciones formales", updatedAt: "2026-10-01" },
  opportunities: [
    { id:"demo-internal", organization:"Banco ficticio", role:"Internalización en Risk Analytics", status:"exploring", location:"Madrid", fitEstimate:"high", compensation:{min:null,mid:null,max:null,status:"estimate_not_offer"}, nextAction:"Solicitar puesto, banda y paquete total", blocker:"Sin oferta formal" },
    { id:"demo-external", organization:"Compañía tecnológica ficticia", role:"Deployment Strategist", status:"evaluating", location:"Madrid", fitEstimate:"8/10", compensation:{min:null,mid:null,max:null,status:"unknown"}, nextAction:"Preparar candidatura", blocker:"Portfolio pendiente" }
  ],
  organization: [
    { id:"demo-head", name:"Responsable de función", role:"Head of Risk", relationToUser:"function_head" },
    { id:"demo-manager", name:"Manager directo", role:"Risk Manager", relationToUser:"functional_manager" },
    { id:"demo-user", name:"Usuario", role:"Data Scientist", relationToUser:"self" }
  ],
  compensation: [
    { id:"demo-current", label:"Situación actual", min:null,mid:null,max:null,status:"hidden",interpretation:"Oculto en modo demo" },
    { id:"demo-central", label:"Movimiento interno · escenario central",min:null,mid:null,max:null,status:"estimate",interpretation:"Rango oculto en modo demo" }
  ],
  assets: [
    {id:"demo-cv",type:"CV",label:"CV",status:"needs_rework",nextAction:"Reescribir para impacto y resultados"},
    {id:"demo-linkedin",type:"LinkedIn",label:"Perfil profesional",status:"active",nextAction:"Alinear posicionamiento"},
    {id:"demo-github",type:"GitHub",label:"Portfolio técnico",status:"blocked_privacy",nextAction:"Sanear antes de compartir"}
  ],
  goals:[{id:"demo-goal",title:"Clarificar siguiente paso profesional",horizon:"90 días",status:"active",metric:"Opciones comparadas",target:"2",nextAction:"Conseguir condiciones comparables"}],
  decisions:[{id:"demo-dec",title:"Evaluar movimiento interno",status:"open",question:"¿Mejora rol, compensación y trayectoria?",currentView:"Falta oferta formal",nextAction:"Esperar condiciones concretas"}],
  source:{kind:"mock",name:"Demo sintética"}
};

function esc(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function hasNumber(value){return value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));}
function money(value){if(!hasNumber(value))return"—";const n=Number(value);return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);}
function status(value){const k=String(value||"").toLowerCase();return ({confirmed:"Confirmado",hidden:"Dato oculto",estimate:"Estimación",estimate_not_offer:"Estimación · no oferta",unknown:"Sin dato",exploring:"Explorando",evaluating:"Evaluando",active:"Activo",open:"Abierta",needs_rework:"A rehacer",blocked_privacy:"Bloqueado · privacidad",portfolio_candidate:"Portfolio"})[k]||value||"—";}
function range(item){const vals=[item?.min,item?.mid,item?.max].filter(hasNumber);if(!vals.length)return"Sin cifra";if(vals.every(v=>Number(v)===Number(vals[0])))return money(vals[0]);return (hasNumber(item.min)?money(item.min):"—")+" – "+(hasNumber(item.max)?money(item.max):"—");}
function p(data,key){return data?.profile?.[key]?.value??null;}
function relation(v){return ({self:"Tu posición",functional_manager:"Manager",function_head:"Responsable de función",upper_chain:"Cadena superior"})[v]||v||"";}

async function load(remote){
  if(!remote)return CAREER_DEMO;
  const response=await fetch("/api/career",{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw new Error("CAREER_"+response.status);
  return response.json();
}

export function renderCareer(data){
  const s=data.summary||{}, opp=Array.isArray(data.opportunities)?data.opportunities:[], comp=Array.isArray(data.compensation)?data.compensation:[], org=Array.isArray(data.organization)?data.organization:[], assets=Array.isArray(data.assets)?data.assets:[], decisions=Array.isArray(data.decisions)?data.decisions:[], goals=Array.isArray(data.goals)?data.goals:[];
  const isDemo=data?.source?.kind==="mock";
  const salaryValue=isDemo?"—":money(s.fixedSalary);
  const salaryStatus=isDemo?"Dato oculto":"Confirmado";
  return `<div class="career-workspace">
    <section class="career-hero"><div><span class="career-kicker">Situación actual</span><h3>${esc(s.currentRole||"Carrera profesional")}</h3><p>${esc([s.currentEmployer,s.location].filter(Boolean).join(" · "))}</p></div><div class="career-hero-pay"><small>Fijo actual</small><strong>${esc(salaryValue)}</strong><span>${esc(salaryStatus)}</span></div></section>
    <section class="career-summary-grid"><article><small>Rutas abiertas</small><strong>${opp.length}</strong><span>${esc(s.nextAction||"Sin siguiente acción")}</span></article><article><small>Decisiones</small><strong>${decisions.filter(x=>x.status==="open").length}</strong><span>requieren evidencia antes de cerrar</span></article><article><small>Activos con trabajo</small><strong>${assets.filter(x=>/blocked|needs_/i.test(String(x.status||""))).length}</strong><span>CV · LinkedIn · GitHub · portfolio</span></article></section>

    <section class="career-section"><div class="career-section-head"><div><small>Estrategia</small><h3>Rutas profesionales</h3></div><span>${opp.length} abiertas</span></div><div class="career-opportunities">
      ${opp.map(x=>`<article class="career-opportunity"><div class="career-opportunity-top"><div><small>${esc(x.organization||"Organización")}</small><strong>${esc(x.role||"Oportunidad")}</strong></div><span class="career-status">${esc(status(x.status))}</span></div><div class="career-opportunity-meta"><span>${esc(x.location||"Ubicación pendiente")}</span>${x.fitEstimate?`<span>Encaje ${esc(x.fitEstimate)}</span>`:""}${x.compensation?.status!=="unknown"?`<span>${esc(isDemo?"Rango oculto":range(x.compensation))} · ${esc(status(x.compensation?.status))}</span>`:""}</div>${x.nextAction?`<p><b>Siguiente:</b> ${esc(x.nextAction)}</p>`:""}${x.blocker?`<p class="career-blocker"><b>Bloqueo:</b> ${esc(x.blocker)}</p>`:""}${x.notes?`<small class="career-note">${esc(x.notes)}</small>`:""}${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noreferrer">Abrir referencia ↗</a>`:""}</article>`).join("")||'<p class="career-empty">Sin oportunidades abiertas.</p>'}
    </div></section>

    <section class="career-section"><div class="career-section-head"><div><small>Mercado y negociación</small><h3>Compensación</h3></div><span>Hechos ≠ estimaciones</span></div><div class="career-comp-table"><div class="career-comp-row career-comp-head"><span>Escenario</span><span>Rango fijo</span><span>Estado</span></div>${comp.map(x=>`<div class="career-comp-row"><span><strong>${esc(x.label||"Escenario")}</strong><small>${esc(x.interpretation||"")}</small></span><span>${esc(isDemo?"—":range(x))}</span><span>${esc(status(x.status))}</span></div>`).join("")}</div></section>

    <section class="career-section"><div class="career-section-head"><div><small>Contexto</small><h3>Cadena organizativa</h3></div><span>Privado</span></div><div class="career-org">${org.map(x=>`<article class="career-org-row"><span class="career-org-node"></span><div><strong>${esc(x.name||"Persona")}</strong><p>${esc(x.role||x.function||"")}</p></div><small>${esc(relation(x.relationToUser))}</small></article>`).join("")||'<p class="career-empty">Sin contexto organizativo.</p>'}</div></section>

    <section class="career-two-col"><div class="career-section"><div class="career-section-head"><div><small>Readiness</small><h3>Activos profesionales</h3></div></div><div class="career-list">${assets.map(x=>`<article><div><small>${esc(x.type||"Activo")}</small><strong>${esc(x.label||"Activo")}</strong></div><span>${esc(status(x.status))}</span>${x.nextAction?`<p>${esc(x.nextAction)}</p>`:""}</article>`).join("")}</div></div>
    <div class="career-section"><div class="career-section-head"><div><small>Gobierno de decisión</small><h3>Decisiones abiertas</h3></div></div><div class="career-list">${decisions.filter(x=>x.status==="open").map(x=>`<article><div><small>Decisión</small><strong>${esc(x.title||"Decisión")}</strong></div><span>Abierta</span>${x.question?`<p>${esc(x.question)}</p>`:""}${x.currentView?`<p class="career-note">${esc(x.currentView)}</p>`:""}${x.nextAction?`<p><b>Siguiente:</b> ${esc(x.nextAction)}</p>`:""}</article>`).join("")||'<p class="career-empty">Sin decisiones abiertas.</p>'}</div></div></section>

    <section class="career-section"><div class="career-section-head"><div><small>Dirección</small><h3>Objetivos</h3></div></div><div class="career-goals">${goals.filter(x=>x.status==="active").map(x=>`<article><strong>${esc(x.title||"Objetivo")}</strong><span>${esc(x.horizon||"")}</span><p>${esc([x.metric&&x.target?x.metric+": "+x.target:null,x.nextAction].filter(Boolean).join(" · "))}</p></article>`).join("")}</div></section>

    ${p(data,"transition_principle")||p(data,"notice_preference")?`<section class="career-principles"><strong>Principios de transición</strong>${p(data,"transition_principle")?`<p>${esc(p(data,"transition_principle"))}</p>`:""}${p(data,"notice_preference")?`<small>${esc(p(data,"notice_preference"))}</small>`:""}</section>`:""}
    <p class="career-source">Fuente: ${esc(data.source?.name||"Carrera")} · actualizado ${esc(s.updatedAt||"sin fecha")}</p>
  </div>`;
}

export async function openCareerDetail(remote=false){
  const dialog=document.querySelector("#detail-dialog"); if(!dialog)return;
  document.querySelector("#dialog-context").textContent=remote?"Carrera · privado":"Carrera · demo";
  document.querySelector("#dialog-title").textContent="Carrera profesional";
  const body=document.querySelector("#dialog-body"); body.innerHTML='<p class="career-loading">Cargando carrera…</p>';
  if(!dialog.open)dialog.showModal();
  try{body.innerHTML=renderCareer(await load(remote));}
  catch(error){console.warn("Career load failed",error);body.innerHTML='<div class="career-empty"><strong>No se ha podido cargar Carrera</strong><p>La fuente privada no está disponible ahora mismo.</p></div>';}
}
