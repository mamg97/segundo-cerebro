import {hrefForArea,hrefForHealthTab,hrefForHobby,hrefForWedding,routeFromHash,HOBBY_CATEGORIES} from "./area-routes.mjs?v=0.1.3";
export const MOBILE_AREAS=Object.freeze([
 ["area-general","Inicio","home"],["area-finance","Finanzas","wallet"],["area-calendar","Agenda","calendar"],
 ["area-health","Salud","heart"],["area-partner","Pareja","users"],["area-career","Carrera","briefcase"],
 ["area-family","Familia","users"],["area-objects","Objetos","box"],["area-wealth","Patrimonio","chart"],
 ["area-projects","Proyectos","box"],["area-travels","Viajes","plane"],["area-hobbies","Hobbies","book"]
]);
const PRIMARY=MOBILE_AREAS.slice(0,5).map(x=>x[0]);
const PATHS={
 home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
 wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M16 15h5M5 6V4h13"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h8"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 users:'<circle cx="8" cy="8" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3"/><circle cx="17" cy="8" r="2"/><path d="M16 15a5 5 0 0 1 6 5v1"/>',
 grid:'<circle cx="5" cy="5" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/>',
 briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18"/>',
 box:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7m-9 5v10"/>',
 chart:'<path d="M3 20h18M5 17l5-5 4 3 5-9"/>',
 plane:'<path d="M21 3 3 10l8 3 3 8 7-18ZM11 13 21 3"/>',
 book:'<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 refresh:'<path d="M21 11a9 9 0 1 1-2.2-5.8L21 8"/><path d="M21 3v5h-5"/>'
};
const ico=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">'+(PATHS[name]||PATHS.grid)+'</svg>';
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const HEALTH=Object.freeze([["Resumen","overview"],["Médicos","medical"],["Visión","vision"],["Gimnasio","gym"],["Nutrición","nutrition"],["Recetas","recipes"],["Menú","menu"]].map(([label,tab])=>({label,href:hrefForHealthTab(tab)})));
const OTHER={
 "area-health":HEALTH,
 "area-partner":[{label:"Resumen",href:"#/pareja"},{label:"Boda",href:hrefForWedding()}],
 "area-finance":[{label:"Cuentas y presupuesto",href:"#/finanzas"},{label:"Patrimonio",href:"#/patrimonio"}],
 "area-hobbies":[{label:"Películas",href:hrefForHobby("peliculas")},...HOBBY_CATEGORIES.filter(x=>x.id!=="peliculas").map(x=>({label:x.title,href:hrefForHobby(x.id)}))],
 "area-travels":[{label:"Todos los viajes",href:"#/viajes"}]
};
export function mobileSections(route){
 const area=route?.areaId||"area-general";
 return OTHER[area]||[{label:MOBILE_AREAS.find(x=>x[0]===area)?.[1]||"Inicio",href:hrefForArea(area)}];
}
export function mobileCurrentLabel(route,hash){
 const area=MOBILE_AREAS.find(x=>x[0]===route?.areaId)||MOBILE_AREAS[0];
 return {area:area[1],section:mobileSections(route).find(x=>x.href===hash)?.label||(route?.detailId||area[1]),tab:PRIMARY.includes(area[0])?area[0]:"more"};
}
export function mobileRememberedRoute(id,cache){
 if(!MOBILE_AREAS.some(x=>x[0]===id))return "#/inicio";
 const v=cache?.[id];return v&&routeFromHash(v)?.areaId===id?v:hrefForArea(id);
}
let go,onRefresh,refreshBusy=false,refreshFeedbackTimer=null,route={areaId:"area-general",detailId:null},hash="#/inicio",mode="",trigger=null;
const historyByArea={};
const dom=(id)=>document.getElementById(id);
function markup(){return '<div id="mobile-app-header" class="mobile-app-header">'+
 '<button id="mobile-context-trigger" class="mobile-context-trigger" type="button" aria-haspopup="dialog" aria-expanded="false"><span><small id="mobile-context-area">Inicio</small><strong id="mobile-context-label">Inicio</strong></span>'+ico("down")+'</button>'+
 '<button id="mobile-refresh-action" class="mobile-header-action" type="button" aria-label="Actualizar datos" aria-busy="false">'+ico("refresh")+'</button><span class="mobile-refresh-feedback" id="mobile-refresh-feedback" role="status" aria-live="polite" hidden></span></div>'+
 '<nav id="mobile-bottom-nav" class="mobile-bottom-nav" aria-label="Navegación móvil">'+MOBILE_AREAS.slice(0,5).map(([id,label,icon])=>
 '<a href="'+hrefForArea(id)+'" data-mobile-main="'+id+'">'+ico(icon)+'<span>'+label+'</span></a>').join("")+
 '<button id="mobile-more-trigger" type="button" aria-expanded="false">'+ico("grid")+'<span>Más</span></button></nav>'+
 '<div id="mobile-navigation-sheet" class="mobile-navigation-sheet" hidden><button class="mobile-sheet-backdrop" data-mobile-dismiss aria-label="Cerrar menú"></button>'+
 '<section class="mobile-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-sheet-heading" tabindex="-1">'+
 '<div class="mobile-sheet-handle" aria-hidden="true"></div><div class="mobile-sheet-heading"><h2 id="mobile-sheet-heading">Apartados</h2><button id="mobile-sheet-close" type="button" aria-label="Cerrar">×</button></div>'+
 '<div id="mobile-sheet-options"></div></section></div>';}
