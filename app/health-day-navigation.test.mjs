import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { healthDayBalanceModel, renderHealthDayBalance } from "./health-daily-balance.js";

const today = "2026-10-10";
function dayData({ date = "2026-10-09", consumption = 2050, entries = 4, spent = 2400, coverage = "full" } = {}) {
  return {
    date,
    nutritionSummary: { consumed: { kcal: consumption } },
    activity: { activeKcal: 500, restingKcal: spent == null ? null : spent - 500, totalKcal: spent },
    nutritionHistory: [{ date, consumedEntryCount: entries, coverageQuality: coverage }]
  };
}

test("selected prior day shows distinct consumed, burned and negative deficit without modifying inputs", () => {
  const source = dayData({});
  const original = JSON.stringify(source);
  const day = healthDayBalanceModel(source, today);
  assert.deepEqual([day.intake, day.burned, day.balance], [2050, 2400, -350]);
  assert.equal(day.isToday, false);
  assert.equal(JSON.stringify(source), original);
  const html = renderHealthDayBalance(source, today);
  assert.match(html, /2\.050 kcal/);
  assert.match(html, /2\.400 kcal/);
  assert.match(html, /-350 kcal/);
  assert.match(html, /is-deficit/);
  assert.match(html, /id="health-overview-date"/);
  assert.match(html, /data-health-day-step="-1"/);
  assert.match(html, /data-health-day-today/);
});

test("surplus is positive and today's balance is provisional", () => {
  const html = renderHealthDayBalance(dayData({ date: today, consumption: 2800 }), today);
  assert.match(html, /\+400 kcal/);
  assert.match(html, /is-surplus/);
  assert.match(html, /provisional/);
  assert.match(html, /data-health-day-step="1"[^>]*disabled/);
});

test("partial/no Watch coverage never creates a fictitious calorie balance", () => {
  for (const coverage of ["partial", "low", "no_watch", "phone_only", "missing"]) {
    const value = healthDayBalanceModel(dayData({ coverage, spent: 1700 }), today);
    assert.equal(value.burned, 1700);
    assert.equal(value.balance, null);
    assert.match(renderHealthDayBalance(dayData({ coverage, spent: 1700 }), today), /Gasto sin cobertura completa del Watch/);
  }
});

test("absence of intake and energy is not interpreted as zero", () => {
  const data = dayData({ consumption: null, entries: 0, spent: null, coverage: "missing" });
  data.activity.activeKcal = null;
  const summary = healthDayBalanceModel(data, today);
  assert.equal(summary.intake, null);
  assert.equal(summary.burned, null);
  assert.equal(summary.balance, null);
  assert.doesNotMatch(renderHealthDayBalance(data, today), />0 kcal</);
});

test("render wiring preserves historic date, keyboard chart navigation and request ordering", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(app, /renderHealthDayBalance\(data, localDateKey\(\)\)/);
  assert.match(app, /bindHealthDayNavigation\(payload\.date \|\| selected\)/);
  assert.match(app, /healthOverviewDate = selected/);
  assert.match(app, /ensureHealthNutritionPanels\(healthOverviewDate\)/);
  assert.match(app, /requestId !== healthOverviewRequestId/);
  assert.match(app, /requestId !== healthHistoryRequestId/);
  assert.match(app, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(css, /\.health-day-summary-grid\s*\{/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
