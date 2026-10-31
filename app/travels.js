import { tripDashboardMarkup, bindTripDashboard } from "./travels-dashboard.js?v=0.3.3";
import { hrefForTravel, hrefForArea } from "./area-routes.mjs?v=0.1.0";
// Viajes: vista privada sobre el ledger canónico de Eventos.
// La fuente de viajes y hechos es /api/events; Finanzas mantiene la autoridad del dinero.
function escapeText(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function summaryParts(value) {
  return String(value || "").split(" | ").map((part) => part.trim());
}

export function parseTravelDetail(payload) {
  const facts = Array.isArray(payload && payload.facts) ? payload.facts : [];
  const groups = { flights: [], bookings: [], days: [], slots: [], points: [], tasks: [], notes: [], accommodation: [], destination: [] };
  const latestTaskStates = new Map();
  for (const fact of facts) {
    const parts = summaryParts(fact.summary);
    const prefix = parts[0];
    if (prefix === "TAREA_ESTADO" && parts.length >= 3) {
      latestTaskStates.set(parts[1], parts[2]);
    }
  }
  for (const fact of facts) {
    const p = summaryParts(fact.summary);
    const [prefix, ...rest] = p;
    if (prefix === "DESTINO") groups.destination.push({ text: rest.join(" | "), fact });
    else if (prefix === "VUELO") groups.flights.push({ key: rest[0], text: rest.slice(1).join(" · "), fact });
    else if (prefix === "ALOJAMIENTO") groups.accommodation.push({ text: rest.join(" | "), fact });
    else if (prefix === "RESERVA") groups.bookings.push({ key: rest[0], text: rest.slice(1).join(" · "), fact });
    else if (prefix === "PLAN_DIA") groups.days.push({ date: rest[0], text: rest.slice(1).join(" · "), fact });
    else if (prefix === "PLAN_HORA" && rest.length >= 5) groups.slots.push({ date: rest[0], time: rest[1], status: rest[2], category: rest[3], text: rest.slice(4).join(" | "), fact });
    else if (prefix === "MAPA_PUNTO" && rest.length >= 7) {
      const lat=Number(rest[5]), lon=Number(rest[6]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat)<=85 && Math.abs(lon)<=180 && rest[2] && rest[3]) {
        groups.points.push({ date: rest[0], order: Number(rest[1]) || 0, name: rest[2], query: rest[3], status: rest[4], lat, lon, fact });
      }
    }
    else if (prefix === "TAREA") {
      groups.tasks.push({
        key: rest[0], status: latestTaskStates.get(rest[0]) || rest[1],
        text: rest.slice(2).join(" · "), fact
      });
    } else if (prefix === "NOTA_VIAJE" || prefix === "FINANZAS") {
      groups.notes.push({ type: prefix, text: rest.join(" | "), fact });
    }
  }
  // Facts are append-only: later versions supersede the displayed day/time, not history.
  groups.days = [...new Map(groups.days.map(d=>[d.date,d])).values()];
  groups.slots = [...new Map(groups.slots.map(slot=>[slot.date+"|"+slot.time,slot])).values()];
  groups.points = [...new Map(groups.points.map(p=>[p.date+"|"+p.name,p])).values()];
  groups.days.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  groups.slots.sort((a, b) => (a.date+" "+a.time).localeCompare(b.date+" "+b.time));
  return groups;
}

