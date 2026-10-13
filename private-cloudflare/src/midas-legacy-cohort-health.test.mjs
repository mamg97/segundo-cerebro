import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validLegacyMidasCohort } from "./midas-legacy-cohort-health.js";

const makeRows = () => [
  { id: "benchmark_spy", status: "demo_con_diario",
    last_session: "2026-10-09", comparison_eligible: false, comparison_universe_symbols: null },
  ...["buy_hold_equal_weight", "ema_rsi_fixed", "genetic_frozen", "macd_12_26_9",
      "rsi_reversion_14", "bollinger_breakout_20", "turtle_20_10_long",
      "turtle_55_20_long"].map(id => ({
        id, status: "demo_con_diario", last_session: "2026-10-09",
        comparison_eligible: false, comparison_universe_symbols: null
      }))
];

test("the original SPY reference stays archived with the eight 8-stock strategies", () => {
  const rows = makeRows();
  assert.equal(rows.length, 9);
  assert.equal(validLegacyMidasCohort(rows), true);
  const audit = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");
  assert.match(audit, /validLegacyMidasCohort\(legacyPaper\)/);
  assert.match(audit, /classicSp500\.length === 9/);
});

test("a historical 8-stock strategy cannot silently enter forward comparison", () => {
  const rows = makeRows();
  rows[2].comparison_eligible = true;
  assert.equal(validLegacyMidasCohort(rows), false);
});

test("missing SPY benchmark, duplicate or forward-eligible archive fails", () => {
  const rows = makeRows();
  assert.equal(validLegacyMidasCohort(rows.slice(1)), false);
  assert.equal(validLegacyMidasCohort([rows[0], rows[0], ...rows.slice(2)]), false);
  rows[0].comparison_eligible = true;
  assert.equal(validLegacyMidasCohort(rows), false);
  rows[0].comparison_eligible = false;
  rows[0].comparison_universe_symbols = 503;
  assert.equal(validLegacyMidasCohort(rows), false);
});

test("absent diary or noncanonical status is never considered healthy", () => {
  const rows = makeRows();
  rows[5].last_session = null;
  assert.equal(validLegacyMidasCohort(rows), false);
  rows[5].last_session = "2026-10-09";
  rows[0].status = "sin_diario_disponible";
  assert.equal(validLegacyMidasCohort(rows), false);
});
