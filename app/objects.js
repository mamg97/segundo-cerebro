const TABS = [["summary","Resumen"],["inventory","Inventario"],["wardrobe","Armario visual"],["builder","Combinador"],["looks","Looks"],["kits","Kits"],["lists","Listas"]];
let activeTab = "summary";
let objectsFlash = "";

function e(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[c]));
}
function d(value) {
  if (!value) return "—";
  const date = new Date(String(value).slice(0,10) + "T12:00:00");
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(date).replace(".","") : String(value);
}
function m(value, currency="EUR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES",{style:"currency",currency,maximumFractionDigits:2}).format(n);
}
function label(value) { return String(value || "DISPONIBLE").replaceAll("_"," "); }
function pending(payload) { return payload?.source?.available === false; }
function imageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return "";
}
function visualUrl(item) {
  return imageUrl(item?.thumbnailUrl || item?.processedPhotoUrl || item?.originalPhotoUrl || item?.photoUrl);
}
function processedBadge(item) {
  const state = String(item?.processedState || "pendiente").toLowerCase();
  if (state === "procesada") return '<span class="wardrobe-process-state is-ready">Procesada</span>';
  if (state === "revisar") return '<span class="wardrobe-process-state is-review">Revisar</span>';
  return '<span class="wardrobe-process-state">Foto pendiente</span>';
}
function useFrequency(item) {
  const n = Number(item?.useCount);
  if (!Number.isFinite(n)) return "unknown";
  if (n === 0) return "unused";
  if (n <= 2) return "low";
  if (n <= 7) return "regular";
  return "high";
}
function empty(title, detail="") {
  return '<div class="objects-empty"><strong>'+e(title)+'</strong>'+(detail?'<p>'+e(detail)+'</p>':'')+'</div>';
}

export function objectsAreaFromState(state, privateModeKind) {
  if (privateModeKind !== "remote") return null;
  const s = state?.objectsSummary || null;
  const attention = Number(s?.repairCount || 0) + Number(s?.loanedCount || 0);
  return {
    id:"area-objects", slug:"objects", title:"Objetos", shortTitle:"Objetos",
    summary:s ? Number(s.totalObjects||0)+" objetos · "+Number(s.activeListCount||0)+" listas activas." : "Inventario personal, armario, looks, kits y listas contextuales.",
    health:s ? (attention ? Math.max(58,88-attention*4) : 88) : 76,
    tone:"blue", module:"Objects", sensitivity:"confidencial", status:attention?"attention":"steady"
  };
}

export function renderHomeObjectsCard(state, privateModeKind) {
  const card = document.querySelector("#home-objects-card");
  if (!card) return;
  card.hidden = privateModeKind !== "remote";
  if (card.hidden) return;
  const s = state?.objectsSummary || null;
  const set = (id,value) => { const node=document.querySelector(id); if(node) node.textContent=value; };
  if (!s) {
    set("#home-objects-total","—"); set("#home-objects-wardrobe","—"); set("#home-objects-attention","—"); set("#home-objects-lists","—");
    set("#home-objects-status","Fuente canónica pendiente · interfaz preparada");
    card.dataset.sourceStatus="pending";
    return;
  }
  delete card.dataset.sourceStatus;
  set("#home-objects-total",Number(s.totalObjects||0));
  set("#home-objects-wardrobe",Number(s.wardrobeCount||0));
  set("#home-objects-attention",Number(s.repairCount||0)+Number(s.loanedCount||0));
  set("#home-objects-lists",Number(s.activeListCount||0));
  set("#home-objects-status",Number(s.repairCount||0)+" reparar · "+Number(s.loanedCount||0)+" prestados");
}

function pendingView() {
  return '<section class="objects-source-pending"><span class="objects-source-mark">◇</span><div><strong>Fuente canónica pendiente</strong><p><code>SEGUNDO CEREBRO - OBJETOS</code> todavía no existe. La web está preparada, pero no se han inventado objetos ni creado una base alternativa.</p><small>Propietario funcional: GESTOR OBJETOS Y ARMARIO.</small></div></section>';
}
function kpi(name,value,note="") {
  return '<article><span>'+e(name)+'</span><strong>'+e(value ?? "—")+'</strong>'+(note?'<small>'+e(note)+'</small>':'')+'</article>';
}

function summaryView(payload) {
  if (pending(payload)) return pendingView();
  const s=payload.summary||{}, locations=s.locations||[], latest=s.latestAdditions||[], contexts=s.upcomingContexts||[];
  return '<div class="objects-summary-grid">'+
    kpi("Objetos",Number(s.totalObjects||0),"activos")+kpi("Ropa y calzado",Number(s.wardrobeCount||0))+kpi("Electrónica",Number(s.electronicsCount||0))+
    kpi("Reparar",Number(s.repairCount||0))+kpi("Prestados",Number(s.loanedCount||0))+kpi("Revisar salida",Number(s.dispositionReviewCount||0),"vender · donar · descartar")+
    kpi("Looks",Number(s.lookCount||0))+kpi("Listas activas",Number(s.activeListCount||0))+'</div>'+
    '<div class="objects-summary-columns"><section class="objects-panel"><div class="objects-section-title"><small>Ubicación</small><strong>Dónde están mis cosas</strong></div><div class="objects-location-grid">'+
      (locations.length?locations.map(x=>'<span><strong>'+Number(x.count||0)+'</strong><small>'+e(x.location||"Sin ubicación")+'</small></span>').join(""):empty("Sin ubicaciones registradas"))+
    '</div></section><section class="objects-panel"><div class="objects-section-title"><small>Actividad</small><strong>Últimas incorporaciones</strong></div><div class="objects-compact-list">'+
      (latest.length?latest.map(x=>'<button type="button" data-object-open="'+e(x.id)+'"><span>'+e(x.name||"Objeto")+'</span><time>'+e(d(x.date))+'</time></button>').join(""):empty("Sin incorporaciones fechadas"))+
    '</div></section></div>'+
    '<section class="objects-panel"><div class="objects-section-title"><small>Contexto</small><strong>Próximas listas</strong></div><div class="objects-context-strip">'+
      (contexts.length?contexts.map(x=>'<button type="button" data-list-open="'+e(x.id)+'"><time>'+e(d(x.startDate))+'</time><strong>'+e(x.name||"Lista")+'</strong><small>'+e(x.destination||"Sin destino")+'</small></button>').join(""):empty("No hay contextos próximos con lista activa"))+
    '</div></section>';
}

