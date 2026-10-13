import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../migrations/0010_health_readonly_schema.sql", import.meta.url), "utf8");

const names = ["fetchHealthRecoveryRows", "fetchHealthBodySamples", "fetchHealthEnergyRows"];
const toNumber = (n) => n == null ? null : Number(n);
const deduplicateHealthBodySamples = (rows) => rows;

function reader(name) {
  const pos = worker.indexOf("async function " + name + "(");
  const end = worker.indexOf("\nasync function ", pos + 1);
  assert.ok(pos >= 0 && end > pos, name + " must be present");
  const code = worker.slice(pos, end);
  assert.doesNotMatch(code, /await ensureHealth\w*Table\(/, name + " must not mutate schema on GET");
  return new Function("toNumber", "deduplicateHealthBodySamples", code + "\nreturn " + name + ";")(
    toNumber, deduplicateHealthBodySamples
  );
}

function readingDb() {
  const queries = [];
  return {
    env: { DB: { prepare(sql) {
      queries.push(sql);
      if (!/^\s*SELECT\b/i.test(sql)) throw new Error("GET_ATTEMPTED_NON_SELECT");
      return { bind(...params) { assert.equal(params.length, 2); return this; },
        async all() { return { results: [] }; } };
    } } },
    queries
  };
}

for (const name of names) {
  test(name + " issues only a date-bounded SELECT and no D1 schema mutation", async () => {
    const { env, queries } = readingDb();
    await reader(name)(env, "2026-10-01", "2026-10-13");
    assert.equal(queries.length, 1);
    assert.match(queries[0], /\bBETWEEN \? AND \?/);
  });
}

test("Health read schema is idempotent, versioned, and preserves existing data", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS health_body_samples/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS health_energy_daily/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS uq_health_energy_date/);
  const sql = migration.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
  assert.doesNotMatch(sql, /^\s*(?:DELETE|UPDATE|INSERT|DROP|ALTER|REPLACE|TRUNCATE)\b/im);
});
