import {hrefForArea,hrefForHealthTab,hrefForHobby,hrefForWedding,hrefForPantryTab,routeFromHash,HOBBY_CATEGORIES} from "./area-routes.mjs?v=0.1.5";
export const MOBILE_AREAS=Object.freeze([
 ["area-general","Inicio","home"],["area-finance","Finanzas","wallet"],["area-calendar","Agenda","calendar"],
 ["area-health","Salud","heart"],["area-partner","Boda","ring"],["area-career","Carrera","briefcase"],
 ["area-family","Familia","users"],["area-pantry","Despensa","pantry"],["area-objects","Objetos","box"],["area-wealth","Patrimonio","chart"],
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
 ring:'<path d="M9 5l1.2-2h3.6L15 5l-3 3-3-3Z"/><path d="M8.1 9.2a8 8 0 1 0 7.8 0"/>',
 utensils:'<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 3v18M15 3v7a4 4 0 0 0 4-4V3"/>',
 briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18"/>',
 box:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7m-9 5v10"/>',
 chart:'<path d="M3 20h18M5 17l5-5 4 3 5-9"/>',
 plane:'<path d="M21 3 3 10l8 3 3 8 7-18ZM11 13 21 3"/>',
 pantry:'<path d="M3 5h18v15H3zM3 10h18M8 10v10M16 10v10"/>',
 dumbbell:'<path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/>',
 shopping:'<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h2l3 13h13l2-9H5"/>',
 book:'<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 refresh:'<path d="M21 11a9 9 0 1 1-2.2-5.8L21 8"/><path d="M21 3v5h-5"/>'
};
const ico=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">'+(PATHS[name]||PATHS.grid)+'</svg>';
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const MOBILE_DEFAULT_SHORTCUTS=Object.freeze([
 "#/finanzas",hrefForWedding(),hrefForHealthTab("gym"),hrefForHealthTab("menu")
]);
const SHORTCUT_STORAGE_KEY="segun.mobile.shortcuts.v1";
// El catálogo deriva exclusivamente de rutas disponibles, nunca de contenido privado.
const HEALTH=Object.freeze([["Resumen","overview"],["Médicos","medical"],["Visión","vision"],["Gimnasio","gym"],["Nutrición","nutrition"],["Recetas","recipes"],["Menú semanal","menu"]].map(([label,tab])=>({label,href:hrefForHealthTab(tab)})));
const OTHER={
 "area-health":HEALTH,
 "area-partner":[{label:"Boda",href:hrefForWedding()}],
 "area-finance":[{label:"Cuentas y presupuesto",href:"#/finanzas"},{label:"Patrimonio",href:"#/patrimonio"}],
 "area-hobbies":[{label:"Películas",href:hrefForHobby("peliculas")},...HOBBY_CATEGORIES.filter(x=>x.id!=="peliculas").map(x=>({label:x.title,href:hrefForHobby(x.id)}))],
 "area-travels":[{label:"Todos los viajes",href:"#/viajes"}],
 "area-pantry":[{label:"Inventario",href:hrefForPantryTab("inventario")},{label:"Lista de la compra",href:hrefForPantryTab("compra")},{label:"Tickets",href:hrefForPantryTab("tickets")}]
};
const areaHref=(id)=>id==="area-partner"?hrefForWedding():hrefForArea(id);
const sectionIcon=(href,fallback)=>{
  if(href==="#/pareja/boda")return "ring";
  if(href==="#/salud/gym")return "dumbbell";
  if(href==="#/salud/menu")return "utensils";
  if(href==="#/despensa/compra")return "shopping";
  return fallback;
};
export const MOBILE_SHORTCUT_GROUPS=Object.freeze(MOBILE_AREAS.filter(([id])=>id!=="area-general").map(([areaId,label,icon])=>{
  const root={label,href:areaHref(areaId),icon:sectionIcon(areaHref(areaId),icon)};
  const sections=(OTHER[areaId]||[]).filter(x=>x.href!==root.href && routeFromHash(x.href)?.areaId===areaId)
    .map(x=>({label:x.label,href:x.href,icon:sectionIcon(x.href,icon)}));
  // El acceso a movimientos también es un subbloque financiero compartible.
  if(areaId==="area-finance")sections.push({label:"Movimientos",href:"#/finanzas/movimientos",icon:"wallet"});
  const seen=new Set();
  return Object.freeze({areaId,label,icon,links:Object.freeze([root,...sections].filter(x=>{
    if(seen.has(x.href)||!routeFromHash(x.href))return false;
    seen.add(x.href);return true;
  }))});
}));
const SHORTCUT_LINKS=new Map(MOBILE_SHORTCUT_GROUPS.flatMap(group=>group.links.map(link=>[link.href,link])));
export function normalizeMobileShortcuts(value){
  const chosen=[];
  if(Array.isArray(value))for(const href of value){
    if(typeof href==="string"&&SHORTCUT_LINKS.has(href)&&!chosen.includes(href))chosen.push(href);
    if(chosen.length===4)break;
  }
  for(const href of MOBILE_DEFAULT_SHORTCUTS){
    if(chosen.length===4)break;
    if(!chosen.includes(href))chosen.push(href);
  }
  return chosen;
}
export function swapMobileShortcut(current,index,href){
  const result=normalizeMobileShortcuts(current);
  if(!Number.isInteger(index)||index<0||index>=4||!SHORTCUT_LINKS.has(href))return result;
  const previous=result.indexOf(href);
  if(previous>=0){[result[index],result[previous]]=[result[previous],result[index]];}
  else result[index]=href;
  return result;
}
function loadMobileShortcuts(){
  try{return normalizeMobileShortcuts(JSON.parse(window.localStorage.getItem(SHORTCUT_STORAGE_KEY)));}
  catch{return [...MOBILE_DEFAULT_SHORTCUTS];}
}
let selectedShortcuts=[...MOBILE_DEFAULT_SHORTCUTS],selectedSlot=0;
function storeMobileShortcuts(next){
  selectedShortcuts=normalizeMobileShortcuts(next);
  try{window.localStorage.setItem(SHORTCUT_STORAGE_KEY,JSON.stringify(selectedShortcuts));}catch{}
  renderBottomBar();
}
function shortcutMarkup(href,index){
  const item=SHORTCUT_LINKS.get(href);
  if(!item)return "";
  return '<a href="'+safe(href)+'" data-mobile-shortcut="'+safe(href)+'" data-mobile-slot="'+index+'" aria-label="Abrir '+safe(item.label)+'">'+ico(item.icon)+'<span>'+safe(item.label==="Menú semanal"?"Menú":item.label)+'</span></a>';
}
function renderBottomBar(){
  const node=dom("mobile-bottom-nav");if(!node)return;
  node.innerHTML='<a href="#/inicio" data-mobile-main="area-general">'+ico("home")+'<span>Inicio</span></a>'+
    selectedShortcuts.map(shortcutMarkup).join("")+
    '<button id="mobile-more-trigger" type="button" aria-expanded="'+(mode!=="sections"&&mode!==""?"true":"false")+'" aria-label="Más apartados y personalizar accesos">'+ico("grid")+'<span>Más</span></button>';
  syncBottomBarState();
}
function syncBottomBarState(){
  const home=route.areaId==="area-general";
  const active=selectedShortcuts.some(href=>href===hash || (href===hrefForArea(route.areaId)&&route.areaId!=="area-general"));
  document.querySelectorAll("[data-mobile-shortcut]").forEach(el=>{
    const href=el.dataset.mobileShortcut;
    const isCurrent=href===hash || (href===hrefForArea(route.areaId)&&route.areaId!=="area-general");
    el.classList.toggle("is-current",isCurrent);
    if(isCurrent)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
  });
  const homeLink=dom("mobile-bottom-nav")?.querySelector('[data-mobile-main="area-general"]');
  homeLink?.classList.toggle("is-current",home);
  if(home)homeLink?.setAttribute("aria-current","page");else homeLink?.removeAttribute("aria-current");
  dom("mobile-more-trigger")?.classList.toggle("is-current",!home&&!active);
}
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
 if(id==="area-partner")return hrefForWedding();
 const v=cache?.[id];return v&&routeFromHash(v)?.areaId===id?v:hrefForArea(id);
}
let go,onRefresh,refreshBusy=false,refreshFeedbackTimer=null,route={areaId:"area-general",detailId:null},hash="#/inicio",mode="",trigger=null;
const historyByArea={};
const dom=(id)=>document.getElementById(id);
function markup(){return '<div id="mobile-app-header" class="mobile-app-header">'+
 '<button id="mobile-context-trigger" class="mobile-context-trigger" type="button" aria-haspopup="dialog" aria-expanded="false"><span><small id="mobile-context-area">Inicio</small><strong id="mobile-context-label">Inicio</strong></span>'+ico("down")+'</button>'+
 '<button id="mobile-refresh-action" class="mobile-header-action" type="button" aria-label="Actualizar datos" aria-busy="false">'+ico("refresh")+'</button><span class="mobile-refresh-feedback" id="mobile-refresh-feedback" role="status" aria-live="polite" hidden></span></div>'+
 '<nav id="mobile-bottom-nav" class="mobile-bottom-nav" aria-label="Navegación móvil"></nav>'+
 '<div id="mobile-navigation-sheet" class="mobile-navigation-sheet" hidden><button class="mobile-sheet-backdrop" data-mobile-dismiss aria-label="Cerrar menú"></button>'+
 '<section class="mobile-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-sheet-heading" tabindex="-1">'+
 '<div class="mobile-sheet-handle" aria-hidden="true"></div><div class="mobile-sheet-heading"><h2 id="mobile-sheet-heading">Apartados</h2><button id="mobile-sheet-close" type="button" aria-label="Cerrar">×</button></div>'+
 '<div id="mobile-sheet-options"></div></section></div>';}
