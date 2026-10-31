import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BODAS_LINKS,weddingTaskItems,weddingProviderItems,renderAgenda,renderProviders,renderGuests,renderTables,renderBodasDirectory} from "./wedding-planner-ui.js";

const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const script=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");

test("agenda and vendor views reuse existing wedding items rather than duplicate them",()=>{
 const items=[
  {id:"t",category:"tareas",status:"pendiente",title:"Confirmar música"},
  {id:"d",category:"tareas",status:"hecho",title:"Revisar finca"},
  {id:"p",category:"finca",status:"contactado",title:"Finca de prueba",provider:"Empresa ficticia",estimateCents:200000},
  {id:"i",category:"ideas",status:"idea",title:"Idea suelta"}
 ];
 assert.deepEqual(weddingTaskItems(items).map(i=>i.id),["t","d"]);
 assert.deepEqual(weddingProviderItems(items).map(i=>i.id),["p"]);
 assert.match(renderAgenda(items,esc),/1 de 2 completadas/);
 assert.match(renderProviders(items,esc),/2000,00/);
 assert.match(script,/state\.view==="agenda"/);
 assert.match(script,/state\.view==="proveedores"/);
});
test("Bodas.net links are direct HTTPS official URLs and never imply live scraping",()=>{
 assert.ok(BODAS_LINKS.length>=10);
 for(const [,url] of BODAS_LINKS){
  const parsed=new URL(url);
  assert.equal(parsed.protocol,"https:");
  assert.ok(parsed.hostname==="www.bodas.net"||parsed.hostname==="comunidad.bodas.net");
 }
 assert.match(renderBodasDirectory(esc),/Sin API oficial conectada/);
 assert.doesNotMatch(script,/fetch\(["']https:\/\/www\.bodas\.net/);
});
test("guest and table controls include RSVP, dietary notes, seat assignments and editing",()=>{
 const tables=[{id:"00000000-0000-4000-8000-000000000001",name:"Mesa demo",capacity:8,seated:1,shape:"redonda"}];
 const guests=[{id:"00000000-0000-4000-8000-000000000002",name:"Invitado de prueba",groupName:"Amigos",rsvp:"confirmado",menu:"vegetariano",dietaryNotes:"Sin frutos secos",tableId:tables[0].id}];
 assert.match(renderGuests(guests,tables,guests[0].id,esc),/Sin frutos secos/);
 assert.match(renderGuests(guests,tables,"new",esc),/id="wed-guest-form"/);
 assert.match(renderGuests(guests,tables,null,esc),/data-wed-edit-guest/);
 assert.match(renderTables(guests,tables,null,esc),/1\/1 confirmados ubicados/);
 assert.match(renderTables(guests,tables,"new",esc),/id="wed-table-form"/);
 assert.match(script,/getJson\("\/api\/wedding\/guests"/);
 assert.match(script,/getJson\("\/api\/wedding\/tables"/);
 assert.match(script,/revision:guest\.revision/);
 assert.match(css,/\.wed-planner-fields/);
});
