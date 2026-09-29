import assert from "node:assert/strict";
import test from "node:test";
import {
  matchIcloudCalendar,
  normalizeIcloudCalendarName,
  resolveIcloudCalendarRead
} from "./icloud-calendar.js";

test("calendar names match despite case, accents and extra whitespace", () => {
  assert.equal(normalizeIcloudCalendarName("  MÉDICO   Personal "), "medico personal");
  const available = [{ name: "Médico Personal", url: "https://example.test/calendar" }];
  assert.equal(matchIcloudCalendar(available, " medico  personal "), available[0]);
});

test("partial discovery keeps last-known-good events from missing calendars", () => {
  const previous = {
    events: [
      { id: "personal-1", calendarName: "Personal", startsAt: "2026-10-01T10:00:00" },
      { id: "family-1", calendarName: "Familia", startsAt: "2026-10-02T10:00:00" }
    ],
    source: { updatedAt: "2026-09-29T10:00:00Z" }
  };
  const live = {
    events: [{ id: "personal-2", calendarName: "Personal", startsAt: "2026-10-03T10:00:00" }],
    source: { selectedCalendarCount: 2, matchedCalendarCount: 1, missingCalendars: [" familia "], updatedAt: "2026-09-29T11:00:00Z" }
  };
  const resolved = resolveIcloudCalendarRead(live, previous);
  assert.equal(resolved.shouldPersist, false);
  assert.equal(resolved.value.source.freshness, "mixed");
  assert.deepEqual(resolved.value.events.map((item) => item.id), ["family-1", "personal-2"]);
});

test("empty live read cannot erase a non-empty last-known-good snapshot", () => {
  const previous = {
    events: [{ id: "wedding-1", calendarName: "Personal", startsAt: "2027-05-01T00:00:00" }],
    source: { updatedAt: "2026-09-29T10:00:00Z" }
  };
  const live = {
    events: [],
    source: { selectedCalendarCount: 4, matchedCalendarCount: 4, missingCalendars: [], updatedAt: "2026-09-29T11:00:00Z" }
  };
  const resolved = resolveIcloudCalendarRead(live, previous);
  assert.equal(resolved.shouldPersist, false);
  assert.equal(resolved.value.source.freshness, "fallback");
  assert.equal(resolved.value.events[0].id, "wedding-1");
});

test("complete non-empty live read becomes the new last-known-good snapshot", () => {
  const live = {
    events: [{ id: "fresh-1", calendarName: "Personal", startsAt: "2026-10-01T10:00:00" }],
    source: { selectedCalendarCount: 4, matchedCalendarCount: 4, missingCalendars: [], updatedAt: "2026-09-29T11:00:00Z" }
  };
  const resolved = resolveIcloudCalendarRead(live, null);
  assert.equal(resolved.shouldPersist, true);
  assert.equal(resolved.value.source.freshness, "live");
});
