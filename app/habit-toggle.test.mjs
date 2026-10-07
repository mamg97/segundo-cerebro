import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app=fs.readFileSync(new URL("./app.js",import.meta.url),"utf8");
const worker=fs.readFileSync(new URL("../private-cloudflare/src/index.js",import.meta.url),"utf8");

test("Habit toggle reconciles the authoritative POST count before rendering",()=>{
  assert.match(app,/reconcileHabitToggleSummary\(payload\.summary, habitId, payload\.count\)/);
  assert.match(app,/renderHabitsPanel\(reconciled\)/);
  assert.match(worker,/previousCount: currentCount/);
  assert.match(worker,/count: nextCount/);
});

test("Habit toggle failures are visible instead of failing silently",()=>{
  assert.match(app,/showHabitStatusToast\(/);
  assert.match(app,/No se ha podido guardar el hábito\./);
  assert.match(worker,/HABITQUEST_WRITE_\(401\|403\|404\|409\|429\|5\\d\\d\)/);
});
