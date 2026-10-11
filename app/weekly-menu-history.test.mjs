import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { menuWeekMonday, menuShiftWeek, menuWeekRangeLabel } from "./menu-week-history.js";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("ISO weeks start Monday, including month/year boundaries and leap days", () => {
  assert.equal(menuWeekMonday("2026-10-12"), "2026-10-12");
  assert.equal(menuWeekMonday("2026-10-11"), "2026-10-05");
  assert.equal(menuWeekMonday("2026-10-04"), "2026-09-28");
  assert.equal(menuWeekMonday("2027-01-01"), "2026-12-28");
  assert.equal(menuWeekMonday("2024-02-29"), "2024-02-26");
  assert.equal(menuWeekMonday("2026-02-29"), null);
  assert.equal(menuWeekMonday("2026-13-01"), null);
  assert.equal(menuWeekMonday("2026-10-12xyz"), null);
  assert.equal(menuShiftWeek("2026-10-12", -1), "2026-10-05");
  assert.equal(menuShiftWeek("2026-10-05", -1), "2026-09-28");
  assert.equal(menuShiftWeek("2026-12-28", 1), "2027-01-04");
  assert.equal(menuWeekRangeLabel("2026-10-05"), "5 oct – 11 oct 2026");
});

test("history uses only canonical week-scoped read endpoint, without writes or synthetic consumption", () => {
  const start = app.indexOf("async function loadHistoricalMenuWeek(");
  const end = app.indexOf("function bindMenuWeekNavigation(", start);
  const chunk = app.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(chunk, /fetch\("\/api\/nutrition\?date="/);
  assert.match(chunk, /credentials: "same-origin", cache: "no-store"/);
  assert.match(chunk, /menuWeekMonday\(weekly\.weekStart\) !== selected/);
  assert.match(chunk, /renderMenuPanel\(weekly, \{ historicalFetch: true \}\)/);
  assert.match(chunk, /Array\.isArray\(weekly\.weeklyMenu\)/);
  assert.match(chunk, /Array\.isArray\(weekly\.recipes\)/);
  assert.match(chunk, /requestId !== healthMenuRequestId/);
  assert.match(chunk, /El menú anterior sigue visible/);
  assert.doesNotMatch(chunk, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
});

test("date selector, previous/next and current week all remain reachable in compact menu", () => {
  const nav = app.slice(app.indexOf("function menuWeekNavigationMarkup("),
    app.indexOf("async function loadHistoricalMenuWeek("));
  assert.match(nav, /data-menu-week-step="-1"/);
  assert.match(nav, /data-menu-week-step="1"/);
  assert.match(nav, /id="weekly-menu-week-picker"/);
  assert.match(nav, /data-menu-week-current/);
  assert.match(nav, /nextAllowed \? "" : "disabled"/);
  const context = {
    menuWeekMonday, menuWeekRangeLabel,
    localDateKey: () => "2026-10-12",
    escapeHtml: (x) => x
  };
  vm.runInNewContext(nav +
    '\nresult = menuWeekNavigationMarkup("2026-10-05");', context);
  assert.match(context.result, /5 oct – 11 oct 2026/);
  assert.doesNotMatch(context.result, /data-menu-week-step="1"[^>]+disabled/);
  vm.runInNewContext(nav +
    '\nresult = menuWeekNavigationMarkup("2026-10-12");', context);
  assert.match(context.result, /data-menu-week-step="1"[^>]+disabled/);
});

test("each day stays short and expandable, preserving progress, grouped meals and linked ingredients", () => {
  const start = app.indexOf("function renderMenuPanel(");
  const end = app.indexOf("function hideHomeWeeklyMenu(", start);
  const ui = app.slice(start, end);
  assert.match(ui, /<details class="weekly-menu-day-collapse"/);
  assert.match(ui, /<summary class="weekly-menu-day-summary"/);
  assert.match(ui, /isToday \? "open" : ""/);
  assert.match(ui, /renderWeeklyMenuProgress\("Calorías"/);
  assert.match(ui, /renderWeeklyMenuProgress\("Proteína"/);
  assert.match(ui, /renderWeeklyMenuMealGroup\(group\.items\)/);
  assert.match(ui, /bindMenuWeekNavigation\(panel\)/);
  assert.match(ui, /bindMenuEntityLinks\(panel, data\)/);
  assert.match(app, /data-menu-recipe-open/);
  assert.match(app, /data-menu-product-open/);
  assert.match(app, /Ver ingredientes y cantidades|Ver componentes y cantidades/);
  assert.match(styles, /\.weekly-menu-day-collapse > summary/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});

test("older weeks are not silently overwritten by a nutrition-day refresh", () => {
  const ui = app.slice(app.indexOf("function renderMenuPanel("),
    app.indexOf("function hideHomeWeeklyMenu("));
  assert.match(ui, /if \(payloadWeek !== healthMenuSelectedWeek\)/);
  assert.match(ui, /if \(!healthMenuViewData\) void loadHistoricalMenuWeek\(healthMenuSelectedWeek\)/);
  assert.match(ui, /healthMenuViewData = data;/);
  assert.match(app, /healthMenuSelectedWeek = null;/);
});
