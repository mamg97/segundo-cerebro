import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRequestFailure,
  hiddenMenuStatus,
  logicalMenuKey,
  menuDisplayTotals,
  qualityStep,
  visibleMenuRow
} from "./web-audit-utils.js";

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
