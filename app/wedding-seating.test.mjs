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
 assert.match(html,/6 plazas, 0 ocupadas/);
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
