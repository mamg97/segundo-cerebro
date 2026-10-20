// Private wedding collaboration view. No embedded personal records.
export const WEDDING_TYPES=[
 ["all","Todo","✦"],["finca","Fincas","🏛"],["catering","Catering","🍽"],
 ["decoracion","Decoración e ideas","✿"],["fotografia","Foto y vídeo","📷"],
 ["musica","Música","♫"],["invitaciones","Invitaciones","✉"],
 ["vestuario","Vestuario","♧"],["invitados","Invitados","♙"],
 ["ideas","Otras ideas","✧"],["tareas","Tareas","✓"],["otros","Otros","⋯"]
];
const STATUSES=[["idea","Idea"],["pendiente","Pendiente"],["contactado","Contactado"],["presupuestado","Presupuesto recibido"],["reservado","Reservado"],["confirmado","Confirmado"],["descartado","Descartado"],["hecho","Hecho"]];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=x=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(x/100);
const typeName=x=>WEDDING_TYPES.find(z=>z[0]===x)?.[1]||"Otro";
const statusName=x=>STATUSES.find(z=>z[0]===x)?.[1]||x;
const state={items:[],filter:"all",search:"",editing:null,mode:false,busy:false,viewer:"",error:"",loaded:false};
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
function home(){
 const n=weddingTotals(state.items);
 return '<div class="wed-workspace">'+
   '<div class="wed-stats"><div><small>Elementos activos</small><strong>'+n.total+'</strong></div>'+
   '<div><small>Presupuesto planificado</small><strong>'+eur(n.planned)+'</strong></div>'+
   '<div><small>Contratado</small><strong>'+eur(n.committed)+'</strong></div>'+
   '<div><small>Pagado</small><strong>'+eur(n.paid)+'</strong></div></div>'+
   '<div class="wed-toolbar"><div><h3>Tablero de boda</h3><small>'+n.ideas+' ideas · '+n.confirmed+' reservados o confirmados</small></div>'+
   '<button type="button" class="wed-primary" id="wed-new">+ Añadir elemento</button></div>'+
   '<div class="wed-controls"><label class="wed-search"><span>Buscar</span><input id="wed-search" type="search" placeholder="Buscar fincas, ideas, proveedores…" value="'+esc(state.search)+'"></label>'+
   '<button type="button" id="wed-refresh">↻ Actualizar</button></div>'+
   '<nav class="wed-filters" aria-label="Filtrar tipo de elemento">'+WEDDING_TYPES.map(([id,label,icon])=>'<button type="button" data-wed-filter="'+id+'" aria-pressed="'+(state.filter===id)+'">'+icon+' '+esc(label)+'</button>').join("")+'</nav>'+
   '<div id="wed-results">'+cards()+'</div>'+
   '<p class="wed-note">El presupuesto planificado usa el importe contratado cuando existe, o la estimación en su defecto. «Pagado» se muestra por separado, sin sumarlo dos veces.</p>'+
 '</div>';
}
function moneyInput(name,label,value){return '<label>'+label+' (€)<input type="number" min="0" max="10000000" step="0.01" name="'+name+'" value="'+(value==null?"":(value/100).toFixed(2))+'" placeholder="0,00"></label>';}
function editor(){
 const original=state.editing&&state.editing!=="new"?state.items.find(x=>x.id===state.editing):null;
 return '<div class="wed-editor-wrap"><button id="wed-back" class="wed-back" type="button">← Volver al tablero</button>'+
  '<div class="wed-editor"><h3>'+(original?"Editar elemento":"Añadir a la boda")+'</h3><p>Podréis modificar estos datos desde cualquiera de vuestras sesiones autorizadas.</p>'+
  '<form id="wed-form"><div class="wed-form-grid">'+
  '<label>Categoría<select name="category" required>'+WEDDING_TYPES.filter(x=>x[0]!=="all").map(x=>'<option value="'+x[0]+'" '+((original?.category||"ideas")===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("")+'</select></label>'+
  '<label>Estado<select name="status" required>'+STATUSES.map(x=>'<option value="'+x[0]+'" '+((original?.status||"idea")===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("")+'</select></label>'+
  '<label class="wide">Nombre o idea *<input type="text" name="title" maxlength="180" required value="'+esc(original?.title||"")+'" placeholder="Ej. Visitar finca…"></label>'+
  '<label class="wide">Descripción y notas<textarea name="description" rows="4" maxlength="4000" placeholder="Detalles, pros y contras, preguntas pendientes…">'+esc(original?.description||"")+'</textarea></label>'+
  '<label>Proveedor / contacto<input name="provider" maxlength="180" value="'+esc(original?.provider||"")+'" placeholder="Nombre del proveedor"></label>'+
  '<label>Web o referencia HTTPS<input name="url" type="url" maxlength="600" value="'+esc(original?.url||"")+'" placeholder="https://…"></label>'+
  moneyInput("estimateCents","Estimado",original?.estimateCents)+moneyInput("contractedCents","Contratado",original?.contractedCents)+
  moneyInput("paidCents","Pagado",original?.paidCents)+
  '<label>Fecha clave<input type="date" name="dueDate" value="'+esc(original?.dueDate||"")+'"></label>'+
  '<label class="wide">Fotografía de referencia (JPG/PNG/WebP)<input type="file" name="photo" id="wed-photo-input" accept="image/jpeg,image/png,image/webp"><small>Las imágenes se optimizan antes de guardarse en el espacio privado.</small></label>'+
  (original?.photoUrl?'<div class="wed-photo-existing wide"><img alt="Foto actual" src="'+esc(original.photoUrl)+'?v='+Date.now()+'"><button id="wed-photo-remove" type="button">Quitar foto</button></div>':'')+
  '</div><div class="wed-form-actions"><button class="wed-primary" id="wed-submit" type="submit">Guardar</button>'+
  (original?'<button class="wed-danger" id="wed-delete" type="button">Eliminar elemento</button>':'')+
  '<button type="button" id="wed-cancel">Cancelar</button></div></form></div></div>';
}
function show(){
 if(!active())return;
 const area=document.querySelector("#dialog-body");
 area.innerHTML=state.editing?editor():home();
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
async function optimizedPhoto(file){
 if(!file)return null;
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("INVALID_IMAGE");
 // User-supplied photos are resized on-device; originals never enter the public repository.
 const bitmap=await createImageBitmap(file);
 try{
  for(let max=1500;max>=700;max-=200){
   const ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("IMAGE_PROCESSING_FAILED");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.7,.55]){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    if(blob&&blob.size<=900000)return new File([blob],"boda.jpg",{type:"image/jpeg"});
   }
  }
  throw new Error("IMAGE_TOO_LARGE");
 }finally{bitmap.close();}
}
async function sendPhoto(id,file){
 const optimized=await optimizedPhoto(file);if(!optimized)return;
 const fd=new FormData();fd.append("file",optimized);
 const r=await fetch("/api/wedding/items/"+encodeURIComponent(id)+"/photo",{method:"POST",credentials:"same-origin",body:fd});
 const body=await r.json().catch(()=>({}));if(!r.ok||!body.ok)throw new Error(body.code||"IMAGE_UPLOAD_FAILED");
}
function bind(area){
 area.querySelector("#wed-new")?.addEventListener("click",()=>{state.editing="new";state.error="";show();});
 area.querySelector("#wed-back")?.addEventListener("click",()=>{state.editing=null;state.error="";show();});
 area.querySelector("#wed-cancel")?.addEventListener("click",()=>{state.editing=null;state.error="";show();});
 area.querySelector("#wed-refresh")?.addEventListener("click",()=>{state.error="";void load().catch(e=>{state.error=errorMsg(e);show();});});
 area.querySelector("#wed-search")?.addEventListener("input",e=>{state.search=e.target.value;const target=area.querySelector("#wed-results");if(target){target.innerHTML=cards();bindCards(target);}});
 area.querySelectorAll("[data-wed-filter]").forEach(btn=>btn.addEventListener("click",()=>{state.filter=btn.dataset.wedFilter;state.error="";show();}));
 bindCards(area);
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
function bindCards(root){root.querySelectorAll("[data-wed-edit]").forEach(btn=>btn.addEventListener("click",()=>{state.editing=btn.dataset.wedEdit;state.error="";show();}));}
export function openWeddingDetail(remote){
 const dialog=document.querySelector("#detail-dialog"),body=document.querySelector("#dialog-body");if(!dialog||!body)return;
 document.querySelector("#dialog-context").textContent="Pareja · proyecto compartido";
 document.querySelector("#dialog-title").textContent="Boda";
 dialog.classList.add("wedding-dialog");
 state.editing=null;state.error="";state.mode=remote;state.filter="all";state.search="";
 body.innerHTML='<div class="wed-loading">Cargando espacio de boda…</div>';
 if(!dialog.open)dialog.showModal();
 if(!remote){body.innerHTML='<div class="wed-locked"><h3>Boda</h3><p>Este apartado permite añadir ideas, presupuestos y fotos en la versión privada de Segundo Cerebro.</p></div>';return;}
 void load().catch(e=>{if(!active())return;body.innerHTML='<div class="wed-locked"><h3>No se pudo abrir Boda</h3><p>'+esc(errorMsg(e))+'</p><button type="button" id="wed-try">Reintentar</button></div>';body.querySelector("#wed-try")?.addEventListener("click",()=>void openWeddingDetail(remote));});
}
