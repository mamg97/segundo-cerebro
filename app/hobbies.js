import {HOBBY_CATEGORIES,hrefForArea,hrefForHobby} from "./area-routes.mjs?v=0.1.2";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SUPPORTED=new Set(["peliculas","series","libros","vinos"]);
const mediaFields=["titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios"];
const wineFields=["marca","tipo","denominacion","nota","precio","comentarios"];
const LIMIT=48;
const store={category:null,items:[],filter:"",search:"",page:1,editing:null,error:"",busy:false,loaded:false};
const byId=id=>HOBBY_CATEGORIES.find(c=>c.id===id);
const titleOf=(item,category)=>category==="vinos"?[item.marca,item.tipo].filter(Boolean).join(" · ")||"Vino sin marca":item.titulo||"Sin título";
function card(hobby){
 return '<a class="hby-card" href="'+hrefForHobby(hobby.id)+'" data-hby-category="'+esc(hobby.id)+'">'+
 '<span class="hby-card-symbol" aria-hidden="true">'+hobby.icon+'</span>'+
 '<span class="hby-card-content"><small>'+esc(hobby.subtitle)+'</small>'+
 '<strong>'+esc(hobby.title)+'</strong><span>'+esc(hobby.description)+'</span></span>'+
 '<span class="hby-card-arrow" aria-hidden="true">↗</span></a>';
}
function overview(){
 return '<section class="hby-page" aria-label="Explorar hobbies">'+
 '<div class="hby-hero"><div><span class="hby-eyebrow">TU ESPACIO PERSONAL</span>'+
 '<h3>Disfrutar también es parte del plan.</h3>'+
 '<p>Organiza lo que ves, lees, pruebas y recorres. Cada afición tendrá su histórico, favoritos y próximas ideas.</p></div>'+
 '<span class="hby-hero-mark" aria-hidden="true">✦</span></div>'+
 '<div class="hby-section-head"><h3>Explora tus aficiones</h3><span>'+HOBBY_CATEGORIES.length+' secciones iniciales</span></div>'+
 '<div class="hby-grid">'+HOBBY_CATEGORIES.map(card).join("")+'</div>'+
 '<p class="hby-hint">Películas, series, libros y vinos consultan sus fuentes oficiales de Google Sheets. Rutas en moto continuará como módulo independiente.</p>'+
 '</section>';
}
function categoryView(hobby){
 return '<section class="hby-page" data-hby-current="'+esc(hobby.id)+'">'+
 '<a class="hby-back" href="'+hrefForArea("area-hobbies")+'">← Todos los hobbies</a>'+
 '<div class="hby-category-hero"><span class="hby-category-icon" aria-hidden="true">'+hobby.icon+'</span>'+
 '<div><small>HOBBIES / '+esc(hobby.title.toLocaleUpperCase("es"))+'</small>'+
 '<h3>'+esc(hobby.title)+'</h3><p>'+esc(hobby.description)+'</p></div></div>'+
 (SUPPORTED.has(hobby.id)?'<div id="hby-dynamic"><div class="hby-loading">Cargando catálogo privado…</div></div>':
 '<div class="hby-section-head"><h3>Tu colección</h3><span>Por conectar</span></div>'+
 '<div class="hby-empty"><h4>Rutas en moto · Próximamente</h4><p>Este apartado tendrá sus rutas, itinerarios y mapas propios.</p></div>')+
 '</section>';
}
export function hobbiesMarkup(categoryId=null){
 if(!categoryId)return overview();
 const hobby=byId(categoryId);
 return hobby?categoryView(hobby):overview();
}
const active=()=>document.querySelector("#detail-dialog")?.open&&window.location.hash==="#/hobbies/"+store.category;
async function request(path,method="GET",payload){
 const response=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:payload?{"Content-Type":"application/json","Accept":"application/json"}:{"Accept":"application/json"},body:payload?JSON.stringify(payload):undefined});
 const data=await response.json().catch(()=>({code:"INVALID_RESPONSE"}));
 if(!response.ok||!data.ok){const error=new Error(data.code||"API_FAILED");error.status=response.status;throw error;}return data;
}
function message(e){
 if(e.status===409)return "La ficha ha cambiado desde que la abriste. Se actualizará el catálogo para evitar sobrescribir cambios.";
 return {ACCESS_REQUIRED:"La sesión privada ha caducado o esta cuenta no tiene acceso.",CANONICAL_SOURCE_MISSING:"No se encuentra el catálogo canónico.",
  DUPLICATE_CANONICAL_SOURCE:"Hay más de un Sheet candidato. Se ha bloqueado la lectura hasta resolverlo.",
  MIGRATION_NOT_ACTIVE:"La migración está en validación; todavía no se han activado las escrituras.",
  GOOGLE_NOT_CONFIGURED:"El servicio de Google Sheets no está configurado.",SHEET_SCHEMA_MISMATCH:"El esquema del catálogo no coincide con la versión esperada.",
  TITLE_REQUIRED:"Debes escribir un título o una marca.",INVALID_NUMBER:"La puntuación o el precio no son válidos.",SHEETS_WRITE_FAILED:"No se ha podido guardar en Google Sheets.",
  SHEETS_READ_FAILED:"No se ha podido leer el Google Sheet."}[e.message]||"No se pudo completar la operación ("+e.message+").";
}
function listed(){
 const q=store.search.trim().toLocaleLowerCase("es");
 return store.items.filter(item=> (!store.filter||item.estado===store.filter) &&
 (!q||[item.titulo,item.marca,item.tipo,item.subtipo,item.subtipo_2,item.denominacion,item.comentarios,item.estado].join(" ").toLocaleLowerCase("es").includes(q)));
}
function recordCard(item){
 const win=store.category==="vinos",score=win?item.nota:item.puntuacion;
 const title=titleOf(item,store.category);
 return '<article class="hby-record" data-hby-record="'+esc(item.id)+'">'+
 '<div class="hby-record-meta"><span>'+esc(win?(item.denominacion||"Vino"):(item.subtipo||"Catálogo"))+'</span>'+
 (item.estado?'<span class="hby-record-status">'+esc(item.estado)+'</span>':'')+'</div>'+
 '<h4>'+esc(title)+'</h4>'+
 (win&&item.precio!==""?'<p class="hby-record-price">'+Number(item.precio).toLocaleString("es-ES",{style:"currency",currency:"EUR"})+'</p>':'')+
 (score!==""&&score!=null?'<strong class="hby-score">'+esc(score)+'/10</strong>':'')+
 (item.comentarios?'<p class="hby-record-notes">'+esc(item.comentarios)+'</p>':'')+
 (item.incidencia_migracion?'<p class="hby-review">Pendiente de revisión: '+esc(item.incidencia_migracion)+'</p>':'')+
 '<div class="hby-record-actions"><small>'+esc(item.fecha_fin||item.fecha_inicio||"")+'</small>'+
 '<button type="button" data-hby-edit="'+esc(item.id)+'">Editar</button></div></article>';
}
function statusOptions(){
 const all=[...new Set(store.items.map(x=>x.estado).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
 return '<option value="">Todos los estados</option>'+all.map(s=>'<option value="'+esc(s)+'" '+(store.filter===s?"selected":"")+'>'+esc(s)+'</option>').join("");
}
function catalogMarkup(){
 const subset=listed(),shown=subset.slice(0,store.page*LIMIT);
 return '<div class="hby-catalog-head"><div><h3>Tu catálogo</h3><small>'+store.items.length+' registros · '+subset.length+' en esta vista</small></div>'+
 '<button type="button" class="hby-main-action" id="hby-add">+ Añadir</button></div>'+
 '<div class="hby-catalog-tools"><label>Buscar<input id="hby-search" type="search" value="'+esc(store.search)+'" placeholder="Título, autor, bodega, notas…"></label>'+
 (store.category==="vinos"?'':'<label>Estado<select id="hby-status">'+statusOptions()+'</select></label>')+
 '<button id="hby-reload" type="button">↻ Actualizar</button></div>'+
 (subset.length?'<div class="hby-record-grid">'+shown.map(recordCard).join("")+'</div>'+
 (shown.length<subset.length?'<button id="hby-more" class="hby-more" type="button">Ver más ('+(subset.length-shown.length)+' restantes)</button>':''):
 '<div class="hby-empty"><h4>No hay resultados</h4><p>Prueba con otros filtros o añade un registro.</p></div>')+
 '<p class="hby-source-note">Fuente oficial: Google Sheets · Se conservan las referencias al registro original y las incidencias de migración.</p>';
}
function inputField(name,label,value,type="text"){
 const max=name==="comentarios"?4000:300;
 if(name==="comentarios")return '<label class="hby-full">'+label+'<textarea name="'+name+'" rows="5" maxlength="'+max+'">'+esc(value||"")+'</textarea></label>';
 return '<label>'+label+'<input name="'+name+'" type="'+type+'" '+(type==="number"?'min="0" max="'+(name==="precio"?"100000":"10")+'" step="0.1"':'maxlength="'+max+'"')+' value="'+esc(value??"")+'"></label>';
}
function editor(){
 const item=store.editing==="new"?null:store.items.find(x=>x.id===store.editing),wine=store.category==="vinos";
 return '<button type="button" class="hby-back hby-back-button" id="hby-back">← Volver al catálogo</button>'+
 '<div class="hby-editor"><h3>'+(item?"Editar ficha":"Nuevo registro")+'</h3>'+
 (item&&item.sourceRow?'<p>Registro original en la fila '+esc(item.sourceRow)+'. Los campos históricos y las incidencias no se borrarán.</p>':'')+
 '<form id="hby-form"><div class="hby-editor-fields">'+
 (wine?inputField("marca","Marca / bodega *",item?.marca)+inputField("tipo","Tipo / vino",item?.tipo)+inputField("denominacion","Denominación",item?.denominacion)+inputField("nota","Puntuación (0–10)",item?.nota,"number")+inputField("precio","Precio (€)",item?.precio,"number"):
 inputField("titulo","Título *",item?.titulo)+inputField("subtipo","Género / subtipo",item?.subtipo)+
 inputField("subtipo_2","Subtipo adicional",item?.subtipo_2)+
 inputField("estado","Estado",item?.estado)+inputField("puntuacion","Puntuación (0–10)",item?.puntuacion,"number")+
 inputField("fecha_inicio","Fecha inicio",item?.fecha_inicio,"date")+inputField("fecha_fin","Fecha fin",item?.fecha_fin,"date"))+
 inputField("comentarios","Notas y comentarios",item?.comentarios)+
 '</div><div class="hby-editor-actions"><button class="hby-main-action" type="submit">Guardar en Sheets</button>'+
 (item?'<button class="hby-danger" type="button" id="hby-archive">Archivar</button>':'')+
 '<button type="button" id="hby-cancel">Cancelar</button></div></form></div>';
}
function show(){
 if(!active())return;
 const place=document.querySelector("#hby-dynamic");if(!place)return;
 place.innerHTML=(store.error?'<div class="hby-error" role="alert">'+esc(store.error)+'</div>':'')+(store.editing?editor():catalogMarkup());
 bind(place);
}
async function load(){
 const data=await request("/api/hobbies/"+store.category);
 if(!active())return;
 store.items=data.items||[];store.error="";store.loaded=true;show();
}
function reload(){
 return load().catch(e=>{store.error=message(e);if(!active())return;
 document.querySelector("#hby-dynamic").innerHTML='<div class="hby-error" role="alert">'+esc(store.error)+'</div>'+
 '<button id="hby-retry" type="button">Reintentar</button>';
 document.querySelector("#hby-retry")?.addEventListener("click",()=>void reload());});
}
async function change(action){
 if(store.busy)return;store.busy=true;
 try{await action();store.editing=null;store.page=1;await load();}
 catch(e){store.error=message(e);if(e.status===409){store.editing=null;try{await load()}catch{}store.error=message(e);}show();}
 finally{store.busy=false;}
}
function bind(root){
 root.querySelector("#hby-add")?.addEventListener("click",()=>{store.editing="new";store.error="";show();});
 root.querySelector("#hby-reload")?.addEventListener("click",()=>void reload());
 root.querySelector("#hby-search")?.addEventListener("input",e=>{store.search=e.target.value;store.page=1;const position=e.target.selectionStart;show();const next=document.querySelector("#hby-search");next?.focus();if(next&&position!=null)next.setSelectionRange(position,position);});
 root.querySelector("#hby-status")?.addEventListener("change",e=>{store.filter=e.target.value;store.page=1;show();});
 root.querySelector("#hby-more")?.addEventListener("click",()=>{store.page++;show();});
 root.querySelectorAll("[data-hby-edit]").forEach(b=>b.addEventListener("click",()=>{store.editing=b.dataset.hbyEdit;store.error="";show();}));
 root.querySelector("#hby-back")?.addEventListener("click",()=>{store.editing=null;store.error="";show();});
 root.querySelector("#hby-cancel")?.addEventListener("click",()=>{store.editing=null;store.error="";show();});
 root.querySelector("#hby-form")?.addEventListener("submit",event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget),item=store.items.find(x=>x.id===store.editing),names=store.category==="vinos"?wineFields:mediaFields;
  const body={};
  for(const key of names){let value=data.get(key)||"";if(["nota","precio","puntuacion"].includes(key))value=value===""?"":Number(value);body[key]=value;}
  if(!(body.titulo||body.marca)){store.error="Falta el título o la marca.";show();return;}
  void change(()=>request("/api/hobbies/"+store.category+(item?"/"+encodeURIComponent(item.id):""),item?"PATCH":"POST",{...body,...(item?{revision:item.revision}:{})}));
 });
 root.querySelector("#hby-archive")?.addEventListener("click",()=>{
  const item=store.items.find(x=>x.id===store.editing);
  if(item&&window.confirm("¿Archivar este registro? Se conservará en el Google Sheet."))
   void change(()=>request("/api/hobbies/"+store.category+"/"+encodeURIComponent(item.id),"DELETE",{revision:item.revision}));
 });
}
export function openHobbiesDetail(categoryId=null){
 const dialog=document.querySelector("#detail-dialog"),content=document.querySelector("#dialog-body");
 if(!dialog||!content)return;
 dialog.classList.add("hobbies-dialog");
 const hobby=byId(categoryId);
 document.querySelector("#dialog-context").textContent="Hobbies · colección personal";
 document.querySelector("#dialog-title").textContent=hobby?hobby.title:"Hobbies";
 content.innerHTML=hobbiesMarkup(categoryId);content.scrollTop=0;
 if(!dialog.open)dialog.showModal();
 if(!categoryId||!SUPPORTED.has(categoryId))return;
 if(globalThis.__SECOND_BRAIN_REMOTE__!==true){
  const block=content.querySelector("#hby-dynamic");
  if(block)block.innerHTML='<div class="hby-empty"><h4>Catálogos privados</h4><p>Los registros se consultan exclusivamente desde la versión privada de Segundo Cerebro.</p></div>';
  return;
 }
 store.category=categoryId;store.editing=null;store.items=[];store.filter="";store.search="";store.page=1;store.loaded=false;store.error="";
 void reload();
}
