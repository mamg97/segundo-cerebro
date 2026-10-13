import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../migrations/0009_gym_history_read.sql", import.meta.url), "utf8");
const start = source.indexOf("async function fetchGymHistory(env) {");
const end = source.indexOf("\nasync function saveGymSession(", start);
assert.ok(start > 0 && end > start, "real Gym history function exists");
const readGym = new Function(source.slice(start, end) + "\nreturn fetchGymHistory;")();

function fakeDb(sessions, entries) {
  const queries = [];
  return {
    queries,
    DB: {
      prepare(sql) {
        const call = { sql, args: [] };
        queries.push(call);
        return {
          bind(...args) { call.args = args; return this; },
          async all() {
            if (/FROM gym_sessions/.test(sql)) return { results: sessions };
            if (/FROM gym_entries/.test(sql)) return {
              results: entries.filter((item) => call.args.includes(item.session_id))
            };
            throw new Error("UNEXPECTED_QUERY");
          }
        };
      }
    }
  };
}

test("Gym GET reads only entries belonging to the latest 40 sessions", async () => {
  const records = [
    { id: "session-a", session_date: "2026-10-12", day_id: "day-a", created_at: "2026-10-12" },
    { id: "session-b", session_date: "2026-10-11", day_id: "day-a", created_at: "2026-10-11" }
  ];
  const entries = [
    { id: 1, session_id: "session-a", exercise_id: "a", exercise_name: "Exercise A", load_value: 42, load_unit: "kg" },
    { id: 2, session_id: "session-old", exercise_id: "b", exercise_name: "Exercise B", load_value: 999, load_unit: "kg" },
    { id: 3, session_id: "session-b", exercise_id: "a", exercise_name: "Exercise A", load_value: 40, load_unit: "kg" }
  ];
  const env = fakeDb(records, entries);
  const result = await readGym(env);
  assert.equal(env.queries.length, 2);
  assert.match(env.queries[0].sql, /LIMIT 40/);
  assert.match(env.queries[1].sql, /WHERE session_id IN \(\?, \?\)/);
  assert.deepEqual(env.queries[1].args, ["session-a", "session-b"]);
  assert.equal(result.sessions.length, 2);
  assert.deepEqual(result.sessions.map((row) => row.entries.length), [1, 1]);
  assert.deepEqual(result.progress.a.map((row) => row.value), [40, 42]);
  assert.ok(env.queries.every(({ sql }) => !/CREATE |ALTER |PRAGMA/i.test(sql)));
});

test("Gym GET does not request gym_entries when there are no sessions", async () => {
  const env = fakeDb([], [{ id: 4, session_id: "orphan" }]);
  const result = await readGym(env);
  assert.equal(env.queries.length, 1);
  assert.deepEqual(result, { sessions: [], progress: {} });
});

test("Gym history migration indexes bounded reads without deleting existing records", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS gym_sessions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS gym_entries/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_gym_entries_session_id\s+ON gym_entries\(session_id, id\)/);
  assert.doesNotMatch(migration, /\b(?:DROP|DELETE|TRUNCATE|REPLACE INTO)\b/i);
});
