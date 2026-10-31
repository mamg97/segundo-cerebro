// Private wedding collaboration view. No embedded personal records.
export const WEDDING_TYPES=[
 ["all","Todo","✦"],["finca","Fincas","🏛"],["catering","Catering","🍽"],
 ["decoracion","Decoración e ideas","✿"],["fotografia","Foto y vídeo","📷"],
 ["musica","Música","♫"],["invitaciones","Invitaciones","✉"],
 ["vestuario","Vestuario","♧"],["invitados","Invitados","♙"],
 ["ideas","Otras ideas","✧"],["tareas","Tareas","✓"],["otros","Otros","⋯"]
];
const STATUSES=[["idea","Idea"],["pendiente","Pendiente"],["contactado","Contactado"],["presupuestado","Presupuesto recibido"],["reservado","Reservado"],["confirmado","Confirmado"],["hecho","Hecho"],["descartado","Descartado"]];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=x=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(x/100);
const typeName=x=>WEDDING_TYPES.find(z=>z[0]===x)?.[1]||"Otro";
const statusName=x=>STATUSES.find(z=>z[0]===x)?.[1]||x;
const state={items:[],filter:"all",search:"",editing:null,mode:false,busy:false,viewer:"",error:"",loaded:false,view:"kanban",draftStatus:"idea",sort:"recent",inspirationFilter:"all",inspirationSearch:"",ideaMode:false,quickFiles:[],quickBusy:false,quickError:""};
function active(){return document.querySelector("#detail-dialog")?.open&&window.location.hash==="#/pareja/boda";}
export function weddingEntryCard(){
 return '<a class="wed-entry" href="#/pareja/boda"><span aria-hidden="true">💍</span><span><strong>Boda</strong><small>Ideas, fincas, catering, fotos y presupuesto compartido</small></span><b aria-hidden="true">↗</b></a>';
}
async function getJson(path,method="GET",body=null){
 const response=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:body?{"Content-Type":"application/json","Accept":"application/json"}:{"Accept":"application/json"},body:body?JSON.stringify(body):undefined});
 const result=await response.json().catch(()=>({ok:false,code:"INVALID_RESPONSE"}));
 if(!response.ok||!result.ok){const e=new Error(result.code||"API_ERROR");e.status=response.status;throw e;}return result;
}
export function weddingTotals(items){
 const visible=items.filter(i=>i.status!=="descartado");
 return {total:visible.length,planned:visible.reduce((n,i)=>n+(i.contractedCents??i.estimateCents??0),0),
   committed:visible.reduce((n,i)=>n+(i.contractedCents??0),0),paid:visible.reduce((n,i)=>n+(i.paidCents||0),0),
   ideas:visible.filter(i=>i.status==="idea").length,confirmed:visible.filter(i=>["reservado","confirmado","hecho"].includes(i.status)).length};
}
function cards(){
 const search=state.search.toLocaleLowerCase("es");
 const list=state.items.filter(i=>(state.filter==="all"||i.category===state.filter)&&
   (!search||[i.title,i.description,i.provider,i.category].join(" ").toLocaleLowerCase("es").includes(search)));
 if(!list.length)return '<div class="wed-zero"><strong>Aún no hay elementos en esta vista</strong><p>Puedes añadir una idea, una finca o un presupuesto para empezar.</p></div>';
 return '<div class="wed-grid">'+list.map(i=>{
  const cost=i.contractedCents!=null?'<span>Contratado · '+eur(i.contractedCents)+'</span>':i.estimateCents!=null?'<span>Estimado · '+eur(i.estimateCents)+'</span>':'';
  const safeLink=i.url?'<a class="wed-provider-link" href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">Ver enlace ↗</a>':'';
  return '<article class="wed-item" data-wed-id="'+esc(i.id)+'">'+
    (i.photoUrl?'<img class="wed-photo" alt="Referencia visual de '+esc(i.title)+'" loading="lazy" src="'+esc(i.photoUrl)+'?v='+encodeURIComponent(i.updatedAt||Date.now())+'">':'')+
    '<div class="wed-item-content"><div class="wed-item-kicker"><span>'+esc(typeName(i.category))+'</span><span class="wed-status" data-status="'+esc(i.status)+'">'+esc(statusName(i.status))+'</span></div>'+
    '<h4>'+esc(i.title)+'</h4>'+(i.provider?'<p class="wed-provider">'+esc(i.provider)+'</p>':'')+
    (i.description?'<p class="wed-description">'+esc(i.description)+'</p>':'')+
    '<div class="wed-item-meta">'+cost+(i.paidCents?'<span>Pagado · '+eur(i.paidCents)+'</span>':'')+(i.dueDate?'<span>Fecha · '+esc(i.dueDate)+'</span>':'')+'</div>'+
    '<div class="wed-item-actions">'+safeLink+'<button type="button" data-wed-edit="'+esc(i.id)+'">Editar</button></div>'+
    '<small class="wed-author">Actualizado por '+esc(i.updatedBy||"Participante")+'</small></div></article>';
 }).join("")+'</div>';
}

