import { travelScheduleMarkup } from "./travel-timetable.js?v=0.1.0";
import { travelMapPoints, travelMapDays, travelMapVisible, bindTravelMap } from "./travel-multipoint-map.js?v=0.1.0";
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
  const mapPoints=travelMapPoints(groups),mapDays=travelMapDays(groups);
  const hasPoints=mapPoints.length>0,initialDay=mapDays[0]||"TODOS";
  const views=[...mapDays,"TODOS",...(mapPoints.some(p=>p.date==="OPCIONAL")?["OPCIONAL"]:[])];
  const shortDay=date=>{
    if(date==="TODOS")return "Todos";
    if(date==="OPCIONAL")return "Opcionales";
    const d=new Date(date+"T12:00:00");
    return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short"}).format(d):date;
  };
  const mapTabs=hasPoints?'<div class="trv-map-day-tabs" role="group" aria-label="Filtrar ruta por día">'+
    views.map(date=>'<button type="button" data-trv-map-day="'+escapeText(date)+'" aria-pressed="'+(date===initialDay?"true":"false")+'" class="'+(date===initialDay?"is-active":"")+'">'+escapeText(shortDay(date))+'</button>').join("")+'</div>':"";
  const mapLists=hasPoints?'<div class="trv-map-stops" aria-label="Paradas del recorrido">'+views.map(date=>{
    const selected=travelMapVisible(mapPoints,date).filter(p=>p.date!=="ALOJAMIENTO");
    const name=date==="TODOS"?"Todas las jornadas":date==="OPCIONAL"?"Alternativas no incluidas":escapeText(dayLabel(date));
    return '<div class="trv-map-stop-group" data-trv-map-list="'+escapeText(date)+'"'+(date!==initialDay?' hidden':"")+'>'+
      '<strong>'+name+'</strong><ol>'+selected.map((p,i)=>'<li><span class="trv-map-stop-num">'+(i+1)+'</span><a href="'+escapeText(tripMapLink(p.query,"external"))+'" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">'+escapeText(p.name)+'</a><small>'+escapeText(p.status==="CONFIRMADO"?"Confirmado":p.status==="PENDIENTE"?"Pendiente":p.status==="OPCIONAL"?"Alternativa":"Propuesta")+'</small></li>').join("")+'</ol></div>';
  }).join("")+'</div>':"";
  const map='<section class="trv-panel trv-dash-map-section" id="trv-dash-map">'+
    '<div class="trv-panel-head"><h3>⌖ '+(hasPoints?"Mapa del recorrido":"Dónde está el alojamiento")+'</h3><small>'+(hasPoints?"Paradas y orden por día":"Mapa bajo demanda")+'</small></div>'+
    (address||hasPoints?
      (address?'<div class="trv-dash-address"><span aria-hidden="true">⌖</span><p>'+escapeText(address)+'</p></div>':"")+
      mapTabs+
      '<div class="trv-map-canvas" data-trv-map-canvas><div class="trv-map-intro"><span class="trv-map-pin">⌖</span><strong>'+(hasPoints?"Rutas del viaje, por días":"El alojamiento, en el mapa")+'</strong>'+
      '<p>'+(hasPoints?"Para mostrar calles y puntos se cargarán mapas de OpenStreetMap. La conexión solo se realizará si eliges cargar el mapa.":"Tu dirección solo se compartirá con Google si decides cargarlo.")+'</p>'+
      '<button type="button" data-trv-show-map>'+(hasPoints?"Cargar mapa con paradas":"Mostrar mapa interactivo")+'</button></div></div>'+
      (hasPoints?'<div class="trv-map-routes" data-trv-map-routes></div>'+
        '<p class="trv-map-note">Línea entre puntos = secuencia orientativa, no camino por las calles. Las horas propuestas no son reservas.</p>'+mapLists:"")+
      '<p class="trv-map-footer">'+(external?'<a href="'+escapeText(external)+'" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Ver alojamiento en Google Maps ↗</a>':"")+
      '<span>Datos de ubicaciones guardados en Eventos.</span></p>':
      '<div class="trv-muted">Aún no consta un alojamiento ni ubicaciones en Eventos.</div>')+'</section>';
  const plan='<section class="trv-panel trv-dash-planning" id="trv-dash-plan"><div class="trv-panel-head"><h3>▤ Planning horario</h3><small>Horas × días · Confirmado / Pendiente / Propuesta</small></div>'+travelScheduleMarkup(groups,dayLabel)+
     '<p class="trv-footnote">Los bloques pendientes y orientativos no son reservas confirmadas. Las horas proceden de Eventos.</p></section>';
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
  if(travelMapPoints(groups).length){
    bindTravelMap({root,groups,address:lodgingMapAddress(groups),mapLink:tripMapLink,dayLabel});
  } else {
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
  }
  const anchors={map:"trv-dash-map",plan:"trv-dash-plan",tasks:"trv-dash-tasks",budget:"trv-dash-budget",bookings:"trv-dash-bookings"};
  root.querySelectorAll("[data-trv-go]").forEach(b=>b.addEventListener("click",()=>{
    const id=anchors[b.dataset.trvGo];
    if(id)root.querySelector("#"+id)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
}
