import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTravelDetail } from "./travels.js";

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
 assert.match(app,/openTravelsDetail\(state\.financeSummary, privateModeKind\)/);
 const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 assert.match(html,/travels\.css\?v=/);
});