// An inspiration wall backed by the existing private wedding entries, not a Pinterest scraper.
const INSPIRATION_CATEGORIES=["all","finca","catering","decoracion","fotografia","musica","invitaciones","vestuario","ideas","otros"];
export function isPinterestLink(link){
 if(!link)return false;
 try{
  const host=new URL(link).hostname.toLowerCase();
  return host==="pin.it"||host.endsWith(".pin.it")||host==="pinterest.com"||
   host.endsWith(".pinterest.com")||host==="pinterest.es"||host.endsWith(".pinterest.es");
 }catch{return false;}
}
export function inspirationItems(items,filter="all",search=""){
 const normalized=String(search||"").trim().toLocaleLowerCase("es");
 return items.filter(item=>{
  if(item.status==="descartado"||!INSPIRATION_CATEGORIES.includes(item.category))return false;
  if(!item.photoUrl&&!item.url&&item.status!=="idea")return false;
  if(filter!=="all"&&item.category!==filter)return false;
  if(normalized&&![item.title,item.description,item.provider,typeName(item.category)].join(" ").toLocaleLowerCase("es").includes(normalized))return false;
  return true;
 });
}
function viewTabs(){
 return '<nav class="wed-view-tabs" aria-label="Secciones de boda">'+
 '<button type="button" data-wed-view="kanban" aria-pressed="'+(state.view==="kanban")+'">☷ Kanban</button>'+
 '<button type="button" data-wed-view="inspiracion" aria-pressed="'+(state.view==="inspiracion")+'">✦ Inspiración</button>'+
 '<button type="button" data-wed-view="planificacion" aria-pressed="'+(state.view==="planificacion")+'">▤ Planificación y presupuesto</button>'+
 '</nav>';
}
function inspirationCard(item){
 const pinterest=isPinterestLink(item.url);
 const link=item.url?'<a class="wed-pin-source" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+
 (pinterest?'Ver en Pinterest ↗':'Ver referencia ↗')+'</a>':'';
 const cover=item.photoUrl?
   '<img class="wed-pin-photo" alt="Imagen de inspiración: '+esc(item.title)+'" loading="lazy" src="'+esc(item.photoUrl)+'?v='+encodeURIComponent(item.updatedAt||"1")+'">':
   '<div class="wed-pin-placeholder" aria-hidden="true"><span>✦</span></div>';
 return '<article class="wed-pin" data-wed-pin="'+esc(item.id)+'">'+cover+
  '<div class="wed-pin-details"><div class="wed-pin-category">'+esc(typeName(item.category))+'</div>'+
  '<h4>'+esc(item.title)+'</h4>'+
  (item.description?'<p>'+esc(item.description)+'</p>':'')+
  '<div class="wed-pin-actions">'+link+
  '<button type="button" data-wed-edit="'+esc(item.id)+'" aria-label="Editar idea '+esc(item.title)+'">Editar</button></div>'+
  '<small class="wed-pin-author">Guardado por '+esc(item.createdBy||"Participante")+'</small></div></article>';
}
function inspirationCards(){
 const items=inspirationItems(state.items,state.inspirationFilter,state.inspirationSearch);
 if(!items.length)return '<div class="wed-inspo-empty">'+
  '<div class="wed-inspo-empty-icon" aria-hidden="true">✧</div>'+
  '<h3>Aquí empieza vuestro tablero de inspiración</h3>'+
  '<p>Guardad decoración, rincones de fincas, flores, vestidos o ideas de Pinterest. El tablero será compartido entre las cuentas autorizadas.</p>'+
  '<button type="button" class="wed-primary" id="wed-first-pin">+ Guardar primera idea</button></div>';
 return '<div class="wed-masonry">'+items.map(inspirationCard).join("")+'</div>';
}
function inspirationHome(){
 const count=inspirationItems(state.items).length;
 return '<div class="wed-workspace wed-inspiration">'+viewTabs()+
 '<div class="wed-inspo-head"><div><h3>Inspiración</h3><small>'+count+' ideas guardadas · fotos y enlaces</small></div>'+
 '<button class="wed-primary" type="button" id="wed-add-pin">+ Guardar idea</button></div>'+
 '<div class="wed-inspo-guide"><strong>De Pinterest a vuestro tablero:</strong> Copiar enlace del pin → Guardar idea → Pegar el enlace. Podéis adjuntar una foto de referencia desde el móvil.</div>'+
 '<div class="wed-inspo-controls"><label>Buscar ideas<input type="search" id="wed-inspo-search" value="'+esc(state.inspirationSearch)+'" placeholder="Flores, finca, decoración…"></label>'+
 '</div>'+
 '<nav class="wed-inspo-filters" aria-label="Categorías de inspiración">'+INSPIRATION_CATEGORIES.map(category=>{
  const item=WEDDING_TYPES.find(x=>x[0]===category);
  return '<button type="button" data-wed-inspo-filter="'+category+'" aria-pressed="'+(state.inspirationFilter===category)+'">'+esc(item?.[1]||category)+'</button>';
 }).join("")+'</nav>'+
 '<div id="wed-inspo-results">'+inspirationCards()+'</div>'+
 '<p class="wed-inspo-footnote">Fotos privadas y enlaces a su origen; Pinterest no está sincronizado automáticamente.</p>'+
 '<button type="button" class="wed-floating-add" id="wed-floating-add">＋ Guardar fotos</button>'+
 '</div>';
}

