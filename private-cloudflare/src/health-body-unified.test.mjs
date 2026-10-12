import test from "node:test";
import assert from "node:assert/strict";
import { mergeHealthBodySources, latestHealthBodyMetric, healthBodyWeightStats } from "./health-body-unified.js";

const sample = (date, time, value, source = "Scale") => ({
  type: "bodyMass", value, source, date, measuredAt: time, importedAt: "2026-10-12T10:00:00Z"
});

test("newer automatic weight wins over older manual Sheet baseline", () => {
  const manual = sample("2026-10-09", "2026-10-09T08:00:00+02:00", 80.2);
  const auto = sample("2026-10-11", "2026-10-11T09:23:00Z", 79.5);
  const rows = mergeHealthBodySources([auto], [manual]);
  assert.equal(latestHealthBodyMetric(rows, "bodyMass", "2026-10-12")?.value, 79.5);
  assert.equal(healthBodyWeightStats(rows, "2026-10-12").latest, 79.5);
});

test("newer manual weight is not hidden by D1", () => {
  const auto = sample("2026-10-09", "2026-10-09T06:00:00Z", 78.7);
  const manual = sample("2026-10-12", "2026-10-12T09:00:00Z", 79.1, "manual");
  assert.equal(latestHealthBodyMetric(mergeHealthBodySources([auto], [manual]), "bodyMass", "2026-10-12")?.value, 79.1);
});

test("Zepp Life imported in D1 and mirrored in the manual Sheet is one measurement", () => {
  const auto = sample("2026-10-09", "2026-10-09T06:45:33.000Z", 78.7, "Zepp Life");
  const mirrored = {...auto, measuredAt:"2026-10-09T08:45:33+02:00", importedAt:"2026-10-09T09:00:00Z"};
  const unique = mergeHealthBodySources([auto], [mirrored]);
  assert.equal(unique.length, 1);
  assert.equal(healthBodyWeightStats(unique, "2026-10-09").current7d, 78.7);
});

test("seven-day rolling mean weighs days equally and ignores future measurements", () => {
  const rows = mergeHealthBodySources([
    sample("2026-10-10", "2026-10-10T07:00:00Z", 79),
    sample("2026-10-10", "2026-10-10T08:00:00Z", 81),
    sample("2026-10-11", "2026-10-11T08:00:00Z", 78),
    sample("2026-10-13", "2026-10-13T08:00:00Z", 70)
  ]);
  const stats = healthBodyWeightStats(rows, "2026-10-11");
  assert.equal(stats.current7d, 79);
  assert.equal(stats.latest, 78);
  assert.equal(latestHealthBodyMetric(rows, "bodyMass", "2026-10-11", true)?.value, 78);
});

test("no weight and missing history do not fabricate a reading", () => {
  const other = {type:"bodyFatPercentage", value:20, source:"Scale", date:"2026-10-11", measuredAt:"2026-10-11T09:00:00Z"};
  assert.equal(latestHealthBodyMetric([other], "bodyMass", "2026-10-12"), null);
  assert.deepEqual(healthBodyWeightStats([other], "2026-10-12"), {latest:null,current7d:null,previous7d:null,weeklyChange:null});
});
