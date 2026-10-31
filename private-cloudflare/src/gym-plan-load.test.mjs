import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseGymPlanLoadValue } from "./gym-plan-load.js";

test("Gym plan parses decimal-comma loads without changing source values", () => {
  const row = { load_value: "22,5" };
  assert.equal(parseGymPlanLoadValue(row.load_value), 22.5);
  assert.equal(row.load_value, "22,5");
  assert.equal(parseGymPlanLoadValue("11,25"), 11.25);
  assert.equal(parseGymPlanLoadValue("  0,75  "), 0.75);
});

test("Gym plan preserves numeric loads and rejects ambiguous values", () => {
  assert.equal(parseGymPlanLoadValue(25), 25);
  assert.equal(parseGymPlanLoadValue("22.5"), 22.5);
  assert.equal(parseGymPlanLoadValue("0"), 0);
  for (const value of [null, undefined, "", "  ", "22,5 kg", "1.234,56", "not a number"]) {
    assert.equal(parseGymPlanLoadValue(value), null, String(value));
  }
});

test("Worker applies locale parsing only to the finance-derived Gym plan", () => {
  const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  assert.match(source, /import \{ parseGymPlanLoadValue \} from "\.\/gym-plan-load\.js";/);
  assert.match(source, /loadValue: parseGymPlanLoadValue\(item\.load_value\)/);
  assert.match(source, /loadValue:\s*toNumber\(entry\?\.loadValue\)/);
});
