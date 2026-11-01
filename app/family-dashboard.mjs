// Pure view: no real personal names, diagnoses, addresses, loan values or
// private document contents belong to the public Git repository.
export const FAMILY_DASH_TOPICS=Object.freeze([
  {id:"health",title:"Salud y médicos",icon:"♡",domains:["health"],wealth:[]},
  {id:"disability",title:"Baja e incapacidad",icon:"▤",domains:["disability"],wealth:[]},
  {id:"retirement",title:"Jubilación",icon:"◷",domains:["retirement"],wealth:[]},
  {id:"business",title:"Taller y continuidad",icon:"▦",domains:["business"],wealth:["business"]},
  {id:"property",title:"Inmuebles",icon:"⌂",domains:["property"],wealth:["property"]},
  {id:"mortgage",title:"Hipotecas y deuda",icon:"≋",domains:["mortgage"],wealth:["debt"]},
  {id:"investment",title:"Inversiones",icon:"↗",domains:["investment"],wealth:["investment","cash"]},
  {id:"admin",title:"Otros trámites",icon:"☷",domains:["tax","admin","legal","other"],wealth:["other"]}
]);
const CLOSED=new Set(["DONE","ARCHIVED"]);
const scopeNames={all:"Todos",mother:"Madre",father:"Padre",shared:"Común"};
const labels={ACTIVE:"Activo",WAITING_EXTERNAL:"En espera",WAITING_DOCUMENT:"Falta documento",
  DECISION_OPEN:"Por decidir",SCHEDULED:"Programado",BLOCKED:"Bloqueado",DONE:"Finalizado",ARCHIVED:"Archivado"};
