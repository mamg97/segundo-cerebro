// Shared travel-map renderer. Places and dates come exclusively from private Events.
// Google Maps embeds are created only after explicit consent.
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const bounded=(x,min,max)=>Math.max(min,Math.min(max,x));
export function travelMapPoints(groups){
  return (Array.isArray(groups?.points)?groups.points:[])
    .filter(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=85&&Math.abs(p.lon)<=180&&p.name&&p.query)
    .sort((a,b)=>String(a.date).localeCompare(String(b.date))||(Number(a.order)||0)-(Number(b.order)||0));
}
export function travelMapDays(groups){
  return [...new Set(travelMapPoints(groups).map(p=>p.date).filter(d=>DAY.test(d)))].sort();
}
export function travelMapVisible(points,day){
  return points.filter(p=>p.date==="ALOJAMIENTO"|| (day==="TODOS" ? DAY.test(p.date) : p.date===day)).sort((a,b)=>a.date==="ALOJAMIENTO"?-1:b.date==="ALOJAMIENTO"?1:0);
}
// Large, geographically separated day stops need road directions; compact urban trips remain walkable.
// Only private map coordinates already supplied to this generic renderer are considered.
function geoDistanceKm(a,b){
  const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
  const q=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(q)));
}
export function travelRouteMode(points,day){
  if(!DAY.test(day))return "walking";
  const stops=points.filter(p=>p.date===day).sort((a,b)=>a.order-b.order);
  const lodging=points.find(p=>p.date==="ALOJAMIENTO");
  const route=lodging?[lodging,...stops]:stops;
  if(route.length<2)return "walking";
  return route.some((point,i)=>i>0&&[point,route[i-1]].every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon))&&geoDistanceKm(route[i-1],point)>8)
    ?"driving":"walking";
}
export function travelRouteUrls(points,day,lodgingAddress){
  if(!DAY.test(day))return [];
  const stops=points.filter(p=>p.date===day).sort((a,b)=>a.order-b.order);
  if(!stops.length)return [];
  // Maps URLs mobile browsers support only three intermediate waypoints.
  // Keep every leg within that limit; the next leg starts at the previous stop.
  const legs=[],size=4;
  for(let start=0;start<stops.length;start+=size){
    const chunk=stops.slice(start,start+size);
    const origin=start===0?(lodgingAddress||chunk[0].query):stops[start-1].query;
    const destination=chunk.at(-1).query;
    const middle=(start===0&&!lodgingAddress?chunk.slice(1,-1):chunk.slice(0,-1)).map(p=>p.query);
    const params=new URLSearchParams({api:"1",origin,destination,travelmode:travelRouteMode(points,day)});
    if(middle.length)params.set("waypoints",middle.slice(0,3).join("|"));
    legs.push("https://www.google.com/maps/dir/?"+params.toString());
  }
  return legs;
}
// Google Maps is the only cartographic provider. No API keys, geolocation or
// remote loads until the person explicitly enables the embedded map.
export function travelGoogleMapEmbedUrl(query){
  if(typeof query!=="string"||!query.trim())return null;
  return "https://maps.google.com/maps?q="+encodeURIComponent(query.trim().slice(0,240))+"&z=13&output=embed";
}
function el(tag,cls,txt){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(txt!=null)n.textContent=String(txt);
  return n;
}
export function bindTravelMap({root,groups,address,mapLink,dayLabel}){
  const points=travelMapPoints(groups),days=travelMapDays(groups);
  if(!points.length)return;
  const mapHolder=root.querySelector("[data-trv-map-canvas]");
  const openButton=root.querySelector("[data-trv-show-map]");
  const routeBox=root.querySelector("[data-trv-map-routes]");
  const routeGroups=[...root.querySelectorAll("[data-trv-map-list]")];
  const tabs=[...root.querySelectorAll("[data-trv-map-day]")];
  const stopButtons=[...root.querySelectorAll("[data-trv-map-stop]")];
  let day=days[0]||"TODOS",consented=false,focused=null;

  function visible(){
    return travelMapVisible(points,day);
  }
  function currentPoint(){
    const all=visible();
    if(focused&&all.includes(focused))return focused;
    return all.find(p=>p.date===day)||all.find(p=>p.date!=="ALOJAMIENTO")||all[0]||null;
  }
  function updateUi(){
    tabs.forEach(button=>{
      const active=button.dataset.trvMapDay===day;
      button.setAttribute("aria-pressed",String(active));
      button.classList.toggle("is-active",active);
    });
    routeGroups.forEach(group=>{group.hidden=group.dataset.trvMapList!==day;});
    const current=currentPoint();
    stopButtons.forEach(button=>{
      const active=Number(button.dataset.trvMapStop)===points.indexOf(current);
      button.setAttribute("aria-pressed",String(active));
      button.classList.toggle("is-active",active);
    });
    if(!routeBox)return;
    routeBox.replaceChildren();
    const urls=travelRouteUrls(points,day,address);
    const mode=travelRouteMode(points,day)==="driving"?"en coche":"a pie";
    urls.forEach((url,i)=>{
      const label=urls.length===1?"Abrir ruta "+mode+" en Google Maps":
        "Abrir ruta "+mode+" · tramo "+(i+1)+"/"+urls.length;
      const link=el("a","trv-map-route-link",label);
      link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.referrerPolicy="no-referrer";
      routeBox.append(link);
    });
  }
  function render(){
    if(!consented||!mapHolder)return;
    const point=currentPoint();
    if(!point)return;
    const src=travelGoogleMapEmbedUrl(point.query);
    if(!src)return;
    const frame=el("iframe","trv-google-map-frame");
    frame.title="Google Maps · "+point.name;
    frame.src=src;frame.loading="lazy";frame.referrerPolicy="no-referrer";
    frame.allowFullscreen=true;
    const info=el("div","trv-google-map-info");
    info.append(el("span","","Google Maps · "+point.name));
    const link=el("a","","Abrir lugar ↗");
    link.href=mapLink(point.query,"external");
    link.target="_blank";link.rel="noopener noreferrer";link.referrerPolicy="no-referrer";
    info.append(link);
    mapHolder.replaceChildren(frame,info);
    mapHolder.classList.add("trv-map-loaded");
    updateUi();
  }
  tabs.forEach(button=>button.addEventListener("click",()=>{
    day=button.dataset.trvMapDay;focused=null;updateUi();render();
  }));
  stopButtons.forEach(button=>button.addEventListener("click",()=>{
    const i=Number(button.dataset.trvMapStop);
    if(!Number.isSafeInteger(i)||!points[i]||!visible().includes(points[i]))return;
    focused=points[i];updateUi();render();
  }));
  openButton?.addEventListener("click",()=>{consented=true;render()});
  updateUi();
}
