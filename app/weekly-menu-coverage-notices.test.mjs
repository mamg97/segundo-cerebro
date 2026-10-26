import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");
const start = app.indexOf("function weeklyMenuModel(");
const end = app.indexOf("function weeklyMenuTargetLine(", start);
const renderStart = app.indexOf("function renderMenuPanel(");
const renderEnd = app.indexOf("function hideHomeWeeklyMenu(", renderStart);
const homeStart = app.indexOf("function renderHomeWeeklyMenuDayHeader(");
const homeEnd = app.indexOf("function renderHomeWeeklyMenu(", homeStart);

test("incomplete days render even when there are no meals, without synthetic zeros", () => {
  assert.ok(start > 0 && end > start);
  const code = app.slice(start, end);
  const context = {
    weeklyMenuItemIsVisible: () => true,
    weeklyMenuItemIsConsumed: (row) => row.status === "consumido"
  };
  vm.createContext(context);
  vm.runInContext(code + `
    result = weeklyMenuModel({
      objective: { kcal: 2400, protein: 150 },
      weeklyMenu: [{date:"2027-03-05",moment:"Comida",name:"Plato confirmado",status:"consumido",kcal:620,protein:35}],
      menuDayNotices: [
        {date:"2027-03-05",status:"SIN_DATOS",reason:"Evento al anochecer"},
        {date:"2027-03-06",status:"SIN_DATOS",reason:"Evento todo el día"},
        {date:"2027-03-07",status:"SIN_DATOS",reason:"Comida fuera"}
      ]
    });
  `, context);
  const days = context.result.days;
  assert.deepEqual(Array.from(days, x => x.date), ["2027-03-05","2027-03-06","2027-03-07"]);
  assert.equal(days[0].consumedKcal, 620);
  assert.equal(days[1].hasConsumed, false);
  assert.equal(days[2].items.length, 0);
  assert.equal(days[1].notice.status, "SIN_DATOS");
});

test("both menu endpoints project day notices from the private canonical source", () => {
  assert.match(worker, /menuDayNoticesFromSheet/);
  assert.match(worker, /"AdherenciaManual!A1:E1000"/);
  const first = worker.indexOf("async function fetchWeeklyMenuLight(");
  const second = worker.indexOf("async function fetchHealthNutritionSummary(", first);
  const third = worker.indexOf("function staleHealthSnapshot(", second);
  assert.match(worker.slice(first, second), /menuDayNotices,/);
  assert.match(worker.slice(second, third), /menuDayNotices,/);
});

test("expanded menu and home matrix show incomplete coverage without false target compliance", () => {
  const view = app.slice(renderStart, renderEnd);
  const home = app.slice(homeStart, homeEnd);
  assert.match(view, /if \(!model\.days\.length\)/);
  assert.match(view, /Registro incompleto · día sin evaluación/);
  assert.match(view, /No se imputan cero calorías/);
  assert.match(view, /incompleteLog \? "" : day\.hasPendingPlan/);
  assert.match(home, /home-weekly-menu-coverage-warning/);
  assert.match(home, /Sin datos cuantificados/);
});
