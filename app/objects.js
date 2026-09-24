const TABS = [["summary","Resumen"],["inventory","Inventario"],["wardrobe","Armario"],["looks","Looks"],["kits","Kits"],["lists","Listas"]];
let activeTab = "summary";

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

function wardrobeView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.wardrobe||[], f=payload.facets||{};
  return '<section class="objects-toolbar"><input id="wardrobe-search" type="search" placeholder="Buscar prenda…"><select id="wardrobe-type"><option value="">Todas las prendas</option>'+opts(f.garmentTypes)+'</select><select id="wardrobe-season"><option value="">Todas las temporadas</option>'+opts(f.seasons)+'</select><select id="wardrobe-office"><option value="">Oficina: todo</option><option value="yes">Apto oficina</option><option value="no">No oficina</option></select></section><div class="wardrobe-grid">'+
    (rows.length?rows.map(x=>'<button class="wardrobe-card" type="button" data-object-open="'+e(x.objectId)+'" data-name="'+e(String(x.name||"").toLocaleLowerCase("es"))+'" data-garment="'+e(x.subcategory||"")+'" data-season="'+e(x.season||"")+'" data-office="'+(x.office===true?"yes":x.office===false?"no":"")+'"><span class="wardrobe-visual">'+(x.photoUrl?'<img src="'+e(x.photoUrl)+'" alt="">':'<span>◫</span>')+'</span><span class="wardrobe-card-body"><span class="wardrobe-card-top"><span>'+e(x.subcategory||"Prenda")+'</span>'+(x.office===true?'<b>Oficina</b>':'')+'</span><strong>'+e(x.name||"Prenda")+'</strong><small>'+e([x.color,x.size,x.season].filter(Boolean).join(" · ")||"Sin atributos")+'</small><span class="wardrobe-card-foot"><span>'+e(x.formality||"Formalidad sin indicar")+'</span><time>'+(x.lastUsed?"Último uso "+e(d(x.lastUsed)):"Sin uso fechado")+'</time></span></span></button>').join(""):empty("Armario vacío","Las prendas deben existir primero en el inventario."))+
    '</div>';
}

function looksView(payload) {
  if (pending(payload)) return pendingView();
  const rows=payload.looks||[], office=rows.filter(x=>x.office===true).length;
  return '<section class="objects-callout"><div><small>Armario inteligente</small><strong>Looks de oficina sin repetir</strong><p>Los looks solo referencian prendas existentes y conservan histórico de uso para evitar repeticiones recientes.</p></div><span>'+office+' oficina</span></section><div class="looks-grid">'+
    (rows.length?rows.map(x=>'<article class="look-card"><div class="look-visual">'+(x.photoUrl?'<img src="'+e(x.photoUrl)+'" alt="">':'<span>◇</span>')+'</div><div class="look-body"><span class="look-tags">'+(x.office===true?'<b>Oficina</b>':'')+(x.season?'<b>'+e(x.season)+'</b>':'')+(x.formality?'<b>'+e(x.formality)+'</b>':'')+'</span><strong>'+e(x.name||"Look")+'</strong><p>'+e((x.items||[]).map(i=>i.name).filter(Boolean).join(" · ")||"Sin prendas vinculadas")+'</p><small>'+e(x.context||"Contexto sin indicar")+' · '+(x.lastUsed?"último uso "+e(d(x.lastUsed)):"sin uso reciente")+'</small></div></article>').join(""):empty("Todavía no hay looks","El gestor podrá construirlos a partir del inventario real."))+
    '</div>';
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
  return '<div class="context-lists-grid">'+(rows.length?rows.map(x=>{const p=progress(x.items),missing=(x.items||[]).filter(i=>i.state==="FALTA_COMPRAR").length;return '<button class="context-list-card" type="button" data-list-open="'+e(x.id)+'"><span class="context-list-top"><span>'+e(x.context||"Contexto")+'</span><b>'+e(x.status||"ACTIVA")+'</b></span><strong>'+e(x.name||"Lista")+'</strong><small>'+e([x.destination,x.startDate?d(x.startDate):null,x.endDate?d(x.endDate):null].filter(Boolean).join(" · ")||"Sin fechas")+'</small><span class="context-list-progress"><i style="width:'+p.pct+'%"></i></span><span class="context-list-foot"><span>'+p.prepared+'/'+p.total+' preparados</span><span>'+(missing?missing+" por comprar":"sin compras pendientes")+'</span></span></button>';}).join(""):empty("No hay listas contextuales","Viajes y eventos podrán generarlas reutilizando objetos y kits."))+'</div>';
}

