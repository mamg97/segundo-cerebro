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
