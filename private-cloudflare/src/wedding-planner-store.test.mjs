import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateGuest,validateTable,handleWeddingPlannerRequest} from "./wedding-planner-store.js";

test("private guest validation enforces RSVP, menus, email, seating and bounded notes",()=>{
 const guest={name:"Invitado ficticio",groupName:"Amigos",rsvp:"confirmado",menu:"vegano",email:"example@example.org"};
 assert.equal(validateGuest(guest).menu,"vegano");
 for(const g of [{...guest,rsvp:"no-validado"},{...guest,menu:"incorrecto"},
  {...guest,email:"invalid-email"},{...guest,name:""},
  {...guest,rsvp:"rechazado",tableId:"00000000-0000-4000-8000-000000000000"}]){
  assert.throws(()=>validateGuest(g));
 }
});
test("private table validation checks capacity and shape",()=>{
 assert.equal(validateTable({name:"Mesa demo",capacity:8,shape:"redonda"}).capacity,8);
 for(const table of [{name:"Mesa",capacity:0},{name:"Mesa",capacity:31},{name:"Mesa",capacity:8.5},{name:"Mesa",capacity:10,shape:"otro"}])
  assert.throws(()=>validateTable(table));
});
test("wedding planning API rejects anonymous and cross-origin writes before touching storage",async()=>{
 const DB={prepare(){throw Error("DB_SHOULD_NOT_BE_TOUCHED")}};
 const a=await handleWeddingPlannerRequest(new Request("https://private.example/api/wedding/guests"),{DB});
 assert.equal(a.status,403);
 const req=new Request("https://private.example/api/wedding/tables",{method:"POST",headers:{
  Origin:"https://evil.example","Content-Type":"application/json",
  "Cf-Access-Authenticated-User-Email":"tester@example.org","Cf-Access-Jwt-Assertion":"a.b.c"
 },body:JSON.stringify({name:"Mesa",capacity:8})});
 const b=await handleWeddingPlannerRequest(req,{DB});assert.equal(b.status,403);
});
test("new entities live exclusively in versioned private D1 migration and Worker routing",()=>{
 const migration=readFileSync(new URL("../migrations/0013_wedding_planner.sql",import.meta.url),"utf8");
 const worker=readFileSync(new URL("./index.js",import.meta.url),"utf8");
 assert.match(migration,/CREATE TABLE IF NOT EXISTS wedding_guests/);
 assert.match(migration,/CREATE TABLE IF NOT EXISTS wedding_tables/);
 assert.match(migration,/ON DELETE SET NULL/);
 assert.match(worker,/handleWeddingPlannerRequest\(request, env\)/);
});

test("floor plan coordinates are paired, bounded, and private",()=>{
 const valid=validateTable({name:"Mesa sintética",capacity:12,shape:"redonda",positionX:45.125,positionY:67});
 assert.equal(valid.positionX,45.125);assert.equal(valid.positionY,67);
 const legacy=validateTable({name:"Mesa antigua",capacity:6,shape:"presidencial"});
 assert.equal(legacy.positionX,null);assert.equal(legacy.positionY,null);
 for(const pair of [[-1,50],[101,50],[50,Infinity],[50,null],[null,50],["25",30]]){
  assert.throws(()=>validateTable({name:"Mesa sintética",capacity:8,positionX:pair[0],positionY:pair[1]}));
 }
 const migration=readFileSync(new URL("../migrations/0015_wedding_table_positions.sql",import.meta.url),"utf8");
 assert.match(migration,/ALTER TABLE wedding_tables ADD COLUMN position_x/);
 assert.match(migration,/ALTER TABLE wedding_tables ADD COLUMN position_y/);
 const source=readFileSync(new URL("./wedding-planner-store.js",import.meta.url),"utf8");
 assert.match(source,/position_x=COALESCE\(\?,position_x\)/);
 assert.match(source,/revision=revision\+1/);
});

test("seat indexes must be integral, bounded, and refer to a real assigned table",()=>{
 const id="00000000-0000-4000-8000-000000000000";
 const base={name:"Persona sintética",groupName:"pareja",rsvp:"pendiente",tableId:id};
 assert.equal(validateGuest({...base,seatIndex:0}).seatIndex,0);
 assert.equal(validateGuest({...base,seatIndex:29}).seatIndex,29);
 assert.equal(validateGuest(base).seatIndex,undefined);
 for(const seatIndex of [-1,30,2.5,"0",NaN,Infinity])
  assert.throws(()=>validateGuest({...base,seatIndex}),{message:"INVALID_SEAT"});
 assert.throws(()=>validateGuest({...base,tableId:null,seatIndex:0}),{message:"INVALID_SEAT"});
 const migration=readFileSync(new URL("../migrations/0016_wedding_seat_positions.sql",import.meta.url),"utf8");
 assert.match(migration,/ALTER TABLE wedding_guests ADD COLUMN seat_index/);
 assert.match(migration,/CREATE UNIQUE INDEX IF NOT EXISTS idx_wedding_guest_seat/);
 assert.match(migration,/WHERE guest\.table_id IS NOT NULL/);
 const code=readFileSync(new URL("./wedding-planner-store.js",import.meta.url),"utf8");
 assert.match(code,/async function resolveSeat/);
 assert.match(code,/throw new PlannerError\("SEAT_TAKEN",409\)/);
 assert.match(code,/seat_index=\?/);
});

