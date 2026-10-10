import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("./index.js", import.meta.url), "utf8");

test("Health overview exposes nutrition balance history", () => {
  assert.match(worker, /nutritionHistory:\s*value\.history \|\| \[\]/);
  assert.match(worker, /healthOverviewPayload\(health\.value, health\.status, gym\)/);
});

test("Nutrition history carries intake completeness and Health coverage quality", () => {
  const start = worker.indexOf("const history = [];");
  const end = worker.indexOf("const value = {", start);
  assert.ok(start >= 0 && end > start);
  const historyBuilder = worker.slice(start, end);

  assert.match(historyBuilder, /consumedEntryCount/);
  assert.match(historyBuilder, /coverageQuality = dayEnergy \? healthCoverageQuality\(dayEnergy\) : "missing"/);
  assert.match(historyBuilder, /balanceKcal: burn === null \|\| !isHealthEnergyComparable\(dayEnergy\) \? null : dayConsumed\.kcal - burn/);
  assert.match(worker, /const historyStart = healthAddDays\(date, -29\)/);
  assert.match(historyBuilder, /for \(let offset = 29; offset >= 0; offset -= 1\)/);
});


test("Health history reuses the nutrition cache instead of forcing a duplicate Google read", () => {
  const historyStart = worker.indexOf("async function fetchHealthHistory");
  const historyEnd = worker.indexOf("async function updateHealthSheetRange", historyStart);
  assert.ok(historyStart >= 0 && historyEnd > historyStart);
  const block = worker.slice(historyStart, historyEnd);
  assert.match(block, /fetchHealthNutritionSummary\(env, \{ date \}\)/);
  assert.doesNotMatch(block, /force:\s*true/);
});

test("Health routes keep a recent successful snapshot as transient fallback", () => {
  assert.match(worker, /expiresAt:\s*Date\.now\(\) \+ 60_000/);
  assert.match(worker, /function staleHealthSnapshot\(date\)/);
  assert.match(worker, /Health overview live read failed; serving recent snapshot/);
  assert.match(worker, /Nutrition live read failed; serving recent snapshot/);
  assert.match(worker, /status:\s*"ok-stale"/);
});