function opts(values) { return (values||[]).map(x=>'<option value="'+e(x)+'">'+e(x)+'</option>').join(""); }
function objectCard(x) {
  return '<button class="object-card" type="button" data-object-open="'+e(x.id)+'" data-name="'+e(String(x.name||"").toLocaleLowerCase("es"))+'" data-category="'+e(x.category||"")+'" data-location="'+e(x.location||"")+'" data-status="'+e(x.status||"")+'">'+
    '<span class="object-card-top"><span class="object-category">'+e(x.category||"Otros")+'</span><span class="object-status">'+e(label(x.status))+'</span></span>'+
    '<strong>'+e(x.name||"Objeto")+'</strong><small>'+e([x.brand,x.model,x.subcategory].filter(Boolean).join(" · ")||"Sin detalle adicional")+'</small>'+
    '<span class="object-card-meta"><span>'+e(x.location||"Sin ubicación")+'</span><b>'+e(x.estimatedValue!=null?m(x.estimatedValue,x.currency):x.purchasePrice!=null?m(x.purchasePrice,x.currency):"—")+'</b></span></button>';
}
function inventoryView(payload) {
  if (pending(payload)) return pendingView();
  const items=payload.objects||[], f=payload.facets||{};
  return '<section class="objects-toolbar"><input id="objects-search" type="search" placeholder="Buscar objeto…"><select id="objects-category"><option value="">Todas las categorías</option>'+opts(f.categories)+'</select><select id="objects-location"><option value="">Todas las ubicaciones</option>'+opts(f.locations)+'</select><select id="objects-status"><option value="">Todos los estados</option>'+opts(f.statuses)+'</select></section>'+
    '<div class="objects-list-heading"><strong id="objects-visible-count">'+items.length+' objetos</strong></div><div class="objects-inventory-grid">'+
    (items.length?items.map(objectCard).join(""):empty("Inventario vacío","Cuando el gestor añada objetos a la fuente canónica aparecerán aquí."))+'</div>';
}

function wardrobeVisualCard(x) {
  const src=visualUrl(x);
  return '<button class="wardrobe-card wardrobe-card-visual" type="button" data-object-open="'+e(x.objectId)+'" data-name="'+e(String(x.name||"").toLocaleLowerCase("es"))+'" data-garment="'+e(x.visualCategory||x.subcategory||"")+'" data-brand="'+e(x.brand||"")+'" data-color="'+e(x.primaryColor||x.color||"")+'" data-formality="'+e(x.formality||"")+'" data-season="'+e(x.season||"")+'" data-office="'+(x.office===true?"yes":x.office===false?"no":"")+'" data-frequency="'+e(useFrequency(x))+'">'+
    '<span class="wardrobe-visual">'+(src?'<img loading="lazy" src="'+e(src)+'" alt="'+e(x.name||"Prenda")+'">':'<span class="wardrobe-placeholder">◫</span>')+processedBadge(x)+'</span>'+
    '<span class="wardrobe-card-body"><span class="wardrobe-card-top"><span>'+e(x.subcategory||x.visualCategory||"Prenda")+'</span>'+(x.office===true?'<b>Oficina</b>':'')+'</span>'+
    '<strong>'+e(x.name||"Prenda")+'</strong><small>'+e([x.brand,x.primaryColor||x.color].filter(Boolean).join(" · ")||"Sin marca/color")+'</small>'+
    '<span class="wardrobe-card-foot"><span>'+e(x.formality||"Formalidad sin indicar")+'</span><time>'+(x.lastUsed?"Último uso "+e(d(x.lastUsed)):"Sin uso fechado")+'</time><span>'+(x.relatedLookIds||[]).length+' looks relacionados</span></span></span></button>';
}

function wardrobeView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.wardrobe||[], f=payload.facets||{}, vs=payload.summary?.visualWardrobe||{};
  return '<section class="objects-callout wardrobe-visual-callout"><div><small>Armario visual</small><strong>Prendas listas para combinar</strong><p>Se prioriza miniatura → recorte procesado → foto original. Las prendas sin imagen siguen disponibles y no se inventa ninguna.</p></div><span>'+Number(vs.processed||0)+' procesadas · '+Number(vs.pending||0)+' pendientes</span></section>'+
    '<section class="objects-toolbar wardrobe-toolbar">'+
      '<input id="wardrobe-search" type="search" placeholder="Buscar prenda…">'+
      '<select id="wardrobe-type"><option value="">Categoría: todas</option>'+opts(f.garmentTypes)+'</select>'+
      '<select id="wardrobe-brand"><option value="">Marca: todas</option>'+opts(f.brands)+'</select>'+
      '<select id="wardrobe-color"><option value="">Color: todos</option>'+opts(f.colors)+'</select>'+
      '<select id="wardrobe-formality"><option value="">Formalidad: todas</option>'+opts(f.formalities)+'</select>'+
      '<select id="wardrobe-season"><option value="">Temporada: todas</option>'+opts(f.seasons)+'</select>'+
      '<select id="wardrobe-office"><option value="">Oficina: todo</option><option value="yes">Apto oficina</option><option value="no">No oficina</option></select>'+
      '<select id="wardrobe-frequency"><option value="">Uso: cualquier frecuencia</option><option value="unused">Sin usar</option><option value="low">1–2 usos</option><option value="regular">3–7 usos</option><option value="high">8+ usos</option><option value="unknown">Sin histórico</option></select>'+
      '<button class="objects-primary-action" type="button" data-look-builder>Abrir combinador</button>'+
    '</section><div class="objects-list-heading"><strong id="wardrobe-visible-count">'+rows.length+' prendas</strong></div><div class="wardrobe-grid wardrobe-visual-grid">'+
    (rows.length?rows.map(wardrobeVisualCard).join(""):empty("Armario vacío","Las prendas deben existir primero en el inventario."))+
    '</div>';
}

