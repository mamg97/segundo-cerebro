import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gymWeekSummaryModel, renderHomeGymWeek, nutritionForGymDay } from "./gym-week-summary.mjs";

const today = new Date(2026, 9, 18, 18, 25);
const session = (date, title, names = ["Press banca"], extra = {}) => ({
  sessionDate: date, dayId: "d1", dayTitle: title,
  entries: names.map(name => ({ exerciseName: name, setsDone: 3, repsDone: "10", loadValue: 40, loadUnit: "kg" })),
  ...extra
});
const input = sessions => ({ ok: true, sessions, plan: [{ id: "d1", focus: "Pecho y tríceps" }] });

test("Monday-Sunday current local week only; source is completed saved D1 entries", () => {
  const model = gymWeekSummaryModel(input([
    session("2026-10-12", "Día 1"), session("2026-10-14", "Espalda"),
    session("2026-10-14", "Bíceps", ["Curl"]),
    session("2026-10-18", "Piernas"), session("2026-10-11", "Fuera"),
    session("2026-10-19", "Futuro"), session("2026-10-16", "Sin completar", []),
    session("2026-10-32", "Fecha inválida")
  ]), today);
  assert.equal(model.weekStart, "2026-10-12");
  assert.equal(model.weekEnd, "2026-10-18");
  assert.equal(model.days.length, 7);
  assert.equal(model.trainedDays, 3);
  assert.equal(model.sessionCount, 4);
  assert.deepEqual(model.days.map(v=>v.sessions.length), [1,0,2,0,0,0,1]);
  assert.deepEqual(model.days[0].groups, ["Pecho y tríceps"]);
  assert.deepEqual(model.days[2].groups, ["Espalda", "Bíceps"]);
  assert.equal(model.days[6].isToday, true);
  assert.equal(model.days[2].exerciseCount, 2);
});

test("no future training marked, no fabricated sessions and unknown state distinct from zero", () => {
  const monday = new Date(2026, 9, 12, 10, 0);
  const model = gymWeekSummaryModel(input([
    session("2026-10-12", "Pecho"),
    session("2026-10-13", "Espalda"),
    session("2026-10-13", "sin", [], { entries: [] })
  ]), monday);
  assert.equal(model.sessionCount, 1);
  assert.equal(model.days[1].isFuture, true);
  assert.equal(model.days[1].sessions.length, 0);
  assert.match(renderHomeGymWeek(null), /No se pudo consultar/);
  assert.match(renderHomeGymWeek(input([]), today), /0 días · 0 sesiones/);
  assert.match(renderHomeGymWeek(null, today, {loading:true}), /Cargando/);
  assert.match(renderHomeGymWeek(null, today, {privateMode:false}), /Disponible solo/);
});

test("boundary crossing New Year is locale-safe (Monday first, Sunday last)", () => {
  const model = gymWeekSummaryModel(input([
    session("2026-12-28", "Pecho"), session("2027-01-01", "Piernas")
  ]), new Date(2027, 0, 2, 0, 15));
  assert.equal(model.weekStart, "2026-12-28");
  assert.equal(model.weekEnd, "2027-01-03");
  assert.equal(model.trainedDays, 2);
  assert.equal(model.days[4].day, 1);
});

test("shows the actual exercises performed and escapes any private text", () => {
  const model = input([session("2026-10-18", "<img src=x onerror=alert(1)>", [
    '<script>alert("x")</script>'
  ])]);
  const markup = renderHomeGymWeek(model, today);
  assert.match(markup, /&lt;img/);
  assert.match(markup, /&lt;script&gt;/);
  assert.doesNotMatch(markup, /<script|<img/);
  assert.match(markup, /3 series · 10 reps · 40 kg/);
  assert.match(markup, /<details/);
  assert.equal((markup.match(/data-gym-week-date=/g) || []).length, 7);
  assert.match(markup, /pulsar para ver ejercicios/);
});

