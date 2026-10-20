import {HOBBY_CATEGORIES,hrefForArea,hrefForHobby} from "./area-routes.mjs?v=0.1.2";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SUPPORTED=new Set(["peliculas","series","libros","vinos"]);
const mediaFields=["titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios"];
const wineFields=["marca","tipo","denominacion","nota","precio","comentarios","tienda","tienda_url","imagen_url"];
const LIMIT=48;
const store={category:null,items:[],filter:"",search:"",page:1,editing:null,error:"",busy:false,loaded:false};
const byId=id=>HOBBY_CATEGORIES.find(c=>c.id===id);
const titleOf=(item,category)=>category==="vinos"?[item.marca,item.tipo].filter(Boolean).join(" · ")||"Vino sin marca":item.titulo||"Sin título";
// Single tabbed workspace. The top-level route defaults to Películas.
const DEFAULT_CATEGORY="peliculas";
const TABS=["peliculas","series","libros","vinos","rutas-moto"];
function tabs(selected){
 return '<nav class="hby-tabs" aria-label="Colecciones de hobbies">'+
  TABS.map(id=>{
   const hobby=byId(id),current=id===selected;
   return '<a class="hby-tab'+(current?' is-active':'')+'" href="'+hrefForHobby(id)+'"'+
    (current?' aria-current="page"':'')+'><span aria-hidden="true">'+hobby.icon+'</span> '+esc(hobby.title)+'</a>';
  }).join("")+'</nav>';
}
export function hobbiesMarkup(categoryId=null){
 const selected=byId(categoryId)?categoryId:DEFAULT_CATEGORY;
 return '<section class="hby-page" data-hby-current="'+esc(selected)+'">'+tabs(selected)+
 (SUPPORTED.has(selected)?'<div id="hby-dynamic"><div class="hby-loading">Cargando catálogo privado…</div></div>':
 '<div class="hby-empty"><h4>Rutas en moto</h4><p>Este apartado tendrá sus rutas, itinerarios y mapas propios.</p></div>')+
 '</section>';
}
const active=()=>document.querySelector("#detail-dialog")?.open&&
 (window.location.hash==="#/hobbies/"+store.category||
  (window.location.hash==="#/hobbies"&&store.category===DEFAULT_CATEGORY));
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
  INVALID_STORE_URL:"La tienda debe ser Amazon.es o El Corte Inglés (HTTPS).",INVALID_IMAGE_URL:"La imagen debe utilizar una URL HTTPS válida.",INVALID_RETAILER:"La tienda elegida no corresponde al enlace.",FIELD_TOO_LONG:"Un campo es demasiado largo.",
  SHEETS_READ_FAILED:"No se ha podido leer el Google Sheet."}[e.message]||"No se pudo completar la operación ("+e.message+").";
}
function listed(){
 const q=store.search.trim().toLocaleLowerCase("es");
 return store.items.filter(item=> (!store.filter||item.estado===store.filter) &&
 (!q||[item.titulo,item.marca,item.tipo,item.subtipo,item.subtipo_2,item.denominacion,item.comentarios,item.estado,item.tienda].join(" ").toLocaleLowerCase("es").includes(q)));
}

