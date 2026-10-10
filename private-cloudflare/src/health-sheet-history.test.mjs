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


test("health export recovery rows reconcile sleep and recovery into D1", () => {
  assert.match(source, /RecuperacionDiariaApple!A1:S2000/);
  assert.match(source, /const recoverySheetRows = parseTableRows\(valueRanges\[11\]/);
  assert.match(source, /reconcileHealthRecoveryRows\(env, energyRows, bodySheetRows, recoverySheetRows\)/);
  assert.match(source, /const recoveredRecovery = recoveryRows\.filter/);
  assert.match(source, /INSERT INTO health_recovery_daily/);
  assert.match(source, /source = excluded\.source/);
});


test("health recovery import is idempotent and cannot block reads", () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS health_import_state/);
  assert.match(source, /SELECT signature FROM health_import_state/);
  assert.match(source, /await env\.DB\.batch\(statements\)/);
  assert.match(source, /Apple Health recovery reconcile failed/);
  assert.match(source, /const energyForDate = \(dateKey\) => selectHealthEnergyRow/);
});

test("health Sheet reads retry transient Google failures", () => {
  assert.match(source, /async function fetchHealthNutritionSummary[\s\S]*googleReadFetch\([\s\S]*attempts: 3/);
});


test("nutrition summary can fall back to exact consumed menu identities missing from Registro", () => {
  assert.match(source, /const registeredDayIds = new Set/);
  assert.match(source, /const consumedMenuFallback = prepareWeeklyMenuRows/);
  assert.match(source, /item\.status === "consumido"/);
  assert.match(source, /\[item\.recipeId, item\.foodId\]/);
  assert.match(source, /source: "menu_consumed_fallback"/);
  assert.match(source, /const dayEntries = \[\.\.\.registeredDayEntries, \.\.\.consumedMenuFallback\]/);
});
