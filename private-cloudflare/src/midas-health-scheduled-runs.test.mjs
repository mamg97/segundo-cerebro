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


test("TimesFM weekly and daily due windows are checked independently", () => {
  const before = evaluateMidasWorkflowRuns([], Date.parse("2026-10-13T00:02:00Z"));
  assert.equal(before.workflows.find(x => x.name === "MIDAS TimesFM EUR daily paper").state, "not_due_yet");
  assert.equal(before.workflows.find(x => x.name === "MIDAS TimesFM 2.5 EUR weekly signal").state, "not_due_yet");
  const now = Date.parse("2026-10-13T10:00:00Z");
  const run = [{ name: "MIDAS TimesFM EUR daily paper", event: "schedule",
    created_at: "2026-10-13T02:12:00Z", status: "completed", conclusion: "success" }];
  const ok = evaluateMidasWorkflowRuns(run, now);
  assert.equal(ok.workflows.find(x => x.name === "MIDAS TimesFM EUR daily paper").state, "success");
  assert.equal(ok.workflows.find(x => x.name === "MIDAS TimesFM 2.5 EUR weekly signal").state, "not_due_yet");
  const missing = evaluateMidasWorkflowRuns([], now);
  assert.equal(missing.workflows.find(x => x.name === "MIDAS TimesFM EUR daily paper").state, "missing_due_run");
});

test("MIDAS public schema supports TimesFM but requires EUR period metrics to be finite", () => {
  const api = readFileSync(new URL("./midas.js", import.meta.url), "utf8");
  assert.match(api, /"timesfm_demo"/);
  assert.match(api, /"5_sessions", "21_sessions", "63_sessions"/);
  assert.match(api, /optionalNumber\(row\.period_returns_pct\?\.\[key\]\)/);
  assert.match(api, /"timesfm_daily"/);
  assert.match(api, /"timesfm_weekly"/);
});


test("older 8-stock and IBEX workflows are retired after S&P500 migration", () => {
  const before = Date.parse("2026-10-09T12:00:00Z");
  const previous = evaluateMidasWorkflowRuns([], before);
  assert.notEqual(previous.workflows.find(x => x.name === "MIDAS paper comparison").state, "retired");
  const after = Date.parse("2026-10-13T09:00:00Z");
  const state = evaluateMidasWorkflowRuns([], after);
  for (const name of ["MIDAS paper comparison", "MIDAS TFM shadow forecasts"]) {
    const row = state.workflows.find(x => x.name === name);
    assert.equal(row.state, "retired");
    assert.equal(row.ok, true);
  }
  const replacement = state.workflows.find(x => x.name === "MIDAS classic S&P500 503 paper");
  assert.equal(replacement.state, "missing_due_run");
  assert.equal(replacement.ok, false);
});


test("successful TimesFM execution is visible within the grace window", () => {
  const now = Date.parse("2026-10-13T06:45:00Z");
  const action = {name: "MIDAS TimesFM 2.5 EUR daily 1-session signal",
    event: "schedule", created_at: "2026-10-13T04:38:33Z",
    status: "completed", conclusion: "success", run_number: 4};
  const done = evaluateMidasWorkflowRuns([action], now);
  const row = done.workflows.find(x=>x.name === action.name);
  assert.equal(row.state,"success");
  assert.equal(row.ok,true);
  assert.equal(row.latest.run_number,4);
  const absent = evaluateMidasWorkflowRuns([], now);
  assert.equal(absent.workflows.find(x=>x.name === action.name).state, "not_due_yet");
});
test("archived MIDAS campaigns remain neutral", () => {
  const status = evaluateMidasWorkflowRuns([], Date.parse("2026-10-13T07:00:00Z"));
  const archived = status.workflows.filter(x => x.state === "retired");
  assert.equal(archived.length, 2);
  assert.ok(archived.every(x=>x.ok === true));
});
test("MIDAS frontend identifies retired and missing private genetic diary", () => {
  const ui = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");
  assert.match(ui,/retired: "Archivada · fuera de competición"/);
  assert.match(ui,/genetic\?\.last_session \? "snapshot_published" : "missing_due_run"/);
  assert.match(ui,/\["retired", "snapshot_published"\]\.includes\(row.state\)/);
});


test("production auditor recognizes both immutable classic cohorts instead of assuming 9 rows total", () => {
  const audit = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");
  const api = readFileSync(new URL("./midas.js", import.meta.url), "utf8");
  assert.match(audit, /const legacyPaper = paper\.filter\(/);
  assert.match(audit, /const classicSp500 = paper\.filter\(/);
  assert.match(audit, /classicSp500\.length === 9/);
  assert.match(audit, /comparison_universe_symbols === 503/);
  assert.doesNotMatch(audit, /paper\.length === 9 && paper\.every/);
  assert.match(api, /classic_sp500_cohort: row\.classic_sp500_cohort === true/);
  assert.match(api, /\["timesfm_demo", "timesfm_daily_demo"\]\.includes\(row\.group\)/);
});

test("the new TimesFM workflow name matches the real upstream GitHub schedule", () => {
  const upstreamName = "MIDAS TimesFM 2.5 EUR daily 1-session signal";
  const historicalAlias = "MIDAS TimesFM EUR one-day signal";
  const now = Date.parse("2026-10-13T12:10:00Z");
  const scheduled = [{
    name: upstreamName, event: "schedule",
    created_at: "2026-10-13T04:38:33Z",
    status: "completed", conclusion: "success", run_number: 34
  }];
  const result = evaluateMidasWorkflowRuns(scheduled, now);
  const workflow = result.workflows.find(item => item.name === upstreamName);
  assert.ok(workflow, "canonical upstream workflow must be monitored");
  assert.equal(workflow.state, "success");
  assert.equal(workflow.ok, true);
  assert.equal(workflow.latest.run_number, 34);
  assert.equal(result.workflows.some(item => item.name === historicalAlias), false,
    "outdated workflow name must not trigger a synthetic missing-run alert");
  const absent = evaluateMidasWorkflowRuns([], now).workflows.find(item => item.name === upstreamName);
  assert.equal(absent.ok, false, "genuinely absent schedule must remain a failure");
  assert.equal(absent.state, "missing_due_run");
  const failed = evaluateMidasWorkflowRuns(scheduled.map(x => ({ ...x, conclusion: "failure" })), now)
    .workflows.find(item => item.name === upstreamName);
  assert.equal(failed.ok, false, "failed upstream schedule cannot pass");
});
