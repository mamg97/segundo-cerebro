import {googleReadFetch} from "./google-read.js";
// Private Google Sheets are canonical. This module never contains personal catalogue rows or IDs.
const SPEC={
 peliculas:{title:"SEGUNDO CEREBRO - HOBBIES - PELICULAS",prefix:"pel",headers:["id","titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios","tipo_origen","estado_origen","fila_origen","revision","incidencia_migracion","actualizado_en","actualizado_por","archivado"],editable:["titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios"]},
 series:{title:"SEGUNDO CEREBRO - HOBBIES - SERIES",prefix:"ser",headers:["id","titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios","tipo_origen","estado_origen","fila_origen","revision","incidencia_migracion","actualizado_en","actualizado_por","archivado"],editable:["titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios"]},
 libros:{title:"SEGUNDO CEREBRO - HOBBIES - LIBROS",prefix:"lib",headers:["id","titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios","tipo_origen","estado_origen","fila_origen","revision","incidencia_migracion","actualizado_en","actualizado_por","archivado"],editable:["titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios"]},
 vinos:{title:"SEGUNDO CEREBRO - HOBBIES - VINOS",prefix:"vin",headers:["id","marca","tipo","denominacion","nota","precio","comentarios","fila_origen","revision","incidencia_migracion","actualizado_en","actualizado_por","archivado","tienda","tienda_url","imagen_url"],editable:["marca","tipo","denominacion","nota","precio","comentarios","tienda","tienda_url","imagen_url"]}
};
const CACHE=new Map();
export const HOBBY_TYPES=Object.freeze(Object.keys(SPEC));
export class HobbiesError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const send=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const text=(v,max)=>{const s=String(v??"").trim();if(s.length>max)throw new HobbiesError("FIELD_TOO_LONG");return s;};
const RETAILERS=Object.freeze({"Amazon":host=>host==="amazon.es"||host.endsWith(".amazon.es"),"El Corte Inglés":host=>host==="elcorteingles.es"||host.endsWith(".elcorteingles.es")});
export function normalizeWineUrl(value,kind="image"){
 const raw=text(value,1800);if(!raw)return "";
 let url;try{url=new URL(raw);}catch{throw new HobbiesError(kind==="store"?"INVALID_STORE_URL":"INVALID_IMAGE_URL");}
 if(url.protocol!=="https:"||url.username||url.password||url.port||!url.hostname.includes(".")||
    /^(localhost|127\\.|10\\.|192\\.168\\.|172\\.|169\\.254\\.)/i.test(url.hostname))
    throw new HobbiesError(kind==="store"?"INVALID_STORE_URL":"INVALID_IMAGE_URL");
 if(kind==="store"&&!Object.values(RETAILERS).some(fn=>fn(url.hostname.toLowerCase())))
    throw new HobbiesError("INVALID_STORE_URL");
 return url.href;
}
function retailerFromUrl(value){
 if(!value)return "";
 const host=new URL(value).hostname.toLowerCase();
 return Object.keys(RETAILERS).find(key=>RETAILERS[key](host))||"";
}
function safeId(v){const s=String(v||"");if(!/^[A-Za-z0-9_-]{4,90}$/.test(s))throw new HobbiesError("INVALID_ID");return s;}
function requireCategory(type){if(!Object.hasOwn(SPEC,type))throw new HobbiesError("INVALID_CATEGORY",404);return SPEC[type];}
function getActor(request){
 // Cloudflare Access sits at the perimeter; reject direct anonymous Worker calls.
 const mail=request.headers.get("Cf-Access-Authenticated-User-Email"),jwt=request.headers.get("Cf-Access-Jwt-Assertion");
 if(!mail||mail.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||!jwt||jwt.split(".").length!==3)throw new HobbiesError("ACCESS_REQUIRED",403);
 return mail.toLowerCase();
}
function checkOrigin(request){if(request.headers.get("Origin")!==new URL(request.url).origin)throw new HobbiesError("INVALID_ORIGIN",403);}
function editablePayload(spec,src,previous={}){
 if(!src||typeof src!=="object"||Array.isArray(src))throw new HobbiesError("INVALID_PAYLOAD");
 const p={...previous};
 for(const key of spec.editable){
  const val=src[key];
  if(key==="puntuacion"||key==="nota"||key==="precio"){
   if(val===null||val===""||val===undefined){p[key]="";continue;}
   const n=Number(val);
   if(!Number.isFinite(n)||n<0||(key==="precio"?n>100000:key==="puntuacion"||key==="nota"?n>10:false))throw new HobbiesError("INVALID_NUMBER");
   p[key]=n;continue;
  }
  if(key==="tienda_url"||key==="imagen_url"){
   p[key]=normalizeWineUrl(val,key==="tienda_url"?"store":"image");
   continue;
  }
  if(key==="tienda"){
   const provider=text(val,40);
   if(provider&&!Object.hasOwn(RETAILERS,provider))throw new HobbiesError("INVALID_RETAILER");
   p[key]=provider;
   continue;
  }
  if(key==="fecha_inicio"||key==="fecha_fin"){
   const date=text(val,10);
   if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new HobbiesError("INVALID_DATE");
   p[key]=date;continue;
  }
  p[key]=text(val,key==="comentarios"?4000:key==="titulo"?300:200);
 }
 if(spec.prefix==="vin"){
  const inferred=retailerFromUrl(p.tienda_url);
  if(inferred&&p.tienda&&p.tienda!==inferred)throw new HobbiesError("INVALID_RETAILER");
  p.tienda=inferred||"";
 }
 const primary=spec.editable.includes("titulo")?"titulo":"marca";
 if(!p[primary])throw new HobbiesError("TITLE_REQUIRED");
 return p;
}
function convertRow(spec,headers,values,rowNo){
 const obj={};
 for(let i=0;i<headers.length;i++)obj[headers[i]]=values?.[i]??"";
 obj.revision=Number(obj.revision)||1;
 obj.sourceRow=Number(obj.fila_origen)||null;
 obj.sheetRow=rowNo;
 obj.archivado=String(obj.archivado).toLowerCase()==="si";
 return obj;
}
export function decodeHobbiesRows(type,values){
 const spec=requireCategory(type),header=values?.[0]||[];
 if(spec.headers.some((expected,i)=>header[i]!==expected))throw new HobbiesError("SHEET_SCHEMA_MISMATCH",503);
 const out=[];
 for(let i=1;i<(values?.length||0);i++){
  if(!values[i]?.[0])continue;
  const item=convertRow(spec,header,values[i],i+1);
  if(!item.archivado)out.push(item);
 }
 return out;
}
async function loadData(type,token,sheetId,{fetcher=fetch}={}){
 const url="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(sheetId)+"/values/"+encodeURIComponent("Catalogo!A1:P2000")+"?valueRenderOption=UNFORMATTED_VALUE";
 const r=await fetcher(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},cache:"no-store"});
 if(!r.ok)throw new HobbiesError("SHEETS_READ_FAILED",502);
 return decodeHobbiesRows(type,(await r.json())?.values||[]);
}
async function readControl(id,token,{fetcher=fetch}={}){
 const u="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+"/values/"+encodeURIComponent("Control!A1:B20")+"?valueRenderOption=UNFORMATTED_VALUE";
 const r=await fetcher(u,{headers:{Authorization:"Bearer "+token}});
 if(!r.ok)throw new HobbiesError("CONTROL_UNAVAILABLE",503);
 const vals=(await r.json())?.values||[];
 const status=vals.find(x=>x[0]==="estado")?.[1];
 if(status!=="ACTIVO")throw new HobbiesError("MIGRATION_NOT_ACTIVE",503);
}
async function resolve(type,token,{fetcher=fetch,now=Date.now()}={}){
 const spec=requireCategory(type),cached=CACHE.get(type);
 if(cached?.expires>now)return cached.id;
 const query=new URLSearchParams({q:"name = '"+spec.title+"' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",fields:"files(id,name)",pageSize:"10"});
 const r=await fetcher("https://www.googleapis.com/drive/v3/files?"+query,{headers:{Authorization:"Bearer "+token}});
 if(!r.ok)throw new HobbiesError("DRIVE_SOURCE_NOT_FOUND",503);
 const matches=((await r.json())?.files||[]).filter(x=>x.name===spec.title);
 if(matches.length!==1)throw new HobbiesError(matches.length?"DUPLICATE_CANONICAL_SOURCE":"CANONICAL_SOURCE_MISSING",503);
 const id=matches[0].id;if(!/^[A-Za-z0-9_-]{20,}$/.test(id))throw new HobbiesError("INVALID_SOURCE_ID",503);
 CACHE.set(type,{id,expires:now+10*60_000});return id;
}
async function googleWrite(url,token,body,method="PUT",{fetcher=fetch}={}){
 const r=await fetcher(url,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!r.ok)throw new HobbiesError("SHEETS_WRITE_FAILED",502);
 return r.json();
}
function toRow(spec,p){
 return spec.headers.map(h=>p[h]??"");
}
async function writeExisting(id,token,type,item,{fetcher=fetch}={}){
 const spec=requireCategory(type),lastCol=type==="vinos"?"P":"Q",range="Catalogo!A"+item.sheetRow+":"+lastCol+item.sheetRow;
 const u="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+"/values/"+encodeURIComponent(range)+"?valueInputOption=RAW";
 await googleWrite(u,token,{range,majorDimension:"ROWS",values:[toRow(spec,item)]},"PUT",{fetcher});
}
async function append(id,token,type,item,{fetcher=fetch}={}){
 const spec=requireCategory(type),lastCol=type==="vinos"?"P":"Q",range="Catalogo!A:"+lastCol;
 const u="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+"/values/"+encodeURIComponent(range)+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
 await googleWrite(u,token,{majorDimension:"ROWS",values:[toRow(spec,item)]},"POST",{fetcher});
}
async function parseBody(request){
 if(!request.headers.get("Content-Type")?.startsWith("application/json"))throw new HobbiesError("JSON_REQUIRED",415);
 if(Number(request.headers.get("Content-Length")||0)>12000)throw new HobbiesError("TOO_LARGE",413);
 try{return await request.json()}catch{throw new HobbiesError("INVALID_JSON");}
}
export async function handleHobbiesRequest(request,env,getGoogleAccessToken){
 try{
  const actor=getActor(request),url=new URL(request.url),match=url.pathname.match(/^\/api\/hobbies\/(peliculas|series|libros|vinos)(?:\/([A-Za-z0-9_-]+))?$/);
  if(!match)throw new HobbiesError("INVALID_CATEGORY",404);
  const type=match[1],itemId=match[2]||null,spec=requireCategory(type),method=request.method;
  if(method!=="GET")checkOrigin(request);
  if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.GOOGLE_REFRESH_TOKEN)throw new HobbiesError("GOOGLE_NOT_CONFIGURED",503);
  const token=await getGoogleAccessToken(env),id=await resolve(type,token);
  await readControl(id,token);
  const current=await loadData(type,token,id);
  if(method==="GET"){if(itemId){const item=current.find(x=>x.id===itemId);if(!item)throw new HobbiesError("NOT_FOUND",404);return send({ok:true,item});}
   return send({ok:true,category:type,count:current.length,source:"Google Sheets",items:current});}
  if(method==="POST"&&!itemId){
   const payload=editablePayload(spec,await parseBody(request));
   const now=new Date().toISOString(),prefix=spec.prefix;
   const p=Object.fromEntries(spec.headers.map(h=>[h,""]));
   Object.assign(p,payload,{id:prefix+"-new-"+crypto.randomUUID(),revision:1,actualizado_en:now,actualizado_por:actor,archivado:""});
   await append(id,token,type,p);
   return send({ok:true,id:p.id},201);
  }
  if(!itemId||!["PATCH","DELETE"].includes(method))throw new HobbiesError("METHOD_NOT_ALLOWED",405);
  safeId(itemId);
  const existing=current.find(x=>x.id===itemId);if(!existing)throw new HobbiesError("NOT_FOUND",404);
  const body=await parseBody(request);
  const revision=Number(body?.revision);
  if(!Number.isSafeInteger(revision)||revision!==existing.revision)throw new HobbiesError("REVISION_CONFLICT",409);
  const p={...existing};
  if(method==="PATCH")Object.assign(p,editablePayload(spec,body,existing));
  if(method==="DELETE")p.archivado="si";
  p.revision=revision+1;p.actualizado_en=new Date().toISOString();p.actualizado_por=actor;
  await writeExisting(id,token,type,p);
  return send({ok:true,id:itemId,revision:p.revision});
 }catch(e){
  if(!(e instanceof HobbiesError))console.warn("Hobbies API internal failure",String(e?.name||"Error"));
  return send({ok:false,code:e instanceof HobbiesError?e.code:"HOBBIES_API_FAILED"},e instanceof HobbiesError?e.status:502);
 }
}
