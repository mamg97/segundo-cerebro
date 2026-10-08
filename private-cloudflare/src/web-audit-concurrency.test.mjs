import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/web-audit.yml", import.meta.url), "utf8");

test("the hourly auditor must not cancel an active full browser audit", () => {
  assert.match(workflow, /group: segundo-cerebro-hourly-web-audit\s+cancel-in-progress: false/);
  assert.match(workflow, /- cron: "17 \* \* \* \*"/);
  assert.match(workflow, /- cron: "42 \* \* \* \*"/);
  assert.match(workflow, /Primary hourly audit already exists; backup slot stays lightweight/);
  assert.match(workflow, /name: Navigate and audit production/);
});
