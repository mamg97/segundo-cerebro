import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gymWeekSummaryModel, renderHomeGymWeek } from "./gym-week-summary.mjs";

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
  assert.match(page, /gym-week-summary\.css\?v=0\.44\.53/);
  assert.match(app, /gym-week-summary\.mjs\?v=0\.44\.53/);
  assert.match(app, /homeGymSnapshot = gymData;\s*renderHomeGymWeekSummary\(gymData\)/);
  assert.match(app, /homeGymSnapshot = data;\s*if \(privateModeKind === "remote"\) renderHomeGymWeekSummary\(data\)/);
  assert.match(app, /home-gym-week-open/);
  assert.match(css, /repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(page, /data-gym-week-date="2026-/);
});