function lookMosaic(look,payload) {
  const wardrobe=new Map((payload.wardrobe||[]).map(x=>[String(x.objectId),x]));
  const direct=imageUrl(look.photoUrl);
  if(direct) return '<img loading="lazy" src="'+e(direct)+'" alt="'+e(look.name||"Look")+'">';
  const images=(look.items||[]).map(i=>visualUrl(wardrobe.get(String(i.objectId)))).filter(Boolean).slice(0,4);
  if(!images.length) return '<span>◇</span>';
  return '<span class="look-mosaic">'+images.map(src=>'<img loading="lazy" src="'+e(src)+'" alt="">').join("")+'</span>';
}

function normalizedUsageDates(values=[], lastUsed=null) {
  const raw=[...(Array.isArray(values)?values:[])];
  if (lastUsed) raw.push(lastUsed);
  return [...new Set(raw.map(value=>String(value||"").trim().slice(0,10)).filter(Boolean))].sort().reverse();
}

function isUsageWithinLast30Days(value) {
  const date=new Date(String(value||"").slice(0,10)+"T12:00:00");
  if (!Number.isFinite(date.getTime())) return false;
  const today=new Date();
  today.setHours(23,59,59,999);
  const cutoff=new Date(today);
  cutoff.setDate(cutoff.getDate()-29);
  cutoff.setHours(0,0,0,0);
  return date>=cutoff && date<=today;
}

function usageDatesForLook(look) {
  return normalizedUsageDates(look?.usageHistory||[],look?.lastUsed);
}

function usageHistoryRows(payload,mode="looks") {
  if (mode==="garments") {
    const looks=payload.looks||[];
    return (payload.wardrobe||[]).map(item=>{
      const related=looks.filter(look=>(look.items||[]).some(part=>String(part.objectId)===String(item.objectId)));
      const dates=normalizedUsageDates(related.flatMap(usageDatesForLook),item.lastUsed);
      const canonical=Number(item.useCount);
      const totalUses=Number.isFinite(canonical)?Math.max(canonical,dates.length):dates.length;
      return {
        id:String(item.objectId),
        kind:"garment",
        name:item.name||"Prenda",
        detail:[item.brand,item.subcategory||item.visualCategory,item.primaryColor||item.color].filter(Boolean).join(" · "),
        dates,
        latestDate:dates[0]||item.lastUsed||"",
        totalUses,
        recentUses:dates.filter(isUsageWithinLast30Days).length,
        item
      };
    }).filter(row=>row.totalUses>0||row.dates.length>0);
  }
  return (payload.looks||[]).map(look=>{
    const dates=usageDatesForLook(look);
    const canonical=Number(look.useCount);
    const totalUses=Number.isFinite(canonical)?Math.max(canonical,dates.length):dates.length;
    return {
      id:String(look.id),
      kind:"look",
      name:look.name||"Look",
      detail:[look.context,look.formality,look.season].filter(Boolean).join(" · "),
      dates,
      latestDate:dates[0]||look.lastUsed||"",
      totalUses,
      recentUses:dates.filter(isUsageWithinLast30Days).length,
      look
    };
  }).filter(row=>row.totalUses>0||row.dates.length>0);
}

function sortUsageRows(rows,sort="recent") {
  const copy=[...rows];
  if (sort==="oldest") return copy.sort((a,b)=>String(a.latestDate||"9999").localeCompare(String(b.latestDate||"9999")));
  if (sort==="total") return copy.sort((a,b)=>b.totalUses-a.totalUses||String(b.latestDate).localeCompare(String(a.latestDate)));
  if (sort==="month") return copy.sort((a,b)=>b.recentUses-a.recentUses||String(b.latestDate).localeCompare(String(a.latestDate)));
  return copy.sort((a,b)=>String(b.latestDate).localeCompare(String(a.latestDate)));
}

function lookUsageEntries(payload) {
  const entries=[];
  for (const look of payload.looks||[]) {
    for (const date of usageDatesForLook(look)) entries.push({date,look});
  }
  return entries.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

function looksView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.looks||[], office=rows.filter(x=>x.office===true).length;
  return '<section class="objects-callout"><div><small>Armario inteligente</small><strong>Looks guardados</strong><p>Pulsa un look para ampliar su imagen y ver las prendas reales que lo componen.</p></div><span>'+office+' oficina</span></section>'+
    '<div class="looks-actions"><button class="objects-secondary-action" type="button" data-look-history>Historial de uso</button><button class="objects-primary-action" type="button" data-look-builder>Crear look visual</button></div><div class="looks-grid">'+
    (rows.length?rows.map(x=>'<article class="look-card" role="button" tabindex="0" data-look-open="'+e(x.id)+'" aria-label="Abrir '+e(x.name||"look")+'"><div class="look-visual">'+lookMosaic(x,payload)+'</div><div class="look-body"><span class="look-tags">'+(x.office===true?'<b>Oficina</b>':'')+(x.season?'<b>'+e(x.season)+'</b>':'')+(x.formality?'<b>'+e(x.formality)+'</b>':'')+'</span><strong>'+e(x.name||"Look")+'</strong><p>'+e((x.items||[]).map(i=>i.name).filter(Boolean).join(" · ")||"Sin prendas vinculadas")+'</p><small>'+e(x.context||"Contexto sin indicar")+' · '+(x.lastUsed?"último uso "+e(d(x.lastUsed)):"sin uso reciente")+'</small></div></article>').join(""):empty("Todavía no hay looks","El combinador puede crear el primero reutilizando prendas reales."))+
    '</div>';
}