function renderSheet(){
 const node=dom("mobile-sheet-options");if(!node)return;
 if(mode==="sections"){
  dom("mobile-sheet-heading").textContent="Dentro de "+mobileCurrentLabel(route,hash).area;
  node.innerHTML='<div class="mobile-sheet-list">'+mobileSections(route).map(x=>
   '<a href="'+x.href+'" data-mobile-route="'+x.href+'"'+(x.href===hash?' aria-current="page"':'')+'>'+safe(x.label)+'<span aria-hidden="true">'+(x.href===hash?'✓':'›')+'</span></a>').join("")+'</div>';
 }else{
  dom("mobile-sheet-heading").textContent="Todos los apartados";
  node.innerHTML='<div class="mobile-sheet-grid">'+MOBILE_AREAS.map(([id,label,icon])=>
   '<a href="'+hrefForArea(id)+'" data-mobile-other="'+id+'"'+(route.areaId===id?' aria-current="page"':'')+'>'+ico(icon)+'<span>'+safe(label)+'</span></a>').join("")+'</div>';
 }
}
function openSheet(type,target){
 mode=type;trigger=target;renderSheet();dom("mobile-navigation-sheet").hidden=false;document.body.classList.add("mobile-sheet-open");
 dom("mobile-context-trigger").setAttribute("aria-expanded",String(type==="sections"));
 dom("mobile-more-trigger").setAttribute("aria-expanded",String(type==="more"));
 dom("mobile-sheet-close").focus();
}
function closeSheet(){
 if(dom("mobile-navigation-sheet")?.hidden!==false)return;
 dom("mobile-navigation-sheet").hidden=true;document.body.classList.remove("mobile-sheet-open");mode="";
 dom("mobile-context-trigger").setAttribute("aria-expanded","false");
 dom("mobile-more-trigger").setAttribute("aria-expanded","false");
 if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;
}
function navigate(target){if(!routeFromHash(target))return;closeSheet();go?.(target);}
export function syncMobileNavigation(nextRoute,nextHash){
 if(!nextRoute)return;
 route=nextRoute;hash=nextHash||"#/inicio";
 if(route.areaId!=="area-general")historyByArea[route.areaId]=hash;
 const label=mobileCurrentLabel(route,hash);
 if(dom("mobile-context-area"))dom("mobile-context-area").textContent=label.area;
 if(dom("mobile-context-label"))dom("mobile-context-label").textContent=label.section;
 document.querySelectorAll("[data-mobile-main]").forEach(el=>{
  const chosen=el.dataset.mobileMain===route.areaId;el.classList.toggle("is-current",chosen);
  if(chosen)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
 });
 dom("mobile-more-trigger")?.classList.toggle("is-current",label.tab==="more");
 if(mode)renderSheet();
}
export function initializeMobileNavigation({navigateTo,onRefresh:refreshHandler}){
 go=navigateTo;onRefresh=refreshHandler;if(dom("mobile-app-header"))return;
 document.body.insertAdjacentHTML("beforeend",markup());
 dom("mobile-context-trigger").addEventListener("click",e=>openSheet("sections",e.currentTarget));
 dom("mobile-refresh-action").addEventListener("click",async()=>{
  if(refreshBusy)return;
  const button=dom("mobile-refresh-action"),feedback=dom("mobile-refresh-feedback");
  refreshBusy=true;button.disabled=true;button.classList.add("is-refreshing");
  button.setAttribute("aria-busy","true");
  if(refreshFeedbackTimer)clearTimeout(refreshFeedbackTimer);
  feedback.hidden=false;feedback.textContent="Actualizando datos…";
  try{
    const result=await onRefresh?.();
    feedback.textContent=result?.ok===true?"Datos actualizados":"Actualización parcial o fallida";
  }catch(error){feedback.textContent="No se pudo actualizar";}
  finally{
    refreshBusy=false;button.disabled=false;button.classList.remove("is-refreshing");
    button.setAttribute("aria-busy","false");
    refreshFeedbackTimer=setTimeout(()=>{feedback.hidden=true;},4500);
  }
 });
 dom("mobile-bottom-nav").addEventListener("click",e=>{
  const area=e.target.closest("[data-mobile-main]");if(area){e.preventDefault();navigate(mobileRememberedRoute(area.dataset.mobileMain,historyByArea));}
 });
 dom("mobile-more-trigger").addEventListener("click",e=>openSheet("more",e.currentTarget));
 dom("mobile-navigation-sheet").addEventListener("click",e=>{
  if(e.target.closest("[data-mobile-dismiss],#mobile-sheet-close")){closeSheet();return;}
  const link=e.target.closest("[data-mobile-route]");if(link){e.preventDefault();navigate(link.dataset.mobileRoute);return;}
  const more=e.target.closest("[data-mobile-other]");if(more){e.preventDefault();navigate(mobileRememberedRoute(more.dataset.mobileOther,historyByArea));}
 });
 document.addEventListener("keydown",e=>{
  const sheet=dom("mobile-navigation-sheet");if(sheet?.hidden!==false)return;
  if(e.key==="Escape"){e.preventDefault();closeSheet();return;}
  if(e.key!=="Tab")return;
  const items=[...sheet.querySelectorAll('a[href],button:not([disabled])')].filter(x=>x.getClientRects().length);
  const first=items[0],last=items.at(-1);if(!first||!last)return;
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 syncMobileNavigation(routeFromHash(window.location.hash||"#/inicio"),window.location.hash||"#/inicio");
}
