import test from "node:test";
import assert from "node:assert/strict";
import { buildEventsSheetPayload, parseCalendarVisibilityRows, findAbsentIcloudEventRows } from "./events-sheet.js";

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

test("removes only vanished future instances after a complete fresh iCloud read", () => {
  const now = Date.parse("2099-01-01T10:00:00Z");
  const existing = [
    { id: "old", calendarRef: "icloud-series-2099-01-02", sourceProvider: "calendar", status: "CONFIRMADO", startsAt: "2099-01-02T11:00:00Z", _rowNumber: 4 },
    { id: "current", calendarRef: "icloud-series-2099-01-03", sourceProvider: "calendar", status: "CONFIRMADO", startsAt: "2099-01-03T11:00:00Z", _rowNumber: 5 },
    { id: "manual", calendarRef: "icloud-series-manual", sourceProvider: "user", status: "CONFIRMADO", startsAt: "2099-01-03T10:00:00Z", _rowNumber: 6 },
    { id: "past", calendarRef: "icloud-series-past", sourceProvider: "calendar", status: "CERRADO", startsAt: "2098-12-01T10:00:00Z", _rowNumber: 7 }
  ];
  const source = { status: "ok", freshness: "live", selectedCalendarCount: 4, matchedCalendarCount: 4, updatedAt: "2099-01-01T09:59:30Z" };
  const live = [{ id: "icloud-series-2099-01-03", startsAt: "2099-01-03T11:00:00Z" }];
  assert.deepEqual(findAbsentIcloudEventRows(existing, live, source, now).map(e=>e.id), ["old"]);
});

test("never infers a cancellation from fallback, partial, stale or failed iCloud", () => {
  const now = Date.parse("2099-01-01T10:00:00Z");
  const event = { id: "old", calendarRef: "icloud-series-2099-01-02", sourceProvider: "calendar", status: "CONFIRMADO", startsAt: "2099-01-02T11:00:00Z", _rowNumber: 4 };
  const healthy = { status: "ok", freshness: "live", selectedCalendarCount: 4, matchedCalendarCount: 4, updatedAt: "2099-01-01T09:59:30Z" };
  for (const overridden of [
    { freshness: "fallback" },
    { freshness: "mixed" },
    { matchedCalendarCount: 3 },
    { status: "timeout" },
    { status: "error" },
    { updatedAt: "2098-12-31T23:59:00Z" },
    { status: "not-configured" }
  ]) {
    assert.deepEqual(findAbsentIcloudEventRows([event], [], { ...healthy, ...overridden }, now), []);
  }
});
