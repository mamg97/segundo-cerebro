import test from "node:test";
import assert from "node:assert/strict";
import { healthCoverageQuality, isHealthEnergyComparable, selectHealthEnergyRow } from "./health-energy-quality.js";

test("legacy recovered partial energy stays partial even when its source name says export_recovery", () => {
  const row = {
    source: "apple_health_export_recovery",
    note: "Cobertura Apple Watch parcial; día en curso, no usar como cierre diario.",
    sourceDetails: ["coverage=partial", "watch_rest_hours=10.8"],
    activeKcal: 45,
    restingKcal: 850,
    totalKcal: 895
  };
  assert.equal(healthCoverageQuality(row), "partial");
  assert.equal(isHealthEnergyComparable(row), false);
});

test("screenshot review cannot claim full coverage without explicit evidence", () => {
  const screenshot = { source: "apple_health_manual_screenshot", sourceDetails: [], totalKcal: 2400 };
  assert.equal(healthCoverageQuality(screenshot), "unknown");
  assert.equal(healthCoverageQuality({ ...screenshot, sourceDetails: ["coverage=full", "source=apple_health_ui"] }), "full");
});

test("steps-only HealthKit snapshots are not comparable energy days", () => {
  const stepsOnly = { source: "apple_health", steps: 2000, activeKcal: null, restingKcal: null, totalKcal: null };
  assert.equal(healthCoverageQuality(stepsOnly), "live");
  assert.equal(isHealthEnergyComparable(stepsOnly), false);
  const completedSheet = { source: "apple_health_manual_screenshot", sourceDetails: ["coverage=full"], totalKcal: 2300 };
  assert.equal(selectHealthEnergyRow(stepsOnly, completedSheet), completedSheet);
});

test("complete snapshot outranks older partial D1 snapshot without using larger kcal as a heuristic", () => {
  const d1 = { source: "apple_health_export_recovery", sourceDetails: ["coverage=partial"], totalKcal: 900, importedAt: "2026-06-09T10:00:00Z" };
  const sheet = { source: "apple_health_manual_screenshot", sourceDetails: ["coverage=full"], totalKcal: 2450, importedAt: "2026-06-10T12:00:00Z" };
  assert.equal(selectHealthEnergyRow(d1, sheet), sheet);
  assert.equal(selectHealthEnergyRow(sheet, d1), sheet);
});

test("complete D1 snapshot still wins against a partial or unknown manual Sheet snapshot", () => {
  const d1 = { source: "apple_health", sourceDetails: [{kind:"coverage",quality:"full"}], totalKcal: 2200 };
  const sheet = { source: "apple_health_manual_screenshot", sourceDetails: ["coverage=partial"], totalKcal: 2800 };
  assert.equal(selectHealthEnergyRow(d1, sheet), d1);
});

test("native HealthKit D1 snapshot wins over a comparable historical recovery import", () => {
  const native = {
    source: "apple_health",
    sourceDetails: [{ kind: "coverage", quality: "full" }],
    totalKcal: 2200,
    importedAt: "2026-06-10T10:00:00Z"
  };
  const exportRecovery = {
    source: "apple_health_export_recovery",
    sourceDetails: ["coverage=full"],
    totalKcal: 2100,
    importedAt: "2026-06-11T10:00:00Z"
  };
  assert.equal(selectHealthEnergyRow(native, exportRecovery), native);
});

test("when both snapshots are comparable, existing D1 and export recency semantics remain stable", () => {
  const d1 = { source: "apple_health_export_recovery", sourceDetails: ["coverage=full"], importedAt: "2026-06-10T12:00:00Z" };
  const oldSheet = { source: "apple_health_export_recovery", sourceDetails: ["coverage=full"], importedAt: "2026-06-09T12:00:00Z" };
  assert.equal(selectHealthEnergyRow(d1, oldSheet), d1);
  assert.equal(selectHealthEnergyRow(oldSheet, d1), d1);
  assert.equal(selectHealthEnergyRow(d1, null), d1);
});
