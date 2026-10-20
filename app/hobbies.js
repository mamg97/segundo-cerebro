import {HOBBY_CATEGORIES,hrefForArea,hrefForHobby} from "./area-routes.mjs?v=0.1.2";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SUPPORTED=new Set(["peliculas","series","libros","vinos"]);
const mediaFields=["titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios"];
const wineFields=["marca","tipo","denominacion","nota","precio","comentarios","tienda","tienda_url","imagen_url"];
const LIMIT=48;
const store={category:null,items:[],filter:"",search:"",page:1,sortKey:"",sortDir:"asc",editing:null,error:"",busy:false,loaded:false};
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

const HOBBY_SORT_KEYS=Object.freeze(["foto","titulo","genero","estado","nota","enlace"]);
const HOBBY_SORT_COLLATOR=new Intl.Collator("es",{numeric:true,sensitivity:"base"});
function sortValue(item,category,key){
 const wine=category==="vinos";
 switch(key){
  case "foto": return wine?(item.imagen_url?"Con foto":"Sin foto"):null;
  case "titulo": return titleOf(item,category);
  case "genero": return wine?(item.denominacion||item.tipo):(item.subtipo||item.subtipo_2);
  case "estado": return wine?item.tipo:item.estado;
  case "nota": {
   const raw=wine?item.precio:item.puntuacion;
   if(raw===null||raw===undefined||String(raw).trim()==="")return null;
   const number=Number(String(raw).replace(",","."));
   return Number.isFinite(number)?number:null;
  }
  // For FilmAffinity/Amazon searches the linked destination is derived from the title.
  // For bottles, this is the name of the linked retailer (or the Amazon search fallback).
  case "enlace": return wine?(item.tienda||"Amazon (búsqueda)"):item.titulo;
  default: return null;
 }
}
export function sortHobbyRecords(items,category,key,direction="asc"){
 if(!HOBBY_SORT_KEYS.includes(key))return [...items];
 const sign=direction==="desc"?-1:1;
 return items.map((item,index)=>({item,index,value:sortValue(item,category,key)})).sort((a,b)=>{
  const missingA=a.value===null||a.value===undefined||a.value==="";
  const missingB=b.value===null||b.value===undefined||b.value==="";
  if(missingA!==missingB)return missingA?1:-1; // Unrated/unknown items stay last both ways.
  if(missingA)return a.index-b.index;
  const comparison=typeof a.value==="number"&&typeof b.value==="number"
   ?a.value-b.value:HOBBY_SORT_COLLATOR.compare(String(a.value),String(b.value));
  return sign*Math.sign(comparison)||a.index-b.index;
 }).map(entry=>entry.item);
}
function sortHeader(label,key){
 const selected=store.sortKey===key;
 const direction=selected?store.sortDir:"asc";
 const indicator=selected?(direction==="asc"?"▲":"▼"):"↕";
 const nextDirection=selected&&direction==="asc"?"desc":"asc";
 return '<th scope="col" aria-sort="'+(selected?(direction==="asc"?"ascending":"descending"):"none")+'">'+
  '<button type="button" class="hby-sort-button'+(selected?' is-active':'')+'" data-hby-sort="'+key+
  '" title="Ordenar por '+esc(label)+'" aria-label="Ordenar '+esc(label)+' '+(nextDirection==="asc"?"ascendente":"descendente")+'">'+
  '<span>'+esc(label)+'</span><span class="hby-sort-indicator" aria-hidden="true">'+indicator+'</span></button></th>';
}
function mobileSortMarkup(wine){
 const options=[["","Orden original"],...(wine?[["foto","Foto"]]:[]),["titulo","Título"],["genero",wine?"Denominación":"Género"],["estado",wine?"Tipo":"Estado"],["nota",wine?"Precio":"Nota"],["enlace",wine?"Tienda":"Buscar en"]];
 return '<div class="hby-mobile-sort-tools"><label for="hby-mobile-sort">Ordenar</label><select id="hby-mobile-sort">'+
  options.map(([key,label])=>'<option value="'+key+'"'+(store.sortKey===key?' selected':'')+'>'+esc(label)+'</option>').join("")+
  '</select><button id="hby-mobile-direction" type="button"'+(!store.sortKey?' disabled':'')+
  ' title="Invertir orden" aria-label="Invertir orden">'+(store.sortDir==="asc"?"↑":"↓")+'</button></div>';
}
function setSort(key,flip=false){
 if(!HOBBY_SORT_KEYS.includes(key)){store.sortKey="";store.sortDir="asc";}
 else{store.sortDir=flip&&store.sortKey===key&&store.sortDir==="asc"?"desc":"asc";store.sortKey=key;}
 store.page=1;show();
}
function listed(){
 const q=store.search.trim().toLocaleLowerCase("es");
 const filtered=store.items.filter(item=> (!store.filter||item.estado===store.filter) &&
 (!q||[item.titulo,item.marca,item.tipo,item.subtipo,item.subtipo_2,item.denominacion,item.comentarios,item.estado,item.tienda].join(" ").toLocaleLowerCase("es").includes(q)));
 return sortHobbyRecords(filtered,store.category,store.sortKey,store.sortDir);
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
// Search links deliberately open result pages, never pretend to be verified work/edition IDs.
// Purely derived from the private canonical title: no row mutations, scraping or paid APIs.
export function externalCatalogLink(item,category){
 if(!["peliculas","series","libros"].includes(category))return "";
 const raw=String(item?.titulo??"").trim();
 const query=raw.replace(/\s*\(\d{4}\)\s*$/,"").trim()||raw;
 if(!query)return '<td class="hby-list-external" data-label="Buscar en">—</td>';
 const films=category!=="libros";
 const service=films?"FilmAffinity":"Amazon";
 const url=films
  ?"https://www.filmaffinity.com/es/search.php?stype=title&stext="+encodeURIComponent(query)
  :"https://www.amazon.es/s?k="+encodeURIComponent(query)+"&i=stripbooks";
 return '<td class="hby-list-external" data-label="Buscar en"><a class="hby-external-link" href="'+esc(url)+
 '" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer" title="Buscar '+esc(raw)+' en '+service+' (resultados, no ficha verificada)" aria-label="Buscar '+esc(raw)+' en '+service+'">'+service+' ↗</a></td>';
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
  '<td class="hby-list-title" data-label="Título"><strong title="'+esc(title)+'">'+esc(title)+'</strong>'+notes+issue+'</td>'+
  '<td class="hby-list-type" data-label="'+(wine?'Denominación':'Género')+'">'+esc(genre)+'</td>'+
  (wine?'<td class="hby-list-status" data-label="Tipo">'+esc(item.tipo||"—")+'</td>':
        '<td class="hby-list-status" data-label="Estado"><span class="hby-record-status">'+esc(item.estado||"—")+'</span></td>')+
  '<td class="hby-list-score" data-label="'+(wine?'Precio':'Nota')+'">'+metricText+'</td>'+
  (wine?wineShopMarkup(item):externalCatalogLink(item,store.category))+
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
 (subset.length?mobileSortMarkup(wine):"")+
 (subset.length?'<div class="hby-list-wrap"><table class="hby-list-table '+(wine?'hby-list-table--wine':'hby-list-table--media')+'"><thead><tr>'+
 (wine?sortHeader("Foto","foto"):"")+
 sortHeader("Título","titulo")+sortHeader(wine?"Denominación":"Género","genero")+
 sortHeader(wine?"Tipo":"Estado","estado")+sortHeader(wine?"Precio":"Nota","nota")+
 sortHeader(wine?"Tienda":"Buscar en","enlace")+
 '<th scope="col" title="Editar cada registro; no es un dato ordenable">Acciones</th></tr></thead><tbody>'+shown.map(recordRow).join("")+'</tbody></table></div>'+
 (shown.length<subset.length?'<button id="hby-more" class="hby-more" type="button">Ver más ('+(subset.length-shown.length)+' restantes)</button>':''):
 '<div class="hby-empty"><h4>No hay resultados</h4><p>Prueba con otros filtros o añade un registro.</p></div>')+
 '<p class="hby-source-note">Fuente oficial: Google Sheets · Se conservan las referencias al registro original y las incidencias de migración.</p>';
}
function inputField(name,label,value,type="text"){
 const max=name==="comentarios"?4000:name.endsWith("_url")?1800:300;
 if(name==="comentarios")return '<label class="hby-full">'+label+'<textarea name="'+name+'" rows="5" maxlength="'+max+'">'+esc(value||"")+'</textarea></label>';
 return '<label>'+label+'<input name="'+name+'" type="'+type+'" '+(type==="number"?'min="0" max="'+(name==="precio"?"100000":"10")+'" step="0.1"':'maxlength="'+max+'"')+' value="'+esc(value??"")+'"></label>';
}

const OTHER_OPTION="__hby_other__";
const EDITOR_COLLATOR=new Intl.Collator("es",{sensitivity:"base",numeric:true});
export function hobbyEditorOptions(items,field,current="",numeric=false){
 const values=[...(items||[]).map(item=>item?.[field]),current].filter(value=>value!==null&&value!==undefined&&String(value).trim()!=="");
 if(numeric){
  for(let n=0;n<=20;n++)values.push(n/2);
 }
 const seen=new Set();
 return values.map(value=>String(value).trim().replace(numeric?",":/^$/,".")) // Numeric choices use dot-decimal convention.
  .filter(value=>{
   const key=value.toLocaleLowerCase("es");
   if(seen.has(key))return false;
   if(numeric&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>10))return false;
   seen.add(key);return true;
  })
  .sort(numeric?(a,b)=>Number(a)-Number(b):(a,b)=>EDITOR_COLLATOR.compare(a,b));
}
export function hobbySelectField(name,label,value,options,{numeric=false}={}){
 const current=value===null||value===undefined?"":String(value).trim().replace(numeric?",":/^$/,".");
 const unique=[...options];
 if(current&&!unique.includes(current))unique.push(current);
 const sorted=unique.sort(numeric?(a,b)=>Number(a)-Number(b):(a,b)=>EDITOR_COLLATOR.compare(a,b));
 const list=['<option value=""'+(!current?' selected':'')+'>Sin especificar</option>',
  ...sorted.map(option=>'<option value="'+esc(option)+'"'+(option===current?' selected':'')+'>'+esc(option)+'</option>'),
  '<option value="'+OTHER_OPTION+'">Otro… (escribir)</option>'].join("");
 const max=numeric?10:200;
 return '<label>'+esc(label)+'<select name="'+esc(name)+'" data-hby-choice="'+esc(name)+'">'+list+'</select>'+
  '<input name="'+esc(name)+'__other" data-hby-other="'+esc(name)+'" type="'+(numeric?'number':'text')+'"'+
  (numeric?' min="0" max="10" step="any"':' maxlength="'+max+'"')+
  ' placeholder="Nuevo valor de '+esc(label)+'" aria-label="Nuevo valor de '+esc(label)+'" hidden disabled></label>';
}
function editorChoice(name,label,value,{numeric=false}={}){
 return hobbySelectField(name,label,value,hobbyEditorOptions(store.items,name,value,numeric),{numeric});
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
 (wine?inputField("marca","Marca / bodega *",item?.marca)+editorChoice("tipo","Tipo / vino",item?.tipo)+editorChoice("denominacion","Denominación",item?.denominacion)+editorChoice("nota","Puntuación (0–10)",item?.nota,{numeric:true})+inputField("precio","Precio (€)",item?.precio,"number")+shopEditor(item):
 inputField("titulo","Título *",item?.titulo)+editorChoice("subtipo","Género / subtipo",item?.subtipo)+
 editorChoice("subtipo_2","Subtipo adicional",item?.subtipo_2)+
 editorChoice("estado","Estado",item?.estado)+editorChoice("puntuacion","Puntuación (0–10)",item?.puntuacion,{numeric:true})+
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
 root.querySelectorAll("[data-hby-sort]").forEach(button=>button.addEventListener("click",()=>setSort(button.dataset.hbySort,true)));
 root.querySelector("#hby-mobile-sort")?.addEventListener("change",e=>setSort(e.target.value));
 root.querySelector("#hby-mobile-direction")?.addEventListener("click",()=>{
  if(store.sortKey){store.sortDir=store.sortDir==="asc"?"desc":"asc";store.page=1;show();}
 });
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
 root.querySelectorAll("[data-hby-choice]").forEach(select=>select.addEventListener("change",()=>{
  const name=select.dataset.hbyChoice,input=root.querySelector('[data-hby-other="'+name+'"]');
  if(!input)return;
  const custom=select.value===OTHER_OPTION;
  input.hidden=!custom;input.disabled=!custom;input.required=custom;
  if(custom)input.focus();
 }));
 root.querySelector("#hby-form")?.addEventListener("submit",event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget),item=store.items.find(x=>x.id===store.editing),names=store.category==="vinos"?wineFields:mediaFields;
  const body={};
  for(const key of names){
   let value=data.get(key)||"";
   if(value===OTHER_OPTION)value=String(data.get(key+"__other")||"").trim();
   if(["nota","precio","puntuacion"].includes(key))value=value===""?"":Number(value);
   body[key]=value;
  }
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
 store.category=selected;store.editing=null;store.items=[];store.filter="";store.search="";store.page=1;store.sortKey="";store.sortDir="asc";store.loaded=false;store.error="";
 void reload();
}