function lookUsageHistoryView(payload,mode="looks",sort="recent") {
  const body=document.querySelector("#dialog-body");
  const rows=sortUsageRows(usageHistoryRows(payload,mode),sort);
  const totalUses=rows.reduce((sum,row)=>sum+Number(row.totalUses||0),0);
  const recentUses=rows.reduce((sum,row)=>sum+Number(row.recentUses||0),0);
  const isGarments=mode==="garments";
  const entityLabel=isGarments?"Prenda":"Look";
  const dateCells=(row)=>row.dates.length
    ? '<div class="look-history-dates">'+row.dates.map(date=>'<span>'+e(d(date))+'</span>').join("")+'</div>'
    : '<span class="look-history-none">Sin fechas</span>';
  const tableRows=rows.map(row=>'<tr>'+
    '<td><button class="look-history-entity" type="button" '+(isGarments?'data-garment-history-open="'+e(row.id)+'"':'data-look-history-open="'+e(row.id)+'"')+'><strong>'+e(row.name)+'</strong><small>'+e(row.detail||"Sin detalle")+'</small></button></td>'+
    '<td data-label="Último uso"><strong>'+e(row.latestDate?d(row.latestDate):"—")+'</strong></td>'+
    '<td data-label="Usos totales"><strong>'+e(row.totalUses)+'</strong></td>'+
    '<td data-label="Últimos 30 días"><strong>'+e(row.recentUses)+'</strong></td>'+
    '<td data-label="Fechas registradas">'+dateCells(row)+'</td>'+
    '</tr>').join("");
  body.innerHTML='<button class="objects-back" data-look-history-back type="button">← Volver a Looks</button>'+
    '<section class="look-history">'+
      '<header class="look-history-head"><div><small>Armario inteligente</small><h3>Historial de uso</h3><p>Lectura de usos registrados en la fuente canónica de Objetos.</p></div><div class="look-history-kpis"><span><small>Usos totales</small><strong>'+totalUses+'</strong></span><span><small>Últimos 30 días</small><strong>'+recentUses+'</strong></span></div></header>'+
      '<div class="look-history-controls">'+
        '<div class="look-history-mode" role="group" aria-label="Vista del historial"><button type="button" data-look-history-mode="looks" aria-pressed="'+(!isGarments)+'">Looks</button><button type="button" data-look-history-mode="garments" aria-pressed="'+isGarments+'">Prendas</button></div>'+
        '<label>Ordenar por<select data-look-history-sort><option value="recent"'+(sort==="recent"?" selected":"")+'>Uso más reciente</option><option value="oldest"'+(sort==="oldest"?" selected":"")+'>Uso más antiguo</option><option value="total"'+(sort==="total"?" selected":"")+'>Más usos totales</option><option value="month"'+(sort==="month"?" selected":"")+'>Más usos · últimos 30 días</option></select></label>'+
      '</div>'+
      '<div class="look-history-table-wrap"><table class="look-history-table" data-history-mode="'+e(mode)+'"><thead><tr><th>'+entityLabel+'</th><th>Último uso</th><th>Usos totales</th><th>Últimos 30 días</th><th>Fechas registradas</th></tr></thead><tbody>'+
        (tableRows||'<tr><td colspan="5">'+empty("Todavía no hay usos registrados",isGarments?"Las prendas aparecerán cuando exista uso canónico o una fecha derivable de un look registrado.":"Los looks aparecerán cuando tengan historico_usos, ultimo_uso o veces_usado.")+'</td></tr>')+
      '</tbody></table></div>'+
      (isGarments?'<p class="look-history-note">En Prendas, las fechas se derivan de los usos registrados de los looks que contienen cada prenda y de su último uso canónico. El total usa Armario.veces_usado cuando existe. El cómputo de 30 días solo cuenta fechas disponibles.</p>':'<p class="look-history-note">En Looks, el total usa Looks.veces_usado cuando existe; las fechas proceden de historico_usos y ultimo_uso. El cómputo de 30 días solo cuenta fechas disponibles.</p>')+
    '</section>';
  body.querySelector("[data-look-history-back]")?.addEventListener("click",()=>{activeTab="looks";renderWorkspace(payload);});
  body.querySelectorAll("[data-look-history-mode]").forEach(button=>button.addEventListener("click",()=>lookUsageHistoryView(payload,button.dataset.lookHistoryMode||"looks",sort)));
  body.querySelector("[data-look-history-sort]")?.addEventListener("change",event=>lookUsageHistoryView(payload,mode,event.target.value||"recent"));
  body.querySelectorAll("[data-look-history-open]").forEach(button=>button.addEventListener("click",()=>{
    const look=(payload.looks||[]).find(x=>String(x.id)===String(button.dataset.lookHistoryOpen));
    if(look) detailLook(look,payload);
  }));
  body.querySelectorAll("[data-garment-history-open]").forEach(button=>button.addEventListener("click",()=>{
    const item=(payload.objects||[]).find(x=>String(x.id)===String(button.dataset.garmentHistoryOpen));
    if(item) detailObject(item,payload);
  }));
}