function detailObject(item,payload) {
  const body=document.querySelector("#dialog-body"), w=(payload.wardrobe||[]).find(x=>x.objectId===item.id);
  body.innerHTML='<button class="objects-back" data-objects-back type="button">← Volver a Objetos</button><section class="object-detail"><div class="object-detail-head"><div><span class="object-category">'+e(item.category||"Otros")+'</span><h3>'+e(item.name||"Objeto")+'</h3><p>'+e([item.brand,item.model,item.subcategory].filter(Boolean).join(" · ")||"Sin detalle")+'</p></div><span class="object-status">'+e(label(item.status))+'</span></div><div class="object-detail-grid">'+
    [['Ubicación',item.location||"Sin indicar"],['Cantidad',item.quantity??"—"],['Condición',item.condition||"Sin indicar"],['Compra',d(item.purchaseDate)],['Precio',m(item.purchasePrice,item.currency)],['Valor aprox.',m(item.estimatedValue,item.currency)],['Garantía',d(item.warrantyUntil)],['N.º serie',item.serialNumber||"—"]].map(([a,b])=>'<span><small>'+e(a)+'</small><strong>'+e(b)+'</strong></span>').join("")+
    '</div>'+(w?'<div class="object-wardrobe-detail"><strong>Armario</strong><span>'+e([w.color,w.size,w.season,w.formality].filter(Boolean).join(" · ")||"Sin atributos")+'</span><small>'+(w.lastUsed?"Último uso "+e(d(w.lastUsed)):"Sin uso fechado")+'</small></div>':'')+
    ((item.contexts||[]).length||(item.tags||[]).length?'<div class="object-chip-row">'+[...(item.contexts||[]),...(item.tags||[])].map(x=>'<span>'+e(x)+'</span>').join("")+'</div>':'')+
    (item.notes?'<div class="object-notes"><strong>Notas</strong><p>'+e(item.notes)+'</p></div>':'')+
    '<div class="object-detail-links">'+(item.receiptRef?'<span>Factura/recibo referenciado</span>':'')+(item.link?'<a href="'+e(item.link)+'" target="_blank" rel="noreferrer">Abrir enlace ↗</a>':'')+'</div></section>';
  body.querySelector("[data-objects-back]")?.addEventListener("click",()=>renderWorkspace(payload));
}

function detailList(list,payload) {
  const body=document.querySelector("#dialog-body");
  body.innerHTML='<button class="objects-back" data-objects-back type="button">← Volver a Objetos</button><section class="object-detail"><div class="object-detail-head"><div><span class="object-category">'+e(list.context||"Lista")+'</span><h3>'+e(list.name||"Lista")+'</h3><p>'+e([list.destination,list.startDate?d(list.startDate):null,list.endDate?d(list.endDate):null].filter(Boolean).join(" · ")||"Sin fechas")+'</p></div><span class="object-status">'+e(list.status||"ACTIVA")+'</span></div><div class="packing-list">'+
    ((list.items||[]).length?(list.items||[]).map(x=>'<article><span class="packing-importance">'+e(x.importance||"RECOMENDADO")+'</span><div><strong>'+e(x.name||"Necesidad")+'</strong><small>'+(x.objectId?"Objeto del inventario":x.state==="FALTA_COMPRAR"?"No disponible · comprar":"Necesidad contextual")+'</small></div><span class="packing-state">'+e(label(x.state))+'</span></article>').join(""):empty("Lista vacía"))+'</div></section>';
  body.querySelector("[data-objects-back]")?.addEventListener("click",()=>renderWorkspace(payload));
}

