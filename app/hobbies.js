import {HOBBY_CATEGORIES,hrefForArea,hrefForHobby} from "./area-routes.mjs?v=0.1.1";

const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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
    '<p class="hby-hint">Espacio preparado para añadir nuevos hobbies. Los registros personales aún no están conectados; no se muestran entradas ficticias.</p>'+
    '</section>';
}
function categoryView(hobby){
  return '<section class="hby-page" data-hby-current="'+esc(hobby.id)+'">'+
    '<a class="hby-back" href="'+hrefForArea("area-hobbies")+'">← Todos los hobbies</a>'+
    '<div class="hby-category-hero"><span class="hby-category-icon" aria-hidden="true">'+hobby.icon+'</span>'+
    '<div><small>HOBBIES / '+esc(hobby.title.toLocaleUpperCase("es"))+'</small>'+
    '<h3>'+esc(hobby.title)+'</h3><p>'+esc(hobby.description)+'</p></div></div>'+
    '<div class="hby-section-head"><h3>Tu colección</h3><span>Por conectar</span></div>'+
    '<div class="hby-stages">'+hobby.stages.map(stage=>'<span>'+esc(stage)+'</span>').join("")+'</div>'+
    '<div class="hby-empty"><span aria-hidden="true">✦</span><h4>Esta colección está preparada</h4>'+
    '<p>Los registros de esta sección aún no están conectados. Cuando incorporemos tus aficiones, aparecerán aquí sin inventar datos.</p></div>'+
    '<section class="hby-schema"><h4>Información prevista</h4><div>'+
    hobby.fields.map(field=>'<span>'+esc(field)+'</span>').join("")+
    '</div></section></section>';
}
export function hobbiesMarkup(categoryId=null){
  if(!categoryId)return overview();
  const hobby=HOBBY_CATEGORIES.find(item=>item.id===categoryId);
  return hobby?categoryView(hobby):overview();
}
export function openHobbiesDetail(categoryId=null){
  const dialog=document.querySelector("#detail-dialog");
  const content=document.querySelector("#dialog-body");
  if(!dialog||!content)return;
  dialog.classList.add("hobbies-dialog");
  const hobby=HOBBY_CATEGORIES.find(item=>item.id===categoryId);
  document.querySelector("#dialog-context").textContent="Hobbies · colección personal";
  document.querySelector("#dialog-title").textContent=hobby?hobby.title:"Hobbies";
  content.innerHTML=hobbiesMarkup(categoryId);
  content.scrollTop=0;
  if(!dialog.open)dialog.showModal();
}
