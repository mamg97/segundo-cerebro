import assert from "node:assert/strict";
import test from "node:test";
import { menuDayNoticesFromSheet } from "./menu-day-notices.js";

test("private incomplete-day notes are projected by week without inventing food", () => {
  const data = [
    ["fecha", "estado", "motivo", "fuente", "updated_at"],
    ["2027-03-05", "SIN_DATOS", "Cena social sin detalle; desayuno sí registrado.", "test", ""],
    ["2027-03-06", "SIN_DATOS", "Evento de día completo.", "test", ""],
    ["2027-03-07", "SIN_DATOS", "Comida fuera sin cantidades.", "test", ""],
    ["2027-03-08", "PARCIAL", "Sí hubo seguimiento.", "test", ""]
  ];
  const notes = menuDayNoticesFromSheet(data, "2027-03-01", "2027-03-07");
  assert.deepEqual(notes.map(x => x.date), ["2027-03-05", "2027-03-06", "2027-03-07"]);
  assert.deepEqual(notes.map(x => x.status), ["SIN_DATOS", "SIN_DATOS", "SIN_DATOS"]);
  assert.match(notes[0].reason, /desayuno sí registrado/);
  assert.equal(Object.hasOwn(notes[0], "kcal"), false);
});

test("latest manual classification wins and malformed source fails closed", () => {
  assert.deepEqual(menuDayNoticesFromSheet([], "2027-03-01", "2027-03-07"), []);
  assert.deepEqual(menuDayNoticesFromSheet([["fecha", "motivo"], ["2027-03-05", "texto"]], "2027-03-01", "2027-03-07"), []);
  const values = [
    ["fecha", "estado", "motivo"],
    ["2027-03-03", "SIN_DATOS", "Inicial"],
    ["2027-03-03", "CUMPLIDO", "Reevaluado"],
    ["2027-03-04", "SIN_DATOS", "Sin registro"]
  ];
  assert.deepEqual(menuDayNoticesFromSheet(values, "2027-03-01", "2027-03-07").map(x => x.date), ["2027-03-04"]);
});
