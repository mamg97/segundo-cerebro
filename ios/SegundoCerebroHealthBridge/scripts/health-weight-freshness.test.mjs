import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../SegundoCerebroHealthBridge/", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");
const [health, sync, delegate, state] = await Promise.all([
  read("HealthKitService.swift"),
  read("SyncService.swift"),
  read("AppDelegate.swift"),
  read("AppState.swift")
]);

test("weight observer is distinguished from other HealthKit changes", () => {
  assert.match(health, /isWeightUpdate = \(type as\? HKQuantityType\)\?\.identifier == HKQuantityTypeIdentifier\.bodyMass\.rawValue/);
  assert.match(health, /await onUpdate\(isWeightUpdate\)/);
  assert.match(delegate, /isWeightUpdate \? \.bodyMass : \.healthKit/);
});

test("new weight bypasses only the normal eight-hour automatic cooldown", () => {
  assert.match(sync, /case bodyMass/);
  assert.match(sync, /static let automaticSyncInterval: TimeInterval = 8 \* 60 \* 60/);
  assert.match(sync, /if trigger\.isAutomatic,\s*trigger != \.bodyMass,\s*defaults\.integer/);
  assert.match(state, /case \.bodyMass: "Automática · nuevo peso"/);
});

test("body metrics request immediate background notifications; activity stays hourly", () => {
  for (const id of ["bodyMass", "bodyFatPercentage", "bodyMassIndex", "leanBodyMass"]) {
    assert.match(health, new RegExp("HKQuantityTypeIdentifier\\." + id + "\\.rawValue"));
  }
  assert.match(health, /\? \.immediate : \.hourly/);
  assert.doesNotMatch(health, /store\.enableBackgroundDelivery\(for: type, frequency: \.hourly\)/);
});
