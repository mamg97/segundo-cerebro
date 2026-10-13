import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = app.indexOf("async function loadHomeWeeklyMenu(");
const end = app.indexOf("async function renderHomeNutritionCard(", start);
assert.ok(start >= 0 && end > start, "Home menu loader boundaries must exist");
const loader = app.slice(start, end);

function harness(fetchImpl) {
  const calls = [];
  let rendered = null;
  let unavailable = false;
  const context = {
    encodeURIComponent,
    localDateKey: () => "2026-10-13",
    fetch: (...args) => { calls.push(args); return fetchImpl(...args); },
    renderHomeWeeklyMenu: (data) => { rendered = data; },
    renderHomeWeeklyMenuUnavailable: () => { unavailable = true; },
    console: { warn() {} }
  };
  vm.runInNewContext(loader, context);
  return { context, calls, get rendered() { return rendered; }, get unavailable() { return unavailable; } };
}

const stale = { weeklyMenu: [
  { date:"2026-10-14", moment:"Comida", kcal:1878, protein:165 },
  { date:"2026-10-16", moment:"Comida", kcal:866, protein:110 }
] };
const fresh = { ok:true, weeklyMenu: [
  { date:"2026-10-14", moment:"Comida", kcal:1878, protein:165 },
  { date:"2026-10-14", moment:"Media mañana", kcal:73.2, protein:9.96 },
  { date:"2026-10-16", moment:"Comida", kcal:866, protein:110 },
  { date:"2026-10-16", moment:"Desayuno", kcal:277.1, protein:35.4 }
] };

test("Home prefers a fresh, dedicated Sheets menu even when nutrition summary has rows", async () => {
  const h = harness(async () => ({ ok:true, json:async () => fresh }));
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], "/api/nutrition/menu?date=2026-10-13");
  assert.equal(h.calls[0][1].cache, "no-store");
  assert.equal(h.calls[0][1].credentials, "same-origin");
  assert.equal(h.rendered.weeklyMenu.length, 4);
  assert.equal(h.rendered.weeklyMenu.filter(x => x.date === "2026-10-14")
    .reduce((acc, x) => acc + x.protein, 0), 174.96);
  assert.equal(h.rendered.weeklyMenu.filter(x => x.date === "2026-10-16")
    .reduce((acc, x) => acc + x.protein, 0), 145.4);
  assert.equal(h.unavailable, false);
});

test("Home preserves existing nutrition fallback if live menu read is unavailable", async () => {
  const h = harness(async () => ({ ok:false, status:503 }));
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), true);
  assert.equal(h.rendered, stale);
  assert.equal(h.unavailable, false);
});

test("Home keeps empty/error state when neither live nor nutrition source is usable", async () => {
  const h = harness(async () => { throw Error("offline"); });
  assert.equal(await h.context.loadHomeWeeklyMenu(null), false);
  assert.equal(h.rendered, null);
  assert.equal(h.unavailable, true);
});

test("Home never accepts invalid JSON as a fresh weekly menu", async () => {
  const h = harness(async () => ({ ok:true, json:async () => ({ ok:true }) }));
  assert.equal(await h.context.loadHomeWeeklyMenu(stale), true);
  assert.equal(h.rendered, stale);
});
