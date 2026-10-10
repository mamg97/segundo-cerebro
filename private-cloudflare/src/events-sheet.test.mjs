import test from "node:test";
import assert from "node:assert/strict";
import { buildEventsSheetPayload, parseCalendarVisibilityRows } from "./events-sheet.js";

test("buildEventsSheetPayload parses canonical event rows and rules", () => {
  const payload = buildEventsSheetPayload([
    { values: [
      ["evento_id","title","kind","status","starts_at","ends_at","location","participants","calendar_ref","finance_ref","objects_list_ref","summary","final_summary","sensitivity","source_provider","source_updated_at","updated_at"],
      ["evt-future","Evento futuro","social","CONFIRMADO","2099-01-10T18:00:00+01:00","2099-01-10T23:00:00+01:00","Madrid","A|B","cal-1","","","Resumen","","confidencial","calendar","2099-01-01T00:00:00Z","2099-01-01T00:00:00Z"],
      ["evt-old","Evento pasado","travel","CONFIRMADO","2000-01-01T10:00:00+01:00","2000-01-01T12:00:00+01:00","","","","","","","","confidencial","events","2000-01-01T00:00:00Z","2000-01-01T00:00:00Z"]
    ]},
    { values: [
      ["fact_id","evento_id","fact_type","summary","happened_at","source_provider","source_ref","created_at"],
      ["f1","evt-future","PLAN","Plan de prueba","2099-01-01T10:00:00+01:00","other","ref","2099-01-01T10:00:00Z"]
    ]},
    { values: [
      ["ref_id","evento_id","ref_type","source_provider","source_ref","label","created_at"],
      ["r1","evt-future","ticket","drive","file-1","Entrada","2099-01-01T10:00:00Z"]
    ]},
    { values: [
      ["id","match_terms","display_title","kind","enabled","note","exclude_terms"],
      ["rule-1","boda|prueba","Boda de prueba","social",true,"Nota","preboda"]
    ]}
  ]);

  assert.equal(payload.events.length, 2);
  assert.deepEqual(payload.events[0].participants, []);
  const future = payload.events.find((item) => item.id === "evt-future");
  assert.deepEqual(future.participants, ["A","B"]);
  assert.equal(future.status, "CONFIRMADO");
  assert.equal(payload.events.find((item) => item.id === "evt-old").status, "CERRADO");
  assert.equal(payload.facts[0].eventId, "evt-future");
  assert.equal(payload.references[0].sourceProvider, "drive");
  assert.deepEqual(payload.rules[0].matchTerms, ["boda","prueba"]);
  assert.deepEqual(payload.rules[0].excludeTerms, ["preboda"]);
  assert.equal(payload.summary.activeCount, 1);
  assert.equal(payload.summary.historyCount, 1);
});

test("visibility rows from private Sheet preserve false and default untouched calendars", () => {
  const rows = parseCalendarVisibilityRows([
    ["provider", "calendar_id", "calendar_name", "visible", "updated_at"],
    ["google-calendar", "private-cmu-id", "Origen institucional", false, "2099-01-01"],
    ["google-calendar", "private-personal-id", "Personal", true, "2099-01-01"]
  ]);
  assert.deepEqual(rows.map(({ calendarId, visible }) => ({ calendarId, visible })), [
    { calendarId: "private-cmu-id", visible: false },
    { calendarId: "private-personal-id", visible: true }
  ]);
});
