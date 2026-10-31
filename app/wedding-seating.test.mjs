import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ROUND_CAPACITIES,seatingSummary,suggestWeddingSeating,roundSeats} from "./wedding-seating.js";
import {renderTables} from "./wedding-planner-ui.js";
const ui=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const create=(n,group="pareja",rsvp="confirmado",tableId=null)=>
 Array.from({length:n},(_,i)=>({id:group+rsvp+i,name:"Invitado "+i,groupName:group,rsvp,tableId}));
test("confirmed-only capacity projections exclude optional, pending and declined guests",()=>{
 const guests=[...create(46),...create(11,"opcionales"),...create(18,"pareja","pendiente"),...create(3,"pareja","rechazado")];
 const summary=seatingSummary(guests,[]);
 assert.equal(summary.confirmed,46);
 assert.equal(summary.pending,18);assert.equal(summary.declined,3);
 assert.equal(summary.optional,11);assert.equal(summary.unseated.length,46);
 const plans=suggestWeddingSeating(guests,[]);
 assert.deepEqual(ROUND_CAPACITIES,[6,8,10,12]);
 assert.deepEqual(new Set(plans.map(x=>x.capacity)),new Set(ROUND_CAPACITIES));
 assert.ok(plans.every(p=>p.seats>=46&&p.free>=0&&p.tableCount===p.rounds));
 assert.deepEqual(plans.find(p=>p.capacity===10),{
  capacity:10,rounds:5,presidential:false,presidentSeats:0,
  tableCount:5,seats:50,free:4,confirmed:46
 });
 assert.deepEqual(guests[0].tableId,null);
});
test("existing presidential table participates as a reference without moving any real guest",()=>{
 const tables=[{id:"pres",name:"Mesa presidencial",shape:"presidencial",capacity:6}];
 const guests=create(46);
 const opts=suggestWeddingSeating(guests,tables);
 const ten=opts.find(x=>x.capacity===10);
 assert.equal(ten.rounds,4);
 assert.equal(ten.tableCount,5);
 assert.equal(ten.seats,46);
 assert.equal(ten.free,0);
 const html=renderTables(guests,tables,null,esc);
 assert.match(html,/Mesa presidencial/);
 assert.match(html,/Distribuciones sugeridas/);
 assert.match(html,/Confirmados sin mesa/);
 assert.match(html,/5 mesas/);
 assert.match(html,/role="img"/);
 assert.match(html,/data-wed-seat-guest/);
 assert.equal(tables.length,1,"rendering does not create D1 tables");
});
test("zero confirmations still shows saved table preview, not fabricated proposals",()=>{
 const tables=[{id:"pres",name:"Presidencial",shape:"presidencial",capacity:6}];
 const guests=[...create(10,"pareja","pendiente"),...create(4,"opcionales","pendiente")];
 assert.deepEqual(suggestWeddingSeating(guests,tables),[]);
 const html=renderTables(guests,tables,null,esc);
 assert.match(html,/0\/0 confirmados ubicados/);
 assert.match(html,/En cuanto marquéis invitados como confirmados/);
 assert.match(html,/Presidencial: 0 de 6 plazas ocupadas/);
 assert.match(html,/4<\/strong><span>Opcionales/);
});
test("real seating occupancy uses all assigned guests; preset does not overwrite saved capacity",()=>{
 const tables=[{id:"t",name:"Mesa de prueba",shape:"redonda",capacity:12}];
 const guests=[...create(2,"pareja","confirmado","t"),...create(1,"pareja","pendiente","t")];
 const summary=seatingSummary(guests,tables);
 assert.equal(summary.confirmed,2);assert.equal(summary.seated,2);
 assert.equal(summary.occupied,3);assert.equal(summary.seats,12);assert.equal(summary.free,9);
 assert.equal(roundSeats(12,3).filter(x=>x.occupied).length,3);
 assert.equal(roundSeats(12,3).length,12);
 const html=renderTables(guests,tables,"t",esc);
 assert.match(html,/id="wed-table-capacity"/);
 assert.match(html,/value="12"/);
 for(const cap of [6,8,10,12])assert.match(html,new RegExp('data-wed-capacity="'+cap+'"'));
 assert.match(html,/3\/12/);
 assert.match(html,/Invitado 0/);
 assert.match(ui,/capacityInput\.value=button\.dataset\.wedCapacity/);
 assert.match(ui,/revision:existing\.revision/);
});
test("diagrams are responsive and simulated scenarios never mutate D1",()=>{
 assert.match(css,/\.wed-seating-options\{/);
 assert.match(css,/\.wed-seat-diagram\{/);
 assert.match(css,/\.wed-seat-dot\.is-occupied/);
 assert.match(css,/\.wed-seating-summary\{/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(readFileSync(new URL("./wedding-seating.js",import.meta.url),"utf8"),/fetch\(|getJson\(|INSERT INTO|UPDATE wedding_tables/);
 assert.equal(roundSeats(30,30).length,30);
 assert.equal(roundSeats(8,0).filter(x=>x.occupied).length,0);
});

test("new tables default to round 12 and existing presidential remains 6",()=>{
 const newHtml=renderTables([],[], "new",esc);
 assert.match(newHtml,/data-wed-table-new="true"/);
 assert.match(newHtml,/name="capacity" id="wed-table-capacity"[^>]+value="12"/);
 assert.match(newHtml,/<option value="redonda" selected>/);
 const presidency={id:"pres",name:"Presidencial",shape:"presidencial",capacity:6};
 const existing=renderTables([],[presidency],"pres",esc);
 assert.match(existing,/name="capacity" id="wed-table-capacity"[^>]+value="6"/);
 assert.match(existing,/data-wed-table-new="false"/);
 assert.match(ui,/event\.target\.value==="presidencial"\?"6":"12"/);
 assert.equal(suggestWeddingSeating(create(36),[])[0].capacity,12);
});
test("actual assigned guests appear around the circle with clickable names",()=>{
 const tables=[{id:"round1",name:"Mesa de pruebas",shape:"redonda",capacity:12}];
 const guests=[
  {id:"person-1",name:"Elena del Valle",groupName:"pareja",rsvp:"pendiente",tableId:"round1"},
  {id:"person-2",name:"Álvaro Otero",groupName:"padres_miguel",rsvp:"confirmado",tableId:"round1"},
  {id:"person-3",name:"Sin asiento",groupName:"pareja",rsvp:"pendiente",tableId:null}
 ];
 const html=renderTables(guests,tables,null,esc);
 assert.match(html,/data-wed-seat-detail="person-1"/);
 assert.match(html,/data-wed-seat-detail="person-2"/);
 assert.match(html,/Elena del Valle/);assert.match(html,/Álvaro Otero/);
 assert.match(html,/Libre/);
 assert.match(html,/role="group" aria-label="Mesa de pruebas: 2 de 12 plazas ocupadas"/);
 assert.match(html,/data-wed-unseat-guest="person-1"/);
 assert.match(html,/data-wed-toggle-table-picker="round1"/);
 assert.match(html,/data-wed-place-existing="round1"/);
 assert.match(html,/data-wed-add-table-guest="round1"/);
 assert.match(html,/value="person-3"/);
 assert.doesNotMatch(html,/data-wed-seat-detail="person-3"/);
 assert.match(css,/\.wed-named-table\{/);
 assert.match(css,/\.wed-named-seat\.is-filled/);
 assert.match(css,/\.wed-table-picker\.is-open\{display:grid\}/);
});
test("table-persons actions reuse canonical guest API and preserve every guest field",()=>{
 assert.match(ui,/function changeGuestTable\(guest,tableId,seatIndex=undefined\)/);
 assert.match(ui,/tableId,revision:guest\.revision/);
 assert.match(ui,/data-wed-place-existing/);
 assert.match(ui,/data-wed-add-table-guest/);
 assert.match(ui,/data-wed-unseat-guest/);
 assert.match(ui,/data-wed-seat-detail/);
 assert.match(ui,/rsvp:"pendiente",menu:"",tableId/);
 assert.match(ui,/if\(!guest\|\|guest\.tableId\|\|guest\.rsvp==="rechazado"/);
 assert.match(ui,/focusTableId:tableId/);
 assert.match(ui,/form\?\.dataset\.wedTableNew!=="true"/);
});

test("single full-width floor canvas selects a table and shows guests around it",()=>{
 const tables=[{id:"mesa-demo",name:"Mesa de demostración",shape:"redonda",capacity:12,positionX:67.5,positionY:58.25}];
 const guests=[
  {id:"fake1",name:"Lucía Ejemplo",groupName:"pareja",rsvp:"confirmado",tableId:"mesa-demo"},
  {id:"fake2",name:"Pablo Prueba",groupName:"pareja",rsvp:"pendiente",tableId:"mesa-demo"}
 ];
 const html=renderTables(guests,tables,null,esc,"mesa-demo");
 assert.match(html,/data-wed-floor-plan/);
 assert.match(html,/data-wed-floor-table="mesa-demo"/);
 assert.match(html,/left:67\.500%;top:58\.250%/);
 assert.match(html,/wed-floor-table is-selected/);
 assert.match(html,/data-wed-selected-details="mesa-demo"/);
 assert.match(html,/Lucía Ejemplo/);
 assert.match(html,/data-wed-seat-detail="fake1"/);
 assert.match(html,/data-wed-unseat-guest="fake2"/);
 assert.match(css,/\.wed-floor-scroll/);
 assert.match(css,/overflow-x:auto/);
 assert.match(ui,/setPointerCapture/);
 assert.match(ui,/pointercancel/);
 assert.match(ui,/positionX:point\.x,positionY:point\.y,revision:table\.revision/);
});
test("legacy tables without positions receive deterministic visual geometry without writes",()=>{
 const tables=Array.from({length:4},(_,i)=>({id:"table"+i,name:"Mesa "+i,shape:"redonda",capacity:12}));
 const names=Array.from({length:2},(_,i)=>({id:"synthetic"+i,name:"Persona "+i,groupName:"pareja",rsvp:"pendiente",tableId:"table0"}));
 const before=JSON.stringify({tables,names});
 const html=renderTables(names,tables,null,esc,"table2");
 assert.equal((html.match(/data-wed-floor-table="/g)||[]).length,4);
 assert.match(html,/data-wed-floor-table="table2"/);
 assert.match(html,/height:1040px/);
 assert.equal(JSON.stringify({tables,names}),before);
});

test("each physically free chair is a clickable index, while occupied indexes remain stable",()=>{
 const table={id:"synthetic-table",name:"Mesa sintética",capacity:6,shape:"presidencial"};
 const people=[
  {id:"synthetic-a",name:"Ana Ejemplo",tableId:table.id,rsvp:"pendiente",groupName:"pareja",seatIndex:4},
  {id:"synthetic-b",name:"Bruno Ensayo",tableId:table.id,rsvp:"confirmado",groupName:"pareja",seatIndex:1}
 ];
 const html=renderTables(people,[table],null,esc,table.id,2);
 assert.equal((html.match(/data-wed-seat-add="synthetic-table"/g)||[]).length,4);
 assert.match(html,/data-wed-seat-index="2"/);
 assert.doesNotMatch(html,/data-wed-seat-index="4"/);
 assert.doesNotMatch(html,/data-wed-seat-index="1"/);
 assert.match(html,/Añadir personas a Mesa sintética · Plaza 3/);
 assert.match(html,/data-wed-seat-detail="synthetic-a"/);
 assert.match(html,/data-wed-floor-plan style="display:block;height:550px;min-height:550px"/);
 assert.match(html,/class="wed-floor-scroll"[^>]+height:550px;min-height:550px/);
 assert.match(ui,/state\.seatingTargetSeatIndex=index/);
 assert.match(ui,/seatIndex:state\.seatingTargetSeatIndex/);
 assert.match(css,/\.wed-floor-scroll\{[\s\S]*?min-height:550px/);
});
test("one existing table always renders a nonempty floor, regardless of confirmation status",()=>{
 const table={id:"president-demo",name:"Presidencial ficticia",capacity:6,shape:"presidencial"};
 const people=Array.from({length:6},(_,i)=>({
  id:"guest"+i,name:"Prueba "+i,groupName:"pareja",rsvp:"pendiente",tableId:table.id,seatIndex:i
 }));
 const html=renderTables(people,[table],null,esc,table.id);
 assert.equal((html.match(/data-wed-floor-table="president-demo"/g)||[]).length,1);
 assert.match(html,/6\/6 plazas/);
 assert.equal((html.match(/data-wed-seat-add="president-demo"/g)||[]).length,0);
 assert.match(html,/0 confirmados · 0 libres/);
});
