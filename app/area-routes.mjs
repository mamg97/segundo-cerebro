// Stable private SPA routes. Hash URLs cannot bypass Cloudflare Access.
export const HOBBY_CATEGORIES=Object.freeze([
{id:"peliculas",title:"Películas",icon:"🎬",subtitle:"Tu filmoteca personal",description:"Películas vistas, pendientes y favoritas.",stages:["Pendientes","Vistas","Favoritas"],fields:["Título","Año","Género","Valoración","Notas"]},
{id:"series",title:"Series",icon:"📺",subtitle:"Temporadas y seguimiento",description:"Series por empezar, en curso y terminadas.",stages:["Por empezar","En curso","Terminadas"],fields:["Título","Plataforma","Temporada","Estado","Valoración"]},
{id:"libros",title:"Libros",icon:"📚",subtitle:"Lecturas y biblioteca",description:"Próximas lecturas, progreso y libros terminados.",stages:["Por leer","Leyendo","Leídos"],fields:["Título","Autor","Progreso","Estado","Notas"]},
{id:"vinos",title:"Vinos",icon:"🍷",subtitle:"Bodega y catas",description:"Vinos por probar, experiencias y favoritos.",stages:["Por probar","Catados","Favoritos"],fields:["Bodega","Denominación","Añada","Puntuación","Notas de cata"]},
{id:"rutas-moto",title:"Rutas en moto",icon:"🏍️",subtitle:"Carreteras por descubrir",description:"Rutas planificadas, recorridas y favoritas.",stages:["Por hacer","Realizadas","Favoritas"],fields:["Recorrido","Kilómetros","Duración","Mapa","Notas"]}
]);
const hobbyIds=new Set(HOBBY_CATEGORIES.map(item=>item.id));
const routes=[
 ["area-general","inicio"],["area-career","carrera"],["area-finance","finanzas"],
 ["area-calendar","agenda"],["area-partner","pareja"],["area-family","familia"],
 ["area-health","salud"],["area-objects","objetos"],["area-wealth","patrimonio"],
 ["area-projects","proyectos"],["area-travels","viajes"],["area-hobbies","hobbies"]
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
    if(areaId!=="area-travels"&&areaId!=="area-hobbies"&&areaId!=="area-partner")return null;
    try{
      const id=decodeURIComponent(parts[1]);
      if(!id||id.length>500||id.includes("/")||id.includes("\\")||id.includes("\0"))return null;
      if(areaId==="area-hobbies"&&!hobbyIds.has(id))return null;
      if(areaId==="area-partner"&&id!=="boda")return null;
      return {areaId,detailId:id};
    }catch{return null}
  }
  return {areaId,detailId:null};
}
export function hrefForTravel(id){
  if(typeof id!=="string"||!id.trim()||id.length>500)return hrefForArea("area-travels");
  return "#/viajes/"+encodeURIComponent(id);
}
export function hrefForHobby(id){return hobbyIds.has(id)?"#/hobbies/"+id:hrefForArea("area-hobbies")}
export function hrefForWedding(){return "#/pareja/boda"}
export function isNamedArea(areaId){return areaToSlug.has(areaId)}
