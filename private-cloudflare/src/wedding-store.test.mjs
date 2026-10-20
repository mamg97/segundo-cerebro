import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {handleWeddingRequest,WeddingError,validateWeddingItem,WEDDING_CATEGORIES} from "./wedding-store.js";
const valid={category:"finca",status:"idea",title:"Proveedor de prueba",estimateCents:120000,contractedCents:null,paidCents:0};
test("wedding validation rejects unsafe URLs, impossible money and unknown categories",()=>{
 assert.equal(validateWeddingItem(valid).estimateCents,120000);
 for(const payload of [{...valid,category:"unknown"},{...valid,paidCents:-5},{...valid,url:"javascript:alert(1)"},{...valid,contractedCents:1000,paidCents:1001}]){
   assert.throws(()=>validateWeddingItem(payload),WeddingError);
 }
 assert.ok(WEDDING_CATEGORIES.includes("catering"));
});
test("wedding API fails closed for anonymous requests before touching D1",async()=>{
 const r=await handleWeddingRequest(new Request("https://private.example/api/wedding/items"),{DB:{prepare(){throw Error("SHOULD_NOT_READ")}}});
 assert.equal(r.status,403);assert.equal((await r.json()).code,"ACCESS_REQUIRED");
});
test("mutations reject cross-origin submissions even with proxy assertions",async()=>{
 const req=new Request("https://private.example/api/wedding/items",{method:"POST",headers:{"Origin":"https://evil.example","Content-Type":"application/json","Cf-Access-Authenticated-User-Email":"tester@example.org","Cf-Access-Jwt-Assertion":"a.b.c"},body:JSON.stringify(valid)});
 const r=await handleWeddingRequest(req,{DB:{prepare(){throw Error("SHOULD_NOT_READ")}}});
 assert.equal(r.status,403);assert.equal((await r.json()).code,"INVALID_ORIGIN");
});
test("wedding schema is versioned and photos are not embedded in static code",()=>{
 const sql=readFileSync(new URL("../migrations/0011_wedding.sql",import.meta.url),"utf8");
 const index=readFileSync(new URL("./index.js",import.meta.url),"utf8");
 assert.match(sql,/CREATE TABLE IF NOT EXISTS wedding_items/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS wedding_photos/);
 assert.match(index,/handleWeddingRequest\(request, env\)/);
});
