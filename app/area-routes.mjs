// Stable private SPA routes. Hash URLs cannot bypass Cloudflare Access.
const routes=[
 ["area-general","inicio"],["area-career","carrera"],["area-finance","finanzas"],
 ["area-calendar","agenda"],["area-partner","pareja"],["area-family","familia"],
 ["area-health","salud"],["area-objects","objetos"],["area-wealth","patrimonio"],
 ["area-projects","proyectos"],["area-travels","viajes"]
];
const areaToSlug=new Map(routes),slugToArea=new Map(routes.map(([a,s])=>[s,a]));
export function hrefForArea(areaId){return "#/"+(areaToSlug.get(areaId)||"inicio")}
export function routeFromHash(hash){
  if(!hash||hash==="#overview"||hash==="#/")return {areaId:"area-general",detailId:null};
  if(typeof hash!=="string"||!hash.startsWith("#/"))return null;
  const parts=hash.slice(2).split("/");
  const areaId=slugToArea.get(parts[0]);
  if(!areaId || parts.length>2)return null;
  if(parts.length===2){
    if(areaId!=="area-travels")return null;
    try{
      const id=decodeURIComponent(parts[1]);
      if(!id||id.length>500||id.includes("/")||id.includes("\\")||id.includes("\0"))return null;
      return {areaId,detailId:id};
    }catch{return null}
  }
  return {areaId,detailId:null};
}
export function hrefForTravel(id){
  if(typeof id!=="string"||!id.trim()||id.length>500)return hrefForArea("area-travels");
  return "#/viajes/"+encodeURIComponent(id);
}
export function isNamedArea(areaId){return areaToSlug.has(areaId)}
