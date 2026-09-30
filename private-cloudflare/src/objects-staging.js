import { ObjectsImageError, uploadObjectsImage } from "./objects-images.js";
import { resolveObjectsSpreadsheetId } from "./objects.js";

const QUEUE_TAB = "ImageIngestQueue";
const QUEUE_RANGE = QUEUE_TAB + "!A1:Q1000";
const MAX_BATCH = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const HEADERS = [
  "request_id","objeto_id","image_type","drive_file_id","overwrite",
  "vista_prenda","color_principal","patron","categoria_visual","capa",
  "estado_procesado","status","created_at","processed_at","error_code",
  "foto_url","miniatura_url"
];

function asBool(value) {
  return ["1","true","yes","si","sí","on"].includes(String(value ?? "").trim().toLowerCase());
}

function table(values = []) {
  const headers = (values[0] || []).map((item) => String(item ?? "").trim());
  const map = new Map(headers.map((header,index)=>[header,index]));
  return (values.slice(1) || []).map((row,index)=>({
    rowNumber:index+2,
    raw:row,
    value(name){const i=map.get(name); return i === undefined ? "" : row?.[i] ?? "";}
  }));
}

function queueFields(row) {
  return {
    requestId:String(row.value("request_id")||"").trim(),
    objetoId:String(row.value("objeto_id")||"").trim(),
    imageType:String(row.value("image_type")||"").trim().toLowerCase(),
    driveFileId:String(row.value("drive_file_id")||"").trim(),
    overwrite:asBool(row.value("overwrite")),
    vista_prenda:String(row.value("vista_prenda")||"").trim(),
    color_principal:String(row.value("color_principal")||"").trim(),
    patron:String(row.value("patron")||"").trim(),
    categoria_visual:String(row.value("categoria_visual")||"").trim(),
    capa:String(row.value("capa")||"").trim(),
    estado_procesado:String(row.value("estado_procesado")||"").trim(),
    status:String(row.value("status")||"").trim().toLowerCase(),
    createdAt:String(row.value("created_at")||"").trim()
  };
}

