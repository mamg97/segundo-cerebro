// Generic travel dashboard: no trip-specific details or private coordinates in the public repository.
const escapeText=value=>String(value==null?"":value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const money=value=>{
  const n=Number(value);
  return value!=null&&Number.isFinite(n)?new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n):"—";
};
export function lodgingMapAddress(groups){
  const raw=groups?.accommodation?.[0]?.text;
  return raw?String(raw).split(";")[0].replace(/\s+/g," ").trim().slice(0,240)||null:null;
}
export function tripMapLink(address,mode="embed"){
  if(!address||typeof address!=="string")return null;
  const encoded=encodeURIComponent(address.trim().slice(0,240));
  return mode==="external"?
    "https://www.google.com/maps/search/?api=1&query="+encoded:
    "https://maps.google.com/maps?q="+encoded+"&z=16&output=embed";
}
export function tripBudgetStatus(budget){
  if(!budget)return {percent:null,reserved:null,total:null,needed:null};
  const n=(v)=>v==null||v===""?null:Number(v);
  const total=n(budget.totalBudget),reserved=n(budget.reserved),needed=n(budget.needed);
  const validTotal=total!==null&&Number.isFinite(total)&&total>0?total:null;
  const validReserved=reserved!==null&&Number.isFinite(reserved)&&reserved>=0?reserved:null;
  return {total:validTotal,reserved:validReserved,needed:needed!==null&&Number.isFinite(needed)&&needed>=0?needed:null,
    percent:validTotal!==null&&validReserved!==null?Math.min(100,Math.max(0,Math.round(validReserved/validTotal*100))):null};
}
export function tripDashboardMarkup({hero,groups,financeItem,flights,lodging,bookings,budgetSection,tasksSection,refsSection,extrasSection,dayLabel}){
  const tasks=groups.tasks||[],days=groups.days||[];
  const done=tasks.filter(t=>t.status==="COMPLETADA").length,pending=tasks.length-done;
  const b=tripBudgetStatus(financeItem);
  const metric=(icon,title,value)=>'<article class="trv-dash-metric"><span>'+icon+'</span><small>'+escapeText(title)+'</small><strong>'+escapeText(value)+'</strong></article>';
  const metrics='<div class="trv-dash-metrics">'+metric("▤","Días organizados",days.length)+metric("✓","Preparativos",done+" / "+tasks.length)+metric("⌛","Tareas pendientes",pending)+metric("€","Fondos asignados",money(b.reserved))+'</div>';
  const address=lodgingMapAddress(groups),external=tripMapLink(address,"external");
  const map='<section class="trv-panel trv-dash-map-section" id="trv-dash-map"><div class="trv-panel-head"><h3>⌖ Dónde está el alojamiento</h3><small>Mapa bajo demanda</small></div>'+
   (address?'<div class="trv-dash-address"><span aria-hidden="true">⌖</span><p>'+escapeText(address)+'</p></div>'+
   '<div class="trv-map-canvas" data-trv-map-canvas><div class="trv-map-intro"><span class="trv-map-pin">⌖</span><strong>El alojamiento, en el mapa</strong><p>El mapa utiliza Google Maps. Tu dirección solo se compartirá con Google si decides cargarlo.</p><button type="button" data-trv-show-map>Mostrar mapa interactivo</button></div></div>'+
   '<p class="trv-map-footer"><a href="'+escapeText(external)+'" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Abrir ruta en Google Maps ↗</a><span>Dirección leída de Eventos.</span></p>':
   '<div class="trv-muted">Aún no consta un alojamiento con dirección en Eventos. No se muestra una ubicación inventada.</div>')+'</section>';
  const plan='<section class="trv-panel trv-dash-planning" id="trv-dash-plan"><div class="trv-panel-head"><h3>▤ Planning por días</h3><small>Ideas y horarios sujetos a reserva</small></div>'+
   (days.length?'<div class="trv-day-nav" role="group" aria-label="Días del viaje">'+days.map((d,i)=>
      '<button type="button" data-trv-day="'+i+'" aria-pressed="'+(i===0?"true":"false")+'" class="'+(i===0?"is-active":"")+'"><small>DÍA '+(i+1)+'</small><strong>'+escapeText(dayLabel(d.date))+'</strong></button>').join("")+'</div>'+
     '<div class="trv-day-plan" data-trv-day-panel><span>DÍA 1 · PROPUESTA</span><h4>'+escapeText(dayLabel(days[0].date))+'</h4><p>'+escapeText(days[0].text)+'</p></div>':
     '<p class="trv-muted">El planning todavía no está registrado en Eventos.</p>')+
     '<p class="trv-footnote">Un tour propuesto no implica una plaza reservada: comprueba su confirmación en el proveedor.</p></section>';
  const percent=b.percent;
  const budgetProgress=percent===null?"":'<div class="trv-budget-meter"><div role="progressbar" aria-label="Presupuesto provisionado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span data-trv-budget-percent="'+percent+'"></span></div><small>'+percent+' % del presupuesto provisionado; no equivale a gasto pagado</small></div>';
  const nav='<nav class="trv-dash-nav" aria-label="Secciones del viaje">'+
   [["map","⌖ Mapa"],["plan","▤ Días"],["tasks","✓ Pendientes"],["budget","€ Presupuesto"],["bookings","✈ Reservas"]]
   .map(([id,label])=>'<button type="button" data-trv-go="'+id+'">'+label+'</button>').join("")+'</nav>';
  return '<div class="trv-wrap trv-dashboard">'+hero+metrics+nav+
   '<div class="trv-dash-lead">'+map+'<div id="trv-dash-tasks">'+tasksSection+'</div></div>'+plan+
   '<div class="trv-dash-details"><div id="trv-dash-bookings">'+flights+lodging+bookings+'</div>'+
   '<div id="trv-dash-budget">'+budgetProgress+budgetSection+refsSection+extrasSection+'</div></div>'+
   '<p class="trv-footnote">Datos canónicos privados de Eventos y Finanzas · Sin registros de gastos paralelos.</p></div>';
}
export function bindTripDashboard({root,groups,dayLabel}){
  root.querySelectorAll("[data-trv-budget-percent]").forEach(el=>{const v=Number(el.dataset.trvBudgetPercent);if(Number.isFinite(v))el.style.width=Math.max(0,Math.min(100,v))+"%"});
  const mapButton=root.querySelector("[data-trv-show-map]");
  mapButton?.addEventListener("click",()=>{
    const address=lodgingMapAddress(groups),src=tripMapLink(address);
    const holder=root.querySelector("[data-trv-map-canvas]");
    if(!src||!holder)return;
    const iframe=document.createElement("iframe");
    iframe.title="Mapa del alojamiento";
    iframe.loading="lazy";iframe.referrerPolicy="no-referrer";
    iframe.src=src;iframe.setAttribute("allowfullscreen","");
    holder.replaceChildren(iframe);
  });
  const anchors={map:"trv-dash-map",plan:"trv-dash-plan",tasks:"trv-dash-tasks",budget:"trv-dash-budget",bookings:"trv-dash-bookings"};
  root.querySelectorAll("[data-trv-go]").forEach(b=>b.addEventListener("click",()=>{
    const id=anchors[b.dataset.trvGo];
    if(id)root.querySelector("#"+id)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  root.querySelectorAll("[data-trv-day]").forEach(b=>b.addEventListener("click",()=>{
    const index=Number(b.dataset.trvDay),day=groups.days?.[index];if(!day)return;
    root.querySelectorAll("[data-trv-day]").forEach(el=>{
      el.classList.toggle("is-active",el===b);el.setAttribute("aria-pressed",String(el===b));
    });
    const panel=root.querySelector("[data-trv-day-panel]");
    if(panel)panel.innerHTML='<span>DÍA '+(index+1)+' · PROPUESTA</span><h4>'+escapeText(dayLabel(day.date))+'</h4><p>'+escapeText(day.text)+'</p>';
  }));
}
