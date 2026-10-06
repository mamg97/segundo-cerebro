import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("./index.js", import.meta.url), "utf8");

test("Health overview exposes nutrition balance history", () => {
  assert.match(worker, /nutritionHistory:\s*health\.value\.history \|\| \[\]/);
});

test("Nutrition history carries intake completeness and Health coverage quality", () => {
  const start = worker.indexOf("const history = [];");
  const end = worker.indexOf("const value = {", start);
  assert.ok(start >= 0 && end > start);
  const historyBuilder = worker.slice(start, end);

  assert.match(historyBuilder, /consumedEntryCount/);
  assert.match(historyBuilder, /coverageQuality = dayEnergy \? healthCoverageQuality\(dayEnergy\) : "missing"/);
  assert.match(historyBuilder, /balanceKcal: burn === null \? null : dayConsumed\.kcal - burn/);
});
