// Private trip workspace. The EVENTS Sheet remains authoritative; nothing personal lives in Git.
const ROOT = "/api/events";
const esc = (v) => String(v == null ? "" : v)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const money = (v, currency = "EUR") => {
  const num = Number(v);
  return Number.isFinite(num) ? new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(num) : "—";
};
const isTravel = (item) => String(item?.kind || "").toLowerCase() === "travel";
function tripDate(iso) {
  if (!iso) return "Pendiente";
  const d = String(iso).slice(0,10);
  const [y,m,day] = d.split("-").map(Number);
  if (!y || !m || !day) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})
    .format(new Date(Date.UTC(y,m-1,day))).replace(/\./g,"");
}
function tripEnd(event) {
  const end = String(event?.endsAt || "");
  if (!end) return "";
  const start = String(event?.startsAt || "");
  const parsedEnd = Date.parse(end), parsedStart = Date.parse(start);
  if (end.slice(11,19)==="00:00:00" && Number.isFinite(parsedEnd) && Number.isFinite(parsedStart) && parsedEnd-parsedStart>=86400000)
    return new Date(Date.UTC(Number(end.slice(0,4)),Number(end.slice(5,7))-1,Number(end.slice(8,10)))-86400000).toISOString().slice(0,10);
  return end;
}
const dateRange = (event) => tripDate(event.startsAt)+" – "+tripDate(tripEnd(event)||event.startsAt);
const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function classify(f) {
  const txt = String(f?.summary || "");
  const match = txt.match(/^([^|]{3,45})\s*\|\s*([\s\S]+)$/);
  const label = match ? match[1].trim() : "";
  let content = match ? match[2].trim() : txt;
  const code = norm(label);
  let displayLabel=label || (f.type === "PLAN"?"Plan":f.type||"Nota");
  if (code==="plan_dia") {
    const parts=content.split(" | ");
    if (parts.length>=2) {
      displayLabel=parts[0];
      content=parts.slice(1).join(" | ");
    }
  }
  if (code==="tarea") {
    const parts=content.split(" | ");
    if (parts.length>=3) {
      displayLabel=parts[0].replaceAll("-"," ").replace(/^./,c=>c.toUpperCase())+" · "+parts[1];
      content=parts.slice(2).join(" | ");
    }
  }
  if (code==="vuelo" || code==="reserva") {
    const parts=content.split(" | ");
    if(parts.length>=2){displayLabel=(label+" · "+parts[0]).trim();content=parts.slice(1).join(" | ");}
  }
  let bucket = "notes";
  if (code==="destino") bucket="destination";
  else if (/^vuelo|^transporte|^traslado/.test(code) || f.type==="TRANSPORTE") bucket="transport";
  else if (/^alojamiento|^hotel|^airbnb/.test(code)) bucket="accommodation";
  else if (/^dia |^itinerario|^plan diario|^plan_dia|^ruta/.test(code)) bucket="itinerary";
  else if (/^pendiente|^por reservar|^accion|^tarea/.test(code)) bucket="pending";
  else if (/^pago|^presupuesto|^gasto|^coste|^finanzas/.test(code) || f.type==="GASTO") bucket="payments";
  else if (/^confirmado|^reserva/.test(code)) bucket="bookings";
  return {label:displayLabel,content,bucket};
}
const titleFrom = (payload) => {
  const dest = (payload?.facts || []).map(classify).find(x=>x.bucket==="destination")?.content;
  return (dest?dest.split(" · ")[0].trim():null) || payload?.event?.title || "Viaje";
};
function getMoneyRecord(event,state) {
  const rows = Array.isArray(state?.financeSummary?.upcomingCommitments) ? state.financeSummary.upcomingCommitments : [];
  if (event?.financeRef) {
    const exact=rows.find(x=>x.id===event.financeRef);
    if(exact)return exact;
  }
  return rows.find(x=>norm(x.title)===norm(event?.title))||null;
}
const validHttp = (raw) => {
  try { const u=new URL(String(raw)); return u.protocol==="https:" ? u.href : null; } catch { return null; }
};
async function getJSON(url) {
  const r=await fetch(url,{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"});
  if(!r.ok)throw new Error("TRIPS_HTTP_"+r.status);
  const payload=await r.json();
  if(payload?.ok!==true)throw new Error("TRIPS_INVALID_RESPONSE");
  return payload;
}
function dialog() { return document.querySelector("#detail-dialog"); }
function header(context,title) {
  const d=dialog();
  d?.classList.remove("wealth-dialog","health-dialog","habits-dialog","budget-dialog","pantry-dialog","objects-dialog","projects-dialog","trips-dialog");
  d?.classList.add("trips-dialog");
  const a=document.querySelector("#dialog-context"),b=document.querySelector("#dialog-title");
  if(a)a.textContent=context;if(b)b.textContent=title;
  if(d&&!d.open)d.showModal();
  return document.querySelector("#dialog-body");
}
let workspace=null;
function tripCard(ev) {
  const detail=workspace?.details.get(ev.id),name=detail?titleFrom(detail):ev.title;
  const current=ev.status==="CERRADO", cancelled=ev.status==="CANCELADO";
  return '<button type="button" class="trips-card" data-trip-id="'+esc(ev.id)+'"><span class="trips-card-top"><span>'+(current?"HISTÓRICO":cancelled?"CANCELADO":"PRÓXIMO VIAJE")+'</span><span aria-hidden="true">↗</span></span><strong>'+esc(name)+'</strong><small>'+esc(dateRange(ev))+'</small><span class="trips-pill">'+esc(current?"Realizado":cancelled?"Cancelado":"Ver planificación y reservas")+'</span></button>';
}
function renderIndex() {
  const body=header("Viajes · registro privado","Viajes");
  if(!body||!workspace)return;
  const list=workspace.list, now=new Date();
  const upcoming=list.filter(x=>x.status!=="CANCELADO" && (Date.parse(x.endsAt||x.startsAt)||0)>=now.getTime()-86400000);
  const archive=list.filter(x=>!upcoming.includes(x));
  body.innerHTML='<div class="trips-workspace"><div class="trips-intro"><div><span class="trips-overline">MIS VIAJES</span><h3>Un lugar para cada aventura.</h3><p>Billetes, alojamiento, presupuesto, itinerario y gestiones. Información leída desde Eventos y Finanzas, sin duplicar datos.</p></div><button class="trips-minor" type="button" data-trips-refresh>↻ Actualizar</button></div>'+
  '<section class="trips-section"><h4>Próximos viajes <span>'+upcoming.length+'</span></h4><div class="trips-grid">'+(upcoming.length?upcoming.map(tripCard).join(""):'<p class="trips-muted">No hay próximos viajes registrados.</p>')+'</div></section>'+
  '<section class="trips-section"><h4>Viajes e históricos <span>'+archive.length+'</span></h4><div class="trips-grid">'+(archive.length?archive.map(tripCard).join(""):'<p class="trips-muted">Aquí aparecerán los viajes anteriores.</p>')+'</div></section></div>';
  body.querySelectorAll("[data-trip-id]").forEach(el=>el.addEventListener("click",()=>void openTrip(el.dataset.tripId)));
  body.querySelector("[data-trips-refresh]")?.addEventListener("click",()=>void openTripsDetail(workspace.state,true));
}
const sections=[
  {id:"transport",title:"Vuelos y traslados",icon:"✈"},
  {id:"accommodation",title:"Alojamiento",icon:"⌂"},
  {id:"bookings",title:"Reservas confirmadas",icon:"✓"},
  {id:"itinerary",title:"Planning por días",icon:"▤"},
  {id:"pending",title:"Pendiente de organizar",icon:"○"},
  {id:"payments",title:"Pagos y gastos registrados",icon:"€"},
  {id:"notes",title:"Información adicional",icon:"☷"}
];
function sectionItems(items) {
  return items.map(({label,content})=>'<article class="trips-data-item"><strong>'+esc(label)+'</strong><p>'+esc(content)+'</p></article>').join("");
}
function refsSection(refs) {
  if(!refs?.length)return "";
  return '<section class="trips-section"><h4>Documentación y enlaces</h4><div class="trips-link-list">'+refs.map(ref=>{
    const url=validHttp(ref.sourceRef), label=ref.label||ref.type||"Referencia";
    return url?'<a class="trips-reference" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" href="'+esc(url)+'">'+esc(label)+' <span aria-hidden="true">↗</span></a>':
      '<div class="trips-reference"><span>'+esc(label)+'</span><small>Referencia privada en origen · '+esc(ref.sourceProvider||"sin proveedor")+'</small></div>';
  }).join("")+'</div></section>';
}
function renderTrip(payload) {
  const ev=payload.event, body=header("Viajes · ficha privada",titleFrom(payload)),facts=(payload.facts||[]).map(classify);
  const byGroup=id=>facts.filter(x=>x.bucket===id);
  const finance=getMoneyRecord(ev,workspace?.state);
  const amount=finance&&Number.isFinite(Number(finance.totalBudget))?money(finance.totalBudget,finance.currency||"EUR"):"—";
  const reserved=finance&&Number.isFinite(Number(finance.reserved))?money(finance.reserved,finance.currency||"EUR"):"—";
  const needed=finance&&Number.isFinite(Number(finance.needed))?money(finance.needed,finance.currency||"EUR"):"—";
  const fin='<section class="trips-section"><h4>Presupuesto y provisiones <span>Fuente: Finanzas</span></h4><div class="trips-money-grid"><article><span>Presupuesto</span><strong>'+esc(amount)+'</strong></article><article><span>Provisión registrada</span><strong>'+esc(reserved)+'</strong></article><article><span>Necesidad registrada</span><strong>'+esc(needed)+'</strong></article></div><p class="trips-muted">Las provisiones no son pagos ejecutados. Consulta Finanzas para los movimientos bancarios y las cuotas realmente cobradas.</p></section>';
  const sectionsHtml=sections.map(sec=>{
    const rows=byGroup(sec.id);
    return rows.length?'<section class="trips-section"><h4><span class="trips-section-icon">'+esc(sec.icon)+'</span> '+esc(sec.title)+'</h4><div class="trips-data-grid">'+sectionItems(rows)+'</div></section>':"";
  }).join("");
  body.innerHTML='<div class="trips-workspace"><button type="button" class="trips-minor" data-trips-back>← Todos los viajes</button>'+
    '<div class="trips-hero"><span class="trips-overline">FICHA DE VIAJE · '+esc(ev.status||"")+'</span><h3>'+esc(titleFrom(payload))+'</h3><p>'+esc(dateRange(ev))+'</p>'+(ev.summary?'<p class="trips-summary">'+esc(ev.summary)+'</p>':"")+'</div>'+
    fin+sectionsHtml+refsSection(payload.references||[])+
    (facts.length?"":'<div class="trips-muted">Este viaje todavía no tiene planificación detallada en Eventos.</div>')+
    '<p class="trips-privacy">Datos procedentes de Eventos y Finanzas, visibles solo tras autenticación. Una propuesta no equivale a una reserva.</p></div>';
  body.querySelector("[data-trips-back]")?.addEventListener("click",renderIndex);
}
async function openTrip(id) {
  if(!workspace)return;
  const body=header("Viajes · cargando","Detalle del viaje");
  if(body)body.innerHTML='<div class="trips-loading">Consultando detalles privados del viaje…</div>';
  try {
    let d=workspace.details.get(id);
    if(!d){d=await getJSON(ROOT+"/"+encodeURIComponent(id));workspace.details.set(id,d);}
    if(workspace?.selected===null){/* state remains valid */}
    renderTrip(d);
  }catch(e){
    if(body)body.innerHTML='<div class="trips-loading"><strong>No se ha podido cargar la ficha.</strong><p>No se muestran datos inventados ni copias locales.</p><button class="trips-minor" type="button" data-trips-back>← Volver</button></div>';
    body?.querySelector("[data-trips-back]")?.addEventListener("click",renderIndex);
  }
}
export async function openTripsDetail(state,refresh=false) {
  const body=header("Viajes · registro privado","Viajes");
  if(body)body.innerHTML='<div class="trips-loading">Cargando viajes desde Eventos…</div>';
  try {
    const data=await getJSON(ROOT+"?scope=all&kind=travel");
    const sorted=(Array.isArray(data.events)?data.events:[]).filter(isTravel)
      .sort((a,b)=>String(a.startsAt||"").localeCompare(String(b.startsAt||"")));
    const old=refresh?new Map():workspace?.details||new Map();
    workspace={state,list:sorted,details:old,selected:null};
    renderIndex();
    // Resolve displayed destinations from existing fact records without embedding them in public JS.
    const candidates=sorted.filter(ev=>!old.has(ev.id)).slice(-8);
    await Promise.all(candidates.map(async ev=>{
      try {const detail=await getJSON(ROOT+"/"+encodeURIComponent(ev.id));if(workspace?.details===old)old.set(ev.id,detail);}
      catch { /* leave original title and allow retry on opening */ }
    }));
    if(dialog()?.open && document.querySelector(".trips-card"))renderIndex();
  } catch {
    if(body)body.innerHTML='<div class="trips-loading"><strong>Viajes no disponible.</strong><p>No ha sido posible consultar la fuente privada de Eventos.</p><button type="button" class="trips-minor" data-trips-retry>Reintentar</button></div>';
    body?.querySelector("[data-trips-retry]")?.addEventListener("click",()=>void openTripsDetail(state,true));
  }
}
