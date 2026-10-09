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
