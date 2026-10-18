import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { menuWeekMonday, menuShiftWeek, menuWeekRangeLabel } from "./menu-week-history.js";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("home weekly menu has real reusable week selection controls directly above matrix", () => {
  assert.match(page, /<nav id="home-weekly-menu-navigation"[^>]*><\/nav>\s*<div id="home-weekly-menu-content"/);
  assert.match(app, /function homeWeeklyMenuWeekNavigationMarkup/);
  assert.match(app, /data-home-menu-week-step="-1"/);
  assert.match(app, /data-home-menu-week-step="1"/);
  assert.match(app, /data-home-menu-week-current/);
  assert.match(app, /id="home-menu-week-picker" type="date"|type="date" id="home-menu-week-picker"/);
  assert.match(app, /menuWeekRangeLabel\(selected\)/);
  assert.match(css, /\.home-weekly-menu-navigation\s*\{/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.home-weekly-menu-navigation\s*\{/);
});

test("week boundaries stay Monday-Sunday including year-crossings and invalid future date selection", () => {
  assert.equal(menuWeekMonday("2026-10-18"), "2026-10-12");
  assert.equal(menuShiftWeek("2026-10-18", -1), "2026-10-05");
  assert.equal(menuShiftWeek("2026-01-02", -1), "2025-12-22");
  assert.equal(menuShiftWeek("2026-10-12", 1), "2026-10-19");
  assert.equal(menuWeekMonday("2026-02-29"), null);
  assert.match(menuWeekRangeLabel("2026-10-12"), /12.*18.*2026/);
  assert.match(app, /week > current/);
  assert.match(app, /selected >= current \? ' disabled'/);
});

test("home navigation uses canonical selected-week endpoint and rejects stale responses", () => {
  assert.match(app, /fetch\("\/api\/nutrition\/menu\?date=" \+ encodeURIComponent\(date\)/);
  assert.match(app, /menuWeekMonday\(data.weekStart \|\| data.date \|\| ""\) !== selected/);
  assert.match(app, /requestSerial !== homeWeeklyMenuRequestSerial \|\| selectedHomeMenuWeek\(\) !== selected/);
  assert.match(app, /homeWeeklyMenuWeekCache\.set\(selected,/);
  assert.match(app, /HOME_WEEK_CACHE_MS = 5 \* 60_000/);
  assert.match(app, /if \(!options.navigation && selected !== current\) return true/);
  assert.match(app, /if \(options.navigation && !options.force && cached && cached.expiresAt > Date.now\(\)\)/);
  assert.match(app, /homeWeeklyMenuSelectedWeek = priorSelection/);
});

test("Home shows seven weekdays and supports unplanned historical days without invented meals", () => {
  assert.match(app, /const weekDays = Array.from\(\{ length: 7 \},/);
  assert.match(app, /dayByDate.get\(key\) \|\| \{/);
  assert.match(app, /items: \[\], kcal: 0, protein: 0/);
  assert.match(app, /weekDays.map\(\(day\) => renderHomeWeeklyMenuDayHeader/);
  assert.match(app, /weekDays.map\(\(day\) => \{/);
  assert.match(app, /Sin menú registrado para/);
  assert.match(app, /No hay comidas registradas en esta semana/);
});

test("historical weeks are read-only and current-week edits revalidate private canonical data", () => {
  assert.match(app, /function renderHomeWeeklyMenuMatrixCell\(items, readOnly = false\)/);
  assert.match(app, /const canEdit = !readOnly && sourceId && planned/);
  assert.match(app, /renderHomeWeeklyMenuMatrixCell\(rows, selectedWeek !== currentHomeMenuWeek\(\)\)/);
  assert.match(app, /if \(selectedWeek === currentHomeMenuWeek\(\)\) bindHomeWeeklyMenuEdits/);
  assert.match(app, /homeWeeklyMenuWeekCache.delete\(currentHomeMenuWeek\(\)\)/);
  assert.match(app, /loadHomeWeeklyMenu\(null, \{ force: true \}\)/);
  assert.match(app, /menuWeekMonday\(data\?\.weekStart \|\| data\?\.date \|\| ""\) \|\| selectedHomeMenuWeek\(\)/);
});

test("Home Safari static bundle CSS and JS revisions match", () => {
  assert.equal(page.match(/styles\.css\?v=([\d.]+)/)?.[1], "0.44.51");
  assert.equal(page.match(/app\.js\?v=([\d.]+)/)?.[1], "0.44.51");
});
