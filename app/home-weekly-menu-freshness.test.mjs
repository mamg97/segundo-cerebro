import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { menuWeekMonday, menuShiftWeek, menuWeekRangeLabel } from "./menu-week-history.js";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = app.indexOf("let homeWeeklyMenuRequestSerial = 0;");
const end = app.indexOf("async function renderHomeNutritionCard(", start);
assert.ok(start >= 0 && end > start, "Home loader state and function boundaries must exist");
const loader = app.slice(start, end);

function harness(fetchImpl) {
  const calls = [];
  const renders = [];
  let unavailable = false;
  const context = {
    encodeURIComponent,
    menuWeekMonday, menuShiftWeek, menuWeekRangeLabel,
    document: { querySelector: () => null },
    escapeHtml: (value) => String(value),
    localDateKey: () => "2026-06-02",
    fetch: (...args) => { calls.push(args); return fetchImpl(...args); },
    renderHomeWeeklyMenu: (data) => { renders.push(data); unavailable = false; },
    renderHomeWeeklyMenuUnavailable: () => { unavailable = true; },
    console: { warn() {} }
  };
  vm.runInNewContext(loader, context);
  return {
    context, calls, renders,
    get rendered() { return renders.at(-1) || null; },
    get unavailable() { return unavailable; }
  };
}

const stale = { weeklyMenu: [
  { date:"2026-06-03", moment:"Comida", kcal:420, protein:21 }
] };
const fresh = { ok:true, date:"2026-06-02", weekStart:"2026-06-01", weeklyMenu: [
  { date:"2026-06-03", moment:"Comida", kcal:420, protein:21 },
  { date:"2026-06-03", moment:"Media mañana", kcal:80, protein:12 },
  { date:"2026-06-05", moment:"Desayuno", kcal:200, protein:25 }
] };

test("Home loads fresh Sheets rows instead of a cached full-nutrition snapshot", async () => {
  const h = harness(async () => ({ ok:true, json:async () => fresh }));
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], "/api/nutrition/menu?date=2026-06-02");
  assert.equal(h.calls[0][1].cache, "no-store");
  assert.equal(h.calls[0][1].credentials, "same-origin");
  assert.equal(h.rendered.weeklyMenu.length, 3);
  assert.equal(h.rendered.weeklyMenu.filter(x => x.date === "2026-06-03")
    .reduce((sum, x) => sum + x.protein, 0), 33);
  assert.equal(h.unavailable, false);
});

test("if both direct reads fail, Home never presents stale fallback totals as verified", async () => {
  const h = harness(async () => ({ ok:false, status:503 }));
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), false);
  assert.equal(h.calls.length, 2);
  assert.equal(h.rendered, null);
  assert.equal(h.unavailable, true);
});

test("a transient gateway failure retries once and can recover a fresh menu", async () => {
  let n = 0;
  const h = harness(async () => ++n === 1
    ? {ok:false,status:502}
    : {ok:true,json:async()=>fresh});
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), true);
  assert.equal(h.calls.length, 2);
  assert.equal(h.rendered.weeklyMenu.length, 3);
  assert.equal(h.unavailable, false);
});

test("a later failed request cannot overwrite an earlier successful Sheets menu", async () => {
  let resolveFailure;
  let n = 0;
  const h = harness(async () => {
    n += 1;
    if(n === 1) return {ok:true,json:async()=>fresh};
    if(n === 2) return await new Promise(resolve => {resolveFailure=resolve;});
    return {ok:false,status:502};
  });
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), true);
  const second = h.context.loadHomeWeeklyMenu(stale);
  resolveFailure({ok:false,status:502});
  assert.equal(await second,true);
  assert.equal(h.unavailable,false);
  assert.equal(h.rendered.weeklyMenu.length,3);
  assert.equal(h.renders.length,1);
});

test("an older delayed Sheets response cannot replace a later successful response", async () => {
  let resolveOlder;
  let n=0;
  const older={ok:true,date:"2026-06-02",weekStart:"2026-06-01",weeklyMenu:[{date:"2026-06-03",moment:"Comida",kcal:400,protein:18}]};
  const h=harness(async () => {
    n+=1;
    if(n===1) return await new Promise(resolve => {resolveOlder=resolve;});
    return {ok:true,json:async()=>fresh};
  });
  const first=h.context.loadHomeWeeklyMenu();
  assert.equal(await h.context.loadHomeWeeklyMenu(),true);
  resolveOlder({ok:true,json:async()=>older});
  assert.equal(await first,false, "superseded request must not report accepted data");
  assert.equal(h.renders.length,1);
  assert.equal(h.rendered.weeklyMenu.length,3);
});

test("invalid JSON is rejected, never replaced by older summary", async () => {
  const h = harness(async () => ({ ok:true, json:async () => ({ ok:true }) }));
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), false);
  assert.equal(h.calls.length,2);
  assert.equal(h.rendered,null);
  assert.equal(h.unavailable,true);
});
