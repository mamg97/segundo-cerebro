// Shared travel-map renderer. Places, dates and coordinates only come from private Events.
// Third-party map tiles are requested exclusively after user consent.
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
  return points.filter(p=>p.date==="ALOJAMIENTO"|| (day==="TODOS" ? DAY.test(p.date) : p.date===day));
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
    const params=new URLSearchParams({api:"1",origin,destination,travelmode:"walking"});
    if(middle.length)params.set("waypoints",middle.slice(0,3).join("|"));
    legs.push("https://www.google.com/maps/dir/?"+params.toString());
  }
  return legs;
}
function projection(point,z){
  const lat=bounded(point.lat,-85,85)*Math.PI/180;
  const scale=256*(2**z);
  return {x:(point.lon+180)/360*scale,y:(1-Math.asinh(Math.tan(lat))/Math.PI)/2*scale};
}
function fitMap(points,width,height,zoomOverride){
  const fit=()=>{
    for(let zoom=16;zoom>=10;zoom--){
      const a=points.map(p=>projection(p,zoom));
      const x=a.map(p=>p.x),y=a.map(p=>p.y);
      if(Math.max(...x)-Math.min(...x)<=width-100&&Math.max(...y)-Math.min(...y)<=height-100)return zoom;
    }
    return 10;
  };
  const z=bounded(zoomOverride||fit(),10,18);
  const a=points.map(p=>projection(p,z));
  return {zoom:z,x:(Math.min(...a.map(p=>p.x))+Math.max(...a.map(p=>p.x)))/2,
    y:(Math.min(...a.map(p=>p.y))+Math.max(...a.map(p=>p.y)))/2};
}
function el(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!=null)n.textContent=String(text);
  return n;
}
export function bindTravelMap({root,groups,address,mapLink,dayLabel}){
  const points=travelMapPoints(groups), days=travelMapDays(groups);
  if(!points.length)return;
  const mapHolder=root.querySelector("[data-trv-map-canvas]");
  const openButton=root.querySelector("[data-trv-show-map]");
  const routeBox=root.querySelector("[data-trv-map-routes]");
  const routeGroups=Array.from(root.querySelectorAll("[data-trv-map-list]"));
  const tabs=Array.from(root.querySelectorAll("[data-trv-map-day]"));
  let day=days[0]||"TODOS",consented=false,zoomOverride=null,panX=0,panY=0;
  function updateUi(){
    tabs.forEach(b=>{const yes=b.dataset.trvMapDay===day;b.setAttribute("aria-pressed",String(yes));b.classList.toggle("is-active",yes)});
    routeGroups.forEach(group=>{group.hidden=group.dataset.trvMapList!==day;});
    if(routeBox){
      routeBox.replaceChildren();
      const urls=travelRouteUrls(points,day,address);
      urls.forEach((url,i)=>{
        const a=el("a","trv-map-route-link",urls.length===1?"Abrir recorrido a pie en Google Maps":"Recorrido a pie · tramo "+(i+1)+"/"+urls.length);
        a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";
        routeBox.append(a);
      });
    }
  }
  function render(){
    if(!consented||!mapHolder)return;
    const shown=travelMapVisible(points,day);
    if(!shown.length)return;
    const width=Math.max(320,Math.round(mapHolder.clientWidth||650));
    const height=Math.max(285,Math.round(mapHolder.clientHeight||340));
    const view=fitMap(shown,width,height,zoomOverride);
    const size=2**view.zoom, x0=view.x-width/2+panX,y0=view.y-height/2+panY;
    const frag=document.createDocumentFragment(),layer=el("div","trv-map-tiles");
    const minX=Math.floor(x0/256),maxX=Math.ceil((x0+width)/256);
    const minY=Math.floor(y0/256),maxY=Math.ceil((y0+height)/256);
    for(let tileX=minX;tileX<=maxX;tileX++)for(let tileY=minY;tileY<=maxY;tileY++){
      if(tileY<0||tileY>=size)continue;
      const tile=el("img","trv-map-tile");
      tile.alt="";tile.loading="lazy";tile.decoding="async";
      tile.referrerPolicy="strict-origin-when-cross-origin";
      tile.src="https://tile.openstreetmap.org/"+view.zoom+"/"+((tileX%size+size)%size)+"/"+tileY+".png";
      tile.style.left=Math.round(tileX*256-x0)+"px";tile.style.top=Math.round(tileY*256-y0)+"px";
      layer.append(tile);
    }
    frag.append(layer);
    if(DAY.test(day)){
      const actual=shown.filter(p=>p.date===day).sort((a,b)=>a.order-b.order);
      if(actual.length>1){
        const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
        svg.classList.add("trv-map-route-svg");svg.setAttribute("viewBox","0 0 "+width+" "+height);
        svg.setAttribute("aria-hidden","true");
        const poly=document.createElementNS("http://www.w3.org/2000/svg","polyline");
        poly.setAttribute("points",actual.map(p=>{const q=projection(p,view.zoom);return Math.round(q.x-x0)+","+Math.round(q.y-y0)}).join(" "));
        poly.setAttribute("fill","none");poly.setAttribute("stroke","#0a527b");poly.setAttribute("stroke-width","3.5");
        poly.setAttribute("stroke-dasharray","6 5");poly.setAttribute("stroke-linecap","round");
        svg.append(poly);frag.append(svg);
      }
    }
    const listForDay=shown.filter(p=>p.date===day);
    for(const point of shown){
      const p=projection(point,view.zoom);
      const pin=el("button","trv-map-marker"+(point.date==="ALOJAMIENTO"?" is-lodging":""),point.date==="ALOJAMIENTO"?"⌂":DAY.test(day)?String(listForDay.indexOf(point)+1):"•");
      pin.type="button";pin.style.left=Math.round(p.x-x0)+"px";pin.style.top=Math.round(p.y-y0)+"px";
      pin.title=point.name;pin.setAttribute("aria-label","Ver "+point.name);
      pin.addEventListener("click",()=>{
        const info=mapHolder.querySelector("[data-trv-map-info]");
        if(!info)return;
        info.replaceChildren(el("strong","",point.name));
        const a=el("a","","Ver ubicación ↗");a.href=mapLink(point.query,"external");
        a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";
        info.append(a);
      });
      frag.append(pin);
    }
    const controls=el("div","trv-map-zoom");
    for(const [label,delta] of [["+",1],["−",-1]]){
      const btn=el("button","",label);btn.type="button";btn.setAttribute("aria-label",delta>0?"Ampliar mapa":"Alejar mapa");
      btn.addEventListener("click",()=>{zoomOverride=bounded(view.zoom+delta,10,18);panX=0;panY=0;render()});
      controls.append(btn);
    }
    frag.append(controls);
    const attribution=el("a","trv-map-attribution","© OpenStreetMap contributors");
    attribution.href="https://www.openstreetmap.org/copyright";attribution.target="_blank";attribution.rel="noopener noreferrer";
    frag.append(attribution);
    const info=el("div","trv-map-info");
    info.setAttribute("data-trv-map-info","");
    info.append(el("span","","Pulsa un número para abrir su ubicación"));
    frag.append(info);
    mapHolder.replaceChildren(frag);
  }
  tabs.forEach(button=>button.addEventListener("click",()=>{
    day=button.dataset.trvMapDay;zoomOverride=null;panX=0;panY=0;updateUi();render();
  }));
  if(openButton)openButton.addEventListener("click",()=>{
    if(!mapHolder)return;consented=true;mapHolder.classList.add("trv-map-loaded");render();
  });
  // Drag the viewport with a pointer: do not interfere with marker buttons or zoom controls.
  let drag=null;
  mapHolder?.addEventListener("pointerdown",e=>{
    if(!consented||e.target.closest("button,a"))return;
    drag={x:e.clientX,y:e.clientY,pointer:e.pointerId};
    mapHolder.setPointerCapture?.(e.pointerId);
  });
  mapHolder?.addEventListener("pointerup",e=>{
    if(!drag||drag.pointer!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>4){panX-=dx;panY-=dy;render();}
    drag=null;mapHolder.releasePointerCapture?.(e.pointerId);
  });
  mapHolder?.addEventListener("pointercancel",()=>{drag=null});
  updateUi();
}
