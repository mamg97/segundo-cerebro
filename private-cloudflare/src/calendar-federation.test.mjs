import assert from "node:assert/strict";
import test from "node:test";
import { mergeCalendarSources } from "./calendar-federation.js";

test("federated calendar keeps unique events from iCloud and Google", () => {
  const merged = mergeCalendarSources(
    { status: "ok", value: { events: [{ id: "i1", title: "Viaje", startsAt: "2099-01-02T10:00:00Z", endsAt: "2099-01-02T11:00:00Z", sourceRefs: ["source-icloud-calendar"] }], source: { selectedCalendarCount: 2, matchedCalendarCount: 2, freshness: "live" } } },
    { status: "ok", value: { events: [{ id: "g1", title: "Curso", startsAt: "2099-01-03T18:00:00Z", endsAt: "2099-01-03T20:00:00Z", sourceRefs: ["source-google-calendar"] }], source: { selectedCalendarCount: 3, matchedCalendarCount: 3, freshness: "live" } } }
  );
  assert.deepEqual(merged.events.map((item) => item.title), ["Viaje", "Curso"]);
  assert.equal(merged.source.selectedCalendarCount, 5);
  assert.equal(merged.source.matchedCalendarCount, 5);
  assert.equal(merged.source.freshness, "live");
});

test("duplicate provider copies collapse and preserve both source refs", () => {
  const duplicate = { title: "Mismo evento", startsAt: "2099-01-03T18:00:00+01:00", endsAt: "2099-01-03T20:00:00+01:00" };
  const merged = mergeCalendarSources(
    { status: "ok", value: { events: [{ id: "i1", ...duplicate, sourceRefs: ["source-icloud-calendar"] }], source: { selectedCalendarCount: 1, matchedCalendarCount: 1, freshness: "live" } } },
    { status: "ok", value: { events: [{ id: "g1", ...duplicate, sourceRefs: ["source-google-calendar"] }], source: { selectedCalendarCount: 1, matchedCalendarCount: 1, freshness: "live" } } }
  );
  assert.equal(merged.events.length, 1);
  assert.deepEqual(merged.events[0].sourceRefs.sort(), ["source-google-calendar", "source-icloud-calendar"]);
});

test("one failed provider marks federation degraded without erasing the other", () => {
  const merged = mergeCalendarSources(
    { status: "ok", value: { events: [{ id: "i1", title: "Disponible", startsAt: "2099-01-03T18:00:00Z", endsAt: "2099-01-03T20:00:00Z" }], source: { selectedCalendarCount: 1, matchedCalendarCount: 1, freshness: "live" } } },
    { status: "error", value: null }
  );
  assert.equal(merged.events.length, 1);
  assert.equal(merged.source.freshness, "degraded");
  assert.equal(merged.source.providers.google.status, "error");
});

test("a hidden Google calendar does not remove the owner's or iCloud events", () => {
  const shared = { id: "shared", title: "Sesión institucional", calendarId: "shared-calendar", calendarName: "Origen institucional", startsAt: "2099-01-03T08:00:00Z", endsAt: "2099-01-03T09:00:00Z" };
  const personal = { id: "mine", title: "Curso personal", calendarId: "my-calendar", calendarName: "Personal", startsAt: "2099-01-04T18:00:00Z", endsAt: "2099-01-04T19:00:00Z" };
  const icloud = { id: "icloud", title: "Cita privada", startsAt: "2099-01-05T10:00:00Z", endsAt: "2099-01-05T11:00:00Z" };
  const merged = mergeCalendarSources(
    { status: "ok", value: { events: [icloud], source: { selectedCalendarCount: 1, matchedCalendarCount: 1 } } },
    { status: "ok", value: { events: [shared, personal], source: { selectedCalendarCount: 2, matchedCalendarCount: 2 } } },
    [{ provider: "google-calendar", calendarId: "shared-calendar", calendarName: "Origen institucional", visible: false }]
  );
  assert.deepEqual(merged.events.map((event) => event.id), ["mine", "icloud"]);
  assert.equal(merged.source.hiddenCalendarCount, 1);
  assert.equal(merged.source.providers.google.matchedCalendarCount, 2);
});

test("old Google snapshots without calendarId still respect a hidden source, and future visible sources remain", () => {
  const hiddenCopy = { id: "old1", title: "Sesión institucional", calendarName: "Origen institucional", startsAt: "2099-01-03T08:00:00Z" };
  const other = { id: "old2", title: "Otro evento", calendarName: "Familiar", startsAt: "2099-01-03T09:00:00Z" };
  const merged = mergeCalendarSources(
    { status: "not-configured", value: null },
    { status: "fallback", value: { events: [hiddenCopy, other], source: { freshness: "fallback" } } },
    [{ provider: "google-calendar", calendarId: "shared-calendar", calendarName: "Origen institucional", visible: false }]
  );
  assert.deepEqual(merged.events.map((item) => item.id), ["old2"]);
  assert.equal(merged.source.freshness, "mixed");
});
