import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { menuWeekMonday, menuWeekRangeLabel } from "./menu-week-history.js";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const script = app.slice(app.indexOf("function recoverLightWeeklyMenu("),
  app.indexOf("function bindMenuWeekNavigation("));

function harness(fetchImpl, base = null) {
  let render = null;
  const message = {
    hidden: true, textContent: "", children: [],
    append(node) { this.children.push(node); }
  };
  const panel = { isConnected: true, querySelector: (selector) =>
    selector === "#menu-week-error" ? message : null };
  const ctx = {
    menuWeekMonday, menuWeekRangeLabel,
    healthMenuSelectedWeek: "2026-10-12",
    healthMenuViewData: { weekStart: "2026-10-12" },
    healthMenuBaseData: base,
    healthMenuLoading: false,
    healthMenuRequestId: 0,
    localDateKey: () => "2026-10-12",
    document: { querySelector: () => panel, createElement: () => ({
      type: null, textContent: "", addEventListener() {}
    }) },
    renderMenuPanel(payload, opts) { render = { payload, opts }; },
    fetch: fetchImpl,
    console: { warn() {} }
  };
  vm.runInNewContext(script, ctx);
  return { ctx, message, get rendered() { return render; } };
}
const full = {
  ok:true, weekStart:"2026-10-05", recipes:[{id:"rec-1",name:"Receta real"}],
  weeklyMenu:[{date:"2026-10-05",name:"Comida original",recipeId:"rec-1",kcal:450,protein:27,status:"consumido"}]
};
const light = {
  ok:true, weekStart:"2026-10-05", weeklyMenu: [
    {date:"2026-10-05",name:"Comida original",recipeId:"rec-1",kcal:450,protein:27,status:"consumido"},
    {date:"2026-10-06",name:"Comida incompleta",foodId:"food-real",kcal:null,protein:null,status:"planificado"}
  ]
};

test("week-scoped fallback restores canonical rows without invented calories or pantry links", async () => {
  const urls = [];
  const h = harness(async (url,opts) => {
    urls.push([url,opts]);
    return url.startsWith("/api/nutrition/menu?")
      ? {ok:true,json:async()=>light}
      : {ok:false,status:502};
  },{ weekStart:"2026-10-12",recipes:full.recipes });
  const ok = await h.ctx.loadHistoricalMenuWeek("2026-10-05");
  assert.equal(ok,true);
  assert.equal(urls.length,2);
  assert.match(urls[0][0],/^\/api\/nutrition\?date=2026-10-05$/);
  assert.match(urls[1][0],/^\/api\/nutrition\/menu\?date=2026-10-05$/);
  assert.equal(urls[1][1].cache,"no-store");
  assert.equal(urls[1][1].credentials,"same-origin");
  assert.equal(h.ctx.healthMenuSelectedWeek,"2026-10-05");
  assert.equal(h.rendered.payload.menuReadMode,"light");
  assert.equal(h.rendered.payload.weeklyMenu.length,2);
  assert.equal(h.rendered.payload.weeklyMenu[0].kcal,450);
  assert.equal(h.rendered.payload.weeklyMenu[0].recipe.id,"rec-1");
  assert.equal(h.rendered.payload.weeklyMenu[1].kcal,null);
  assert.equal(h.rendered.payload.weeklyMenu[1].protein,null);
  assert.equal(h.rendered.payload.weeklyMenu[1].pantryProductId,null);
  assert.equal(h.rendered.payload.weeklyMenu[1].pantrySyncStatus,"unavailable");
});

test("when returning to the current week, reuse the fully loaded data without another API read", async () => {
  const base={...full,weekStart:"2026-10-12"};
  const h=harness(async()=>{throw Error("Should not fetch cached current week");},base);
  h.ctx.healthMenuSelectedWeek = "2026-10-05"; // returning from the preceding week
  assert.equal(await h.ctx.loadHistoricalMenuWeek("2026-10-12",{force:false}),true);
  assert.equal(h.rendered.payload,base);
  assert.equal(h.rendered.payload.menuReadMode,undefined);
});