function builderOptions(rows,role) {
  const candidates=(rows||[]).filter(x=>x.layer===role && !["VENDIDO","DONADO","DESCARTADO","PERDIDO"].includes(String(x.status||"")));
  return '<option value="">'+(role==="exterior"?"Sin exterior":"Seleccionar")+'</option>'+candidates.map(x=>'<option value="'+e(x.objectId)+'">'+e([x.name,x.brand,x.primaryColor||x.color].filter(Boolean).join(" · "))+'</option>').join("");
}

function builderView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.wardrobe||[], f=payload.facets||{};
  return '<section class="look-builder"><div class="look-builder-head"><div><small>Constructor visual · MVP</small><strong>Combina solo prendas que ya existen</strong><p>Superior, inferior y calzado son necesarios; exterior es opcional. El guardado escribe en Looks + LookItems de la fuente canónica.</p></div><button type="button" data-objects-tab="wardrobe">Volver al armario</button></div>'+
    '<div class="look-builder-layout"><section class="look-builder-controls">'+
      '<label>Nombre del look<input id="look-builder-name" type="text" placeholder="Ej. Oficina azul y gris"></label>'+
      '<label>Contexto<input id="look-builder-context" type="text" placeholder="Oficina, viaje, cena…"></label>'+
      '<label>Formalidad<select id="look-builder-formality"><option value="">Sin indicar</option>'+opts(f.formalities)+'</select></label>'+
      '<label>Temporada<select id="look-builder-season"><option value="">Sin indicar</option>'+opts(f.seasons)+'</select></label>'+
      '<label class="look-builder-office"><input id="look-builder-office" type="checkbox"> Apto para oficina</label>'+
      '<div class="look-builder-selectors">'+["superior","exterior","inferior","calzado"].map(role=>'<label><span>'+e(role)+'</span><select data-look-role="'+role+'">'+builderOptions(rows,role)+'</select></label>').join("")+'</div>'+
      '<div class="look-builder-save-row"><span id="look-builder-message">Selecciona superior, inferior y calzado.</span><button id="look-builder-save" class="objects-primary-action" type="button">Guardar look</button></div>'+
    '</section><section class="look-builder-preview" aria-label="Vista previa del look">'+["exterior","superior","inferior","calzado"].map(role=>'<article data-look-preview="'+role+'"><small>'+e(role)+'</small><div><span>◫</span></div><strong>Sin seleccionar</strong></article>').join("")+'</section></div></section>';
}

function kitsView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.kits||[];
  return '<div class="kits-grid">'+(rows.length?rows.map(x=>'<article class="kit-card"><div class="kit-card-head"><div><small>'+e(x.context||"Plantilla reutilizable")+'</small><strong>'+e(x.name||"Kit")+'</strong></div><span>'+(x.items||[]).length+'</span></div><p>'+e(x.description||"Sin descripción")+'</p><div class="kit-items">'+(x.items||[]).slice(0,8).map(i=>'<span><b>'+e(i.name||"Necesidad")+'</b><small>'+e(i.importance||"RECOMENDADO")+'</small></span>').join("")+'</div></article>').join(""):empty("No hay kits definidos","Podrán usarse para oficina, gimnasio, viajes, moto, senderismo y otros contextos."))+'</div>';
}

function progress(items) {
  const relevant=(items||[]).filter(x=>x.state!=="DESCARTADO"), prepared=relevant.filter(x=>x.state==="PREPARADO").length;
  return {prepared,total:relevant.length,pct:relevant.length?Math.round(prepared/relevant.length*100):0};
}
function listsView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.lists||[];
  return '<div class="context-lists-grid">'+(rows.length?rows.map(x=>{const p=progress(x.items),missing=(x.items||[]).filter(i=>i.state==="FALTA_COMPRAR").length;return '<button class="context-list-card" type="button" data-list-open="'+e(x.id)+'"><span class="context-list-top"><span>'+e(x.context||"Contexto")+'</span><b>'+e(x.status||"ACTIVA")+'</b></span><strong>'+e(x.name||"Lista")+'</strong><small>'+e([x.destination,x.startDate?d(x.startDate):null,x.endDate?d(x.endDate):null].filter(Boolean).join(" · ")||"Sin fechas")+'</small><progress class="context-list-progress" max="100" value="'+p.pct+'" aria-label="'+p.pct+'% preparado"></progress><span class="context-list-foot"><span>'+p.prepared+'/'+p.total+' preparados</span><span>'+(missing?missing+" por comprar":"sin compras pendientes")+'</span></span></button>';}).join(""):empty("No hay listas contextuales","Viajes y eventos podrán generarlas reutilizando objetos y kits."))+'</div>';
}

