import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, app, trips, css] = await Promise.all([
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./trips.js", import.meta.url), "utf8"),
  readFile(new URL("./trips.css", import.meta.url), "utf8")
]);
const module = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(trips));

test("Viajes is placed exactly after Proyectos in private navigation", () => {
  assert.match(app, /"area-wealth", "area-projects", "area-trips"/);
  assert.match(app, /privateModeKind === "remote" && !state\.areas\.some\(\(area\) => area\.id === "area-trips"\)/);
  assert.match(app, /if \(areaId === "area-trips" && privateModeKind === "remote"\)/);
  assert.match(app, /void openTripsDetail\(state\)/);
  assert.match(index, /trips\.css\?v=/);
  assert.match(app, /from "\.\/trips\.js\?v=/);
  assert.match(css, /\.trips-money-grid/);
});

test("Trip facts interpret the private event canonical vocabulary without hardcoded travel data", () => {
  const classify=module.classifyTripFact;
  assert.equal(classify({type:"LUGAR", summary:"DESTINO | Lugar ficticio · País ficticio"}).bucket,"destination");
  assert.equal(classify({type:"TRANSPORTE", summary:"VUELO | IDA | Despegue de prueba"}).bucket,"transport");
  assert.match(classify({type:"TRANSPORTE", summary:"VUELO | IDA | Despegue de prueba"}).label,/IDA/);
  assert.equal(classify({type:"PLAN", summary:"PLAN_DIA | 2027-03-01 | Paseo de prueba"}).bucket,"itinerary");
  assert.equal(classify({type:"PLAN", summary:"TAREA | free-tour-test | PENDIENTE | Reservar"}).bucket,"pending");
  assert.equal(classify({type:"NOTA", summary:"RESERVA | HOTEL | Confirmado de prueba"}).bucket,"bookings");
  assert.equal(classify({type:"NOTA", summary:"FINANZAS | La hoja externa conserva la autoridad"}).bucket,"payments");
  assert.equal(module.tripDisplayTitle({event:{title:"Viaje genérico"},facts:[{type:"LUGAR",summary:"DESTINO | Lugar ficticio · País ficticio"}]}),"Lugar ficticio");
});

test("Dates are not silently extended beyond calendar exclusive midnight end", () => {
  assert.match(module.tripDateRange({startsAt:"2027-03-01T00:00:00",endsAt:"2027-03-04T00:00:00"}), /1 mar 2027 – 3 mar 2027/);
  assert.equal(module.tripSafeExternalUrl("javascript:alert(1)"),null);
  assert.equal(module.tripSafeExternalUrl("http://example.com"),null);
  assert.equal(module.tripSafeExternalUrl("https://example.org/path"),"https://example.org/path");
});

test("Public repository contains only generic travel module logic", () => {
  for(const name of ["Varsovia","Krakowskie","FR1062","Andrea","G3CYMZ","HMWWFRMBXW"]){
    assert.equal(trips.includes(name),false,"private travel data in public module: "+name);
  }
  assert.match(trips,/credentials:"same-origin"/);
  assert.match(trips,/cache:"no-store"/);
  assert.match(trips,/kind=travel/);
  assert.match(trips,/financeSummary\?\.upcomingCommitments/);
});