test("home insertion immediately follows macro summary before finance, menu stays bottom", () => {
  const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("./gym-week-summary.css", import.meta.url), "utf8");
  const summary = page.indexOf('id="home-health-card"');
  const gym = page.indexOf('id="home-gym-week"');
  const finance = page.indexOf('class="money-horizon"');
  const agenda = page.indexOf('class="workbench"');
  const menu = page.indexOf('id="home-weekly-menu-panel"');
  const footer = page.indexOf("<footer>");
  assert.ok(summary >= 0 && summary < gym && gym < finance && finance < agenda && agenda < menu && menu < footer);
  assert.equal(page.match(/id="home-gym-week"/g)?.length, 1);
  assert.match(page, /gym-week-summary\.css\?v=0\.44\.57/);
  assert.match(app, /gym-week-summary\.mjs\?v=0\.44\.57/);
  assert.match(app, /homeGymSnapshot = gymData;\s*renderHomeGymWeekSummary\(gymData\)/);
  assert.match(app, /homeGymSnapshot = data;\s*if \(privateModeKind === "remote"\) renderHomeGymWeekSummary\(data\)/);
  assert.match(app, /home-gym-week-open/);
  assert.match(css, /repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(page, /data-gym-week-date="2026-/);
});

test("all seven days show four nutrition metrics, even without a gym session", () => {
  const history = [
    { date: "2026-10-12", consumedEntryCount: 3, consumedKcal: 2100,
      consumedProtein: 156.5, burnedKcal: 2520, coverageQuality: "full" },
    { date: "2026-10-13", consumedEntryCount: 2, consumedKcal: 2350,
      consumedProtein: 120, burnedKcal: 2000, coverageQuality: "live" },
    { date: "2026-10-14", consumedEntryCount: 1, consumedKcal: 1800,
      consumedProtein: 100, burnedKcal: 1400, coverageQuality: "partial" },
    { date: "2026-10-15", consumedEntryCount: 0, consumedKcal: 0,
      consumedProtein: null, burnedKcal: 2300, coverageQuality: "full" },
    { date: "2026-10-19", consumedEntryCount: 1, consumedKcal: 2500,
      consumedProtein: 130, burnedKcal: 2600, coverageQuality: "full" }
  ];
  const model = gymWeekSummaryModel(input([session("2026-10-12", "Pecho")]), today, history);
  assert.equal(model.days[0].nutrition.balance, -420);
  assert.equal(model.days[0].nutrition.protein, 156.5);
  assert.equal(model.days[1].nutrition.balance, 350);
  assert.equal(model.days[2].nutrition.balance, null);
  assert.equal(model.days[2].nutrition.burned, null);
  assert.equal(model.days[2].nutrition.protein, 100);
  assert.equal(model.days[3].nutrition.consumed, null);
  assert.equal(model.days[3].nutrition.balance, null);
  assert.equal(model.days[6].nutrition.consumed, null);
  const html = renderHomeGymWeek(input([session("2026-10-12", "Pecho")]), today,
    { nutritionHistory: history });
  assert.equal((html.match(/class="home-gym-day-nutrition"/g) || []).length, 7);
  assert.match(html, /-420 kcal/);
  assert.match(html, /2\.520 kcal/);
  assert.match(html, /2\.100 kcal/);
  assert.match(html, /157 g/);
  assert.match(html, /\+350 kcal/);
  assert.match(html, /Proteína/);
  assert.match(html, /Gasto total/);
  assert.match(html, /Ingeridas/);
  assert.equal((html.match(/home-gym-nutrition-row is-deficit/g) || []).length, 1);
  assert.equal((html.match(/home-gym-nutrition-row is-surplus/g) || []).length, 1);
  assert.match(html, /<summary[^>]*>[^]*?<span class="home-gym-day-nutrition"[^]*?<\/summary>/);
});

test("missing intake, incomplete expenditure and missing Health do not manufacture zero balance", () => {
  assert.equal(nutritionForGymDay({ consumedEntryCount: 0, consumedKcal: 0,
    burnedKcal: 2000, coverageQuality: "full" }).balance, null);
  assert.equal(nutritionForGymDay({ consumedEntryCount: 1, consumedKcal: 1500,
    consumedProtein: 90, burnedKcal: 2200, coverageQuality: "partial" }).balance, null);
  assert.equal(nutritionForGymDay({ consumedEntryCount: 1, consumedKcal: 1500,
    consumedProtein: 90, burnedKcal: null, coverageQuality: "live" }).burned, null);
  assert.equal(nutritionForGymDay(null).balance, null);
  const html = renderHomeGymWeek(input([]), today, { nutritionHistory: [] });
  assert.equal((html.match(/class="home-gym-day-nutrition"/g) || []).length, 7);
  assert.doesNotMatch(html, /(?:\+0|-0) kcal/);
  assert.match(html, /home-gym-nutrition-label">Balance<\/span><strong>—<\/strong>/);
  const gymFailure = renderHomeGymWeek(null, today, { nutritionHistory: [] });
  assert.match(gymFailure, /Entrenamientos no disponibles/);
  assert.doesNotMatch(gymFailure, /0 días · 0 sesiones/);
  assert.match(gymFailure, /Entrenos sin consultar/);
  const todayRow = { date: "2026-10-18", consumedEntryCount: 2, consumedKcal: 1700,
    consumedProtein: 110, burnedKcal: 2350, coverageQuality: "live" };
  const todayHtml = renderHomeGymWeek(input([]), today, { nutritionHistory: [todayRow] });
  assert.match(todayHtml, /provisional/);
  assert.match(todayHtml, /-650 kcal/);
});

test("Home reuses the existing private health overview history, no seven new requests", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");
  assert.match(app, /homeHealthWeekNutritionHistory = Array\.isArray\(data\.nutritionHistory\)/);
  assert.match(app, /nutritionHistory: current \? homeHealthWeekNutritionHistory : historical\.nutritionHistory/);
  assert.match(worker, /consumedProtein: consumedEntryCount > 0 \? dayConsumed\.protein : null/);
  assert.match(worker, /nutritionHistory: value\.history \|\| \[\]/);
  const source = readFileSync(new URL("./gym-week-summary.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(/);
});


test("selected historical week renders actual saved sessions and nutrition instead of current week", () => {
  const now = new Date(2026, 9, 19, 10, 16);
  const history = [
    {date: "2026-10-16", consumedEntryCount: 5, consumedKcal: 2345,
     consumedProtein: 207, burnedKcal: 2925, coverageQuality: "full"},
    {date: "2026-10-17", consumedEntryCount: 2, consumedKcal: 1781,
     consumedProtein: 95, burnedKcal: 1748, coverageQuality: "full"},
    {date: "2026-10-19", consumedEntryCount: 1, consumedKcal: 100,
     consumedProtein: 10, burnedKcal: 500, coverageQuality: "live"}
  ];
  const source = input([
    session("2026-10-14", "Pierna completa"),
    session("2026-10-16", "Empuje"),
    session("2026-10-19", "Pecho")
  ]);
  const model = gymWeekSummaryModel(source, now, history, "2026-10-12");
  assert.equal(model.weekStart, "2026-10-12");
  assert.equal(model.weekEnd, "2026-10-18");
  assert.equal(model.trainedDays, 2);
  assert.equal(model.sessionCount, 2);
  assert.equal(model.days[4].nutrition.consumed, 2345);
  assert.equal(model.days[4].nutrition.burned, 2925);
  assert.equal(model.days[4].nutrition.balance, -580);
  assert.equal(model.days[4].nutrition.protein, 207);
  assert.equal(model.days[5].nutrition.balance, 33);
  assert.equal(model.days.find(d => d.isToday), undefined);
  const html = renderHomeGymWeek(source, now, { selectedWeek: "2026-10-12", nutritionHistory: history });
  assert.match(html, /Semana 12–18 oct/);
  assert.match(html, /2 días · 2 sesiones/);
  assert.match(html, /-580 kcal/);
  assert.doesNotMatch(html, /data-gym-week-date="2026-10-19"/);
});

test("historical week selection rejects non-Mondays, invalid dates, and future weeks", () => {
  const now = new Date(2026, 9, 19, 10);
  for (const invalid of ["2026-10-13", "2026-10-99", "2026-10-26", "bad"]) {
    assert.throws(() => gymWeekSummaryModel(input([]), now, [], invalid), /INVALID_GYM_WEEK_SELECTION/);
  }
  const current = gymWeekSummaryModel(input([]), now);
  assert.equal(current.weekStart, "2026-10-19");
  assert.equal(current.days[1].isFuture, true);
});

test("Home historical navigator uses one bounded gym GET and one dated Health GET", () => {
  const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("./gym-week-summary.css", import.meta.url), "utf8");
  const backend = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");
  assert.match(page, /id="home-gym-week-navigation"/);
  assert.match(app, /data-home-gym-week-step="-1"/);
  assert.match(app, /data-home-gym-week-step="1"/);
  assert.match(app, /id="home-gym-week-picker"/);
  assert.match(app, /data-home-gym-week-current/);
  assert.match(app, /const week = menuWeekMonday\(date\)/);
  assert.match(app, /week > current/);
  assert.match(app, /requestId !== homeGymWeekRequestSerial/);
  assert.match(app, /fetch\("\/api\/gym\/week\?start="/);
  assert.match(app, /fetch\("\/api\/health\/overview\?date="/);
  assert.match(app, /homeGymWeekCache\.set\(week, snapshot\)/);
  assert.match(css, /home-gym-week-controls/);
  assert.match(backend, /if \(url\.pathname === "\/api\/gym\/week"\)/);
  assert.match(backend, /WHERE session_date BETWEEN \? AND \?/);
  assert.match(backend, /LIMIT 40/);
  assert.match(backend, /parsed\.getUTCDay\(\) !== 1/);
  assert.match(backend, /weekStart > localHealthDateKey\(\)/);
  assert.doesNotMatch(app, /localStorage\.setItem\("homeGym/);
});