function detailObject(item,payload) {
  const body=document.querySelector("#dialog-body"), w=(payload.wardrobe||[]).find(x=>x.objectId===item.id);
  const related=(payload.looks||[]).filter(x=>(w?.relatedLookIds||[]).includes(x.id));
  const compatible=(w?.compatibleWith||[]).map(id=>(payload.wardrobe||[]).find(x=>x.objectId===id)).filter(Boolean);
  const usageDates=[...new Set(related.flatMap(x=>x.usageHistory||[]).filter(Boolean))].sort().reverse();
  const processed=w?imageUrl(w.processedPhotoUrl||w.thumbnailUrl||w.photoUrl):"";
  const original=w?imageUrl(w.originalPhotoUrl||item.photoUrl):imageUrl(item.photoUrl);
  const gallery=w?'<div class="wardrobe-detail-gallery"><div class="wardrobe-detail-main">'+(processed?'<img src="'+e(processed)+'" alt="'+e(item.name||"Prenda")+' procesada">':'<span>◫</span>')+'<small>Procesada · '+e(w.processedState||"pendiente")+'</small></div><div class="wardrobe-detail-original">'+(original?'<img src="'+e(original)+'" alt="'+e(item.name||"Prenda")+' original">':'<span>Sin original</span>')+'<small>Original</small></div></div>':"";
  body.innerHTML='<button class="objects-back" data-objects-back type="button">← Volver a Objetos</button><section class="object-detail">'+gallery+'<div class="object-detail-head"><div><span class="object-category">'+e(item.category||"Otros")+'</span><h3>'+e(item.name||"Objeto")+'</h3><p>'+e([item.brand,item.model,item.subcategory].filter(Boolean).join(" · ")||"Sin detalle")+'</p></div><span class="object-status">'+e(label(item.status))+'</span></div><div class="object-detail-grid">'+
    [['Ubicación',item.location||"Sin indicar"],['Cantidad',item.quantity??"—"],['Condición',item.condition||"Sin indicar"],['Compra',d(item.purchaseDate)],['Precio',m(item.purchasePrice,item.currency)],['Valor aprox.',m(item.estimatedValue,item.currency)],['Garantía',d(item.warrantyUntil)],['N.º serie',item.serialNumber||"—"]].map(([a,b])=>'<span><small>'+e(a)+'</small><strong>'+e(b)+'</strong></span>').join("")+
    '</div>'+(w?'<div class="object-wardrobe-detail"><strong>Armario visual</strong><span>'+e([w.visualCategory,w.subcategory,w.primaryColor||w.color,w.pattern,w.size,w.season,w.formality].filter(Boolean).join(" · ")||"Sin atributos")+'</span><small>'+e([w.layer?("capa "+w.layer):null,w.garmentView?("vista "+w.garmentView):null,w.lastUsed?("último uso "+d(w.lastUsed)):null,w.office===true?"oficina":null].filter(Boolean).join(" · ")||"Sin histórico de uso")+'</small></div>':'')+
    (w?'<div class="object-related-block"><strong>Histórico de uso</strong><div><span>'+e(Number.isFinite(Number(w.useCount))?Number(w.useCount)+" usos registrados":"Frecuencia sin registrar")+'</span>'+(w.lastUsed?'<span>Último '+e(d(w.lastUsed))+'</span>':'')+usageDates.slice(0,6).map(date=>'<span>'+e(d(date))+'</span>').join("")+'</div></div>':'')+
    (related.length?'<div class="object-related-block"><strong>Looks relacionados</strong><div>'+related.map(x=>'<span>'+e(x.name)+'</span>').join("")+'</div></div>':'')+
    (compatible.length?'<div class="object-related-block"><strong>Prendas compatibles</strong><div>'+compatible.map(x=>'<span>'+e(x.name)+'</span>').join("")+'</div></div>':'')+
    ((item.contexts||[]).length||(item.tags||[]).length?'<div class="object-chip-row">'+[...(item.contexts||[]),...(item.tags||[])].map(x=>'<span>'+e(x)+'</span>').join("")+'</div>':'')+
    (item.notes||w?.notes?'<div class="object-notes"><strong>Notas</strong><p>'+e(w?.notes||item.notes)+'</p></div>':'')+
    '<div class="object-detail-links">'+(item.receiptRef?'<span>Factura/recibo referenciado</span>':'')+(item.link?'<a href="'+e(item.link)+'" target="_blank" rel="noreferrer">Abrir enlace ↗</a>':'')+'</div></section>';
  body.querySelector("[data-objects-back]")?.addEventListener("click",()=>renderWorkspace(payload));
}

function detailLook(look,payload) {
  const body=document.querySelector("#dialog-body");
  const wardrobe=new Map((payload.wardrobe||[]).map(x=>[String(x.objectId),x]));
  const objects=new Map((payload.objects||[]).map(x=>[String(x.id),x]));
  const direct=imageUrl(look.photoUrl);
  const itemCards=(look.items||[]).map(item=>{
    const garment=wardrobe.get(String(item.objectId));
    const object=objects.get(String(item.objectId));
    const src=visualUrl(garment);
    const name=garment?.name||item.name||object?.name||"Prenda";
    const detail=[garment?.brand||object?.brand,garment?.primaryColor||garment?.color,garment?.subcategory||garment?.visualCategory].filter(Boolean).join(" · ");
    return '<button class="look-detail-item" type="button" data-object-open="'+e(item.objectId)+'">'+
      '<span class="look-detail-item-image">'+(src?'<img src="'+e(src)+'" alt="'+e(name)+'">':'<span>◫</span>')+'</span>'+
      '<span class="look-detail-item-copy"><small>'+e(label(item.role||"prenda"))+'</small><strong>'+e(name)+'</strong><span>'+e(detail||"Ver prenda en Armario")+'</span></span>'+
      '</button>';
  }).join("");
  body.innerHTML='<button class="objects-back" data-look-back type="button">← Volver a Looks</button>'+
    '<section class="look-detail">'+
      '<div class="look-detail-layout">'+
        '<div class="look-detail-main">'+(direct?'<img src="'+e(direct)+'" alt="'+e(look.name||"Look")+'">':lookMosaic(look,payload))+'</div>'+
        '<div class="look-detail-copy">'+
          '<span class="look-tags">'+(look.office===true?'<b>Oficina</b>':'')+(look.season?'<b>'+e(look.season)+'</b>':'')+(look.formality?'<b>'+e(look.formality)+'</b>':'')+'</span>'+
          '<div class="look-detail-heading"><small>Look completo</small><h3>'+e(look.name||"Look")+'</h3><p>'+e(look.context||"Contexto sin indicar")+'</p></div>'+
          '<div class="look-detail-meta"><span><small>Prendas</small><strong>'+Number((look.items||[]).length)+'</strong></span><span><small>Último uso</small><strong>'+e(look.lastUsed?d(look.lastUsed):"Sin uso reciente")+'</strong></span></div>'+
          '<div class="look-detail-components"><div><small>Composición</small><strong>Prendas del look</strong></div><div class="look-detail-items">'+(itemCards||empty("Sin prendas vinculadas"))+'</div></div>'+
        '</div>'+
      '</div>'+
    '</section>';
  body.querySelector("[data-look-back]")?.addEventListener("click",()=>{activeTab="looks";renderWorkspace(payload);});
  body.querySelectorAll("[data-object-open]").forEach(button=>button.addEventListener("click",()=>{
    const item=(payload.objects||[]).find(x=>String(x.id)===String(button.dataset.objectOpen));
    if(item)detailObject(item,payload);
  }));
}