function bind(payload) {
  const body=document.querySelector("#dialog-body");
  body.querySelectorAll("[data-objects-tab]").forEach(b=>b.addEventListener("click",()=>{activeTab=b.dataset.objectsTab||"summary";renderWorkspace(payload);}));
  body.querySelectorAll("[data-object-open]").forEach(b=>b.addEventListener("click",()=>{const item=(payload.objects||[]).find(x=>String(x.id)===String(b.dataset.objectOpen));if(item)detailObject(item,payload);}));
  body.querySelectorAll("[data-list-open]").forEach(b=>b.addEventListener("click",()=>{const item=(payload.lists||[]).find(x=>String(x.id)===String(b.dataset.listOpen));if(item)detailList(item,payload);}));

  const filterObjects=()=>{const q=String(body.querySelector("#objects-search")?.value||"").trim().toLocaleLowerCase("es"),cat=body.querySelector("#objects-category")?.value||"",loc=body.querySelector("#objects-location")?.value||"",st=body.querySelector("#objects-status")?.value||"";let n=0;body.querySelectorAll(".object-card").forEach(c=>{const show=(!q||String(c.dataset.name||"").includes(q))&&(!cat||c.dataset.category===cat)&&(!loc||c.dataset.location===loc)&&(!st||c.dataset.status===st);c.hidden=!show;if(show)n++;});const out=body.querySelector("#objects-visible-count");if(out)out.textContent=n+(n===1?" objeto":" objetos");};
  ["#objects-search","#objects-category","#objects-location","#objects-status"].forEach(s=>{body.querySelector(s)?.addEventListener("input",filterObjects);body.querySelector(s)?.addEventListener("change",filterObjects);});

  const filterWardrobe=()=>{const q=String(body.querySelector("#wardrobe-search")?.value||"").trim().toLocaleLowerCase("es"),type=body.querySelector("#wardrobe-type")?.value||"",season=body.querySelector("#wardrobe-season")?.value||"",office=body.querySelector("#wardrobe-office")?.value||"";body.querySelectorAll(".wardrobe-card").forEach(c=>c.hidden=!((!q||String(c.dataset.name||"").includes(q))&&(!type||c.dataset.garment===type)&&(!season||c.dataset.season===season)&&(!office||c.dataset.office===office)));};
  ["#wardrobe-search","#wardrobe-type","#wardrobe-season","#wardrobe-office"].forEach(s=>{body.querySelector(s)?.addEventListener("input",filterWardrobe);body.querySelector(s)?.addEventListener("change",filterWardrobe);});
}

function renderWorkspace(payload) {
  const body=document.querySelector("#dialog-body");
  const views={summary:summaryView,inventory:inventoryView,wardrobe:wardrobeView,looks:looksView,kits:kitsView,lists:listsView};
  body.innerHTML='<div class="objects-shell"><header class="objects-hero"><div><small>Inventario personal compartido</small><strong>Lo que tengo, dónde está y para qué me sirve</strong><p>Una única fuente para armario, equipaje, oficina, deporte, hogar y futuros gestores.</p></div><span class="objects-source-state '+(pending(payload)?"pending":"ready")+'">'+(pending(payload)?"Fuente pendiente":"Fuente conectada")+'</span></header><nav class="objects-tabs">'+TABS.map(([id,name])=>'<button type="button" class="'+(activeTab===id?"active":"")+'" data-objects-tab="'+id+'">'+e(name)+'</button>').join("")+'</nav><div class="objects-tab-content">'+(views[activeTab]||summaryView)(payload)+'</div></div>';
  bind(payload);
}

export async function openObjectsDetail() {
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
    activeTab="summary";
    renderWorkspace(await response.json());
  } catch(error) {
    console.warn("Objects load failed",error);
    document.querySelector("#dialog-body").innerHTML='<div class="objects-empty"><strong>Objetos no disponible</strong><p>No se ha podido leer la capa privada. El resto del dashboard sigue operativo.</p><button id="objects-retry" type="button">Reintentar</button></div>';
    document.querySelector("#objects-retry")?.addEventListener("click",openObjectsDetail);
  }
}
