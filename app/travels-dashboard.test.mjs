import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lodgingMapAddress, tripMapLink, tripBudgetStatus, tripDashboardMarkup } from "./travels-dashboard.js";

function sample(overrides={}) {
  return {
    hero:"<header>Ejemplo</header>", groups:{
      accommodation:[{text:"Alojamiento Plaza Ejemplo 9, Ciudad Prueba; entrada 15:00"}],
      days:[{date:"2027-06-12",text:"Paseo de prueba"},{date:"2027-06-13",text:"Excursión de prueba"}],
      tasks:[{key:"walk",status:"PENDIENTE",text:"Reservar paseo"},{key:"bag",status:"COMPLETADA",text:"Preparar maleta"}]
    }, financeItem:{totalBudget:800,reserved:300,needed:500},
    flights:"<section>Vuelo de prueba</section>",lodging:"<section>Estancia</section>",
    bookings:"<section>Reserva</section>",budgetSection:"<section>Finanzas</section>",
    tasksSection:"<section>Checklist</section>",refsSection:"",extrasSection:"",
    dayLabel:(date)=>date,...overrides
  };
}
test("accommodation map is derived from private data and strips check-in prose",()=>{
  assert.equal(lodgingMapAddress(sample().groups),"Alojamiento Plaza Ejemplo 9, Ciudad Prueba");
  assert.equal(lodgingMapAddress({accommodation:[]}),null);
  assert.equal(tripMapLink(null),null);
  assert.match(tripMapLink("Calle Ejemplo 1, Ciudad Prueba"),/maps\.google\.com\/maps\?q=Calle%20Ejemplo%201%2C%20Ciudad%20Prueba/);
  assert.match(tripMapLink("Calle Ejemplo 1","external"),/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
});
test("dashboard never loads third party iframe automatically; consent click is explicit",()=>{
  const html=tripDashboardMarkup(sample());
  assert.match(html,/data-trv-show-map/);
  assert.match(html,/Solo|solo se compartirá/);
  assert.doesNotMatch(html,/<iframe|<img/);
  assert.match(html,/id="trv-dash-plan"/);
  assert.match(html,/id="trv-dash-tasks"/);
  assert.match(html,/id="trv-dash-budget"/);
  assert.match(html,/data-trv-day="1"/);
});
test("budget progression represents provisioning, not paid invoices",()=>{
  assert.deepEqual(tripBudgetStatus({totalBudget:800,reserved:300,needed:500}),
    {total:800,reserved:300,needed:500,percent:38});
  assert.equal(tripBudgetStatus({totalBudget:0,reserved:0}).percent,null);
  assert.equal(tripBudgetStatus({totalBudget:800,reserved:900}).percent,100);
  assert.equal(tripBudgetStatus(null).percent,null);
  assert.match(tripDashboardMarkup(sample()),/38 % del presupuesto provisionado; no equivale a gasto pagado/);
  assert.match(tripDashboardMarkup(sample()),/Fondos asignados/);
});
test("travel facts escape unsafe HTML and avoid guessing missing location",()=>{
  const attack='<img src=x onerror="alert(1)">';
  const evil=sample({groups:{accommodation:[{text:attack}],days:[{date:"2027-06-12",text:attack}],tasks:[]}});
  const html=tripDashboardMarkup(evil);
  assert.doesNotMatch(html,/<img|onerror="/);
  assert.match(html,/&lt;img/);
  const missing=tripDashboardMarkup(sample({groups:{accommodation:[],days:[],tasks:[]}}));
  assert.match(missing,/Aún no consta un alojamiento/);
  assert.doesNotMatch(missing,/data-trv-show-map/);
});
test("privacy and permissions: only private app embeds maps on demand",()=>{
  const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const travels=readFileSync(new URL("./travels.js",import.meta.url),"utf8");
  const privateWorker=readFileSync(new URL("../private-cloudflare/src/index.js",import.meta.url),"utf8");
  assert.match(index,/travels\.css\?v=0\.3\.0/);
  assert.match(app,/travels\.js\?v=0\.2\.0/);
  assert.match(travels,/tripDashboardMarkup/);
  assert.match(travels,/bindTripDashboard/);
  assert.match(privateWorker,/frame-src https:\/\/www\.google\.com https:\/\/maps\.google\.com/);
  for(const src of [travels,readFileSync(new URL("./travels-dashboard.js",import.meta.url),"utf8")]){
    assert.doesNotMatch(src,/Krakowskie|Varsovia|HMWWFRMBXW|G3CYMZ/);
  }
});
