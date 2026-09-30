import assert from "node:assert/strict";
import test from "node:test";
import { validateAuditClaims } from "./web-audit-gateway.js";

const now = Date.parse("2026-09-30T21:00:00Z");
const epoch = Math.floor(now / 1000);
const valid = {
  iss: "https://token.actions.githubusercontent.com",
  aud: "segundo-cerebro-web-audit",
  repository: "mamg97/segundo-cerebro",
  ref: "refs/heads/main",
  workflow_ref: "mamg97/segundo-cerebro/.github/workflows/web-audit.yml@refs/heads/main",
  event_name: "schedule",
  iat: epoch - 10,
  exp: epoch + 300,
  run_id: "123456789"
};

test("accepts the exact scheduled audit workflow", () => {
  assert.equal(validateAuditClaims(valid, now), true);
});

test("accepts manual dispatch of the same workflow", () => {
  assert.equal(validateAuditClaims({ ...valid, event_name: "workflow_dispatch" }, now), true);
});

for (const [name, mutation] of [
  ["wrong repository", { repository: "mamg97/other" }],
  ["wrong ref", { ref: "refs/heads/feature" }],
  ["wrong workflow", { workflow_ref: "mamg97/segundo-cerebro/.github/workflows/other.yml@refs/heads/main" }],
  ["push event", { event_name: "push" }],
  ["wrong audience", { aud: "something-else" }],
  ["expired token", { exp: epoch - 1 }]
]) {
  test("rejects " + name, () => {
    assert.equal(validateAuditClaims({ ...valid, ...mutation }, now), false);
  });
}
