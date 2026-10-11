import test from "node:test";
import assert from "node:assert/strict";
import { canonicalHealthTimestamp, deduplicateHealthBodySamples } from "./health-body-identity.js";

test("body samples from an export and HealthKit share one instant identity", () => {
  const older = {
    type: "bodyMass", value: 70, source: "Scale",
    measuredAt: "2026-01-02T08:45:33+01:00", importedAt: "2026-01-03T10:00:00Z"
  };
  const newer = {
    ...older, value: 70.0001,
    measuredAt: "2026-01-02T07:45:33.000Z", importedAt: "2026-01-04T10:00:00Z"
  };
  assert.equal(canonicalHealthTimestamp(older.measuredAt), newer.measuredAt);
  assert.deepEqual(deduplicateHealthBodySamples([newer, older]), [newer]);
});

test("different metrics, sources and instants stay distinct", () => {
  const base = { type: "bodyMass", value: 70, source: "Scale", measuredAt: "2026-01-02T07:45:33Z" };
  const rows = [base, { ...base, type: "leanBodyMass" }, { ...base, source: "Manual" },
    { ...base, measuredAt: "2026-01-02T07:45:34Z" }];
  assert.equal(deduplicateHealthBodySamples(rows).length, 4);
  assert.equal(canonicalHealthTimestamp("not-a-date"), null);
});
