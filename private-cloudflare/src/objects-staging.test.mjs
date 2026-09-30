import assert from "node:assert/strict";
import test from "node:test";
import { processObjectsImageQueue, OBJECTS_STAGING_QUEUE } from "./objects-staging.js";

function queueRow(values={}) {
  return {
    rowNumber: 2,
    value(name) { return values[name] ?? ""; }
  };
}

function baseValues(overrides={}) {
  return {
    request_id:"req-001",
    objeto_id:"obj-shirt-scalpers-skyblue-001",
    image_type:"processed",
    drive_file_id:"1X2UxwRKti_ofLl-pzx7D6QY8HatUmvsq",
    overwrite:"false",
    vista_prenda:"frontal",
    color_principal:"celeste",
    patron:"liso",
    categoria_visual:"camisa",
    capa:"superior",
    estado_procesado:"procesada",
    status:"pending",
    created_at:"2026-09-30T10:00:00.000Z",
    ...overrides
  };
}

test("staging queue contract lives in the canonical Objects sheet", () => {
  assert.equal(OBJECTS_STAGING_QUEUE.tab, "ImageIngestQueue");
  assert.ok(OBJECTS_STAGING_QUEUE.headers.includes("objeto_id"));
  assert.ok(OBJECTS_STAGING_QUEUE.headers.includes("drive_file_id"));
  assert.ok(OBJECTS_STAGING_QUEUE.headers.includes("status"));
});

test("pending staged image is downloaded, ingested and trashed", async () => {
  const calls=[];
  const fakeFetch=async (input,init={})=>{
    const url=String(input);
    calls.push({url,method:init.method||"GET",body:init.body||null});
    if(url.includes("/drive/v3/files/") && url.includes("fields=")){
      return new Response(JSON.stringify({id:"file",name:"shirt.png",mimeType:"image/png",size:"8",trashed:false}),{
        status:200,headers:{"content-type":"application/json"}
      });
    }
    if(url.includes("/drive/v3/files/") && url.includes("alt=media")){
      return new Response(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),{
        status:200,headers:{"content-type":"image/png"}
      });
    }
    if(url.includes("/drive/v3/files/") && init.method==="PATCH"){
      return new Response(JSON.stringify({id:"file",trashed:true}),{status:200,headers:{"content-type":"application/json"}});
    }
    if(url.includes("sheets.googleapis.com") && url.endsWith("/values:batchUpdate")){
      return new Response(JSON.stringify({}),{status:200,headers:{"content-type":"application/json"}});
    }
    throw new Error("Unexpected fetch "+url);
  };

  let captured=null;
  const result=await processObjectsImageQueue(
    {OBJECTS_MEDIA:{put(){}}},
    async ()=>"google-token",
    {
      resolveObjectsSpreadsheetId:async ()=>"sheet-id",
      readQueue:async ()=>[queueRow(baseValues())],
      fetch:fakeFetch,
      uploadObjectsImage:async (request,_env,_token,objetoId,overrides)=>{
        assert.equal(objetoId,"obj-shirt-scalpers-skyblue-001");
        assert.equal(overrides.authenticated,true);
        const form=await request.formData();
        captured={
          objeto_id:form.get("objeto_id"),
          image_type:form.get("image_type"),
          vista_prenda:form.get("vista_prenda"),
          color_principal:form.get("color_principal"),
          patron:form.get("patron"),
          categoria_visual:form.get("categoria_visual"),
          capa:form.get("capa"),
          file:form.get("image")
        };
        return {
          ok:true,
          objeto_id:objetoId,
          image_type:"processed",
          url:"/api/objects/"+objetoId+"/image/processed?v=version-1",
          thumbnail_url:"/api/objects/"+objetoId+"/image/thumbnail?v=version-1",
          estado_procesado:"procesada",
          updated_at:"2026-09-30T10:01:00.000Z"
        };
      }
    }
  );

  assert.equal(result.status,"ok");
  assert.equal(result.processed,1);
  assert.equal(result.results[0].ok,true);
  assert.equal(captured.objeto_id,"obj-shirt-scalpers-skyblue-001");
  assert.equal(captured.image_type,"processed");
  assert.equal(captured.capa,"superior");
  assert.equal(captured.file.type,"image/png");
  assert.ok(calls.some(call=>call.method==="PATCH"));
  const queueWrites=calls.filter(call=>call.url.endsWith("/values:batchUpdate"));
  assert.equal(queueWrites.length,2);
});

test("ingest failure marks queue error and does not trash staging file", async () => {
  const calls=[];
  const fakeFetch=async (input,init={})=>{
    const url=String(input);
    calls.push({url,method:init.method||"GET"});
    if(url.includes("/drive/v3/files/") && url.includes("fields=")){
      return new Response(JSON.stringify({name:"shirt.png",mimeType:"image/png",size:"8",trashed:false}),{status:200});
    }
    if(url.includes("alt=media")){
      return new Response(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),{status:200});
    }
    if(url.includes("sheets.googleapis.com") && url.endsWith("/values:batchUpdate")){
      return new Response("{}",{status:200});
    }
    if(url.includes("/drive/v3/files/") && init.method==="PATCH"){
      throw new Error("must not trash");
    }
    throw new Error("Unexpected fetch "+url);
  };
  const result=await processObjectsImageQueue(
    {OBJECTS_MEDIA:{put(){}}},
    async ()=>"google-token",
    {
      resolveObjectsSpreadsheetId:async ()=>"sheet-id",
      readQueue:async ()=>[queueRow(baseValues())],
      fetch:fakeFetch,
      uploadObjectsImage:async ()=>{ throw new Error("OBJECTS_MEDIA_UPLOAD_FAILED"); }
    }
  );
  assert.equal(result.results[0].ok,false);
  assert.equal(result.results[0].error,"OBJECTS_MEDIA_UPLOAD_FAILED");
  assert.equal(calls.some(call=>call.method==="PATCH"),false);
});

test("cleanup_pending retries Drive trash without reingesting", async () => {
  let uploads=0;
  const fakeFetch=async (input,init={})=>{
    const url=String(input);
    if(url.includes("/drive/v3/files/") && init.method==="PATCH") return new Response("{}",{status:200});
    if(url.includes("sheets.googleapis.com") && url.endsWith("/values:batchUpdate")) return new Response("{}",{status:200});
    throw new Error("Unexpected fetch "+url);
  };
  const result=await processObjectsImageQueue(
    {OBJECTS_MEDIA:{put(){}}},
    async ()=>"token",
    {
      resolveObjectsSpreadsheetId:async ()=>"sheet-id",
      readQueue:async ()=>[queueRow(baseValues({status:"cleanup_pending"}))],
      fetch:fakeFetch,
      uploadObjectsImage:async ()=>{ uploads+=1; }
    }
  );
  assert.equal(result.results[0].cleanupOnly,true);
  assert.equal(uploads,0);
});

test("processor does not require an R2 binding", async () => {
  let tokenCalls=0;
  const result=await processObjectsImageQueue(
    {},
    async ()=>{tokenCalls+=1; return "token";},
    {
      resolveObjectsSpreadsheetId:async ()=>"sheet-id",
      readQueue:async ()=>[]
    }
  );
  assert.equal(result.status,"ok");
  assert.equal(result.processed,0);
  assert.equal(tokenCalls,1);
});
