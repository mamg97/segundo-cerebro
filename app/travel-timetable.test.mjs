import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {travelScheduleRows,travelScheduleMarkup} from "./travel-timetable.js";
import {parseTravelDetail} from "./travels.js";

function fixture(){
 const facts=[
  {summary:"PLAN_DIA | 2027-04-01 | Primer día de prueba"},
  {summary:"PLAN_DIA | 2027-04-02 | Segundo día de prueba"},
  {summary:"PLAN_HORA | 2027-04-02 | 10:00 | PENDIENTE | TOUR | Paseo por reservar"},
  {summary:"PLAN_HORA | 2027-04-01 | 20:45 | CONFIRMADO | TRANSPORTE | Vuelo de ejemplo"},
  {summary:"PLAN_HORA | 2027-04-02 | 12:00 | PROPUESTA | VISITA | Visitar el museo"}
 ];
 return parseTravelDetail({facts});
}
test("PLAN_HORA facts produce chronological rows with hour on left and days as columns",()=>{
  const groups=fixture(),grid=travelScheduleRows(groups);
  assert.equal(groups.slots.length,3);
  assert.deepEqual(grid.days.map(d=>d.date),["2027-04-01","2027-04-02"]);
  assert.ok(grid.times.indexOf("10:00")<grid.times.indexOf("20:45"));
  const html=travelScheduleMarkup(groups,date=>date);
  assert.match(html,/<th scope="col" class="trv-time-axis">Hora<\/th>/);
  assert.match(html,/<colgroup><col class="trv-time-col"><col class="trv-day-col"><col class="trv-day-col"><\/colgroup>/);
  assert.match(html,/Desliza la tabla para ver los demás días/);
  assert.match(html,/<th scope="row" class="trv-time-axis">20:45<\/th>/);
  assert.match(html,/Paseo por reservar/);
  assert.match(html,/data-state="PENDIENTE"/);
  assert.match(html,/data-state="CONFIRMADO"/);
  assert.match(html,/Ver las notas completas por día/);
});
test("invalid times, status, and HTML cannot become injected markup",()=>{
  const parsed=parseTravelDetail({facts:[
    {summary:"PLAN_HORA | 2027-04-01 | 99:99 | CONFIRMADO | VISITA | No válida"},
    {summary:'PLAN_HORA | 2027-04-02 | 10:00 | <img src=x onerror=alert(1)> | VISITA | <script>alert(1)</script>'},
  ]});
  const out=travelScheduleMarkup(parsed,d=>d);
  assert.doesNotMatch(out,/<script>|<img src=x|data-state="<img/);
  assert.match(out,/&lt;script&gt;/);
  assert.doesNotMatch(out,/No válida/);
  assert.match(out,/data-state="PROPUESTA"/);
});
test("no trip schedule or real private data is embedded in public code",()=>{
 const js=readFileSync(new URL("./travel-timetable.js",import.meta.url),"utf8");
 const dashboard=readFileSync(new URL("./travels-dashboard.js",import.meta.url),"utf8");
 assert.match(dashboard,/travelScheduleMarkup\(groups,dayLabel\)/);
 for(const str of ["Varsovia","Marbella","Ryanair","FR1062","Krakowskie","Miguel","Andrea"]){
  assert.equal(js.includes(str),false);
 }
});

test("compact itinerary distinguishes empty and occupied hours, preserving descriptions and statuses",()=>{
  const markup=travelScheduleMarkup(fixture(),date=>date);
  assert.match(markup,/<tr class="trv-time-row-empty"><th scope="row" class="trv-time-axis">08:00<\/th>/);
  assert.match(markup,/<tr class="trv-time-row-active"><th scope="row" class="trv-time-axis">10:00<\/th>/);
  assert.match(markup,/<tr class="trv-time-row-active"><th scope="row" class="trv-time-axis">20:45<\/th>/);
  assert.match(markup,/Paseo por reservar/);
  assert.match(markup,/CONFIRMADO/);
  const css=readFileSync(new URL("./travels.css",import.meta.url),"utf8");
  assert.match(css,/\.trv-timetable tbody \.trv-time-row-empty td\{height:20px\}/);
  assert.match(css,/grid-template-areas:"category status" "description description"/);
  assert.match(css,/\.trv-timetable tbody td\{height:auto;/);
  assert.doesNotMatch(css,/\.trv-timetable tbody td\{height:63px/);
});
