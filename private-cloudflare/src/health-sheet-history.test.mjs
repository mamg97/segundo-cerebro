import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./index.js", import.meta.url), "utf8");

test("health Sheet exposes recipe steps", () => {
  assert.match(source, /PasosReceta!A1:J2000/);
  assert.match(source, /const recipeStepRows = parseTableRows\(valueRanges\[10\]/);
  assert.match(source, /steps: stepsByRecipeId\.get\(recipe\.id\) \|\| \[\]/);
});

test("health history Sheet sync always uses full D1 history", () => {
  assert.match(source, /const sheetHistory = range === "all"[\s\S]*range: "all"/);
  assert.match(source, /persistHealthActivityDetail\(env, sheetHistory\)/);
  assert.match(source, /persistHealthBodyDetail\(env, sheetHistory\)/);
  assert.match(source, /persistHealthRecoveryDetail\(env, sheetHistory\)/);
});

test("health history writers target stable derived tabs", () => {
  assert.match(source, /ActividadDiaria!A2:N2000/);
  assert.match(source, /MedicionesCorporalesApple!A2:H5000/);
  assert.match(source, /RecuperacionDiariaApple!A2:S2000/);
});
