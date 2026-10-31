import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ROUND_CAPACITIES,seatingSummary,suggestWeddingSeating,roundSeats} from "./wedding-seating.js";
import {renderTables,tableFloorPosition} from "./wedding-planner-ui.js";
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
 assert.match(html,/Plaza 3 libre/);
 assert.match(html,/class="wed-svg-table-wrap" data-wed-table-diagram-version="5" role="group"[^>]*aria-label="Mesa de pruebas: 2 de 12 plazas ocupadas"/);
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
 assert.match(html,/data-wed-position-x="67\.500" data-wed-position-y="58\.250"/);
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
 assert.match(html,/height:360px/);
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
 assert.match(html,/data-wed-floor-plan data-wed-table-count="1" style="display:grid;--wed-floor-columns:1;height:360px;min-height:360px"/);
 assert.match(html,/class="wed-floor-scroll"[^>]+height:360px;min-height:360px/);
 assert.match(ui,/openWeddingSeatPicker\(button,tableId,index\)/);
 assert.match(ui,/seatIndex:state\.seatingTargetSeatIndex/);
 assert.match(css,/\.wed-floor-scroll\{[\s\S]*?min-height:360px/);
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

test("a saved edge or centered point renders unchanged and does not teleport on reload",()=>{
 const table={id:"floor-example",name:"Mesa sintética",capacity:6,shape:"presidencial",positionX:14.667,positionY:50};
 const result=renderTables([], [table],null,esc,table.id);
 assert.match(result,/data-wed-position-x="14\.667" data-wed-position-y="50\.000"/);
 assert.doesNotMatch(result,/data-wed-position-x="16\.000"/);
 assert.match(ui,/boundFloorPosition\(\{/);
 assert.match(ui,/const card=tile\.getBoundingClientRect\(\),floor=stage\.getBoundingClientRect\(\)/);
 assert.doesNotMatch(ui,/tile\.offsetLeft|tile\.offsetTop/);
});

test("one presidential table is centered despite invalid legacy drag coordinates",()=>{
 const broken={id:"table-demo",name:"Mesa ficticia",shape:"presidencial",capacity:6,positionX:0,positionY:0};
 const untouched=JSON.stringify(broken);
 assert.deepEqual(tableFloorPosition(broken,0,1),{x:50,y:50});
 const html=renderTables([], [broken],null,esc,broken.id);
 assert.match(html,/data-wed-floor-table="table-demo" data-wed-position-x="50\.000" data-wed-position-y="50\.000"/);
 assert.match(html,/data-wed-floor-grip/);
 assert.match(html,/Arrastrar Mesa ficticia/);
 assert.match(html,/data-wed-center-table="table-demo"/);
 assert.match(html,/display:grid;--wed-floor-columns:1;height:360px;min-height:360px/);
 assert.equal(JSON.stringify(broken),untouched,"must not silently update persisted D1 coordinates");
});
test("compact floor accommodates four tables per row without oversized cards",()=>{
 const tables=Array.from({length:9},(_,index)=>({
  id:"demo-"+index,name:"Mesa "+index,capacity:12,shape:"redonda",positionX:null,positionY:null
 }));
 assert.deepEqual(tableFloorPosition(tables[0],0,9),{x:12.5,y:100/6});
 assert.deepEqual(tableFloorPosition(tables[3],3,9),{x:87.5,y:100/6});
 assert.deepEqual(tableFloorPosition(tables[4],4,9),{x:12.5,y:50});
 assert.deepEqual(tableFloorPosition(tables[8],8,9),{x:12.5,y:100*2.5/3});
 const html=renderTables([],tables,null,esc,"demo-0");
 assert.equal((html.match(/data-wed-floor-table="/g)||[]).length,9);
 assert.match(html,/height:1080px/);
 assert.match(css,/width:268px;height:268px/);
 assert.match(css,/min-width:1180px/);
 assert.match(ui,/state\.seatingSelectedTableId=table\.id/);
 assert.match(ui,/positionX:50,positionY:50,revision:table\.revision/);
});
test("valid saved manually positioned tables are not recentered on rerender",()=>{
 const saved={id:"saved",name:"Mesa",shape:"redonda",capacity:8,positionX:66.5,positionY:47.25};
 assert.deepEqual(tableFloorPosition(saved,0,1),{x:66.5,y:47.25});
 assert.match(renderTables([], [saved], null,esc),/data-wed-position-x="66\.500" data-wed-position-y="47\.250"/);
});

test("all earlier unverified persisted positions are ignored without changing D1",()=>{
 const old={id:"legacy",name:"Mesa presidencial",shape:"presidencial",capacity:6,positionX:15.123,positionY:33.455,positionVerified:false};
 const before=JSON.stringify(old);
 assert.deepEqual(tableFloorPosition(old,0,1),{x:50,y:50});
 assert.equal(JSON.stringify(old),before);
 const markup=renderTables([], [old],null,esc,old.id);
 assert.match(markup,/data-wed-floor-table="legacy" data-wed-position-x="50\.000" data-wed-position-y="50\.000"/);
 assert.match(markup,/wed-floor-reset/);
 assert.match(markup,/data-wed-center-table="legacy"/);
});
test("a verified center or moved position is honored after refresh",()=>{
 const table={id:"fixed",name:"Mesa prueba",shape:"redonda",capacity:12,positionX:62.25,positionY:54.125,positionVerified:true};
 assert.deepEqual(tableFloorPosition(table,0,1),{x:62.25,y:54.125});
 assert.match(renderTables([], [table],null,esc),/data-wed-position-x="62\.250" data-wed-position-y="54\.125"/);
 const frontend=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(frontend,/const calibrate=/);
 assert.match(frontend,/tile\.style\.transform="none"/);
 assert.match(frontend,/requestAnimationFrame\(calibrate\)/);
 assert.match(frontend,/tile\.style\.position="relative"/);
});

test("CSS grid is the fallback when the floor drag script cannot execute",()=>{
 const html=renderTables([], [{id:"one",name:"Presidencial",capacity:6,shape:"presidencial"}], null,esc);
 assert.match(html,/data-wed-table-count="1"/);
 assert.match(html,/style="position:relative;left:auto;top:auto;transform:none"/);
 assert.match(css,/\.wed-floor-plan\{[\s\S]*?display:grid;grid-template-columns/);
 assert.match(css,/\.wed-floor-table\{[\s\S]*?position:relative;transform:none;left:auto;top:auto;place-self:center/);
 assert.doesNotMatch(html,/style="left:50\.000%;top:50\.000%"/);
 assert.match(ui,/tile\.style\.transform="translate3d\("/);
 assert.match(ui,/moveFloorPosition\(drag\.start,dx,dy,dimensions\(\)\)/);
});

test("six assigned guests render in six distinct uniformly spaced circular seats",()=>{
 const table={id:"pres-geometry",name:"Mesa sintética",capacity:6,shape:"presidencial"};
 const guests=Array.from({length:6},(_,i)=>({
  id:"synthetic-person-"+i,name:"Persona "+i,tableId:table.id,
  seatIndex:i,groupName:"pareja",rsvp:"pendiente"
 }));
 const html=renderTables(guests,[table],null,esc,table.id);
 assert.match(html,/class="wed-svg-table" role="button" tabindex="0" data-wed-edit-table="pres-geometry"/);
 assert.match(html,/aria-label="Editar Mesa sintética"/);
 assert.match(html,/class="wed-floor-seat-svg"/);
 assert.equal((html.match(/class="wed-svg-chair is-filled"/g)||[]).length,6);
 assert.equal((html.match(/class="wed-svg-chair is-filled" role="button" tabindex="0" data-wed-seat-detail="synthetic-person-/g)||[]).length,6);
 const slots=[...html.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="18" fill="#59a7fc"/g)]
  .map(m=>({x:+m[1],y:+m[2]}));
 assert.equal(slots.length,6);
 assert.equal(new Set(slots.map(p=>p.x+","+p.y)).size,6);
 const distances=slots.map(p=>Math.hypot(p.x-134,p.y-134));
 assert.ok(Math.max(...distances)-Math.min(...distances)<.02,"same distance from table");
 const angles=slots.map(p=>Math.atan2(p.y-134,p.x-134));
 for(let i=0;i<slots.length;i++){
  const delta=(angles[(i+1)%slots.length]-angles[i]+Math.PI*4)%(Math.PI*2);
  assert.ok(Math.abs(delta-Math.PI/3)<.001,"60 degrees between seats");
 }
 assert.match(css,/\.wed-floor-table \.wed-floor-seat-svg\{/);
 assert.match(css,/\.wed-floor-seat-svg \.wed-svg-chair/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/pointer-events:auto/);
 assert.match(ui,/\[data-wed-seat-detail\],\[data-wed-seat-add\],\[data-wed-edit-table\]/);
});
test("twelve empty places remain independent clickable circular buttons",()=>{
 const table={id:"table-twelve",name:"Mesa libre",capacity:12,shape:"redonda"};
 const html=renderTables([], [table],null,esc,table.id);
 assert.equal((html.match(/class="wed-svg-chair is-empty"/g)||[]).length,12);
 assert.equal((html.match(/data-wed-seat-index="\d+"/g)||[]).length,12);
 assert.equal((html.match(/data-wed-seat-add="table-twelve"/g)||[]).length,12);
 assert.match(html,/aria-label="Añadir invitado en plaza 1 de Mesa libre"/);
 assert.match(html,/data-wed-floor-grip/);
 assert.doesNotMatch(html,/wed-floor-occupancy/);
 assert.match(css,/\.wed-floor-table\.is-selected\{border:0;box-shadow:none\}/);
});
test("capacity 13 through 30 retains all circles with smaller diameters",()=>{
 for(const [count,diameter] of [[13,30],[18,30],[19,24],[24,24],[25,20],[30,20]]){
  const html=renderTables([], [{id:"synthetic-"+count,name:"Mesa",capacity:count,shape:"redonda"}],null,esc);
  assert.equal((html.match(/data-wed-seat-index="\d+"/g)||[]).length,count);
  assert.equal((html.match(new RegExp(' r="'+(diameter/2)+'" fill="#0b1727"',"g"))||[]).length,count);
 }
});
test("pending guests keep all occupied seats visible without altering D1",()=>{
 const table={id:"p",name:"Presidencial ficticia",shape:"presidencial",capacity:6};
 const people=Array.from({length:6},(_,i)=>({
  id:"fake-"+i,name:"Invitado "+i,groupName:"pareja",rsvp:"pendiente",tableId:"p",seatIndex:i
 }));
 const before=JSON.stringify(people);
 const html=renderTables(people,[table],null,esc,"p");
 const diagram=html.slice(html.indexOf('<div class="wed-svg-table-wrap"'),html.indexOf("</article>"));
 assert.match(diagram,/class="wed-floor-seat-svg"/);
 assert.equal((diagram.match(/class="wed-svg-chair is-filled"/g)||[]).length,6);
 assert.equal((diagram.match(/<circle cx="[\d.]+" cy="[\d.]+" r="18" fill="#59a7fc"/g)||[]).length,6);
 assert.equal((diagram.match(/data-wed-seat-detail="fake-/g)||[]).length,18,"six chairs, six near-seat labels and six fallback legend buttons");
 assert.equal(JSON.stringify(people),before);
 assert.match(css,/\.wed-floor-table \.wed-floor-seat-svg\{/);
});
test("top-right plan controls provide one new-table action and a fullscreen exit",()=>{
 const t={id:"d",name:"Demo",capacity:12,shape:"redonda"};
 const normal=renderTables([], [t],null,esc,"d",null,false);
 const expanded=renderTables([], [t],null,esc,"d",null,true);
 assert.equal((normal.match(/data-wed-new-table/g)||[]).length,1);
 assert.match(normal,/class="wed-floor-actions"/);
 assert.match(normal,/data-wed-floor-expand aria-expanded="false"/);
 assert.match(normal,/aria-label="Ampliar plano a pantalla completa"/);
 assert.match(expanded,/class="wed-floor-shell is-expanded" data-wed-floor-shell/);
 assert.match(expanded,/data-wed-floor-expand aria-expanded="true"/);
 assert.match(expanded,/aria-label="Cerrar pantalla completa"/);
 assert.match(expanded,/title="Cerrar pantalla completa"/);
 const code=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(code,/setWeddingFloorExpanded\(!state\.seatingFloorExpanded\)/);
 assert.match(code,/event\.key!=="Escape"/);
 assert.match(code,/event\.stopImmediatePropagation\(\)/);
 assert.match(code,/stage\.dispatchEvent\(new Event\("wed-floor-recalibrate"\)\)/);
 assert.match(code,/function openNewWeddingTableModal\(\)/);
 assert.match(css,/\.wed-floor-shell\.is-expanded\{[\s\S]*?position:fixed;inset:0/);
 assert.match(css,/\.wed-floor-shell\.is-expanded \.wed-floor-scroll\{[\s\S]*?overflow:auto/);
});
test("empty floor still offers accessible new-table action",()=>{
 const html=renderTables([],[],null,esc);
 assert.match(html,/data-wed-new-table/);
 assert.match(html,/data-wed-floor-expand/);
 assert.match(html,/Todavía no hay mesas/);
});

test("presidential seat crown is a descendant of the round table, not an offset sibling",()=>{
 const table={id:"pres-coordinates",name:"Presidencial",shape:"presidencial",capacity:6};
 const guests=Array.from({length:6},(_,i)=>({
  id:"person-"+i,name:"Persona "+i,tableId:table.id,seatIndex:i,groupName:"pareja",rsvp:"confirmado"
 }));
 const before=JSON.stringify(guests);
 const markup=renderTables(guests,[table],null,esc,table.id);
 const article=markup.slice(markup.indexOf('<article class="wed-floor-table'),markup.indexOf('</article>'));
 assert.match(article,/<div class="wed-svg-table-wrap"[^>]*>\s*<svg class="wed-floor-seat-svg"/);
 assert.match(article,/data-wed-table-diagram-version="5"/);
 assert.equal((article.match(/class="wed-svg-chair is-filled"/g)||[]).length,6);
 assert.equal((article.match(/data-wed-seat-detail="person-/g)||[]).length,18,"six chairs, six lateral labels and six fallback names");
 assert.match(article,/<\/svg>[\s\S]*?class="wed-seat-inline-leaders"[\s\S]*?class="wed-floor-seat-legend"[\s\S]*?<\/div><\/div>\s*$/);
 assert.equal(JSON.stringify(guests),before,"the view must never change saved D1 guest assignments");
 assert.match(css,/\.wed-floor-table \.wed-floor-seat-svg/);
});

test("fullscreen is a separate top-layer dialog with two independent ways to escape",()=>{
 assert.match(ui,/modal\.showModal\(\)/);
 assert.match(ui,/modal\.addEventListener\("cancel"/);
 assert.match(ui,/emergency\.addEventListener\("click"/);
 assert.match(ui,/emergency\.setAttribute\("aria-label","Cerrar plano ampliado"\)/);
 assert.match(ui,/if\(weddingFloorPortal\)setWeddingFloorExpanded\(false\)/);
 assert.match(ui,/if\(anchor\.parentNode\)anchor\.parentNode\.replaceChild\(live,anchor\)/);
 assert.match(css,/\.wed-fullscreen-dialog\{/);
 assert.match(css,/\.wed-fullscreen-dialog > \.wed-floor-emergency-close/);
 assert.match(ui,/\.wed-floor-seat-svg \[role=button\]/);
 assert.match(ui,/new MouseEvent\("click",\{bubbles:true,cancelable:true\}\)/);
});

test("full names stay readable in a numbered non-overlapping table legend",()=>{
 const table={id:"names-table",name:"Mesa completa",shape:"redonda",capacity:6};
 const people=[
  {id:"alpha",name:"María del Carmen Hernández López",seatIndex:4,rsvp:"confirmado",tableId:table.id,groupName:"pareja"},
  {id:"beta",name:"José Antonio Fernández Domínguez",seatIndex:1,rsvp:"pendiente",tableId:table.id,groupName:"pareja"}
 ];
 const before=JSON.stringify(people);
 const markup=renderTables(people,[table],null,esc,table.id);
 const floor=markup.slice(markup.indexOf('<article class="wed-floor-table'),markup.indexOf("</article>"));
 assert.match(floor,/class="wed-floor-seat-legend"/);
 assert.match(floor,/>María del Carmen Hernández López</);
 assert.match(floor,/>José Antonio Fernández Domínguez</);
 assert.match(floor,/aria-label="Plaza 5: María del Carmen Hernández López"/);
 assert.match(floor,/aria-label="Plaza 2: José Antonio Fernández Domínguez"/);
 assert.match(floor,/data-wed-seat-detail="alpha"/);
 assert.match(floor,/data-wed-seat-detail="beta"/);
 assert.match(css,/\.wed-floor-seat-legend\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.wed-floor-seat-full-name\{[\s\S]*?overflow-wrap:anywhere/);
 assert.equal(JSON.stringify(people),before,"no D1 assignment changes");
});
test("search only offers free guests and uses typed name matching",()=>{
 const table={id:"first",name:"Primera",capacity:12,shape:"redonda"};
 const other={id:"second",name:"Segunda",capacity:12,shape:"redonda"};
 const people=[
  {id:"free",name:"Álvaro de la Fuente",tableId:null,rsvp:"pendiente",groupName:"pareja"},
  {id:"taken",name:"Daniel Pérez Sánchez",tableId:"second",rsvp:"pendiente",groupName:"pareja"}
 ];
 const html=renderTables(people,[table,other],null,esc,"first");
 const picker=html.slice(html.indexOf('<form data-wed-place-existing="first"'),html.indexOf("</form>",html.indexOf('<form data-wed-place-existing="first"')));
 assert.match(picker,/data-wed-guest-search/);
 assert.match(picker,/value="free"/);
 assert.doesNotMatch(picker,/value="taken"/);
 assert.match(picker,/data-wed-guest-search-status aria-live="polite"/);
 assert.match(ui,/search\.addEventListener\("input",refresh\)/);
 assert.match(ui,/terms\.every\(word=>fold\(item\.label\)\.includes\(word\)\)/);
 assert.match(ui,/!guest\.tableId&&guest\.rsvp!=="rechazado"/);
});
test("dragging and centering save D1 positions without rebuilding expanded floor",()=>{
 assert.match(ui,/const persist=async\(point,rollback=current\)=>/);
 assert.match(ui,/Object\.assign\(table,saved\.item\)/);
 assert.match(ui,/void persist\(complete\.previous,complete\.start\)/);
 assert.match(ui,/tile\.addEventListener\("wed-floor-center"/);
 assert.match(ui,/if\(weddingFloorPortal\)\{[\s\S]*?tile\.dispatchEvent\(new Event\("wed-floor-center"\)\)/);
 assert.match(ui,/tile\.dataset\.wedSaving="true"/);
 assert.match(ui,/tile\.classList\.remove\("is-saving"\)/);
 assert.match(css,/\.wed-floor-plan\{grid-auto-rows:var\(--wed-floor-row-height,360px\)/);
});

test("new-table action opens a visible modal with validation and API persistence",()=>{
 assert.match(ui,/function openNewWeddingTableModal\(\)/);
 assert.match(ui,/modal\.className="wed-new-table-dialog"/);
 assert.match(ui,/modal\.appendChild\(form\)/);
 assert.match(ui,/modal\.showModal\(\)/);
 assert.match(ui,/getJson\("\/api\/wedding\/tables","POST",payload\)/);
 assert.match(ui,/notice\.textContent=errorMsg\(error\)/);
 assert.match(css,/\.wed-new-table-dialog\{/);
 const html=renderTables([], [{id:"x",name:"Existente",shape:"redonda",capacity:12}], "new",esc);
 assert.match(html,/id="wed-table-form"/);
 assert.match(html,/name="name" maxlength="180" required/);
});
test("free chair opens nearby filtered choices without closing fullscreen",()=>{
 assert.match(ui,/function openWeddingSeatPicker\(anchor,tableId,seatIndex\)/);
 assert.match(ui,/const eligible=state\.guests\.filter\(g=>!g\.tableId&&g\.rsvp!=="rechazado"\)/);
 assert.match(ui,/panel\.style\.left=x\+"px";panel\.style\.top=y\+"px"/);
 assert.match(ui,/input\.addEventListener\("input",render\)/);
 assert.match(ui,/words\.every\(w=>fold\(g\.name\)\.includes\(w\)\)/);
 assert.match(ui,/await changeGuestTable\(live,tableId,seatIndex\)/);
 assert.match(ui,/if\(expanded&&active\(\)\)setWeddingFloorExpanded\(true\)/);
 assert.match(css,/\.wed-seat-popover\{/);
});
test("near-seat names have numbered non-crossing leader rails",()=>{
 const table={id:"rail",name:"Mesa",capacity:12,shape:"redonda"};
 const guests=Array.from({length:12},(_,i)=>({
  id:"g"+i,name:"Invitado de nombre compuesto "+i,seatIndex:i,
  tableId:table.id,rsvp:"confirmado",groupName:"pareja"
 }));
 const previous=JSON.stringify(guests);
 const html=renderTables(guests,[table],null,esc,table.id);
 const article=html.slice(html.indexOf('<article class="wed-floor-table'),html.indexOf("</article>"));
 assert.match(article,/class="wed-seat-inline-leaders"/);
 assert.match(article,/class="wed-seat-inline-labels"/);
 assert.equal((article.match(/class="wed-seat-inline-label is-/g)||[]).length,12);
 assert.equal((article.match(/<path d="M/g)||[]).length,12);
 for(const name of guests.map(g=>g.name))assert.match(article,new RegExp(name));
 assert.match(css,/\.wed-seat-inline-label\.is-left\{left:0\}/);
 assert.match(css,/\.wed-seat-inline-label\.is-right\{left:456px\}/);
 assert.equal(JSON.stringify(guests),previous);
});
test("zoom in, out, 100 percent and fit keep floor scroll and coordinates",()=>{
 const html=renderTables([], [{id:"z",name:"Zoom",shape:"redonda",capacity:12}],null,esc,"z");
 for(const marker of ["data-wed-zoom-in","data-wed-zoom-out","data-wed-zoom-reset","data-wed-zoom-fit"])assert.match(html,new RegExp(marker));
 assert.match(ui,/state\.seatingFloorZoom=Math\.max\(\.5,Math\.min\(1\.6/);
 assert.match(ui,/stage\.style\.zoom=String\(state\.seatingFloorZoom\)/);
 assert.match(ui,/stage\.dispatchEvent\(new Event\("wed-floor-recalibrate"\)\)/);
 assert.match(css,/min-width:max\(1180px,calc\(var\(--wed-floor-columns,1\)\*630px\)\)/);
 assert.match(css,/\.wed-floor-scroll\{[\s\S]*?overflow-x:auto;overflow-y:auto/);
});

test("newly created table is selected and scrolled into view after save",()=>{
 assert.match(ui,/const previousIds=new Set\(state\.tables\.map\(table=>table\.id\)\)/);
 assert.match(ui,/const added=state\.tables\.find\(table=>!previousIds\.has\(table\.id\)\)/);
 assert.match(ui,/state\.seatingSelectedTableId=newId;show\(\)/);
 assert.match(ui,/tile\?\.scrollIntoView\(\{block:"center",inline:"nearest",behavior:"smooth"\}\)/);
});
