import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gymMonthCalendarModel, renderGymMonthCalendar } from "./gym-month-calendar.mjs";

const session = (date, title, extra = {}) => ({
  sessionDate: date,
  dayId: "day1",
  dayTitle: title,
  entries: [{ exerciseId: "exercise1", exerciseName: "Ejercicio de prueba" }],
  ...extra
});
const october = new Date(2026, 9, 16, 18, 30);

test("renders the current local month, Monday-first, marking only saved training", () => {
  const model = gymMonthCalendarModel([
    session("2026-10-02", "Pecho"),
    session("2026-10-06", "Espalda"),
    session("2026-09-30", "Piernas"),
    session("2026-11-01", "Hombros")
  ], [], october);
  assert.equal(model.monthLabel, "octubre de 2026");
  assert.equal(model.offset, 3);
  assert.equal(model.days.length, 31);
  assert.equal(model.trainedDays, 2);
  assert.equal(model.days[1].labels[0], "Pecho");
  assert.deepEqual(model.days[2].labels, []);
  assert.equal(model.days[15].isToday, true);
  assert.equal(model.sessionCount, 2);
});

test("multiple completed sessions in one day count as one marked date with distinct labels", () => {
  const model = gymMonthCalendarModel([
    session("2026-10-06", "Pecho"),
    session("2026-10-06", "Tríceps"),
    session("2026-10-06", "Pecho"),
    session("2026-10-07", "Piernas", {entries: []})
  ], [], october);
  assert.equal(model.trainedDays, 1);
  assert.equal(model.sessionCount, 3);
  assert.deepEqual(model.days[5].labels, ["Pecho", "Tríceps"]);
  assert.deepEqual(model.days[6].labels, []);
});

test("uses recorded session title before current plan and only falls back on a generic day title", () => {
  const model = gymMonthCalendarModel([
    session("2026-10-12", "Espalda y bíceps"),
    session("2026-10-13", "Día 1")
  ], [{id: "day1", title:"Día 1", focus: "Pecho y tríceps"}], october);
  assert.deepEqual(model.days[11].labels, ["Espalda y bíceps"]);
  assert.deepEqual(model.days[12].labels, ["Pecho y tríceps"]);
});

test("ignores fabricated, invalid, future and out-of-month dates", () => {
  const model = gymMonthCalendarModel([
    session("2026-10-32", "Inexistente"),
    session("2026-02-29", "Inexistente"),
    session("2026-10-02T08:00:00Z", "Sin fecha canónica"),
    session("2026-10-04", "No realizado", {entries: []}),
    {sessionDate:"2026-10-08",dayTitle:"Plan sin sesión"},
    session("2026-10-10", "Pecho")
  ], [], october);
  assert.equal(model.trainedDays, 1);
  assert.equal(model.days[9].labels[0], "Pecho");
});

test("future dates within this month are not marked as completed workouts", () => {
  const model = gymMonthCalendarModel([
    session("2026-10-15", "Pecho"),
    session("2026-10-16", "Espalda"),
    session("2026-10-21", "Futuro")
  ], [], october);
  assert.equal(model.trainedDays, 2);
  assert.equal(model.sessionCount, 2);
  assert.deepEqual(model.days[20].labels, []);
});

test("February leap year and locale day rollover work without UTC shifts", () => {
  const rows = [session("2028-02-29", "Pierna")];
  const firstDay = gymMonthCalendarModel(rows, [], new Date(2028, 1, 1, 0, 5));
  assert.equal(firstDay.days.length, 29);
  assert.equal(firstDay.trainedDays, 0, "future-day record cannot be completed yet");
  assert.equal(firstDay.days[0].isToday, true);
  const lastDay = gymMonthCalendarModel(rows, [], new Date(2028, 1, 29, 0, 5));
  assert.equal(lastDay.trainedDays, 1);
  assert.equal(lastDay.days[28].isToday, true);
});

test("month cells are accessible, real records highlighted and untrusted labels escaped", () => {
  const markup = renderGymMonthCalendar([
    session("2026-10-16", '<img src=x onerror="alert(1)">'),
    session("2026-10-21", "Pecho")
  ], [], october);
  assert.match(markup, /Calendario de entrenamientos/);
  assert.match(markup, /data-gym-month-date="2026-10-16"/);
  assert.match(markup, /is-trained is-today/);
  assert.match(markup, /role="grid"/);
  assert.match(markup, /is-trained/);
  assert.match(markup, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(markup, /<img src=x/);
  assert.equal((markup.match(/role="gridcell"/g) || []).length, 31);
});

test("calendar is immediately after save and before progress, not below Gym library", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const style = readFileSync(new URL("./gym-month-calendar.css", import.meta.url), "utf8");
  assert.match(app, /gym-month-calendar\.mjs\?v=0\.44\.48/);
  assert.match(page, /gym-month-calendar\.css\?v=0\.44\.48/);
  assert.match(style, /grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\)/);
  const planView = app.slice(app.indexOf("function renderGymPlanView(data)"), app.indexOf("function renderGymLibraryShell()"));
  const saveIndex = planView.indexOf('id="gym-save-status"');
  const calendarIndex = planView.indexOf('renderGymMonthCalendar(sessions, plan)', saveIndex);
  const progressIndex = planView.indexOf('<section class="gym-progress-section">', saveIndex);
  assert.ok(saveIndex >= 0 && calendarIndex > saveIndex);
  assert.ok(progressIndex > calendarIndex, "calendar must be between save form and progress");
  assert.match(planView, /renderGymPlanReference\(plan\)[\s\S]*?renderGymMonthCalendar\(sessions, plan\)/);
  const outerPanel = app.slice(app.indexOf("function renderGymPanel(data)"), app.indexOf("function setGymPanelView(view)"));
  assert.doesNotMatch(outerPanel, /renderGymMonthCalendar/, "calendar must not live after the library panel");
  assert.match(app, /renderGymPanel\(await refresh\.json\(\)\)/);
});
