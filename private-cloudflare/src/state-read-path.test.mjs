import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source=fs.readFileSync(new URL("./index.js", import.meta.url),"utf8");

function stateRouteSource() {
  const start=source.indexOf('if (url.pathname === "/api/state")');
  const end=source.indexOf('if (url.pathname.startsWith("/api/"))',start);
  assert.ok(start>=0 && end>start,"/api/state route must exist");
  return source.slice(start,end);
}

test("/api/state does not await event persistence or legacy migration", () => {
  const route=stateRouteSource();
  assert.match(route,/scheduleStateEventMaintenance\(ctx, env, state\)/);
  assert.equal(route.includes("migrateLegacyEventLedgerToSheet("),false);
  assert.equal(route.includes("syncCalendarEventsToEventsSheet("),false);
  assert.equal(route.includes("syncImportantEventRecords("),false);
  assert.equal(route.includes("fetchEventSheetHomeSummary("),false);
});

test("event maintenance is throttled and runs via execution context", () => {
  assert.match(source,/STATE_EVENT_MAINTENANCE_MS = 5 \* 60_000/);
  assert.match(source,/stateEventMaintenanceNextAt > now/);
  assert.match(source,/ctx\.waitUntil\(/);
  assert.match(source,/async fetch\(request, env, ctx\)/);
});

test("/api/state keeps calendar source timeouts below the browser state timeout", () => {
  const route=stateRouteSource();
  const values=[...route.matchAll(/(?:iCloud|GoogleCalendar)[\s\S]{0,220}?\n\s*(\d{4})\n/g)].map((match)=>Number(match[1]));
  assert.ok(values.length>=2,"calendar timeout budgets should be explicit");
  assert.ok(values.every((value)=>value<9000));
});