test("reject mismatched or invalid light source; preserve older view and offer retry", async () => {
  const h=harness(async (url)=>url.includes("/menu?")
    ? {ok:true,json:async()=>({...light,weekStart:"2026-09-28"})}
    : {ok:false,status:502});
  assert.equal(await h.ctx.loadHistoricalMenuWeek("2026-10-05"),false);
  assert.equal(h.ctx.healthMenuSelectedWeek,"2026-10-12");
  assert.equal(h.rendered,null);
  assert.match(h.message.textContent,/5 oct – 11 oct 2026/);
  assert.equal(h.message.children[0].textContent,"Reintentar");
});

test("full canonical nutrition endpoint is preferred when valid, without a light read", async () => {
  const urls=[];
  const h=harness(async (url)=>{urls.push(url);return {ok:true,json:async()=>full}});
  assert.equal(await h.ctx.loadHistoricalMenuWeek("2026-10-05"),true);
  assert.equal(urls.length,1);
  assert.deepEqual(h.rendered.payload.weeklyMenu,full.weeklyMenu);
  assert.equal(h.rendered.payload.menuReadMode,undefined);
});

test("recovered week UI identifies missing recipe/pantry hydration; no mutation endpoints", () => {
  const ui=app.slice(app.indexOf("function renderMenuPanel("),
    app.indexOf("function hideHomeWeeklyMenu(",app.indexOf("function renderMenuPanel(")));
  assert.match(ui,/menuReadMode === "light"/);
  assert.match(ui,/La lectura ampliada está temporalmente indisponible/);
  assert.match(ui,/data-menu-week-retry-full/);
  assert.match(script,/requestId !== healthMenuRequestId/);
  assert.doesNotMatch(script,/method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
});

test("explicit refresh bypasses in-memory weekly state and appends source-refresh flag", async () => {
  const urls = [];
  const live = {
    ok: true,
    weekStart: "2026-10-12",
    recipes: [],
    weeklyMenu: [
      { date: "2026-10-13", name: "Recipe A", kcal: 550, protein: 40 },
      { date: "2026-10-14", name: "Recipe B", kcal: 350, protein: 28 }
    ]
  };
  const h = harness(async (url, options) => {
    urls.push([url, options]);
    return { ok: true, json: async () => live };
  });
  const ok = await h.ctx.loadHistoricalMenuWeek("2026-10-12", { force: true });
  assert.equal(ok, true);
  assert.equal(urls.length, 1);
  assert.equal(urls[0][0], "/api/nutrition?date=2026-10-12&refresh=1");
  assert.equal(urls[0][1].cache, "no-store");
  assert.equal(h.rendered.payload.weeklyMenu.length, 2);
  assert.equal(h.rendered.payload.weeklyMenu[1].protein, 28);
});

test("weekly menu offers a visible refresh control wired to source refresh", () => {
  assert.match(app, /data-menu-week-refresh aria-label="Actualizar menú desde Google Sheets"/);
  const bind = app.slice(app.indexOf("function bindMenuWeekNavigation("), app.indexOf("function renderMenuPanel(", app.indexOf("function bindMenuWeekNavigation(")));
  assert.match(bind, /data-menu-week-refresh/);
  assert.match(bind, /loadHistoricalMenuWeek\(healthMenuSelectedWeek, \{ force: true \}\)/);
});

test("forced server refresh refuses stale snapshot on read failure", () => {
  const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");
  assert.match(worker, /forceRefresh = url\.searchParams\.get\("refresh"\) === "1"/);
  assert.match(worker, /fetchHealthNutritionSummary\(env, \{ date, force: forceRefresh \}\)/);
  assert.match(worker, /const fallback = forceRefresh \? null : staleHealthSnapshot\(date\)/);
});
