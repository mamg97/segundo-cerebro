import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const start = app.indexOf("function deriveGymTodaySummary(");
const end = app.indexOf("function healthWeightSummary(", start);
assert.ok(start >= 0 && end > start, "Gym summary must be available");

const context = vm.createContext({
  homeHealthMetricNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
  localDateKey: () => "2026-01-18",
  shortHomeGymReason: String
});
vm.runInContext(app.slice(start, end), context);
const derive = vm.runInContext("deriveGymTodaySummary", context);

const plan = [
  { id: "one", title: "Día A" },
  { id: "two", title: "Día B" }
];
const previousSession = {
  sessionDate: "2026-01-16",
  dayId: "one",
  createdAt: "2026-01-16T17:00:00Z"
};
const gym = { plan, sessions: [previousSession], trainingStatus: { paused: false } };
const health = (count, target = 3) => ({
  date: "2026-01-18",
  activityObjective: { strengthSessionsWeek: target },
  gym: { sessionsThisWeek: count }
});

test("Below the weekly minimum the next PPL session remains suggested", () => {
  const result = derive(health(2), gym);
  assert.equal(result.main, "Sugerido");
  assert.match(result.detail, /Día B/);
  assert.match(result.detail, /2\/3 mínimo semanal/);
  assert.equal(result.progress, 67);
});

test("Reaching the weekly minimum never labels today as a rest day", () => {
  const result = derive(health(3), gym);
  assert.equal(result.main, "Siguiente");
  assert.match(result.detail, /Día B/);
  assert.match(result.detail, /3\/3 mínimo semanal cubierto/);
  assert.equal(result.progress, 100);
  assert.doesNotMatch(JSON.stringify(result), /Descanso/);
});

test("Extra sessions above the minimum remain visible and allowed", () => {
  const result = derive(health(5), gym);
  assert.equal(result.main, "Siguiente");
  assert.match(result.detail, /5\/3 mínimo semanal cubierto/);
  assert.equal(result.progress, 100);
  assert.doesNotMatch(JSON.stringify(result), /Descanso/);
});

test("Actual same-day training takes precedence over the minimum summary", () => {
  const result = derive(health(4), {
    ...gym,
    sessions: [{ sessionDate: "2026-01-18", dayId: "two", createdAt: "2026-01-18T12:00:00Z" }, previousSession]
  });
  assert.equal(result.main, "Hecho");
  assert.match(result.detail, /Día B/);
});

test("Medical pause still overrides weekly targets", () => {
  assert.equal(derive(health(1, 0), gym).main, "Pausado");
  assert.equal(derive(health(4), { ...gym, trainingStatus: { paused: true, reason: "Temporary recovery" } }).main, "Pausado");
});
