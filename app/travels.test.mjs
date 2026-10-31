import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTravelDetail,sortTripsNewestFirst,coverForCity,coverFromReference,coverForTravel,tripCaption } from "./travels.js";

test("viajes: datos y tareas proceden de EventoHechos, no de datos incrustados", () => {
  const parsed = parseTravelDetail({ facts: [
    { summary: "DESTINO | Ciudad Ejemplo · País Ejemplo" },
    { summary: "VUELO | IDA | Salida ejemplo sin números reales" },
    { summary: "ALOJAMIENTO | Pensión ejemplo" },
    { summary: "PLAN_DIA | 2027-03-12 | Paseo en el centro" },
    { summary: "TAREA | tour-historico | PENDIENTE | Reservar el paseo" },
    { summary: "FINANZAS | No duplicar presupuesto" }
  ] });
  assert.equal(parsed.destination[0].text,"Ciudad Ejemplo · País Ejemplo");
  assert.equal(parsed.flights[0].key,"IDA");
  assert.equal(parsed.accommodation[0].text,"Pensión ejemplo");
  assert.equal(parsed.days[0].date,"2027-03-12");
  assert.equal(parsed.tasks[0].status,"PENDIENTE");
  assert.equal(parsed.notes[0].type,"FINANZAS");
});
test("viajes: las acciones append-only alteran visualización de tareas y permiten reabrirlas", () => {
  const original = { summary:"TAREA | packing | PENDIENTE | Preparar maleta" };
  const yes = { summary:"TAREA_ESTADO | packing | COMPLETADA" };
  const no = { summary:"TAREA_ESTADO | packing | PENDIENTE" };
  assert.equal(parseTravelDetail({facts:[original,yes]}).tasks[0].status,"COMPLETADA");
  assert.equal(parseTravelDetail({facts:[original,yes,no]}).tasks[0].status,"PENDIENTE");
});
test("viajes: ordena el itinerario por fecha",()=>{
  const p=parseTravelDetail({facts:[
    {summary:"PLAN_DIA | 2027-04-13 | Segundo día"},
    {summary:"PLAN_DIA | 2027-04-12 | Primer día"}
  ]});
  assert.deepEqual(p.days.map(d=>d.date),["2027-04-12","2027-04-13"]);
});
test("viajes: no exponer fixtures personales ni datos reales en Git",()=>{
 const code = readFileSync(new URL("./travels.js",import.meta.url),"utf8");
 assert.doesNotMatch(code,/G3CYMZ|HMWWFRMBXW|Krakowskie|Varsovia|Miguel Ángel|Andrea Hernández/);
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.match(app,/if \(privateModeKind === "remote" && !state\.areas\.some\(\(area\) => area\.id === "area-travels"\)\)/);
 assert.match(app,/"area-projects", "area-travels"/);
 assert.match(app,/openTravelsDetail\(state\.financeSummary, privateModeKind, routedTravelDetailId\)/);
 const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 assert.match(html,/travels\.css\?v=/);
});

test("viajes: galería única ordenada por fecha descendente sin depender del estado",()=>{
  const trips=[
    {id:"old",startsAt:"2025-06-20T00:00:00Z",status:"CERRADO"},
    {id:"future",startsAt:"2027-01-08T00:00:00Z",status:"CONFIRMADO"},
    {id:"recent",startsAt:"2026-09-25T00:00:00Z",status:"CERRADO"},
    {id:"unparseable",startsAt:"",status:"PENDIENTE"}
  ];
  const sorted=sortTripsNewestFirst(trips);
  assert.deepEqual(sorted.map(x=>x.id),["future","recent","old","unparseable"]);
  assert.equal(trips[0].id,"old","no mutar el listado canónico");
});