function catalogMarkup(choice=false){
 return '<div class="mobile-catalog">'+MOBILE_SHORTCUT_GROUPS.map(group=>
   '<details class="mobile-catalog-group"><summary>'+ico(group.icon)+'<span>'+safe(group.label)+'</span>'+ico("down")+'</summary>'+
   '<div class="mobile-catalog-links">'+group.links.map(link=>choice
      ?'<button type="button" data-mobile-select-shortcut="'+safe(link.href)+'">'+ico(link.icon)+'<span>'+safe(link.label)+'</span></button>'
      :'<a href="'+safe(link.href)+'" data-mobile-route="'+safe(link.href)+'">'+ico(link.icon)+'<span>'+safe(link.label)+'</span></a>'
    ).join("")+'</div></details>').join("")+'</div>';
}
function renderSheet(){
 const node=dom("mobile-sheet-options");if(!node)return;
 if(mode==="sections"){
  dom("mobile-sheet-heading").textContent="Dentro de "+mobileCurrentLabel(route,hash).area;
  node.innerHTML='<div class="mobile-sheet-list">'+mobileSections(route).map(x=>
   '<a href="'+x.href+'" data-mobile-route="'+x.href+'"'+(x.href===hash?' aria-current="page"':'')+'>'+safe(x.label)+'<span aria-hidden="true">'+(x.href===hash?'✓':'›')+'</span></a>').join("")+'</div>';
 }else if(mode==="customize"){
  dom("mobile-sheet-heading").textContent="Personalizar barra";
  node.innerHTML='<p class="mobile-sheet-help">Elige qué cuatro bloques o subbloques quieres tener siempre abajo. Inicio y Más permanecen fijos.</p>'+
    '<div class="mobile-shortcuts-editor">'+selectedShortcuts.map((href,i)=>{
      const item=SHORTCUT_LINKS.get(href);return '<button type="button" data-mobile-edit-slot="'+i+'"><strong>'+(i+1)+'</strong>'+
        ico(item?.icon||"grid")+'<span>'+safe(item?.label||"Acceso")+'</span><span aria-hidden="true">Cambiar ›</span></button>';
    }).join("")+'</div><button type="button" class="mobile-shortcuts-reset" data-mobile-reset>Restablecer accesos</button>';
 }else if(mode==="choose"){
  dom("mobile-sheet-heading").textContent="Acceso "+(selectedSlot+1)+" · elegir";
  node.innerHTML='<button type="button" class="mobile-sheet-back" data-mobile-back>‹ Volver a personalizar</button>'+catalogMarkup(true);
 }else{
  dom("mobile-sheet-heading").textContent="Bloques y apartados";
  node.innerHTML='<button type="button" class="mobile-shortcuts-configure" data-mobile-customize>Personalizar barra inferior</button>'+catalogMarkup(false);
 }
}
function openSheet(type,target){
 mode=type;trigger=target;renderSheet();dom("mobile-navigation-sheet").hidden=false;document.body.classList.add("mobile-sheet-open");
 dom("mobile-context-trigger").setAttribute("aria-expanded",String(type==="sections"));
 dom("mobile-more-trigger")?.setAttribute("aria-expanded",String(type==="more"||type==="choose"||type==="customize"));
 dom("mobile-sheet-close").focus();
}
function closeSheet(){
 if(dom("mobile-navigation-sheet")?.hidden!==false)return;
 dom("mobile-navigation-sheet").hidden=true;document.body.classList.remove("mobile-sheet-open");mode="";
 dom("mobile-context-trigger").setAttribute("aria-expanded","false");
 dom("mobile-more-trigger")?.setAttribute("aria-expanded","false");
 if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;
}
function navigate(target){if(!routeFromHash(target))return;closeSheet();if(target==="#/inicio")dom("main-content")?.scrollTo({top:0,behavior:"instant"});go?.(target);}
export function syncMobileNavigation(nextRoute,nextHash){
 if(!nextRoute)return;
 route=nextRoute;hash=nextHash||"#/inicio";
 if(route.areaId!=="area-general")historyByArea[route.areaId]=hash;
 const label=mobileCurrentLabel(route,hash);
 if(dom("mobile-context-area"))dom("mobile-context-area").textContent=label.area;
 if(dom("mobile-context-label"))dom("mobile-context-label").textContent=label.section;
 syncBottomBarState();
 if(mode)renderSheet();
}
export function initializeMobileNavigation({navigateTo,onRefresh:refreshHandler}){
 go=navigateTo;onRefresh=refreshHandler;if(dom("mobile-app-header"))return;
 selectedShortcuts=loadMobileShortcuts();
 document.body.insertAdjacentHTML("beforeend",markup());
 renderBottomBar();
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
    if(result?.ok===true){
      feedback.textContent="Datos actualizados";
    }else{
      const failed=Array.isArray(result?.failed)?result.failed.slice(0,3).join(", "):"";
      feedback.textContent=failed?"Sin actualizar: "+failed:"Actualización parcial o fallida";
    }
  }catch(error){feedback.textContent="No se pudo actualizar";}
  finally{
    refreshBusy=false;button.disabled=false;button.classList.remove("is-refreshing");
    button.setAttribute("aria-busy","false");
    refreshFeedbackTimer=setTimeout(()=>{feedback.hidden=true;},4500);
  }
 });
 dom("mobile-bottom-nav").addEventListener("click",e=>{
  const quick=e.target.closest("[data-mobile-shortcut]");
  if(quick){e.preventDefault();navigate(quick.dataset.mobileShortcut);return;}
  const area=e.target.closest("[data-mobile-main]");
  if(area){e.preventDefault();navigate("#/inicio");return;}
  const more=e.target.closest("#mobile-more-trigger");
  if(more){openSheet("more",more);}
 });
 dom("mobile-navigation-sheet").addEventListener("click",e=>{
  if(e.target.closest("[data-mobile-dismiss],#mobile-sheet-close")){closeSheet();return;}
  const link=e.target.closest("[data-mobile-route]");if(link){e.preventDefault();navigate(link.dataset.mobileRoute);return;}
  const customize=e.target.closest("[data-mobile-customize]");
  if(customize){e.preventDefault();mode="customize";renderSheet();return;}
  const edit=e.target.closest("[data-mobile-edit-slot]");
  if(edit){e.preventDefault();selectedSlot=Number(edit.dataset.mobileEditSlot);mode="choose";renderSheet();return;}
  const picked=e.target.closest("[data-mobile-select-shortcut]");
  if(picked){e.preventDefault();storeMobileShortcuts(swapMobileShortcut(selectedShortcuts,selectedSlot,picked.dataset.mobileSelectShortcut));mode="customize";renderSheet();return;}
  if(e.target.closest("[data-mobile-back]")){e.preventDefault();mode="customize";renderSheet();return;}
  if(e.target.closest("[data-mobile-reset]")){e.preventDefault();storeMobileShortcuts(MOBILE_DEFAULT_SHORTCUTS);renderSheet();return;}
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
