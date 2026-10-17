import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMidasWorkflowRuns } from "./midas-health.js";

const classic = "MIDAS classic S&P500 503 paper";
const started = "2026-10-16T23:48:00Z";
const run = (status, conclusion = null, created_at = started) => ({
  name: classic, event: "schedule", status, conclusion, created_at
});
const classicStatus = (runs, at) =>
  evaluateMidasWorkflowRuns(runs, Date.parse(at)).workflows.find((entry) => entry.name === classic);

test("running MIDAS is pending, never a verified success before grace expires", () => {
  const result = classicStatus([run("in_progress")], "2026-10-17T02:00:00Z");
  assert.equal(result.state, "running");
  assert.equal(result.ok, false);
});

test("running MIDAS remains unverified after grace expires", () => {
  const result = classicStatus([run("queued")], "2026-10-17T07:00:00Z");
  assert.equal(result.state, "running");
  assert.equal(result.ok, false);
});

test("completed success covers a cycle even when a backup is still running", () => {
  const result = classicStatus([
    run("in_progress", null, "2026-10-16T23:50:00Z"),
    run("completed", "success")
  ], "2026-10-17T07:00:00Z");
  assert.equal(result.state, "success");
  assert.equal(result.ok, true);
});

test("before a scheduled run is due, absence is not a failure", () => {
  const result = classicStatus([], "2026-10-16T22:00:00Z");
  assert.equal(result.state, "not_due_yet");
  assert.equal(result.ok, true);
});

test("completed failed run after grace is a failure, not running", () => {
  const result = classicStatus([run("completed", "failure")], "2026-10-17T07:00:00Z");
  assert.equal(result.state, "failed");
  assert.equal(result.ok, false);
});
