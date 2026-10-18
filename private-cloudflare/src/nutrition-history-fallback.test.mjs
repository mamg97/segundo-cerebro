import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareWeeklyMenuRows } from "./weekly-menu.js";
import { menuConsumedFallbackForDate } from "./nutrition-history-fallback.js";
import { gymWeekSummaryModel } from "../../app/gym-week-summary.mjs";

const meal = (date, n, status = "consumido") => ({
  date, moment: "Comida", recipeId: "recipe-" + n, name: "Comida de prueba " + n,
  status, kcal: 100 * n, protein: 10 * n, carbs: 1, fat: 1
});
const total = (entries, name) => entries.reduce((sum, entry) => sum + entry[name], 0);

test("five confirmed menu-only meals appear in 30-day history and weekly Home/Gym", () => {
  const friday = "2026-10-16";
  const prepared = prepareWeeklyMenuRows([
    ...[1, 2, 3, 4, 5].map(n => meal(friday, n)),
    meal(friday, 6, "planificado"),
    meal("2026-10-17", 7)
  ]);
  const fridayRows = menuConsumedFallbackForDate([], prepared, friday);
  assert.equal(fridayRows.length, 5);
  assert.equal(total(fridayRows, "kcal"), 1500);
  assert.equal(total(fridayRows, "protein"), 150);
  const history = [{ date: friday, consumedKcal: total(fridayRows, "kcal"),
    consumedProtein: total(fridayRows, "protein"), consumedEntryCount: fridayRows.length,
    burnedKcal: 2000, coverageQuality: "full" }];
  const model = gymWeekSummaryModel({ ok: true, sessions: [] }, new Date(2026, 9, 18, 12), history);
  assert.equal(model.days[4].nutrition.consumed, 1500);
  assert.equal(model.days[4].nutrition.protein, 150);
  assert.equal(model.days[4].nutrition.balance, -500);
});

test("Registro and MenuSemanal match by canonical date, moment and ID without duplicates", () => {
  const date = "2026-10-17";
  const registered = [{ date, moment: "Comida", itemId: "recipe-1",
    itemName: "Comida de prueba 1", status: "consumido", kcal: 100, protein: 10 }];
  const prepared = prepareWeeklyMenuRows([meal(date, 1), meal(date, 2)]);
  const fallback = menuConsumedFallbackForDate(registered, prepared, date);
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].itemId, "recipe-2");
  assert.equal(total([...registered, ...fallback], "kcal"), 300);
});

test("planned meals do not become consumed, and history is wired to reconciliation", () => {
  const date = "2026-10-16";
  const planned = prepareWeeklyMenuRows([meal(date, 1, "planificado")]);
  assert.deepEqual(menuConsumedFallbackForDate([], planned, date), []);
  const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  assert.match(worker, /menuConsumedFallbackForDate\(registeredHistoryRows, preparedHistoryMenuRows, historyDate\)/);
  assert.match(worker, /menuConsumedFallbackForDate\(\s*registeredDayEntries, preparedHistoryMenuRows, date/);
});