function euros(value) {
  const number = typeof value === "number" ? value : Number(String(value == null ? "" : value).replace(",", "."));
  return Number.isFinite(number) ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(number) : "—";
}
function dateLabel(iso) {
  if (!iso) return "Fecha por determinar";
  const ymd = String(iso).slice(0, 10);
  const date = new Date(ymd + "T12:00:00");
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(date)
    : ymd;
}
function safeHttps(ref) {
  try { const url = new URL(String(ref)); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}
async function getJson(url, options) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...(options && options.headers || {}) },
    credentials: "same-origin", cache: "no-store", ...(options || {})
  });
  if (!response.ok) throw new Error("TRAVEL_HTTP_" + response.status);
  return response.json();
}
const state = { financeSummary: null, mode: "demo", trips: [], details: new Map(), selected: null };
const body = () => document.querySelector("#dialog-body");
function getDialog() { return document.querySelector("#detail-dialog"); }
let travelRequestSequence=0;
function travelViewActive(){
  const dialog=getDialog();
  return !!dialog?.open && dialog.classList.contains("travels-dialog") &&
    (!document.body.classList.contains("route-area-active") || window.location.hash.startsWith("#/viajes"));
}
let travelsCloseCleanupRegistered = false;
function setDialog(title, context) {
  const dialog = getDialog();
  if (!dialog) return null;
  // Never leave the fullscreen Travel class behind when another workspace reuses this dialog.
  if (!travelsCloseCleanupRegistered) {
    dialog.addEventListener("close", () => { if(!dialog.open)dialog.classList.remove("travels-dialog"); });
    travelsCloseCleanupRegistered = true;
  }
  dialog.classList.remove("wealth-dialog","health-dialog","habits-dialog","important-events-dialog",
    "budget-dialog","parents-dialog","electricity-dialog","pantry-dialog","objects-dialog",
    "projects-dialog","events-workspace-dialog","event-detail-dialog");
  dialog.classList.add("travels-dialog");
  document.querySelector("#dialog-context").textContent = context || "Viajes · registro privado";
  document.querySelector("#dialog-title").textContent = title || "Viajes";
  if (!dialog.open) dialog.showModal();
  return dialog;
}
function tripCaption(event, detail) {
  const parsed = parseTravelDetail(detail || {});
  const dest = parsed.destination[0];
  return dest ? dest.text.split(" · ")[0] : event.title;
}
// Fondos urbanos reutilizables, sin datos personales ni identificadores privados.
const CITY_COVERS = [
  {
    // Generic regional artwork only: never a photograph claimed to be from a private trip.
    match: /\basturias\b/i,
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Enol.jpg?width=960",
    source: "https://commons.wikimedia.org/wiki/File:Enol.jpg",
    city: "Lago Enol · Asturias",
    author: "Rodelar",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    match: /\b(?:varsovia|warsaw|warszawa)\b/i,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Warszawa_Rynek_Starego_Miasta_%28dron1%29.jpg/1280px-Warszawa_Rynek_Starego_Miasta_%28dron1%29.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Warszawa_Rynek_Starego_Miasta_(dron1).jpg",
    city: "Warsaw",
    author: "Kapitel",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  {
    match: /\bmarbella\b/i,
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Marbella_Old_Town.jpg?width=960",
    source: "https://commons.wikimedia.org/wiki/File:Marbella_Old_Town.jpg",
    city: "Marbella",
    author: "Tina207",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
  }
];
function coverForCity(text) {
  return CITY_COVERS.find((cover) => cover.match.test(String(text || ""))) || null;
}
function travelPhotoCredits(events) {
  const credits = new Map();
  events.forEach((event) => {
    const cover = coverForCity(tripCaption(event, state.details.get(event.id)));
    if (cover) credits.set(cover.city, cover);
  });
  if (!credits.size) return "";
  const links = [...credits.values()].map((cover) =>
    '<a href="' + escapeText(cover.source) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">' +
      escapeText(cover.city) + ' · ' + escapeText(cover.author) + '</a> ' +
    '<a href="' + escapeText(cover.licenseUrl) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">(' + escapeText(cover.license) + ')</a>').join(" · ");
  return '<p class="trv-photo-credits">Fotografías: ' + links + '</p>';
}
function card(event) {
  const detail = state.details.get(event.id);
  const subtitle = tripCaption(event, detail);
  const cover = coverForCity(subtitle);
  const image = cover
    ? '<img class="trv-card-photo" src="' + escapeText(cover.url) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
    : "";
  return '<button type="button" class="trv-card trv-city-tile" data-trv-open="' + escapeText(event.id) + '" aria-label="Abrir viaje: ' + escapeText(subtitle) + '">' +
    image +
    '<span class="trv-card-details"><strong>' + escapeText(subtitle) + '</strong>' +
    '<small>' + escapeText(dateLabel(event.startsAt)) + '</small></span>' +
    '</button>';
}
export function sortTripsNewestFirst(trips) {
  const timestamp=(event)=>{
    const parsed=Date.parse(event?.startsAt || "");
    return Number.isFinite(parsed) ? parsed : -Infinity;
  };
  return [...(Array.isArray(trips) ? trips : [])].sort((a,b)=>timestamp(b)-timestamp(a));
}
function renderList() {
  setDialog("Viajes", "Viajes · cronológico");
  const ordered=sortTripsNewestFirst(state.trips);
  const gallery=ordered.length
    ? '<div class="trv-grid trv-horizontal-gallery" role="group" aria-label="Viajes ordenados del más reciente al más antiguo">' + ordered.map(card).join("") + '</div>'
    : '<p class="trv-muted">Todavía no hay viajes registrados.</p>';
  const html='<div class="trv-wrap">' +
    '<p class="trv-intro">Tus viajes y escapadas en un solo lugar. Cada ficha reúne reservas, planificación, tareas y enlaces, conectada al registro privado de Eventos.</p>' +
    gallery +
    '<p class="trv-footnote">Fuente: Eventos · Los importes oficiales permanecen en Finanzas. No se muestran datos reales en la demo pública.</p>' +
    travelPhotoCredits(ordered) +
    '</div>';
  body().innerHTML=html;
  body().querySelectorAll("[data-trv-open]").forEach((button) => button.addEventListener("click", () => {
    const id=button.dataset.trvOpen;
    if(!id)return;
    if(document.body.classList.contains("route-area-active")){
      history.pushState(null,"",hrefForTravel(id));
      window.dispatchEvent(new Event("area-route-synced"));
    }
    void openTrip(id);
  }));
}
function section(title, content, subtitle) {
  return '<section class="trv-panel"><div class="trv-panel-head"><h3>' + escapeText(title) +
    '</h3>' + (subtitle ? '<small>' + escapeText(subtitle) + '</small>' : "") + '</div>' + content + "</section>";
}
function items(rows, emptyText) {
  return rows.length ? '<div class="trv-rows">' + rows.map((r) =>
    '<div class="trv-row"><strong>' + escapeText(r.key || "") + '</strong><span>' + escapeText(r.text) + '</span></div>'
  ).join("") + '</div>' : '<p class="trv-muted">' + escapeText(emptyText) + "</p>";
}
function financeSection(event) {
  const all = Array.isArray(state.financeSummary && state.financeSummary.upcomingCommitments)
    ? state.financeSummary.upcomingCommitments : [];
  const item = all.find((v) => event.financeRef && v.id === event.financeRef);
  const link = '<a class="trv-link" href="#overview" data-trv-budget="1">Abrir Finanzas →</a>';
  if (!item) return section("Presupuesto", '<p class="trv-muted">Sin presupuesto reconciliado en el estado cargado. Consulta el compromiso asociado en Finanzas.</p>' + link, "Dato canónico");
  const total = item.totalBudget == null ? "—" : euros(item.totalBudget);
  const reserved = item.reserved == null ? "—" : euros(item.reserved);
  const needed = item.needed == null ? "—" : euros(item.needed);
  return section("Presupuesto",
    '<div class="trv-stats"><div><span>Presupuesto total</span><strong>' + total + '</strong></div>' +
    '<div><span>Fondos asignados</span><strong>' + reserved + '</strong></div>' +
    '<div><span>Pendiente por provisionar</span><strong>' + needed + '</strong></div></div>' + link +
    '<p class="trv-footnote">Las provisiones no son pagos realizados ni saldos bancarios. El detalle de cargos se verifica en Finanzas.</p>', "FINANZAS · estado derivado");
}
function referencesSection(references) {
  const refs = (Array.isArray(references) ? references : []).filter((r) => r && r.label);
  return section("Documentos y referencias",
    refs.length ? '<div class="trv-refs">' + refs.map((r) => {
      const url = safeHttps(r.sourceRef);
      return url ? '<a href="' + escapeText(url) + '" target="_blank" rel="noopener noreferrer">' + escapeText(r.label) + ' ↗</a>' :
        '<span><strong>' + escapeText(r.label) + '</strong><small>Referencia disponible en el gestor original</small></span>';
    }).join("") + '</div>' : '<p class="trv-muted">Todavía no hay documentos enlazados.</p>', "Reservas y fuente de origen");
}
function tasksSection(trips, eventId) {
  const tasks = trips.tasks;
  if (!tasks.length) return section("Preparación", '<p class="trv-muted">Aún no hay tareas de preparación registradas.</p>');
  const count = tasks.filter((t) => t.status === "COMPLETADA").length;
  const content = '<div class="trv-task-summary">' + count + " de " + tasks.length + " completadas</div>" +
    '<div class="trv-tasks">' + tasks.map((t) => {
      const checked = t.status === "COMPLETADA";
      return '<button type="button" class="trv-task" data-trv-task="' + escapeText(t.key) + '" aria-pressed="' + checked + '">' +
        '<span class="trv-check' + (checked ? " done" : "") + '">' + (checked ? "✓" : "") + '</span>' +
        '<span>' + escapeText(t.text) + '</span><small>' + (checked ? "HECHO" : "PENDIENTE") + '</small></button>';
    }).join("") + "</div>" +
    '<p class="trv-footnote">Los cambios se registran como nuevos hechos en Eventos; no modifican pagos, reservas externas ni calendario.</p>';
  return section("Preparación y reservas pendientes", content, "Lista editable · registro privado");
}
function renderDetail(payload) {
  const event = payload.event, groups = parseTravelDetail(payload);
  const destination = tripCaption(event, payload);
  setDialog(destination, "Viajes · ficha de viaje");
  const hero = '<div class="trv-hero trv-dashboard-hero"><button type="button" class="trv-back" data-trv-back>← Todos los viajes</button>' +
    '<span class="trv-kicker">✦ EXPEDIENTE DE VIAJE</span><h2>' + escapeText(destination) + '</h2>' +
    '<p>' + escapeText(event.summary || "Planificación del viaje") + '</p><div class="trv-dates">' +
    '<span>🗓 ' + escapeText(dateLabel(event.startsAt)) + '</span>' +
    '<span>' + escapeText(event.status || "CONFIRMADO") + '</span></div></div>';
  const flights = section("Vuelos",items(groups.flights,"Sin vuelos asociados."),"Reservas de transporte");
  const lodging = section("Alojamiento",items(groups.accommodation.map((r) => ({key:"Estancia",text:r.text})),"Alojamiento por añadir"),"Llegada y acceso");
  const bookings = section("Reservas y pagos programados",items(groups.bookings,"Sin reservas registradas."),"Verifica los cargos en Finanzas");
  const days = section("Itinerario día a día",groups.days.length
    ? '<div class="trv-days">' + groups.days.map((d) => '<article><span>' + escapeText(dateLabel(d.date)) + '</span><p>' + escapeText(d.text) + '</p></article>').join("") + "</div>"
    : '<p class="trv-muted">Pendiente de planificar.</p>',"Horarios propuestos ≠ reservas confirmadas");
  const notes = groups.notes.filter((n)=>n.type==="NOTA_VIAJE");
  const extras = notes.length ? section("Alternativas y observaciones",notes.map((n)=>'<p>' + escapeText(n.text) + '</p>').join(""),"Opcional") : "";
  const budgetItem = (Array.isArray(state.financeSummary?.upcomingCommitments) ? state.financeSummary.upcomingCommitments : [])
    .find((row) => event.financeRef && row.id === event.financeRef) || null;
  body().innerHTML = tripDashboardMarkup({
    hero, groups, financeItem: budgetItem, flights, lodging, bookings,
    budgetSection: financeSection(event), tasksSection: tasksSection(groups,event.id),
    refsSection: referencesSection(payload.references), extrasSection: extras, references:payload.references,
    dayLabel: dateLabel
  });
  bindTripDashboard({ root: body(), groups, dayLabel: dateLabel });
  body().querySelector("[data-trv-back]")?.addEventListener("click",()=>{
    if(document.body.classList.contains("route-area-active")){
      history.pushState(null,"",hrefForArea("area-travels"));
      window.dispatchEvent(new Event("area-route-synced"));
    }
    renderList();
  });
  body().querySelector("[data-trv-budget]")?.addEventListener("click",(e)=>{
    e.preventDefault();getDialog()?.close();
    document.querySelector('[data-nav-area-id="area-finance"]')?.click();
  });
  body().querySelectorAll("[data-trv-task]").forEach((b)=>b.addEventListener("click",()=>{
    void changeTask(event.id,b.dataset.trvTask,b);
  }));
}
async function changeTask(eventId,taskId,button) {
  const payload = state.details.get(eventId);
  if (!payload || state.mode!=="remote") return;
  const groups=parseTravelDetail(payload);
  const task=groups.tasks.find((t)=>t.key===taskId);
  if(!task)return;
  const desired=task.status==="COMPLETADA"?"PENDIENTE":"COMPLETADA";
  button.disabled=true;
  const original=button.innerHTML;
  button.innerHTML='<span class="trv-muted">Guardando cambio…</span>';
  try {
    const result=await getJson("/api/events/"+encodeURIComponent(eventId)+"/facts",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({type:"PLAN",summary:"TAREA_ESTADO | "+taskId+" | "+desired,sourceProvider:"user",happenedAt:new Date().toISOString()})
    });
    const updated=result.event?result:await getJson("/api/events/"+encodeURIComponent(eventId));
    state.details.set(eventId,updated);
    if(travelViewActive() && state.selected===eventId)renderDetail(updated);
  } catch(error) {
    if(!travelViewActive() || !button.isConnected)return;
    button.disabled=false;button.innerHTML=original;
    const note=document.createElement("p");note.className="trv-error";
    note.textContent="No se pudo guardar el cambio. Vuelve a intentarlo.";
    button.after(note);
  }
}
async function openTrip(eventId) {
  state.selected=eventId;
  const event=state.trips.find((t)=>t.id===eventId);
  setDialog(event ? event.title : "Viaje","Viajes · detalle");
  body().innerHTML='<p class="trv-loading">Cargando ficha privada del viaje…</p>';
  try {
    const cached=state.details.get(eventId);
    const detail=cached||await getJson("/api/events/"+encodeURIComponent(eventId));
    if(state.selected!==eventId || !travelViewActive())return;
    state.details.set(eventId,detail);
    renderDetail(detail);
  }catch(error){
    if(!travelViewActive())return;
    body().innerHTML='<div class="trv-wrap"><p class="trv-error">No se pudo cargar este viaje.</p><button type="button" class="trv-back" data-retry>Volver</button></div>';
    body().querySelector("[data-retry]")?.addEventListener("click",renderList);
  }
}
export async function openTravelsDetail(financeSummary, mode, initialTripId=null) {
  const requestId=++travelRequestSequence;
  state.financeSummary=financeSummary||{};
  state.mode=mode;
  state.selected=null;
  state.trips=[];
  state.details.clear();
  const dialog=setDialog("Viajes","Viajes · registro privado");
  if(!dialog)return;
  body().innerHTML='<p class="trv-loading">Buscando viajes en Eventos…</p>';
  if(mode!=="remote"){
    body().innerHTML='<div class="trv-wrap"><p class="trv-muted">Las fichas reales de viaje solo están disponibles en la aplicación privada protegida. La demo pública no consulta reservas personales.</p></div>';
    return;
  }
  try{
    const data=await getJson("/api/events?scope=all&kind=travel");
    if(requestId!==travelRequestSequence || !travelViewActive())return;
    state.trips=Array.isArray(data.events)?data.events:[];
    state.trips=sortTripsNewestFirst(state.trips);
    // Solo precargar el viaje próximo más cercano para recuperar su destino;
    // el orden visible sigue siendo estrictamente descendente por fecha.
    const upcoming=state.trips.filter((t)=>!["CERRADO","CANCELADO"].includes(t.status))
      .sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)).slice(0,1);
    if(upcoming.length){
      const first=await getJson("/api/events/"+encodeURIComponent(upcoming[0].id));
      if(requestId!==travelRequestSequence || !travelViewActive())return;
      if(first.event)state.details.set(upcoming[0].id,first);
    }
    renderList();
    if(initialTripId && state.trips.some(x=>x.id===initialTripId)) await openTrip(initialTripId);
  }catch(error){
    if(requestId!==travelRequestSequence || !travelViewActive())return;
    body().innerHTML='<div class="trv-wrap"><p class="trv-error">No ha sido posible consultar Eventos. No se mostrarán datos de prueba como si fueran reales.</p><button type="button" class="trv-back" id="trv-retry">Reintentar</button></div>';
    body().querySelector("#trv-retry")?.addEventListener("click",()=>void openTravelsDetail(financeSummary,mode));
  }
}
