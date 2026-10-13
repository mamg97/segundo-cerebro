import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRuntimeHealthRecord } from "./midas.js";
import { evaluateMidasWorkflowRuns } from "./midas-health.js";

test("original TimesFM one-day telemetry is mapped to canonical successful cycle", () => {
  const row = normalizeRuntimeHealthRecord({
    schema_version: 1, event: "schedule",
    workflow_key: "timesfm_one_day",
    workflow_name: "MIDAS TimesFM EUR one-day signal",
    recorded_at_utc: "2026-10-13T09:40:39.247796+00:00",
    outcome: "success", run_number: 5,
  });
  assert.equal(row.name, "MIDAS TimesFM 2.5 EUR daily 1-session signal");
  const state = evaluateMidasWorkflowRuns([row], Date.parse("2026-10-13T16:53:00Z"));
  const current = state.workflows.find(item => item.name === row.name);
  assert.equal(current.state, "success");
  assert.equal(current.ok, true);
  assert.equal(current.latest.run_number, 5);
});

test("a real failed cycle stays failed", () => {
  const row = normalizeRuntimeHealthRecord({
    schema_version: 1, event: "schedule",
    workflow_key: "timesfm_one_day",
    workflow_name: "MIDAS TimesFM EUR one-day signal",
    recorded_at_utc: "2026-10-13T09:40:39.247796+00:00",
    outcome: "failure", run_number: 5,
  });
  const state = evaluateMidasWorkflowRuns([row], Date.parse("2026-10-13T16:53:00Z"));
  assert.equal(state.workflows.find(item => item.name === row.name).state, "failed");
});