export function familyDashboardTopics(cases=[],wealthItems=[],scope="all"){
  const visibleCases=(Array.isArray(cases)?cases:[]).filter(c=>scope==="all"||c.personScope===scope);
  const visibleWealth=(Array.isArray(wealthItems)?wealthItems:[]).filter(w=>scope==="all"||w.ownerScope===scope);
  return FAMILY_DASH_TOPICS.map(topic=>{
    const entries=visibleCases.filter(c=>topic.domains.includes(c.domain));
    const assets=visibleWealth.filter(w=>topic.wealth.includes(w.category));
    const open=entries.filter(c=>!CLOSED.has(c.status));
    return {...topic,cases:entries,wealthItems:assets,open,priority:open.some(c=>["high","critical"].includes(c.priority))};
  });
}
export function renderFamilyDashboardView({cases=[],wealth=null,scope="all",casesAvailable=true,wealthAvailable=true,esc,money}={}){
  if(typeof esc!=="function"||typeof money!=="function")throw Error("FAMILY_DASH_RENDER_HELPERS_REQUIRED");
  const topics=familyDashboardTopics(cases,wealth?.items||[],scope);
  const open=cases.filter(c=>(scope==="all"||c.personScope===scope)&&!CLOSED.has(c.status));
  const waiting=open.filter(c=>String(c.status).startsWith("WAITING_")).length;
  const priority=open.filter(c=>["high","critical"].includes(c.priority)).length;
  const items=(Array.isArray(wealth?.items)?wealth.items:[]).filter(w=>scope==="all"||w.ownerScope===scope);
  const summary=wealth?.summary||{};
  const row=(label,value)=>'<div class="family-dash-stat"><span>'+label+'</span><strong>'+value+'</strong></div>';
  const status=(c)=>labels[c.status]||"Por revisar";
  const clean=(x)=>esc(String(x==null?"":x));
  return '<section class="family-dash" aria-label="Visión global de asuntos familiares">'+
    '<header class="family-dash-intro"><p>Seguimiento privado unificado. Casos de D1 y patrimonio de fuentes privadas; sin duplicar expedientes.</p>'+
    '<button type="button" class="family-dash-refresh" data-family-dashboard-refresh>Actualizar vista</button></header>'+
    '<div class="family-dash-stats">'+
      row("Asuntos abiertos",casesAvailable?String(open.length):"—")+
      row("Prioridad alta",casesAvailable?String(priority):"—")+
      row("En espera",casesAvailable?String(waiting):"—")+
      row("Partidas patrimoniales",wealthAvailable?String(items.length):"—")+
    '</div>'+
    '<div class="family-dash-scopes" role="group" aria-label="Filtrar asuntos familiares">'+
    Object.entries(scopeNames).map(([id,label])=>
      '<button type="button" data-family-dashboard-scope="'+id+'" aria-pressed="'+(id===scope)+'" class="'+(id===scope?'active':'')+'">'+label+'</button>').join("")+
    '</div>'+
    (!casesAvailable?'<p class="family-dash-warning" role="status">No se ha podido consultar D1. Los datos de casos no están verificados.</p>':"")+
    '<div class="family-dash-grid">'+topics.map(topic=>{
      const mostImportant=topic.open[0];
      const summaryLine=mostImportant?(mostImportant.nextAction||mostImportant.title):topic.wealthItems.length?
        topic.wealthItems[0].label:"Sin asunto enlazado en Gestor Padres";
      return '<details class="family-dash-topic'+(topic.priority?' needs-attention':'')+'" data-family-topic="'+topic.id+'">'+
        '<summary><div class="family-dash-topic-top"><span class="family-dash-topic-icon" aria-hidden="true">'+topic.icon+'</span>'+
        '<span class="family-dash-topic-count">'+(casesAvailable?String(topic.open.length):"—")+' casos'+(topic.wealth.length && wealthAvailable?' · '+topic.wealthItems.length+' partidas':"")+'</span></div>'+
        '<strong>'+topic.title+'</strong><small>'+clean(summaryLine)+'</small><span class="family-dash-chevron" aria-hidden="true">⌄</span></summary>'+
        '<div class="family-dash-topic-details">'+
        (topic.cases.length?topic.cases.map(c=>
          '<button type="button" class="family-dash-case" data-family-dashboard-case="'+clean(c.id)+'" data-family-case-scope="'+clean(c.personScope)+'">'+
          '<span class="family-dash-case-title">'+clean(c.title)+'</span>'+
          '<span>'+clean(status(c))+(c.nextAction?' · '+clean(c.nextAction):"")+'</span></button>').join(""):
          '<p>'+(casesAvailable?'Sin caso registrado en este ámbito. Puede haber información pendiente de vincular.':'Casos no disponibles.')+'</p>')+
        (topic.wealthItems.length?'<div class="family-dash-assets">'+topic.wealthItems.map(w=>
          '<div><span>'+clean(w.label)+'</span><small>'+(w.amountEur!=null&&w.valuationStatus!=="pending"?clean(money(Number(w.amountEur))):"Pendiente de valorar")+'</small></div>').join("")+'</div>':"")+
        (topic.wealth.length?'<button type="button" class="family-dash-topic-link" data-family-dashboard-wealth>Ver patrimonio completo</button>':"")+
        '</div></details>';
    }).join("")+'</div>'+
    '<section class="family-dash-wealth" aria-label="Balance patrimonial de los padres">'+
      '<div><strong>Patrimonio familiar</strong><small>Inversiones, inmuebles, negocio y deudas · sin doble conteo</small></div>'+
      (wealthAvailable&&items.length&&scope==="all"?
        '<div class="family-dash-balance">'+
          row("Activos conocidos",clean(money(Number(summary.grossAssets||0))))+
          row("Deudas conocidas",clean(money(Number(summary.liabilities||0))))+
          row("Neto conocido"+(summary.incomplete?" · incompleto":""),clean(money(Number(summary.netKnown||0))))+
        '</div>':
        '<p class="family-dash-wealth-notice">'+(!wealthAvailable?"No se ha podido consultar el patrimonio.":items.length?
        "Selecciona Todos para ver el balance global sin inventar un neto por titular.":"No hay partidas vinculadas todavía. No se presupone patrimonio cero.")+'</p>')+
      '<button type="button" class="family-dash-open-wealth" data-family-dashboard-wealth>Ver desglose y editar partidas</button>'+
    '</section>'+
    '<footer class="family-dash-footer"><span>Las fechas, importes y estados proceden de sus fuentes privadas. Los apartados vacíos no implican que el asunto esté resuelto.</span>'+
      '<div><button type="button" data-family-dashboard-parents="mother">Expedientes madre</button>'+
      '<button type="button" data-family-dashboard-parents="father">Expedientes padre</button>'+
      '<button type="button" data-family-dashboard-parents="shared">Asuntos comunes</button></div></footer>'+
  '</section>';
}