// Existing private D1 data and optimistic revisions remain the single source of truth.
export function filteredWeddingItems(items,category="all",search=""){
 const term=String(search||"").trim().toLocaleLowerCase("es");
 return items.filter(item=>(category==="all"||item.category===category)&&
  (!term||[item.title,item.description,item.provider,typeName(item.category)].join(" ").toLocaleLowerCase("es").includes(term)));
}
function sortWeddingItems(items,order){
 const result=[...items];
 if(order==="budget")return result.sort((a,b)=>(b.contractedCents??b.estimateCents??-1)-(a.contractedCents??a.estimateCents??-1));
 if(order==="deadline")return result.sort((a,b)=>(a.dueDate||"9999").localeCompare(b.dueDate||"9999"));
 return result.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));
}
function kanbanCard(item){
 const amount=item.contractedCents!=null?eur(item.contractedCents):item.estimateCents!=null?eur(item.estimateCents):"";
 const url=item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer" class="wed-kanban-link" aria-label="Abrir enlace de '+esc(item.title)+'">↗ Enlace</a>':"";
 const picture=item.photoUrl?'<img loading="lazy" alt="" class="wed-kanban-thumb" src="'+esc(item.photoUrl)+'?v='+encodeURIComponent(item.updatedAt||"1")+'">':"";
 return '<article class="wed-kanban-card" draggable="true" data-wed-drag="'+esc(item.id)+'">'+
  '<div class="wed-kanban-card-main">'+picture+'<div class="wed-kanban-card-title"><small>'+esc(typeName(item.category))+'</small><strong>'+esc(item.title)+'</strong>'+
  (item.provider?'<span>'+esc(item.provider)+'</span>':"")+'</div></div>'+
  '<div class="wed-kanban-meta">'+(amount?'<span>'+amount+'</span>':"")+
  (item.dueDate?'<span>📅 '+esc(item.dueDate)+'</span>':"")+'</div>'+
  '<div class="wed-kanban-actions">'+url+'<button type="button" data-wed-edit="'+esc(item.id)+'">Editar</button>'+
  '<label class="wed-kanban-move">Mover a <select data-wed-move="'+esc(item.id)+'" aria-label="Mover '+esc(item.title)+' a otra columna">'+
   STATUSES.map(([key,name])=>'<option value="'+key+'" '+(item.status===key?"selected":"")+'>'+esc(name)+'</option>').join("")+
  '</select></label></div></article>';
}
function kanbanBoard(){
 const all=sortWeddingItems(filteredWeddingItems(state.items,state.filter,state.search),state.sort);
 return '<div class="wed-kanban" id="wed-kanban-board" aria-label="Tablero Kanban de Boda">'+STATUSES.map(([status,label])=>{
  const selected=all.filter(i=>i.status===status);
  return '<section class="wed-kanban-column" data-wed-column="'+status+'" aria-label="'+esc(label)+', '+selected.length+' elementos">'+
    '<header class="wed-kanban-column-head"><strong>'+esc(label)+'</strong><span>'+selected.length+'</span>'+
    '<button type="button" data-wed-add-status="'+status+'" aria-label="Añadir elemento a '+esc(label)+'">+</button></header>'+
    '<div class="wed-kanban-column-cards">'+(selected.length?selected.map(kanbanCard).join(""):
      '<div class="wed-kanban-empty">Arrastra una tarjeta aquí o pulsa +</div>')+'</div></section>';
 }).join("")+'</div>';
}
function kanbanHome(){
 const n=weddingTotals(state.items);
 return '<div class="wed-workspace wed-kanban-workspace">'+viewTabs()+
  '<div class="wed-toolbar"><div><h3>Organización de la boda</h3><small>'+n.total+' elementos activos · compartido entre participantes autorizados</small></div>'+
  '<button type="button" class="wed-primary" id="wed-new">+ Añadir tarjeta</button></div>'+
  '<div class="wed-controls"><label class="wed-search"><span>Buscar</span><input type="search" id="wed-search" value="'+esc(state.search)+'" placeholder="Proveedores, tareas, ideas…"></label>'+
  '<label class="wed-sort">Ordenar <select id="wed-sort"><option value="recent" '+(state.sort==="recent"?"selected":"")+'>Actualización</option>'+
  '<option value="deadline" '+(state.sort==="deadline"?"selected":"")+'>Fecha clave</option>'+
  '<option value="budget" '+(state.sort==="budget"?"selected":"")+'>Presupuesto</option></select></label></div>'+
  '<nav class="wed-filters" aria-label="Filtrar tarjetas por categoría">'+WEDDING_TYPES.map(([id,label,icon])=>
   '<button type="button" data-wed-filter="'+id+'" aria-pressed="'+(state.filter===id)+'">'+icon+' '+esc(label)+'</button>').join("")+'</nav>'+
  '<p class="wed-kanban-hint">Arrastra tarjetas entre columnas en ordenador o usa «Mover a» desde el móvil. Los cambios se guardan en el espacio compartido.</p>'+
  '<div id="wed-results">'+kanbanBoard()+'</div></div>';
}
function refreshBar(){
 return '<div class="wed-fixed-actions"><button type="button" id="wed-main-refresh" aria-label="Actualizar Boda" title="Actualizar Boda">'+
  '<span aria-hidden="true">↻</span><span>Actualizar</span></button></div>';
}
function home(){
 if(state.view==="inspiracion")return inspirationHome();
 if(state.view==="kanban")return kanbanHome();
 const n=weddingTotals(state.items);
 return '<div class="wed-workspace">'+viewTabs()+
   '<div class="wed-stats"><div><small>Elementos activos</small><strong>'+n.total+'</strong></div>'+
   '<div><small>Presupuesto planificado</small><strong>'+eur(n.planned)+'</strong></div>'+
   '<div><small>Contratado</small><strong>'+eur(n.committed)+'</strong></div>'+
   '<div><small>Pagado</small><strong>'+eur(n.paid)+'</strong></div></div>'+
   '<div class="wed-toolbar"><div><h3>Tablero de boda</h3><small>'+n.ideas+' ideas · '+n.confirmed+' reservados o confirmados</small></div>'+
   '<button type="button" class="wed-primary" id="wed-new">+ Añadir elemento</button></div>'+
   '<div class="wed-controls"><label class="wed-search"><span>Buscar</span><input id="wed-search" type="search" placeholder="Buscar fincas, ideas, proveedores…" value="'+esc(state.search)+'"></label>'+
   '</div>'+
   '<nav class="wed-filters" aria-label="Filtrar tipo de elemento">'+WEDDING_TYPES.map(([id,label,icon])=>'<button type="button" data-wed-filter="'+id+'" aria-pressed="'+(state.filter===id)+'">'+icon+' '+esc(label)+'</button>').join("")+'</nav>'+
   '<div id="wed-results">'+cards()+'</div>'+
   '<p class="wed-note">El presupuesto planificado usa el importe contratado cuando existe, o la estimación en su defecto. «Pagado» se muestra por separado, sin sumarlo dos veces.</p>'+
 '</div>';
}
function moneyInput(name,label,value){return '<label>'+label+' (€)<input type="number" min="0" max="10000000" step="0.01" name="'+name+'" value="'+(value==null?"":(value/100).toFixed(2))+'" placeholder="0,00"></label>';}
function editor(){
 if(state.ideaMode&&state.editing==="new")return quickEditor();
 const original=state.editing&&state.editing!=="new"?state.items.find(x=>x.id===state.editing):null;
 const inspirationMode=state.ideaMode&&!original;
 return '<div class="wed-editor-wrap"><button id="wed-back" class="wed-back" type="button">← Volver a '+(state.view==="inspiracion"?"Inspiración":state.view==="kanban"?"Kanban":"Planificación")+'</button>'+
  '<div class="wed-editor"><h3>'+(original?"Editar elemento":inspirationMode?"Guardar idea de inspiración":"Añadir a la boda")+'</h3>'+
  '<p>'+(inspirationMode?"Pega el enlace de Pinterest (si lo tienes), añade notas y adjunta una imagen de referencia.":"Podréis modificar estos datos desde cualquiera de vuestras sesiones autorizadas.")+'</p>'+
  '<form id="wed-form"><div class="wed-form-grid">'+
  '<label>Categoría<select name="category" required>'+WEDDING_TYPES.filter(x=>x[0]!=="all").map(x=>'<option value="'+x[0]+'" '+((original?.category||"ideas")===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("")+'</select></label>'+
  '<label>Estado<select name="status" required>'+STATUSES.map(x=>'<option value="'+x[0]+'" '+((original?.status||state.draftStatus||"idea")===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("")+'</select></label>'+
  '<label class="wide">Nombre o idea *<input type="text" name="title" maxlength="180" required value="'+esc(original?.title||"")+'" placeholder="Ej. Visitar finca…"></label>'+
  '<label class="wide">Descripción y notas<textarea name="description" rows="4" maxlength="4000" placeholder="Detalles, pros y contras, preguntas pendientes…">'+esc(original?.description||"")+'</textarea></label>'+
  '<label>Proveedor / contacto<input name="provider" maxlength="180" value="'+esc(original?.provider||"")+'" placeholder="Nombre del proveedor"></label>'+
  '<label>Enlace original (Pinterest o web) HTTPS<input name="url" type="url" maxlength="600" value="'+esc(original?.url||"")+'" placeholder="https://www.pinterest.com/pin/…"></label>'+
  moneyInput("estimateCents","Estimado",original?.estimateCents)+moneyInput("contractedCents","Contratado",original?.contractedCents)+
  moneyInput("paidCents","Pagado",original?.paidCents)+
  '<label>Fecha clave<input type="date" name="dueDate" value="'+esc(original?.dueDate||"")+'"></label>'+
  '<label class="wide">Fotografía de referencia (JPG/PNG/WebP)<input type="file" name="photo" id="wed-photo-input" accept="image/jpeg,image/png,image/webp"><small>Una imagen por idea. Solo subid fotos que podáis conservar o compartir de forma privada.</small></label>'+
  (original?.photoUrl?'<div class="wed-photo-existing wide"><img alt="Foto actual" src="'+esc(original.photoUrl)+'?v='+Date.now()+'"><button id="wed-photo-remove" type="button">Quitar foto</button></div>':'')+
  '</div><div class="wed-form-actions"><button class="wed-primary" id="wed-submit" type="submit">Guardar</button>'+
  (original?'<button class="wed-danger" id="wed-delete" type="button">Eliminar elemento</button>':'')+
  '<button type="button" id="wed-cancel">Cancelar</button></div></form></div></div>';
}
function show(){
 if(!active())return;
 const area=document.querySelector("#dialog-body");
 area.innerHTML=refreshBar()+(state.editing?editor():home());
 if(state.error){const notice=document.createElement("div");notice.className="wed-alert";notice.role="alert";notice.textContent=state.error;area.prepend(notice);}
 bind(area);
}
function errorMsg(e){
 if(e.status===409)return "Este elemento ha cambiado desde que lo abriste. He actualizado los datos para evitar sobrescribir los cambios de la otra persona.";
 const dict={ACCESS_REQUIRED:"Acceso denegado. Es necesario iniciar sesión con una cuenta autorizada por Cloudflare Access.",STORAGE_UNAVAILABLE:"La base de datos no está disponible.",
   INVALID_ORIGIN:"La sesión no permite guardar cambios.",INVALID_ITEM:"Revisa los campos obligatorios.",PAID_EXCEEDS_CONTRACTED:"Lo pagado no puede superar lo contratado.",INVALID_IMAGE:"El archivo no es una imagen admitida.",IMAGE_TOO_LARGE:"La fotografía es demasiado grande."};
 return dict[e.message]||"No se pudo completar la operación ("+e.message+").";
}
async function load(){
 const data=await getJson("/api/wedding/items");
 if(!active())return;
 state.items=data.items||[];state.viewer=data.viewer||"";state.loaded=true;state.error="";show();
}
async function mutate(action){
 if(state.busy)return;state.busy=true;
 try{await action();state.editing=null;await load();}
 catch(e){state.error=errorMsg(e);if(e.status===409){try{await load()}catch{}state.error=errorMsg(e);}show();}
 finally{state.busy=false;}
}
function cents(form,name){
 const raw=String(form.get(name)||"").trim();if(!raw)return null;
 const num=Number(raw);if(!Number.isFinite(num)||num<0)return NaN;
 return Math.round(num*100);
}
// Photo-based capture is independent from budget entry; one idea per uploaded photo.
export const QUICK_IMAGE_LIMIT=10;
export function quickTitle(title,index,total,stamp=""){
 const base=String(title||"").trim()||("Inspiración"+(stamp?" · "+stamp:""));
 return total>1?base+" · "+(index+1):base;
}
function clearQuickFiles(){
 for(const item of state.quickFiles)URL.revokeObjectURL(item.preview);
 state.quickFiles=[];state.quickError="";
}
function selectQuickFiles(files){
 const candidates=Array.from(files||[]);
 const accepted=candidates.filter(file=>file.type.startsWith("image/")||/\.(heic|heif)$/i.test(file.name));
 const available=Math.max(0,QUICK_IMAGE_LIMIT-state.quickFiles.length);
 for(const file of accepted.slice(0,available)){
  if(state.quickFiles.some(x=>x.file.name===file.name&&x.file.lastModified===file.lastModified&&x.file.size===file.size))continue;
  state.quickFiles.push({file,preview:URL.createObjectURL(file),createdId:null});
 }
 state.quickError=accepted.length>available?"Máximo 10 imágenes por tanda. Guarda estas y añade las demás después.":
 candidates.length!==accepted.length?"Se descartaron archivos que no eran imágenes.":"";
}
function quickPhotosMarkup(){
 return state.quickFiles.length?
  '<div class="wed-mobile-preview">'+state.quickFiles.map((item,i)=>
   '<div class="wed-mobile-thumb"><img src="'+esc(item.preview)+'" alt="Foto seleccionada '+(i+1)+'">'+
   '<button type="button" data-wed-photo-remove="'+i+'" aria-label="Quitar foto '+(i+1)+'">×</button></div>').join("")+
  '</div><small class="wed-mobile-counter">'+state.quickFiles.length+' de 10 · una idea por imagen</small>':
  '<p class="wed-mobile-empty">Selecciona capturas o fotos desde el móvil. También puedes guardar un enlace sin foto.</p>';
}
function quickEditor(){
 const options=WEDDING_TYPES.filter(x=>INSPIRATION_CATEGORIES.includes(x[0])&&x[0]!=="all").map(x=>
  '<option value="'+x[0]+'" '+((state.inspirationFilter==="all"?"ideas":state.inspirationFilter)===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("");
 return '<div class="wed-mobile-editor"><button type="button" id="wed-back" class="wed-back">← Inspiración</button>'+
  '<h3>Guardar inspiración</h3><p class="wed-mobile-intro">Añade varias capturas a la vez desde Fotos o haz una foto. Los detalles son opcionales.</p>'+
  '<form id="wed-mobile-form">'+
  '<section class="wed-mobile-upload"><strong>Fotos o capturas</strong>'+
  '<div class="wed-mobile-choices">'+
  '<label class="wed-mobile-gallery">▧ Elegir de galería<input id="wed-mobile-gallery-input" type="file" accept="image/*,.heic,.heif" multiple></label>'+
  '<label class="wed-mobile-camera">◎ Hacer foto<input id="wed-mobile-camera-input" type="file" accept="image/*" capture="environment"></label>'+
  '</div><div id="wed-mobile-preview-area">'+quickPhotosMarkup()+'</div>'+
  '<label class="wed-mobile-paste">Pegar captura desde el portapapeles<input id="wed-mobile-paste-input" type="text" placeholder="Toca aquí y pulsa Pegar"></label></section>'+
  '<section class="wed-mobile-fields">'+
  '<label>Categoría<select name="category">'+options+'</select></label>'+
  '<label>Título (opcional)<input name="title" maxlength="180" placeholder="Ej. Decoración floral"></label>'+
  '<label class="wide">Enlace de Pinterest (opcional)<input type="url" name="url" maxlength="600" inputmode="url" placeholder="https://pin.it/…"></label>'+
  '<label class="wide">Notas (opcional)<textarea name="description" maxlength="4000" rows="2" placeholder="Qué te gusta de esta idea…"></textarea></label>'+
  '</section><p id="wed-mobile-feedback" class="wed-mobile-feedback" role="status" aria-live="polite">'+esc(state.quickError)+'</p>'+
  '<div class="wed-mobile-actions"><button type="button" id="wed-mobile-cancel">Cancelar</button>'+
  '<button type="submit" id="wed-mobile-save" class="wed-primary">Guardar inspiración</button></div></form></div>';
}
function quickFeedback(message,error=false){
 const node=document.querySelector("#wed-mobile-feedback");
 if(node){node.textContent=message;node.classList.toggle("is-error",error);}
}
function quickRefreshPreview(){
 const box=document.querySelector("#wed-mobile-preview-area");
 if(box)box.innerHTML=quickPhotosMarkup();
 quickFeedback(state.quickError,!!state.quickError);
}
async function readImage(file){
 if(typeof createImageBitmap==="function"){
  try{const bmp=await createImageBitmap(file);return {source:bmp,width:bmp.width,height:bmp.height,close:()=>bmp.close()};}catch{}
 }
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((ok,fail)=>{image.onload=ok;image.onerror=()=>fail(new Error("IMAGE_UNSUPPORTED"));image.src=url;});
  return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{}};
 }finally{URL.revokeObjectURL(url);}
}
async function optimizedPhoto(file){
 if(!file)return null;
 if(!file.type?.startsWith("image/")&&!/\.(heic|heif)$/i.test(file.name))throw new Error("INVALID_IMAGE");
 const image=await readImage(file);
 try{
  const longest=Math.max(image.width,image.height);
  if(!longest)throw new Error("INVALID_IMAGE");
  for(let size=1500;size>=600;size-=150){
   const scale=Math.min(1,size/longest),canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("IMAGE_PROCESSING_FAILED");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image.source,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.68,.5,.38]){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    if(blob&&blob.size<=900000)return new File([blob],"inspiracion.jpg",{type:"image/jpeg"});
   }
  }
  throw new Error("IMAGE_TOO_LARGE");
 }finally{image.close();}
}
function quickItemPayload(fields,title){
 return {category:fields.get("category")||"ideas",status:"idea",title,
  description:String(fields.get("description")||"").trim(),url:String(fields.get("url")||"").trim(),
  provider:"",estimateCents:null,contractedCents:null,paidCents:0,dueDate:""};
}
async function saveMobilePhotos(event){
 event.preventDefault();
 if(state.quickBusy)return;
 const form=event.currentTarget,fields=new FormData(form),url=String(fields.get("url")||"").trim();
 if(!state.quickFiles.length&&!url){quickFeedback("Selecciona fotos o añade un enlace para guardar.",true);return;}
 if(!form.reportValidity())return;
 state.quickBusy=true;const btn=form.querySelector("#wed-mobile-save");if(btn)btn.disabled=true;
 const total=state.quickFiles.length,stamp=new Date().toLocaleDateString("es-ES");
 let completed=0;
 try{
  if(!total){
   await getJson("/api/wedding/items","POST",quickItemPayload(fields,quickTitle(fields.get("title"),0,1,stamp)));
  }else{
   while(state.quickFiles.length){
    const item=state.quickFiles[0],index=total-state.quickFiles.length;
    quickFeedback("Guardando foto "+(index+1)+" de "+total+"…");
    if(!item.createdId){
     const saved=await getJson("/api/wedding/items","POST",quickItemPayload(fields,quickTitle(fields.get("title"),index,total,stamp)));
     item.createdId=saved.item.id;
    }
    await sendPhoto(item.createdId,item.file);
    URL.revokeObjectURL(item.preview);state.quickFiles.shift();completed++;
   }
  }
  state.editing=null;state.ideaMode=false;state.quickError="";
  await load();
 }catch(error){
  state.quickError=(completed?completed+" fotos guardadas. ":"")+errorMsg(error)+
   (state.quickFiles.length?" Reintenta: solo se enviarán las pendientes.":"");
  quickFeedback(state.quickError,true);
 }finally{state.quickBusy=false;if(btn)btn.disabled=false;}
}
function bindMobileForm(root){
 root.querySelector("#wed-mobile-cancel")?.addEventListener("click",()=>{clearQuickFiles();state.editing=null;state.ideaMode=false;show();});
 for(const id of ["#wed-mobile-gallery-input","#wed-mobile-camera-input"]){
  root.querySelector(id)?.addEventListener("change",event=>{selectQuickFiles(event.target.files);event.target.value="";quickRefreshPreview();});
 }
 root.querySelector("#wed-mobile-preview-area")?.addEventListener("click",event=>{
  const remove=event.target.closest("[data-wed-photo-remove]");if(!remove||state.quickBusy)return;
  const picked=state.quickFiles.splice(Number(remove.dataset.wedPhotoRemove),1)[0];
  if(picked)URL.revokeObjectURL(picked.preview);quickRefreshPreview();
 });
 root.querySelector("#wed-mobile-paste-input")?.addEventListener("paste",event=>{
  const images=Array.from(event.clipboardData?.items||[]).filter(item=>item.type?.startsWith("image/")).map(item=>item.getAsFile()).filter(Boolean);
  if(images.length){event.preventDefault();selectQuickFiles(images);quickRefreshPreview();}
  else{
   const text=event.clipboardData?.getData("text/plain")?.trim();
   if(text&&text.startsWith("https://")){event.preventDefault();root.querySelector('input[name="url"]').value=text;quickFeedback("Enlace pegado.");}
  }
 });
 root.querySelector("#wed-mobile-form")?.addEventListener("submit",event=>void saveMobilePhotos(event));
}
async function sendPhoto(id,file){
 const optimized=await optimizedPhoto(file);if(!optimized)return;
 const fd=new FormData();fd.append("file",optimized);
 const r=await fetch("/api/wedding/items/"+encodeURIComponent(id)+"/photo",{method:"POST",credentials:"same-origin",body:fd});
 const body=await r.json().catch(()=>({}));if(!r.ok||!body.ok)throw new Error(body.code||"IMAGE_UPLOAD_FAILED");
}
function startIdea(){
 clearQuickFiles();state.view="inspiracion";state.ideaMode=true;state.editing="new";state.error="";show();
}
function bind(area){
 if(area.querySelector("#wed-mobile-form"))bindMobileForm(area);
 area.querySelectorAll("[data-wed-view]").forEach(button=>button.addEventListener("click",()=>{
  clearQuickFiles();state.view=button.dataset.wedView;state.editing=null;state.error="";show();
 }));
 area.querySelector("#wed-add-pin")?.addEventListener("click",startIdea);
 area.querySelector("#wed-floating-add")?.addEventListener("click",startIdea);
 area.querySelector("#wed-first-pin")?.addEventListener("click",startIdea);
 area.querySelector("#wed-main-refresh")?.addEventListener("click",()=>{if(state.busy||state.quickBusy)return;if(state.editing&&!window.confirm("¿Actualizar y descartar los cambios no guardados?"))return;state.error="";void load().catch(e=>{state.error=errorMsg(e);show();});});
 area.querySelectorAll("[data-wed-inspo-filter]").forEach(button=>button.addEventListener("click",()=>{
  state.inspirationFilter=button.dataset.wedInspoFilter;state.error="";show();
 }));
 area.querySelector("#wed-inspo-search")?.addEventListener("input",event=>{
  state.inspirationSearch=event.target.value;
  const target=area.querySelector("#wed-inspo-results");if(target){target.innerHTML=inspirationCards();bindCards(target);bindEmptyInspiration(target);}
 });
 area.querySelector("#wed-new")?.addEventListener("click",()=>{state.draftStatus="idea";state.editing="new";state.ideaMode=false;state.error="";show();});

 area.querySelector("#wed-back")?.addEventListener("click",()=>{clearQuickFiles();state.editing=null;state.ideaMode=false;state.error="";show();});
 area.querySelector("#wed-cancel")?.addEventListener("click",()=>{clearQuickFiles();state.editing=null;state.ideaMode=false;state.error="";show();});
 area.querySelector("#wed-sort")?.addEventListener("change",e=>{state.sort=e.target.value;const target=area.querySelector("#wed-results");if(target){target.innerHTML=kanbanBoard();bindCards(target);}});
 area.querySelector("#wed-search")?.addEventListener("input",e=>{state.search=e.target.value;const target=area.querySelector("#wed-results");if(target){target.innerHTML=state.view==="kanban"?kanbanBoard():cards();bindCards(target);}});
 area.querySelectorAll("[data-wed-filter]").forEach(btn=>btn.addEventListener("click",()=>{state.filter=btn.dataset.wedFilter;state.error="";show();}));
 bindCards(area);
 bindEmptyInspiration(area);
 area.querySelector("#wed-form")?.addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget,data=new FormData(form),original=state.items.find(i=>i.id===state.editing),photo=form.elements.photo?.files?.[0];
  const payload={category:data.get("category"),title:data.get("title"),description:data.get("description"),status:data.get("status"),provider:data.get("provider"),url:data.get("url"),dueDate:data.get("dueDate"),
   estimateCents:cents(data,"estimateCents"),contractedCents:cents(data,"contractedCents"),paidCents:cents(data,"paidCents")??0};
  if(["estimateCents","contractedCents","paidCents"].some(k=>Number.isNaN(payload[k]))){state.error="Importes no válidos.";show();return;}
  if(payload.contractedCents!==null&&payload.paidCents>payload.contractedCents){state.error="Lo pagado no puede superar lo contratado.";show();return;}
  void mutate(async()=>{const result=original?
    await getJson("/api/wedding/items/"+encodeURIComponent(original.id),"PATCH",{...payload,revision:original.revision}):
    await getJson("/api/wedding/items","POST",payload);
    if(photo)await sendPhoto(result.item.id,photo);
  });
 });
 area.querySelector("#wed-delete")?.addEventListener("click",()=>{
  const item=state.items.find(i=>i.id===state.editing);
  if(item&&window.confirm("¿Eliminar «"+item.title+"» y su fotografía?"))void mutate(()=>getJson("/api/wedding/items/"+encodeURIComponent(item.id),"DELETE",{revision:item.revision}));
 });
 area.querySelector("#wed-photo-remove")?.addEventListener("click",()=>{
  const item=state.items.find(i=>i.id===state.editing);
  if(item&&window.confirm("¿Quitar la fotografía de este elemento?"))
   void mutate(async()=>{const r=await fetch("/api/wedding/items/"+encodeURIComponent(item.id)+"/photo",{method:"DELETE",credentials:"same-origin"});if(!r.ok)throw new Error("PHOTO_DELETE_FAILED");});
 });
}
function bindEmptyInspiration(root){
 root.querySelector("#wed-first-pin")?.addEventListener("click",startIdea);
}
async function moveCard(id,status){
 if(state.busy||!STATUSES.some(entry=>entry[0]===status))return;
 const item=state.items.find(entry=>entry.id===id);
 if(!item||item.status===status)return;
 await mutate(()=>getJson("/api/wedding/items/"+encodeURIComponent(id),"PATCH",{
  category:item.category,status,title:item.title,description:item.description||"",
  provider:item.provider||"",url:item.url||"",dueDate:item.dueDate||"",
  estimateCents:item.estimateCents??null,contractedCents:item.contractedCents??null,
  paidCents:item.paidCents??0,revision:item.revision
 }));
}
function bindCards(root){
 root.querySelectorAll("[data-wed-add-status]").forEach(btn=>btn.addEventListener("click",()=>{state.draftStatus=btn.dataset.wedAddStatus;state.editing="new";state.ideaMode=false;state.error="";show();}));
 root.querySelectorAll("[data-wed-edit]").forEach(btn=>btn.addEventListener("click",()=>{state.editing=btn.dataset.wedEdit;state.ideaMode=false;state.error="";show();}));
 root.querySelectorAll("[data-wed-move]").forEach(select=>select.addEventListener("change",()=>void moveCard(select.dataset.wedMove,select.value)));
 root.querySelectorAll("[data-wed-drag]").forEach(card=>card.addEventListener("dragstart",event=>{
  if(state.busy){event.preventDefault();return;}
  event.dataTransfer.effectAllowed="move";
  event.dataTransfer.setData("text/plain",card.dataset.wedDrag);
 }));
 root.querySelectorAll("[data-wed-column]").forEach(column=>{
  column.addEventListener("dragover",event=>{if(state.busy)return;event.preventDefault();event.dataTransfer.dropEffect="move";});
  column.addEventListener("drop",event=>{
   event.preventDefault();column.classList.remove("wed-drop-target");
   void moveCard(event.dataTransfer.getData("text/plain"),column.dataset.wedColumn);
  });
  column.addEventListener("dragenter",event=>{if(event.dataTransfer.types.includes("text/plain"))column.classList.add("wed-drop-target");});
  column.addEventListener("dragleave",event=>{if(!column.contains(event.relatedTarget))column.classList.remove("wed-drop-target");});
 });
}
export function openWeddingDetail(remote){
 const dialog=document.querySelector("#detail-dialog"),body=document.querySelector("#dialog-body");if(!dialog||!body)return;
 document.querySelector("#dialog-context").textContent="Pareja · proyecto compartido";
 document.querySelector("#dialog-title").textContent="Boda";
 dialog.classList.add("wedding-dialog");
 clearQuickFiles();state.editing=null;state.error="";state.mode=remote;state.filter="all";state.search="";state.view="kanban";state.draftStatus="idea";state.sort="recent";state.inspirationFilter="all";state.inspirationSearch="";state.ideaMode=false;
 body.innerHTML='<div class="wed-loading">Cargando espacio de boda…</div>';
 if(!dialog.open)dialog.showModal();
 if(!remote){body.innerHTML='<div class="wed-locked"><h3>Boda</h3><p>Este apartado permite añadir ideas, presupuestos y fotos en la versión privada de Segundo Cerebro.</p></div>';return;}
 void load().catch(e=>{if(!active())return;body.innerHTML='<div class="wed-locked"><h3>No se pudo abrir Boda</h3><p>'+esc(errorMsg(e))+'</p><button type="button" id="wed-try">Reintentar</button></div>';body.querySelector("#wed-try")?.addEventListener("click",()=>void openWeddingDetail(remote));});
}
