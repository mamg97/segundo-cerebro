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