test("Travel facts: newer day/hour overrides earlier proposals; map points remain private facts",()=>{
  const fake=s=>({summary:s});
  const result=parseTravelDetail({facts:[
    fake("PLAN_DIA | 2027-02-02 | Paseo antiguo"),
    fake("PLAN_HORA | 2027-02-02 | 14:00 | PROPUESTA | VISITA | Antigua"),
    fake("PLAN_DIA | 2027-02-02 | Paseo corregido"),
    fake("PLAN_HORA | 2027-02-02 | 14:00 | PROPUESTA | VISITA | Corregida"),
    fake("MAPA_PUNTO | 2027-02-02 | 10 | Plaza de ejemplo | Plaza Test City | PROPUESTA | 52.123 | 21.456"),
    fake("MAPA_PUNTO | OPCIONAL | 50 | Museo alternativo | Museo Test City | OPCIONAL | 52.12 | 21.45")
  ]});
  assert.equal(result.days.length,1);
  assert.match(result.days[0].text,/corregido/);
  assert.equal(result.slots.length,1);
  assert.equal(result.slots[0].text,"Corregida");
  assert.equal(result.points.length,2);
  assert.equal(result.points[0].lat,52.123);
  assert.equal(result.points[1].date,"OPCIONAL");
});

test("Travel gallery uses a licensed regional cover when a trip's destination is Asturias",()=>{
 const cover=coverForCity("Asturias oriental");
 assert.ok(cover);
 assert.match(cover.url,/commons\.wikimedia\.org\/wiki\/Special:FilePath\/Enol\.jpg\?width=960/);
 assert.equal(cover.author,"Rodelar");
 assert.equal(cover.license,"CC BY-SA 3.0");
 assert.match(cover.source,/commons\.wikimedia\.org\/wiki\/File:Enol\.jpg/);
 assert.equal(coverForCity("Varsovia").city,"Warsaw");
 assert.equal(coverForCity("Marbella").city,"Marbella");
 assert.equal(coverForCity("Ciudad de Prueba"),null);
});


test("destination names come from the canonical title and never append a year",()=>{
  const event={title:"Ciudad Modelo · verano 2025"};
  assert.equal(tripCaption(event), "Ciudad Modelo");
  assert.equal(tripCaption({title:"Ciudad Nueva"}), "Ciudad Nueva");
  assert.equal(tripCaption({title:"Viaje nov"},{facts:[{summary:"DESTINO | Ciudad Ficticia · País Ficticio"}]}),"Ciudad Ficticia");
});

test("travel photo comes from private cover_image reference with safe Commons source and credit",()=>{
  const ref={type:"cover_image",sourceProvider:"wikimedia_commons",
    sourceRef:"https://commons.wikimedia.org/wiki/File:Ciudad_Modelo.jpg",
    label:"Autor de ejemplo · CC BY 4.0"};
  const cover=coverFromReference(ref);
  assert.equal(cover.file,"Ciudad_Modelo.jpg");
  assert.equal(cover.credit,"Autor de ejemplo · CC BY 4.0");
  assert.deepEqual(coverForTravel({title:"Ciudad Modelo",coverReference:ref}),cover);
  assert.deepEqual(coverForTravel({title:"Ciudad Modelo"},{references:[ref]}),cover);
  for(const sourceRef of [
    "javascript:alert(1)",
    "https://commons.wikimedia.org.evil.invalid/wiki/File:Demo.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Demo.jpg",
    "http://commons.wikimedia.org/wiki/File:Demo.jpg",
    "https://commons.wikimedia.org/wiki/File:Demo.svg",
    "https://commons.wikimedia.org/wiki/File:Demo.jpg?redirect=https://evil.invalid",
    "https://commons.wikimedia.org/wiki/File:Demo%2Fprivate.jpg"
  ])assert.equal(coverFromReference({...ref,sourceRef}),null);
  assert.equal(coverFromReference({...ref,type:"ticket"}),null);
  const code=readFileSync(new URL("./travels.js",import.meta.url),"utf8");
  assert.match(code,/trv-hero-photo/);
  assert.match(code,/trv-card-photo/);
  assert.match(code,/coverReference/);
});
