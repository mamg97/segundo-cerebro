import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const start = app.indexOf("function renderHomeWeeklyMenuPlanBar(");
const end = app.indexOf("function renderHomeWeeklyMenu(data) {", start);
assert.ok(start >= 0 && end > start, "Home weekly menu rendering functions must exist");

const context = {
  escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
  localDateKey: () => "2026-10-14",
  weeklyMenuDayLabel: (date) => date,
};
vm.createContext(context);
vm.runInContext(app.slice(start, end), context);

test("Home weekly bars compare confirmed consumption against daily plan, not goals", () => {
  const bar = context.renderHomeWeeklyMenuPlanBar("kcal", 150, 300);
  assert.match(bar, /150 \/ 300 kcal/);
  assert.match(bar, /value="50" max="100"/);
  assert.doesNotMatch(bar, /obj\.|objetivo diario/);
  const protein = context.renderHomeWeeklyMenuPlanBar("protein", 75, 100);
  assert.match(protein, /75 \/ 100 g/);
  assert.match(protein, /value="75" max="100"/);
});

test("zero consumption, excess consumption and unplanned days are not falsified", () => {
  const zero = context.renderHomeWeeklyMenuPlanBar("kcal", 0, 500);
  assert.match(zero, /0 \/ 500 kcal/);
  assert.match(zero, /value="0" max="100"/);
  const excess = context.renderHomeWeeklyMenuPlanBar("protein", 120, 100);
  assert.match(excess, /120 \/ 100 g/);
  assert.match(excess, /value="100" max="100"/);
  const withoutPlan = context.renderHomeWeeklyMenuPlanBar("kcal", 0, 0);
  assert.match(withoutPlan, /0 \/ — kcal/);
  assert.match(withoutPlan, /value="0" max="100"/);
});

test("visible bar fill always matches the rounded numbers shown to the user", () => {
  // 1.49 / 2.49 would round to 60% using hidden fractions, even though
  // the UI prints 1 / 2 (50%). Progress must use the same displayed values.
  const rounded = context.renderHomeWeeklyMenuPlanBar("kcal", 1.49, 2.49);
  assert.match(rounded, /1 \/ 2 kcal/);
  assert.match(rounded, /value="50" max="100"/);
  const tiny = context.renderHomeWeeklyMenuPlanBar("protein", 0.25, 0.4);
  assert.match(tiny, /0 \/ — g/);
  assert.match(tiny, /value="0" max="100"/);
});

test("missing macros preserve a partial indication instead of inventing full totals", () => {
  const partial = context.renderHomeWeeklyMenuPlanBar("kcal", 120, 200, true, true);
  assert.match(partial, /≥120 \/ ≥200 kcal/);
  assert.match(partial, /subtotal incompleto/);
  assert.match(partial, /Subtotal conocido · datos pendientes/);
  assert.match(partial, /is-partial/);
});

test("all seven day headers omit repeated goal labels, consumption percentages and totals outside bars", () => {
  const day = {
    date: "2026-10-14",
    consumedKcal: 150, kcal: 300,
    consumedProtein: 80, protein: 100,
    nutritionComplete: true, consumedNutritionComplete: true
  };
  const html = context.renderHomeWeeklyMenuDayHeader(day, { kcalTarget: 1950, proteinTarget: 175 });
  assert.match(html, /home-weekly-menu-progress/);
  assert.equal((html.match(/home-weekly-menu-plan-bar/g) || []).length, 2);
  assert.doesNotMatch(html, /1950|1\.950|175|% consumid|obj\./);
  const home = app.slice(app.indexOf("function renderHomeWeeklyMenu(data) {"), app.indexOf("function formatRecipeAmount("));
  assert.equal((home.match(/class="home-weekly-menu-objectives"/g) || []).length, 1);
  assert.match(home, /model\.kcalTarget === null/);
  assert.match(home, /model\.proteinTarget === null/);
  assert.match(css, /\.home-weekly-menu-plan-bar \.home-weekly-menu-plan-value/);
  assert.match(css, /position: absolute/);
});