function detailList(list,payload) {
  const body=document.querySelector("#dialog-body");
  body.innerHTML='<button class="objects-back" data-objects-back type="button">← Volver a Objetos</button><section class="object-detail"><div class="object-detail-head"><div><span class="object-category">'+e(list.context||"Lista")+'</span><h3>'+e(list.name||"Lista")+'</h3><p>'+e([list.destination,list.startDate?d(list.startDate):null,list.endDate?d(list.endDate):null].filter(Boolean).join(" · ")||"Sin fechas")+'</p></div><span class="object-status">'+e(list.status||"ACTIVA")+'</span></div><div class="packing-list">'+
    ((list.items||[]).length?(list.items||[]).map(x=>'<article><span class="packing-importance">'+e(x.importance||"RECOMENDADO")+'</span><div><strong>'+e(x.name||"Necesidad")+'</strong><small>'+(x.objectId?"Objeto del inventario":x.state==="FALTA_COMPRAR"?"No disponible · comprar":"Necesidad contextual")+'</small></div><span class="packing-state">'+e(label(x.state))+'</span></article>').join(""):empty("Lista vacía"))+'</div></section>';
  body.querySelector("[data-objects-back]")?.addEventListener("click",()=>renderWorkspace(payload));
}

function bind(payload) {
  const body=document.querySelector("#dialog-body");
  body.querySelectorAll("[data-objects-tab]").forEach(b=>b.addEventListener("click",()=>{activeTab=b.dataset.objectsTab||"summary";objectsFlash="";renderWorkspace(payload);}));
  body.querySelectorAll("[data-look-builder]").forEach(b=>b.addEventListener("click",()=>{activeTab="builder";objectsFlash="";renderWorkspace(payload);}));
  body.querySelectorAll("[data-look-history]").forEach(b=>b.addEventListener("click",()=>lookUsageHistoryView(payload)));
  body.querySelectorAll("[data-object-open]").forEach(b=>b.addEventListener("click",()=>{const item=(payload.objects||[]).find(x=>String(x.id)===String(b.dataset.objectOpen));if(item)detailObject(item,payload);}));
  body.querySelectorAll("[data-look-open]").forEach(card=>{
    const open=()=>{const look=(payload.looks||[]).find(x=>String(x.id)===String(card.dataset.lookOpen));if(look)detailLook(look,payload);};
    card.addEventListener("click",open);
    card.addEventListener("keydown",(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}});
  });
  body.querySelectorAll("[data-list-open]").forEach(b=>b.addEventListener("click",()=>{const item=(payload.lists||[]).find(x=>String(x.id)===String(b.dataset.listOpen));if(item)detailList(item,payload);}));

  const filterObjects=()=>{const q=String(body.querySelector("#objects-search")?.value||"").trim().toLocaleLowerCase("es"),cat=body.querySelector("#objects-category")?.value||"",loc=body.querySelector("#objects-location")?.value||"",st=body.querySelector("#objects-status")?.value||"";let n=0;body.querySelectorAll(".object-card").forEach(c=>{const show=(!q||String(c.dataset.name||"").includes(q))&&(!cat||c.dataset.category===cat)&&(!loc||c.dataset.location===loc)&&(!st||c.dataset.status===st);c.hidden=!show;if(show)n++;});const out=body.querySelector("#objects-visible-count");if(out)out.textContent=n+(n===1?" objeto":" objetos");};
  ["#objects-search","#objects-category","#objects-location","#objects-status"].forEach(s=>{body.querySelector(s)?.addEventListener("input",filterObjects);body.querySelector(s)?.addEventListener("change",filterObjects);});

  const filterWardrobe=()=>{
    const q=String(body.querySelector("#wardrobe-search")?.value||"").trim().toLocaleLowerCase("es");
    const filters={
      garment:body.querySelector("#wardrobe-type")?.value||"",
      brand:body.querySelector("#wardrobe-brand")?.value||"",
      color:body.querySelector("#wardrobe-color")?.value||"",
      formality:body.querySelector("#wardrobe-formality")?.value||"",
      season:body.querySelector("#wardrobe-season")?.value||"",
      office:body.querySelector("#wardrobe-office")?.value||"",
      frequency:body.querySelector("#wardrobe-frequency")?.value||""
    };
    let n=0;
    body.querySelectorAll(".wardrobe-card").forEach(card=>{
      const show=(!q||String(card.dataset.name||"").includes(q))&&Object.entries(filters).every(([key,val])=>!val||String(card.dataset[key]||"")===val);
      card.hidden=!show;if(show)n++;
    });
    const out=body.querySelector("#wardrobe-visible-count");if(out)out.textContent=n+(n===1?" prenda":" prendas");
  };
  ["#wardrobe-search","#wardrobe-type","#wardrobe-brand","#wardrobe-color","#wardrobe-formality","#wardrobe-season","#wardrobe-office","#wardrobe-frequency"].forEach(s=>{body.querySelector(s)?.addEventListener("input",filterWardrobe);body.querySelector(s)?.addEventListener("change",filterWardrobe);});

  const wardrobeById=new Map((payload.wardrobe||[]).map(x=>[String(x.objectId),x]));
  const updateBuilder=()=>{
    let complete=true;
    body.querySelectorAll("[data-look-role]").forEach(select=>{
      const role=select.dataset.lookRole||"";
      const item=wardrobeById.get(String(select.value||""));
      const preview=body.querySelector('[data-look-preview="'+role+'"]');
      if(preview){
        const src=visualUrl(item);
        const visual=preview.querySelector("div");
        const title=preview.querySelector("strong");
        if(visual) visual.innerHTML=item?(src?'<img src="'+e(src)+'" alt="'+e(item.name||"Prenda")+'">':'<span>◫</span>'):'<span>◫</span>';
        if(title) title.textContent=item?.name||"Sin seleccionar";
      }
      if(["superior","inferior","calzado"].includes(role)&&!item) complete=false;
    });
    const save=body.querySelector("#look-builder-save");
    if(save) save.disabled=!complete;
    const message=body.querySelector("#look-builder-message");
    if(message) message.textContent=complete?"Combinación válida para guardar.":"Selecciona superior, inferior y calzado.";
  };
  body.querySelectorAll("[data-look-role]").forEach(select=>select.addEventListener("change",updateBuilder));
  updateBuilder();

  body.querySelector("#look-builder-save")?.addEventListener("click",async()=>{
    const save=body.querySelector("#look-builder-save"), message=body.querySelector("#look-builder-message");
    const items=[...body.querySelectorAll("[data-look-role]")].map(select=>({role:select.dataset.lookRole,objectId:select.value})).filter(x=>x.objectId);
    if(save)save.disabled=true;
    if(message)message.textContent="Guardando en la fuente canónica…";
    try{
      const response=await fetch("/api/objects/look",{
        method:"POST",
        headers:{"Content-Type":"application/json",Accept:"application/json"},
        credentials:"same-origin",
        body:JSON.stringify({
          name:body.querySelector("#look-builder-name")?.value||"",
          context:body.querySelector("#look-builder-context")?.value||"",
          formality:body.querySelector("#look-builder-formality")?.value||"",
          season:body.querySelector("#look-builder-season")?.value||"",
          office:Boolean(body.querySelector("#look-builder-office")?.checked),
          items
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.code||"OBJECTS_LOOK_SAVE_FAILED");
      const fresh=await fetch("/api/objects",{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
      if(!fresh.ok)throw new Error("OBJECTS_REFRESH_"+fresh.status);
      objectsFlash="Look guardado en la fuente canónica.";
      activeTab="looks";
      renderWorkspace(await fresh.json());
    }catch(error){
      console.warn("Look save failed",error);
      if(message)message.textContent="No se ha podido guardar el look. Revisa la combinación y reintenta.";
      if(save)save.disabled=false;
    }
  });
}

function renderWorkspace(payload) {
  const body=document.querySelector("#dialog-body");
  const views={summary:summaryView,inventory:inventoryView,wardrobe:wardrobeView,builder:builderView,looks:looksView,kits:kitsView,lists:listsView};
  body.innerHTML='<div class="objects-shell">'+(objectsFlash?'<div class="objects-flash">'+e(objectsFlash)+'</div>':'')+'<header class="objects-hero"><div><small>Inventario personal compartido</small><strong>Lo que tengo, dónde está y para qué me sirve</strong><p>Una única fuente para armario, equipaje, oficina, deporte, hogar y futuros gestores.</p></div><span class="objects-source-state '+(pending(payload)?"pending":"ready")+'">'+(pending(payload)?"Fuente pendiente":"Fuente conectada")+'</span></header><nav class="objects-tabs">'+TABS.map(([id,name])=>'<button type="button" class="'+(activeTab===id?"active":"")+'" data-objects-tab="'+id+'">'+e(name)+'</button>').join("")+'</nav><div class="objects-tab-content">'+(views[activeTab]||summaryView)(payload)+'</div></div>';
  bind(payload);
}

export async function openObjectsDetail(initialTab = "summary") {
  const dialog=document.querySelector("#detail-dialog");
  if(!dialog)return;
  dialog.classList.remove("wealth-dialog","health-dialog","habits-dialog","important-events-dialog","budget-dialog","parents-dialog","electricity-dialog","pantry-dialog");
  dialog.classList.add("objects-dialog", "projects-dialog");
  document.querySelector("#dialog-context").textContent="Objetos · estado privado";
  document.querySelector("#dialog-title").textContent="Objetos";
  document.querySelector("#dialog-body").innerHTML='<p class="objects-loading">Cargando inventario…</p>';
  if(!dialog.open)dialog.showModal();
  try {
    const response=await fetch("/api/objects",{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
    if(!response.ok)throw new Error("OBJECTS_"+response.status);
    const validTabs = new Set(TABS.map(([id]) => id));
    activeTab = validTabs.has(initialTab) ? initialTab : "summary";
    objectsFlash="";
    renderWorkspace(await response.json());
  } catch(error) {
    console.warn("Objects load failed",error);
    document.querySelector("#dialog-body").innerHTML='<div class="objects-empty"><strong>Objetos no disponible</strong><p>No se ha podido leer la capa privada. El resto del dashboard sigue operativo.</p><button id="objects-retry" type="button">Reintentar</button></div>';
    document.querySelector("#objects-retry")?.addEventListener("click",openObjectsDetail);
  }
}