function wineUrl(raw,retailer=false){
 try{
  if(!raw)return "";
  const url=new URL(String(raw)),host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||url.port||!host.includes(".")||
     /^(localhost|127\.|10\.|192\.168\.|172\.|169\.254\.)/i.test(host))return "";
  if(retailer&&!(/(^|\.)amazon\.es$/.test(host)||/(^|\.)elcorteingles\.es$/.test(host)))return "";
  return url.href;
 }catch{return "";}
}
export function wineThumbnailMarkup(item){
 const src=wineUrl(item.imagen_url),title=titleOf(item,"vinos");
 return '<td class="hby-list-photo" data-label="Foto">'+(src?
 '<button type="button" class="hby-photo-button" data-hby-photo="'+esc(item.id)+'" aria-label="Ampliar fotografía de '+esc(title)+'" title="Ver botella en grande"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+esc(src)+'" alt="Botella de '+esc(title)+'"></button>':
 '<span class="hby-photo-placeholder" title="Fotografía pendiente" aria-label="Fotografía pendiente">🍷</span>')+'</td>';
}
export function wineShopMarkup(item){
 const url=wineUrl(item.tienda_url,true),host=url?new URL(url).hostname:"";
 const retailer=/(^|\.)amazon\.es$/.test(host)?"Amazon":/(^|\.)elcorteingles\.es$/.test(host)?"El Corte Inglés":"";
 const search='https://www.amazon.es/s?k='+encodeURIComponent([item.marca,item.tipo,item.denominacion,"vino"].filter(Boolean).join(" "));
 return '<td class="hby-list-shop" data-label="Tienda">'+(retailer?
 '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer" aria-label="Ver '+esc(titleOf(item,"vinos"))+' en '+esc(retailer)+'">'+esc(retailer)+' ↗</a>':
 '<a class="hby-shop-search" href="'+esc(search)+'" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer" aria-label="Buscar '+esc(titleOf(item,"vinos"))+' en Amazon; producto sin verificar">Buscar en Amazon ↗</a>')+'</td>';
}
function recordRow(item){
 const wine=store.category==="vinos",score=wine?item.nota:item.puntuacion;
 const genre=wine?(item.denominacion||item.tipo||"—"):(item.subtipo||item.subtipo_2||"—");
 const metric=wine?item.precio:score;
 const metricText=metric!==""&&metric!=null&&Number.isFinite(Number(metric))
   ?(wine?Number(metric).toLocaleString("es-ES",{style:"currency",currency:"EUR"}):esc(metric)+"/10"):"—";
 const title=titleOf(item,store.category);
 const issue=item.incidencia_migracion?'<small class="hby-review">Revisar: '+esc(item.incidencia_migracion)+'</small>':'';
 const notes=item.comentarios?'<small class="hby-row-note" title="'+esc(item.comentarios)+'">'+esc(item.comentarios)+'</small>':'';
 return '<tr data-hby-record="'+esc(item.id)+'">'+
  (wine?wineThumbnailMarkup(item):"")+
  '<td class="hby-list-title" data-label="Título"><strong>'+esc(title)+'</strong>'+notes+issue+'</td>'+
  '<td class="hby-list-type" data-label="'+(wine?'Denominación':'Género')+'">'+esc(genre)+'</td>'+
  (wine?'<td class="hby-list-status" data-label="Tipo">'+esc(item.tipo||"—")+'</td>':
        '<td class="hby-list-status" data-label="Estado"><span class="hby-record-status">'+esc(item.estado||"—")+'</span></td>')+
  '<td class="hby-list-score" data-label="'+(wine?'Precio':'Nota')+'">'+metricText+'</td>'+
  (wine?wineShopMarkup(item):"")+
  '<td class="hby-list-actions"><button type="button" data-hby-edit="'+esc(item.id)+'" aria-label="Editar '+esc(title)+'">Editar</button></td>'+
 '</tr>';
}
function statusOptions(){
 const all=[...new Set(store.items.map(x=>x.estado).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
 return '<option value="">Todos los estados</option>'+all.map(s=>'<option value="'+esc(s)+'" '+(store.filter===s?"selected":"")+'>'+esc(s)+'</option>').join("");
}

function catalogMarkup(){
 const subset=listed(),shown=subset.slice(0,store.page*LIMIT),wine=store.category==="vinos";
 return '<div class="hby-catalog-head"><div><h3>Tu '+(wine?'bodega':'catálogo')+'</h3>'+
  '<small>'+store.items.length+' registros · '+subset.length+' en esta vista</small></div>'+
  '<button type="button" class="hby-main-action" id="hby-add">+ Añadir</button></div>'+
 '<div class="hby-catalog-tools"><label>Buscar<input id="hby-search" type="search" value="'+esc(store.search)+'" placeholder="Buscar por título, género o notas…"></label>'+
 (wine?'':'<label>Estado<select id="hby-status">'+statusOptions()+'</select></label>')+
 '<button id="hby-reload" type="button">↻ Actualizar</button></div>'+
 (subset.length?'<div class="hby-list-wrap"><table class="hby-list-table'+(wine?' hby-list-table--wine':'')+'"><thead><tr>'+
 (wine?'<th scope="col">Foto</th>':'')+
 '<th scope="col">Título</th><th scope="col">'+(wine?'Denominación':'Género')+'</th>'+
 '<th scope="col">'+(wine?'Tipo':'Estado')+'</th><th scope="col">'+(wine?'Precio':'Nota')+'</th>'+
 (wine?'<th scope="col">Tienda</th>':'')+
 '<th scope="col">Acciones</th></tr></thead><tbody>'+shown.map(recordRow).join("")+'</tbody></table></div>'+
 (shown.length<subset.length?'<button id="hby-more" class="hby-more" type="button">Ver más ('+(subset.length-shown.length)+' restantes)</button>':''):
 '<div class="hby-empty"><h4>No hay resultados</h4><p>Prueba con otros filtros o añade un registro.</p></div>')+
 '<p class="hby-source-note">Fuente oficial: Google Sheets · Se conservan las referencias al registro original y las incidencias de migración.</p>';
}
function inputField(name,label,value,type="text"){
 const max=name==="comentarios"?4000:name.endsWith("_url")?1800:300;
 if(name==="comentarios")return '<label class="hby-full">'+label+'<textarea name="'+name+'" rows="5" maxlength="'+max+'">'+esc(value||"")+'</textarea></label>';
 return '<label>'+label+'<input name="'+name+'" type="'+type+'" '+(type==="number"?'min="0" max="'+(name==="precio"?"100000":"10")+'" step="0.1"':'maxlength="'+max+'"')+' value="'+esc(value??"")+'"></label>';
}
function shopEditor(item){
 return '<label>Tienda<select name="tienda"><option value="">Sin enlace</option>'+
 ['El Corte Inglés','Amazon'].map(name=>'<option value="'+esc(name)+'"'+(item?.tienda===name?' selected':'')+'>'+esc(name)+'</option>').join('')+
 '</select></label>'+
 inputField("tienda_url","Enlace directo (Amazon / El Corte Inglés)",item?.tienda_url,"url")+
 inputField("imagen_url","URL HTTPS de imagen de la botella",item?.imagen_url,"url")+
 '<p class="hby-field-hint hby-full">La fotografía aparecerá en miniatura y se podrá ampliar. Usa una referencia exacta de la botella.</p>';
}
function editor(){
 const item=store.editing==="new"?null:store.items.find(x=>x.id===store.editing),wine=store.category==="vinos";
 return '<button type="button" class="hby-back hby-back-button" id="hby-back">← Volver al catálogo</button>'+
 '<div class="hby-editor"><h3>'+(item?"Editar ficha":"Nuevo registro")+'</h3>'+
 (item&&item.sourceRow?'<p>Registro original en la fila '+esc(item.sourceRow)+'. Los campos históricos y las incidencias no se borrarán.</p>':'')+
 '<form id="hby-form"><div class="hby-editor-fields">'+
 (wine?inputField("marca","Marca / bodega *",item?.marca)+inputField("tipo","Tipo / vino",item?.tipo)+inputField("denominacion","Denominación",item?.denominacion)+inputField("nota","Puntuación (0–10)",item?.nota,"number")+inputField("precio","Precio (€)",item?.precio,"number")+shopEditor(item):
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
 const category=store.category;
 const data=await request("/api/hobbies/"+category);
 if(!active()||store.category!==category)return;
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
function openWinePhoto(item){
 const src=wineUrl(item?.imagen_url);
 if(!src)return;
 document.querySelector("#hby-lightbox")?.close();
 document.querySelector("#hby-lightbox")?.remove();
 const dialog=document.createElement("dialog");
 dialog.id="hby-lightbox";dialog.className="hby-lightbox";
 const name=titleOf(item,"vinos");
 dialog.innerHTML='<div class="hby-lightbox-inner"><button type="button" data-hby-close aria-label="Cerrar fotografía">✕</button>'+
 '<img src="'+esc(src)+'" referrerpolicy="no-referrer" alt="Botella de '+esc(name)+'">'+
 '<p>'+esc(name)+'</p></div>';
 document.body.append(dialog);
 dialog.querySelector("[data-hby-close]")?.addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener("close",()=>dialog.remove(),{once:true});
 dialog.showModal();
}
function bind(root){
 root.querySelector("#hby-add")?.addEventListener("click",()=>{store.editing="new";store.error="";show();});
 root.querySelector("#hby-reload")?.addEventListener("click",()=>void reload());
 root.querySelector("#hby-search")?.addEventListener("input",e=>{store.search=e.target.value;store.page=1;const position=e.target.selectionStart;show();const next=document.querySelector("#hby-search");next?.focus();if(next&&position!=null)next.setSelectionRange(position,position);});
 root.querySelector("#hby-status")?.addEventListener("change",e=>{store.filter=e.target.value;store.page=1;show();});
 root.querySelector("#hby-more")?.addEventListener("click",()=>{store.page++;show();});
 root.querySelectorAll("[data-hby-photo]").forEach(button=>button.addEventListener("click",()=>{
  const item=store.items.find(x=>x.id===button.dataset.hbyPhoto);if(item)openWinePhoto(item);
 }));
 root.querySelectorAll(".hby-photo-button img").forEach(img=>img.addEventListener("error",()=>{
  const button=img.closest(".hby-photo-button");
  if(button)button.outerHTML='<span class="hby-photo-placeholder" title="Imagen no disponible" aria-label="Imagen no disponible">🍷</span>';
 },{once:true}));
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
 document.querySelector("#hby-lightbox")?.close();
 const dialog=document.querySelector("#detail-dialog"),content=document.querySelector("#dialog-body");
 if(!dialog||!content)return;
 const selected=byId(categoryId)?categoryId:DEFAULT_CATEGORY;
 dialog.classList.add("hobbies-dialog");
 document.querySelector("#dialog-context").textContent="Hobbies · colección personal";
 document.querySelector("#dialog-title").textContent="Hobbies";
 content.innerHTML=hobbiesMarkup(selected);content.scrollTop=0;
 if(!dialog.open)dialog.showModal();
 if(!SUPPORTED.has(selected))return;
 if(globalThis.__SECOND_BRAIN_REMOTE__!==true){
  const block=content.querySelector("#hby-dynamic");
  if(block)block.innerHTML='<div class="hby-empty"><h4>Catálogos privados</h4><p>Los registros se consultan exclusivamente desde la versión privada de Segundo Cerebro.</p></div>';
  return;
 }
 store.category=selected;store.editing=null;store.items=[];store.filter="";store.search="";store.page=1;store.loaded=false;store.error="";
 void reload();
}