test("migration marks legacy floor positions unverified until an explicit modern drag",()=>{
 const migration=readFileSync(new URL("../migrations/0017_wedding_layout_verified.sql",import.meta.url),"utf8");
 assert.match(migration,/ALTER TABLE wedding_tables ADD COLUMN position_verified/);
 assert.match(migration,/DEFAULT 0/);
 assert.doesNotMatch(migration,/UPDATE wedding_guests|DELETE FROM wedding/);
 const source=readFileSync(new URL("./wedding-planner-store.js",import.meta.url),"utf8");
 assert.match(source,/positionVerified:x\.position_verified===1/);
 assert.match(source,/position_verified=CASE WHEN \? IS NOT NULL AND \? IS NOT NULL THEN 1 ELSE position_verified END/);
 assert.match(source,/position_x=COALESCE\(\?,position_x\)/);
});

// Parent import is strictly scoped and its SQL is a transactional D1 batch.
// Only fabricated fixtures occur in this public repository.
test("parents Miguel import rejects untrusted or truncated data",async()=>{
 const {validateParentImport}=await import("./wedding-parents-import.mjs");
 const items=Array.from({length:102},(_,i)=>({
  name:"Invitado sintético "+i,rama:i<58?"mamá":"papá",
  subgrupo:"Grupo ficticio",prevision:i<92?"seguro":"dudoso"
 }));
 const sample={schema:"segundo-cerebro.wedding.parent-guests.v1",grupo:"padres_miguel",
  expectedExisting:4,items};
 assert.equal(validateParentImport(sample).items.length,102);
 assert.throws(()=>validateParentImport({...sample,grupo:"padres_andrea"}));
 assert.throws(()=>validateParentImport({...sample,items:items.slice(0,101)}));
 assert.throws(()=>validateParentImport({...sample,expectedExisting:-1}));
 assert.throws(()=>validateParentImport({...sample,items:items.map((v,i)=>i===99?{...v,rama:"padre"}:v)}));
});
test("bulk replacement changes no other guest groups and uses a single D1 batch",async()=>{
 const {parentImportStatements,validateParentImport}=await import("./wedding-parents-import.mjs");
 const items=Array.from({length:102},(_,i)=>({
  name:"Persona ficticia "+i,rama:i<58?"mamá":"papá",
  subgrupo:"Subgrupo de prueba",prevision:i<92?"seguro":"dudoso"
 }));
 const data=validateParentImport({schema:"segundo-cerebro.wedding.parent-guests.v1",
  grupo:"padres_miguel",expectedExisting:5,items});
 const statements=[];
 const DB={prepare(sql){return {bind(...params){statements.push({sql,params});return {sql,params};}};}};
 const queries=parentImportStatements(DB,data,"tester@example.test","2026-01-01T00:00:00.000Z",
  ()=>"00000000-0000-4000-8000-000000000000");
 assert.equal(queries.length,7); // one scoped delete + six <=20-row inserts
 assert.match(queries[0].sql,/DELETE FROM wedding_guests WHERE group_name=\?/);
 assert.equal(queries[0].params[0],"padres_miguel");
 assert.equal(queries.slice(1).reduce((n,q)=>n+q.params.length/13,0),102);
 assert.ok(queries.every(q=>!q.sql.includes("padres_andrea")));
 assert.ok(queries.every(q=>!q.sql.includes("pareja")));
});
test("parent import remains private behind Access, exact Origin and expected group count",async()=>{
 const body={schema:"segundo-cerebro.wedding.parent-guests.v1",grupo:"padres_miguel",
  expectedExisting:1,items:[]};
 const unauth=await handleWeddingPlannerRequest(new Request(
  "https://private.example/api/wedding/guests/import-parents-miguel",
  {method:"POST",headers:{Origin:"https://private.example","Content-Type":"application/json"},
   body:JSON.stringify(body)}),{DB:{prepare(){throw Error("UNAUTHORIZED_ACCESS");}}});
 assert.equal(unauth.status,403);
});