function columnLetter(index) {
  let value = index + 1;
  let out = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

async function readQueue(spreadsheetId, token, fetchImpl=fetch) {
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values/" + encodeURIComponent(QUEUE_RANGE) +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const response = await fetchImpl(endpoint,{headers:{Authorization:"Bearer "+token}});
  if (!response.ok) throw new Error("OBJECTS_QUEUE_READ_"+response.status);
  const values=(await response.json())?.values || [];
  if (!values.length) return [];
  const actual=(values[0]||[]).map(v=>String(v??"").trim());
  if (HEADERS.some((header,index)=>actual[index]!==header)) throw new Error("OBJECTS_QUEUE_CONTRACT_INVALID");
  return table(values);
}

async function writeQueueRow(spreadsheetId, token, rowNumber, patch, fetchImpl=fetch) {
  const data=[];
  for(const [header,value] of Object.entries(patch)){
    const index=HEADERS.indexOf(header);
    if(index<0) continue;
    data.push({
      range:QUEUE_TAB+"!"+columnLetter(index)+rowNumber,
      majorDimension:"ROWS",
      values:[[value ?? ""]]
    });
  }
  if(!data.length) return;
  const endpoint="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(spreadsheetId)+"/values:batchUpdate";
  const response=await fetchImpl(endpoint,{
    method:"POST",
    headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({valueInputOption:"RAW",data})
  });
  if(!response.ok) throw new Error("OBJECTS_QUEUE_WRITE_"+response.status);
}

async function driveFile(token,fileId,fetchImpl=fetch){
  if(!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new Error("INVALID_DRIVE_FILE_ID");
  const metaUrl="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId)+"?fields=id,name,mimeType,size,trashed";
  const metaResponse=await fetchImpl(metaUrl,{headers:{Authorization:"Bearer "+token}});
  if(!metaResponse.ok) throw new Error("OBJECTS_STAGING_META_"+metaResponse.status);
  const meta=await metaResponse.json();
  if(meta.trashed) throw new Error("OBJECTS_STAGING_FILE_TRASHED");
  const size=Number(meta.size||0);
  if(!Number.isFinite(size)||size<=0||size>MAX_IMAGE_BYTES) throw new Error("IMAGE_SIZE_INVALID");
  const contentUrl="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId)+"?alt=media";
  const contentResponse=await fetchImpl(contentUrl,{headers:{Authorization:"Bearer "+token}});
  if(!contentResponse.ok) throw new Error("OBJECTS_STAGING_DOWNLOAD_"+contentResponse.status);
  const bytes=new Uint8Array(await contentResponse.arrayBuffer());
  if(!bytes.byteLength||bytes.byteLength>MAX_IMAGE_BYTES) throw new Error("IMAGE_SIZE_INVALID");
  return {
    name:String(meta.name||"image").slice(0,120),
    mime:String(meta.mimeType||contentResponse.headers.get("content-type")||"").toLowerCase(),
    bytes
  };
}

async function trashDriveFile(token,fileId,fetchImpl=fetch){
  const endpoint="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId);
  const response=await fetchImpl(endpoint,{
    method:"PATCH",
    headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({trashed:true})
  });
  if(!response.ok) throw new Error("OBJECTS_STAGING_CLEANUP_"+response.status);
}

function errorCode(error){
  if(error instanceof ObjectsImageError) return error.code;
  const value=String(error?.message||"OBJECTS_STAGING_ERROR");
  return /^[A-Z0-9_]+$/.test(value) ? value.slice(0,120) : "OBJECTS_STAGING_ERROR";
}

async function ingestOne(env, getGoogleAccessToken, spreadsheetId, token, row, overrides={}){
  const fetchImpl=overrides.fetch || fetch;
  const fields=queueFields(row);
  const now=new Date().toISOString();

  if(fields.status==="cleanup_pending"){
    await trashDriveFile(token,fields.driveFileId,fetchImpl);
    await writeQueueRow(spreadsheetId,token,row.rowNumber,{status:"done",processed_at:now,error_code:""},fetchImpl);
    return {ok:true,requestId:fields.requestId,cleanupOnly:true};
  }

  if(fields.status!=="pending") return {ok:false,skipped:true};
  if(!fields.requestId || !fields.objetoId || !fields.driveFileId || !["original","processed","thumbnail"].includes(fields.imageType)){
    await writeQueueRow(spreadsheetId,token,row.rowNumber,{status:"error",processed_at:now,error_code:"INVALID_QUEUE_ROW"},fetchImpl);
    return {ok:false,error:"INVALID_QUEUE_ROW"};
  }

  await writeQueueRow(spreadsheetId,token,row.rowNumber,{status:"processing",error_code:""},fetchImpl);
  console.info("[objects:staging]",{stage:"processing",requestId:fields.requestId,objetoId:fields.objetoId,imageType:fields.imageType});

  try{
    const staged=await driveFile(token,fields.driveFileId,fetchImpl);
    const form=new FormData();
    form.set("objeto_id",fields.objetoId);
    form.set("image_type",fields.imageType);
    form.set("overwrite",fields.overwrite ? "true" : "false");
    for(const key of ["vista_prenda","color_principal","patron","categoria_visual","capa","estado_procesado"]){
      if(fields[key]) form.set(key,fields[key]);
    }
    form.set("image",new File([staged.bytes],staged.name,{type:staged.mime}));
    const internalRequest=new Request("https://internal.local/api/objects/"+encodeURIComponent(fields.objetoId)+"/image",{
      method:"POST",
      body:form
    });
    const result=await (overrides.uploadObjectsImage || uploadObjectsImage)(
      internalRequest,env,getGoogleAccessToken,fields.objetoId,{authenticated:true,...(overrides.uploadOverrides||{})}
    );

    let cleaned=true;
    try{
      await trashDriveFile(token,fields.driveFileId,fetchImpl);
    }catch(cleanupError){
      cleaned=false;
      console.warn("[objects:staging]",{stage:"cleanup_failed",requestId:fields.requestId,objetoId:fields.objetoId,code:errorCode(cleanupError)});
    }

    await writeQueueRow(spreadsheetId,token,row.rowNumber,{
      status:cleaned ? "done" : "cleanup_pending",
      processed_at:now,
      error_code:cleaned ? "" : "OBJECTS_STAGING_CLEANUP_PENDING",
      foto_url:result.url || "",
      miniatura_url:result.thumbnail_url || ""
    },fetchImpl);

    console.info("[objects:staging]",{stage:"done",requestId:fields.requestId,objetoId:fields.objetoId,imageType:fields.imageType,cleanup:cleaned});
    return {ok:true,result,cleanup:cleaned};
  }catch(error){
    const code=errorCode(error);
    console.warn("[objects:staging]",{stage:"failed",requestId:fields.requestId,objetoId:fields.objetoId,imageType:fields.imageType,code});
    await writeQueueRow(spreadsheetId,token,row.rowNumber,{status:"error",processed_at:now,error_code:code},fetchImpl);
    return {ok:false,error:code};
  }
}

export async function processObjectsImageQueue(env,getGoogleAccessToken,overrides={}){
  if(!env?.OBJECTS_MEDIA || typeof env.OBJECTS_MEDIA.put!=="function"){
    console.info("[objects:staging]",{stage:"skipped",code:"OBJECTS_MEDIA_NOT_CONFIGURED"});
    return {status:"media-not-configured",processed:0};
  }
  const token=await getGoogleAccessToken(env);
  const spreadsheetId=await (overrides.resolveObjectsSpreadsheetId || resolveObjectsSpreadsheetId)(env,token);
  if(!spreadsheetId) return {status:"source-pending",processed:0};
  const rows=await (overrides.readQueue || readQueue)(spreadsheetId,token,overrides.fetch||fetch);
  const candidates=rows.filter(row=>["pending","cleanup_pending"].includes(queueFields(row).status)).slice(0,MAX_BATCH);
  const results=[];
  for(const row of candidates){
    results.push(await ingestOne(env,getGoogleAccessToken,spreadsheetId,token,row,overrides));
  }
  return {status:"ok",processed:results.length,results};
}

export const OBJECTS_STAGING_QUEUE = {tab:QUEUE_TAB,headers:HEADERS,maxBatch:MAX_BATCH};
