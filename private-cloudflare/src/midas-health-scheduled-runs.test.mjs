import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateMidasWorkflowRuns } from "./midas-health.js";

test("the production auditor reads scheduled runs, not a CI-heavy unfiltered page", () => {
  const source = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");
  assert.match(source, /actions\/runs\?per_page=100&event=schedule/);
});

test("the prior weekly cycle remains valid on Friday before the new close", () => {
  const now = Date.parse("2026-10-09T09:19:00Z");
  const result = evaluateMidasWorkflowRuns([
    { name: "MIDAS weekly ML paper", event: "schedule", created_at: "2026-10-03T01:57:52Z", status: "completed", conclusion: "success" },
    { name: "MIDAS TFG corrected paper", event: "schedule", created_at: "2026-10-03T02:20:27Z", status: "completed", conclusion: "success" },
  ], now);
  for (const name of ["MIDAS weekly ML paper", "MIDAS TFG corrected paper"]) {
    const workflow = result.workflows.find((row) => row.name === name);
    assert.equal(workflow.state, "success", name);
    assert.equal(workflow.ok, true, name);
  }
});


test("Weekly ML daily is audited separately and its due schedule is causal", () => {
  const name = "MIDAS Weekly ML daily paper";
  const now = Date.parse("2026-10-12T12:00:00Z");
  const scheduled = [{ name, event: "schedule", created_at: "2026-10-09T22:30:00Z",
    status: "completed", conclusion: "success", run_number: 4 }];
  const ok = evaluateMidasWorkflowRuns(scheduled, now);
  const daily = ok.workflows.find((row) => row.name === name);
  assert.equal(daily.state, "success");
  assert.equal(daily.ok, true);
  const missed = evaluateMidasWorkflowRuns([], now).workflows.find((row) => row.name === name);
  assert.equal(missed.state, "missing_due_run");
  assert.equal(missed.ok, false);
});

test("public API retains daily-mode provenance and fetches separate daily telemetry", () => {
  const api = readFileSync(new URL("./midas.js", import.meta.url), "utf8");
  assert.match(api, /daily_mode: row\.daily_mode === true/);
  assert.match(api, /const RUNTIME_HEALTH_FILES = \[[\s\S]*?"weekly_ml_daily"/);
});
