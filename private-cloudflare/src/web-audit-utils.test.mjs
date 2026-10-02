import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalMenuMoment,
  classifyRequestFailure,
  hiddenMenuStatus,
  logicalMenuKey,
  menuDisplayTotals,
  qualityStep,
  visibleMenuRow
} from "./web-audit-utils.js";
import { evaluateMidasWorkflowRuns } from "./midas-health.js";

test("hidden menu states stay hidden", () => {
  for (const status of ["omitido","retirada","cancelado","cancelled","skipped"]) {
    assert.equal(hiddenMenuStatus(status), true);
  }
  assert.equal(visibleMenuRow({ status: "planificado", kcal: 100, protein: 10 }), true);
});

test("logical key is stable for recipe rows", () => {
  assert.equal(
    logicalMenuKey({ date:"2026-10-01", moment:"Merienda", recipeId:"REC-1", name:"x" }),
    "2026-10-01|merienda|recipe:rec-1"
  );
});

test("canonical menu moments match the production folding contract", () => {
  assert.equal(canonicalMenuMoment({ moment: "Postre", note: "después de comida" }), "Comida");
  assert.equal(canonicalMenuMoment({ moment: "Postre", note: "después de cena" }), "Cena");
  assert.equal(canonicalMenuMoment({ moment: "Snack", note: "media mañana" }), "Media mañana");
  assert.equal(canonicalMenuMoment({ moment: "Snack", note: "después oficina" }), "Merienda");
  assert.equal(canonicalMenuMoment({ moment: "Cena · complemento" }), "Cena");
  assert.equal(canonicalMenuMoment({ moment: "Cierre" }), "Cena");
});

test("quality formula matches production UI contract", () => {
  assert.deepEqual(qualityStep("kcal", 1000, 2000), { width: 50, step: 0 });
  assert.deepEqual(qualityStep("protein", 160, 160), { width: 100, step: 10 });
});

test("navigation ERR_ABORTED is ignored but critical bootstrap aborts are not", () => {
  const origin="https://audit.example";
  assert.deepEqual(
    classifyRequestFailure({url:origin+"/api/projects",errorText:"net::ERR_ABORTED",auditOrigin:origin}),
    {track:false,ignored:true,path:"/api/projects",errorText:"net::ERR_ABORTED",reason:"expected-navigation-abort"}
  );
  assert.equal(
    classifyRequestFailure({url:origin+"/api/state",errorText:"net::ERR_ABORTED",auditOrigin:origin}).track,
    true
  );
  assert.equal(
    classifyRequestFailure({url:origin+"/api/projects",errorText:"net::ERR_FAILED",auditOrigin:origin}).track,
    true
  );
});


test("past/current menu bars use consumed totals when consumption exists", () => {
  const result = menuDisplayTotals([
    { status: "consumido", kcal: 600, protein: 50 },
    { status: "planificado", kcal: 900, protein: 70 }
  ], "2026-10-01", "2026-10-01", { kcal: 2000, protein: 160 });
  assert.equal(result.useConsumed, true);
  assert.equal(result.kcal, 600);
  assert.equal(result.protein, 50);
});

test("future menu bars keep full planned totals", () => {
  const result = menuDisplayTotals([
    { status: "planificado", kcal: 600, protein: 50 },
    { status: "planificado", kcal: 900, protein: 70 }
  ], "2026-10-02", "2026-10-01", { kcal: 2000, protein: 160 });
  assert.equal(result.useConsumed, false);
  assert.equal(result.kcal, 1500);
  assert.equal(result.protein, 120);
});


test("MIDAS audit detects a failed due workflow without penalizing not-yet-due weekly jobs", () => {
  const now = Date.parse("2026-10-01T16:00:00Z");
  const health = evaluateMidasWorkflowRuns([
    { name: "MIDAS paper comparison", event: "schedule", status: "completed", conclusion: "success", created_at: "2026-10-01T02:19:28Z" },
    { name: "MIDAS TFM shadow forecasts", event: "schedule", status: "completed", conclusion: "failure", created_at: "2026-09-30T23:05:37Z" },
    { name: "MIDAS capital cycle paper", event: "schedule", status: "completed", conclusion: "success", created_at: "2026-10-01T03:49:10Z" }
  ], now);
  assert.equal(health.ok, false);
  assert.equal(health.issues.length, 1);
  assert.equal(health.issues[0].name, "MIDAS TFM shadow forecasts");
  assert.equal(health.workflows.find((item) => item.name === "MIDAS weekly ML paper").state, "not_due_yet");
});

test("MIDAS audit detects a missing daily schedule after its grace window", () => {
  const now = Date.parse("2026-10-02T16:00:00Z");
  const health = evaluateMidasWorkflowRuns([
    { name: "MIDAS paper comparison", event: "schedule", status: "completed", conclusion: "success", created_at: "2026-10-01T02:19:28Z" },
    { name: "MIDAS TFM shadow forecasts", event: "schedule", status: "completed", conclusion: "success", created_at: "2026-10-02T04:00:00Z" },
    { name: "MIDAS capital cycle paper", event: "schedule", status: "completed", conclusion: "success", created_at: "2026-10-02T04:00:00Z" }
  ], now);
  assert.equal(health.workflows.find((item) => item.name === "MIDAS paper comparison").state, "missing_due_run");
});
