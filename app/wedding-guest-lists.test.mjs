import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WEDDING_GUEST_GROUPS,guestGroupId,renderGuests} from "./wedding-planner-ui.js";
const ui=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");

test("exactly three guest lists are distinct and legacy groups are not silently reassigned",()=>{
 assert.deepEqual(WEDDING_GUEST_GROUPS,[
  ["pareja","Invitados Andrea y Miguel"],
  ["padres_miguel","Invitados padres Miguel"],
  ["padres_andrea","Invitados padres Andrea"]
 ]);
 assert.equal(guestGroupId("padres_miguel"),"padres_miguel");
 assert.equal(guestGroupId("Familia antigua"),null);
 const guests=[
  {id:"a",name:"Persona A",groupName:"pareja",rsvp:"pendiente"},
  {id:"b",name:"Persona B",groupName:"padres_miguel",rsvp:"confirmado"},
  {id:"c",name:"Persona C",groupName:"padres_andrea",rsvp:"rechazado"},
  {id:"d",name:"Persona D",groupName:"Familia antigua",rsvp:"pendiente",dietaryNotes:"Datos privados"}
 ];
 const html=renderGuests(guests,[],null,esc);
 assert.equal((html.match(/class="wed-guest-column"/g)||[]).length,3);
 assert.equal((html.match(/data-wed-quick-add="/g)||[]).length,3);
 assert.match(html,/1 sin clasificar/);
 assert.match(html,/Persona A/);assert.match(html,/Persona B/);assert.match(html,/Persona C/);assert.match(html,/Persona D/);
 assert.doesNotMatch(html,/Datos privados/);
 assert.match(renderGuests(guests,[],"d",esc),/Datos privados/);
 assert.match(renderGuests(guests,[],"d",esc),/Sin clasificar · Familia antigua/);
});
test("one-name quick add uses authenticated D1 without requiring extra details",()=>{
 assert.match(ui,/area\.querySelectorAll\("\[data-wed-quick-add\]"\)/);
 assert.match(ui,/getJson\("\/api\/wedding\/guests","POST"/);
 assert.match(ui,/name,groupName,rsvp:"pendiente",menu:"",tableId:null/);
 assert.match(ui,/focusGroup:groupName/);
 assert.match(ui,/scroll\.scrollTop=oldTop/);
 assert.match(ui,/\.focus\(\{preventScroll:true\}\)/);
 const html=renderGuests([],[],null,esc);
 for(const [id,label] of WEDDING_GUEST_GROUPS){
  assert.ok(html.includes('data-wed-quick-add="'+id+'"'));
  assert.ok(html.includes(label));
 }
});
test("clicking a name opens edit form and preserves RSVP, diet, seating and contact",()=>{
 const user={id:"guest-1",name:"Nombre & nombre",groupName:"pareja",rsvp:"confirmado",
  menu:"vegano",tableId:"table-1",email:"test@example.invalid",dietaryNotes:"Sin nueces"};
 const tables=[{id:"table-1",name:"Mesa 1",capacity:8,seated:1}];
 const html=renderGuests([user],tables,user.id,esc);
 assert.match(html,/id="wed-guest-form"/);
 assert.match(html,/Sin nueces/);
 assert.match(html,/test@example\.invalid/);
 assert.match(html,/data-wed-edit-guest="guest-1"/);
 assert.match(html,/Nombre &amp; nombre/);
 assert.match(ui,/data-wed-edit-guest/);
 assert.match(ui,/revision:existing\.revision/);
 assert.match(css,/\.wed-guest-columns\{/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-auto-columns:minmax\(235px,85vw\)/);
});
