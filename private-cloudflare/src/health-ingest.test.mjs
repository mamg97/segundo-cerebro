import test from "node:test";
import assert from "node:assert/strict";

import { cleanMetricSummary, normalizePayload } from "./health-ingest.js";

test("extended metric normalization preserves useful daily statistics and sources", () => {
  const metric = cleanMetricSummary({
    date: "2026-09-28",
    key: "heartRate",
    unit: "bpm",
    aggregation: "discrete",
    average: "72.5",
    minimum: 51,
    maximum: 164,
    latest: 80,
    latestAt: "2026-09-28T15:20:00+02:00",
    sampleCount: 1234.4,
    sources: ["Apple Watch", "Zepp Life", "", "Apple Watch"],
    sampledAt: "2026-09-28T16:00:00+02:00"
  }, "2026-09-27");

  assert.deepEqual(metric, {
    date: "2026-09-28",
    key: "heartRate",
    unit: "bpm",
    aggregation: "discrete",
    sum: null,
    average: 72.5,
    minimum: 51,
    maximum: 164,
    latest: 80,
    latestAt: "2026-09-28T13:20:00.000Z",
    sampleCount: 1234,
    sourceDetails: ["Apple Watch", "Zepp Life", "Apple Watch"],
    sampledAt: "2026-09-28T14:00:00.000Z"
  });
});

test("invalid or empty extended metrics are rejected", () => {
  assert.equal(cleanMetricSummary({ key: "bad-key", average: 1 }, "2026-09-28"), null);
  assert.equal(cleanMetricSummary({ key: "heartRate" }, "2026-09-28"), null);
});

test("a metrics-only payload is normalized without inventing activity", () => {
  const normalized = normalizePayload({
    date: "2026-09-28",
    metrics: [{
      key: "dietaryWater",
      unit: "mL",
      aggregation: "cumulative",
      sum: 1750,
      sampleCount: 6,
      sources: ["Salud"]
    }]
  }, "/v1/sync");

  assert.equal(normalized.activity.activeKcal, null);
  assert.equal(normalized.metrics.length, 1);
  assert.equal(normalized.metrics[0].sum, 1750);
  assert.deepEqual(normalized.metrics[0].sourceDetails, ["Salud"]);
});
