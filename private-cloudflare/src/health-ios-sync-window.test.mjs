import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const iosBase = new URL("../../ios/SegundoCerebroHealthBridge/SegundoCerebroHealthBridge/", import.meta.url);
const read = (name) => readFileSync(new URL(name, iosBase), "utf8");

test("all Health bridge entry points use the shared three-day reconciliation window", () => {
  const service = read("SyncService.swift");
  const delegate = read("AppDelegate.swift");
  const state = read("AppState.swift");

  assert.match(service, /automaticReconciliationDays\s*=\s*3/);
  assert.match(service, /syncRecentDays\(days:\s*Int\s*=\s*automaticReconciliationDays/);
  assert.match(delegate, /syncRecentDays\(trigger:\s*trigger\)/);
  assert.match(state, /syncRecentDays\(trigger:\s*\.manual\)/);
  assert.doesNotMatch(delegate + state, /syncRecentDays\(days:\s*2/);
});
