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

test("confirmed vs planned labels coexist with the goal reference on an absolute common axis", () => {
  const kcal = context.renderHomeWeeklyMenuPlanBar("kcal", 150, 300, 220);
  assert.match(kcal, /150 \/ 300 kcal/);
  assert.match(kcal, /home-weekly-menu-plan-actual" value="150" max="300"/);
  assert.match(kcal, /home-weekly-menu-plan-expected" value="300" max="300"/);
  assert.match(kcal, /home-weekly-menu-plan-goal" value="220" max="300"/);
  assert.match(kcal, /objetivo diario 220 kcal/);

  const protein = context.renderHomeWeeklyMenuPlanBar("protein", 75, 100, 160);
  assert.match(protein, /75 \/ 100 g/);
  assert.match(protein, /home-weekly-menu-plan-actual" value="75" max="160"/);
  assert.match(protein, /home-weekly-menu-plan-expected" value="100" max="160"/);
  assert.match(protein, /home-weekly-menu-plan-goal" value="160" max="160"/);
});

test("target below, above and equal to plan are in their precise relative position", () => {
  const below = context.renderHomeWeeklyMenuPlanBar("kcal", 100, 2500, 2000);
  assert.match(below, /home-weekly-menu-plan-goal" value="2000" max="2500"/);
  const above = context.renderHomeWeeklyMenuPlanBar("kcal", 800, 1600, 2000);
  assert.match(above, /home-weekly-menu-plan-expected" value="1600" max="2000"/);
  assert.match(above, /home-weekly-menu-plan-goal" value="2000" max="2000"/);
  const equal = context.renderHomeWeeklyMenuPlanBar("protein", 50, 160, 160);
  assert.match(equal, /home-weekly-menu-plan-goal" value="160" max="160"/);
});

test("zero consumption, above-plan confirmed intake and no planned menu stay truthful", () => {
  const zero = context.renderHomeWeeklyMenuPlanBar("kcal", 0, 500, 400);
  assert.match(zero, /0 \/ 500 kcal/);
  assert.match(zero, /home-weekly-menu-plan-actual" value="0" max="500"/);
  const excess = context.renderHomeWeeklyMenuPlanBar("protein", 120, 100, 110);
  assert.match(excess, /120 \/ 100 g/);
  assert.match(excess, /home-weekly-menu-plan-actual" value="120" max="120"/);
  assert.match(excess, /home-weekly-menu-plan-goal" value="110" max="120"/);
  const withoutPlan = context.renderHomeWeeklyMenuPlanBar("kcal", 0, 0, 500);
  assert.match(withoutPlan, /0 \/ — kcal/);
  assert.match(withoutPlan, /home-weekly-menu-plan-expected" value="0" max="500"/);
  assert.match(withoutPlan, /home-weekly-menu-plan-goal" value="500" max="500"/);
});

test("invalid or unavailable objectives are never represented by a false line", () => {
  for (const invalid of [null, undefined, "", 0, -12, "garbage", Infinity]) {
    const output = context.renderHomeWeeklyMenuPlanBar("kcal", 80, 200, invalid);
    assert.doesNotMatch(output, /class="home-weekly-menu-plan-goal"/);
    assert.match(output, /objetivo no disponible/);
  }
});

test("all geometry matches the same rounded amounts that are printed", () => {
  const rounded = context.renderHomeWeeklyMenuPlanBar("kcal", 1.49, 2.49, 1.8);
  assert.match(rounded, /1 \/ 2 kcal/);
  assert.match(rounded, /home-weekly-menu-plan-actual" value="1" max="2"/);
  assert.match(rounded, /home-weekly-menu-plan-goal" value="2" max="2"/);
  const tiny = context.renderHomeWeeklyMenuPlanBar("protein", 0.25, 0.4, null);
  assert.match(tiny, /0 \/ — g/);
  assert.match(tiny, /home-weekly-menu-plan-actual" value="0" max="1"/);
});

test("partial macro totals remain explicitly labeled and do not suppress real target", () => {
  const partial = context.renderHomeWeeklyMenuPlanBar("kcal", 120, 200, 260, true, true);
  assert.match(partial, /≥120 \/ ≥200 kcal/);
  assert.match(partial, /subtotal incompleto/);
  assert.match(partial, /Subtotal conocido · datos pendientes/);
  assert.match(partial, /is-partial/);
  assert.match(partial, /home-weekly-menu-plan-goal" value="260" max="260"/);
});

test("every Home day receives both goals without duplicating the visible goal summary", () => {
  const day = {
    date: "2026-10-14",
    consumedKcal: 150, kcal: 300,
    consumedProtein: 80, protein: 100,
    nutritionComplete: true, consumedNutritionComplete: true
  };
  const html = context.renderHomeWeeklyMenuDayHeader(day, { kcalTarget: 1950, proteinTarget: 175 });
  assert.match(html, /home-weekly-menu-progress/);
  assert.equal((html.match(/class="home-weekly-menu-plan-bar"/g) || []).length, 2);
  assert.match(html, /home-weekly-menu-plan-goal" value="1950" max="1950"/);
  assert.match(html, /home-weekly-menu-plan-goal" value="175" max="175"/);
  assert.doesNotMatch(html, /% consumid|obj\./);
  const home = app.slice(app.indexOf("function renderHomeWeeklyMenu(data) {"), app.indexOf("function formatRecipeAmount("));
  assert.equal((home.match(/class="home-weekly-menu-objectives"/g) || []).length, 1);
  assert.match(home, /model\.kcalTarget === null/);
  assert.match(home, /model\.proteinTarget === null/);
  assert.match(home, /Raya blanca: objetivo/);
  assert.match(css, /progress\.home-weekly-menu-plan-goal::-webkit-progress-value/);
  assert.match(css, /progress\.home-weekly-menu-plan-goal::-moz-progress-bar/);
  assert.match(css, /border-right:\s*3px solid #fff/);
});

test("goal marker renders as an explicit SVG line, not an unreliable native progress border", () => {
  const markup = context.renderHomeWeeklyMenuPlanBar("kcal", 2196, 2759, 1950);
  assert.match(markup, /<svg class="home-weekly-menu-plan-visual"/);
  assert.match(markup, /class="home-weekly-menu-plan-visual-expected"[^>]*width="1000"/);
  assert.match(markup, /class="home-weekly-menu-plan-visual-actual"[^>]*width="796"/);
  assert.match(markup, /class="home-weekly-menu-plan-visual-goal" x1="707" y1="1" x2="707" y2="99"/);
  assert.match(markup, /vector-effect="non-scaling-stroke"/);
  assert.match(css, /home-weekly-menu-plan-visual-goal\s*\{[^}]*stroke:\s*#fff/);
  assert.match(css, /home-weekly-menu-plan-visual\s*\{[^}]*z-index:\s*3/);
  assert.match(css, /home-weekly-menu-plan-value\s*\{\s*z-index:\s*4/);
});

test("a goal above plan remains visible at the right edge; a goal below plan stays inside", () => {
  const above = context.renderHomeWeeklyMenuPlanBar("protein", 127, 164, 175);
  assert.match(above, /home-weekly-menu-plan-visual-expected"[^>]*width="937"/);
  assert.match(above, /class="home-weekly-menu-plan-visual-goal" x1="993"/);
  const below = context.renderHomeWeeklyMenuPlanBar("protein", 165, 229, 175);
  assert.match(below, /class="home-weekly-menu-plan-visual-goal" x1="764"/);
});

test("no goal means no SVG marker; incomplete days keep their partial styling", () => {
  const absent = context.renderHomeWeeklyMenuPlanBar("kcal", 0, 100, null);
  assert.doesNotMatch(absent, /home-weekly-menu-plan-visual-goal"/);
  assert.match(absent, /<svg class="home-weekly-menu-plan-visual"/);
  const incomplete = context.renderHomeWeeklyMenuPlanBar("kcal", 304, 1170, 1950, true, true);
  assert.match(incomplete, /is-partial/);
  assert.match(incomplete, /≥304 \/ ≥1?\.?170 kcal/);
  assert.match(incomplete, /class="home-weekly-menu-plan-visual-goal" x1="993"/);
  assert.match(css, /is-partial \.home-weekly-menu-plan-visual-expected/);
});
