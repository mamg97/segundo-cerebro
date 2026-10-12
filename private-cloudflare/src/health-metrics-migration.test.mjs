import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../../.github/workflows/deploy-private-cloudflare.yml", import.meta.url), "utf8");
const migration = readFileSync(new URL("../migrations/0007_health_metrics.sql", import.meta.url), "utf8");

test("health metric schema is migrated before deploy and never initialized by GET reads", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS health_metric_daily/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_health_metric_key_date/);
  assert.match(workflow, /private-cloudflare\/migrations\/\*\*/);
  assert.match(workflow, /wrangler d1 migrations apply segundo-cerebro-private --remote/);

  const readPath = worker.match(/async function fetchHealthMetricRows[\s\S]*?\n}\n/)?.[0] || "";
  assert.ok(readPath, "fetchHealthMetricRows must remain present");
  assert.doesNotMatch(readPath, /ensureHealthMetricDailyTable/);
});
