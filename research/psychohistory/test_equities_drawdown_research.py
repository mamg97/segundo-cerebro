"""Synthetic-only adversarial tests for stock risk forecasting research."""
import csv
from datetime import date, timedelta
import hashlib
import math
from pathlib import Path
import tempfile
import unittest

from equities_drawdown_research import (
    DRAWDOWN, HORIZON, MIN_TRAIN, LOOKBACK, TEST_STRIDE,
    read_prices, features, label, training_window, predict_at, evaluate,
    write_private_csv, latest_shadow, write_private_json,
)


def synthetic_prices(n=700):
    # Reproducible nonreal periodic stress paths, no real symbols or quotations.
    rows = []
    day = date(2018, 1, 1)
    value = 100.0
    for i in range(n):
        day += timedelta(days=1)
        while day.weekday() >= 5:
            day += timedelta(days=1)
        if i % 105 in range(46, 55):
            change = -0.011
        elif i % 105 in range(55, 71):
            change = 0.010
        else:
            change = 0.0007 + 0.0004 * math.sin(i / 7)
        value *= 1 + change
        rows.append((day, value))
    return rows


class EquityDrawdownResearchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="SYNTHETIC_FIN_RESEARCH_")
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "fake_prices.csv"
        self.rows = synthetic_prices()
        self._write()
    def _write(self):
        with self.path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(("date", "asset_id", "adjusted_close"))
            for day, close in self.rows:
                writer.writerow((day.isoformat(), "SYNTHETIC_INDEX", close))
    def _load(self):
        return read_prices(self.path, hashlib.sha256(self.path.read_bytes()).hexdigest(),
                           self.rows[-1][0].isoformat())

    def test_load_strict_sha_and_dates(self):
        asset, data, sha = self._load()
        self.assertEqual(asset, "SYNTHETIC_INDEX")
        self.assertEqual(len(data), len(self.rows))
        self.assertEqual(sha, hashlib.sha256(self.path.read_bytes()).hexdigest())
        with self.assertRaisesRegex(ValueError, "Source bytes differ"):
            read_prices(self.path, "0" * 64, self.rows[-1][0].isoformat())
        with self.assertRaisesRegex(ValueError, "Future date"):
            read_prices(self.path, sha, "2010-01-01")

    def test_purge_all_labels_beyond_issue_origin(self):
        k = LOOKBACK + MIN_TRAIN + HORIZON + 15
        history = training_window(self.rows, k)
        self.assertEqual(len(history), k - HORIZON - LOOKBACK + 1)
        self.assertEqual(history[-1] + HORIZON, k)
        self.assertEqual(history[-1] + 1, k - HORIZON + 1)
        self.assertEqual(len(features(self.rows, k)), 4)

    def test_future_price_mutation_cannot_change_past_prediction(self):
        k = 540
        before = predict_at(self.rows, k)
        changed = list(self.rows)
        for j in range(k + 1, len(changed)):
            changed[j] = (changed[j][0], changed[j][1] * (0.30 if j % 2 else 4))
        after = predict_at(changed, k)
        self.assertEqual(before, after)
        self.assertTrue(before["n"] >= MIN_TRAIN)
        self.assertLessEqual(before["last_resolved"], self.rows[k][0].isoformat())
        self.assertEqual(before["status"], "EXPLORATORY_PROBABILITY_NOT_CALIBRATED")

    def test_forward_outcomes_are_not_known_at_issue(self):
        k = len(self.rows) - 1
        with self.assertRaisesRegex(ValueError, "not resolved"):
            label(self.rows, k)
        self.assertIn(label(self.rows, 40), (0, 1))
        test_rows, report = evaluate(self.rows, "SYNTHETIC_INDEX", "f" * 64)
        self.assertTrue(test_rows)
        self.assertEqual(report["horizon_sessions"], 20)
        self.assertFalse(report["forecast_issued"])
        self.assertFalse(report["live_trading_authorized"])
        self.assertFalse(report["historical_vendor_asof_independently_verified"])
        self.assertEqual(report["walk_forward_test_origins"], len(test_rows))
        self.assertTrue(all(
            row["label_end_date"] <= self.rows[-1][0].isoformat()
            and row["training_last_known_label_date"] <= row["origin_date"]
            for row in test_rows
        ))
        idx = {day.isoformat(): i for i, (day, _) in enumerate(self.rows)}
        self.assertTrue(all(idx[b["origin_date"]] - idx[a["origin_date"]] == TEST_STRIDE
                            for a, b in zip(test_rows, test_rows[1:])))
        self.assertIsNone(report["brier_skill_vs_baseline"]) if (
            report["brier_baseline_on_model_eligible_cases"] in (0, None)
        ) else self.assertTrue(math.isfinite(report["brier_skill_vs_baseline"]))

    def test_invalid_prices_order_duplicates_and_asset_switch(self):
        for change in ("duplicate", "reverse", "negative", "nan", "asset"):
            with self.subTest(change=change):
                self._write()
                lines = self.path.read_text().splitlines()
                if change == "duplicate":
                    lines[2] = lines[1]
                elif change == "reverse":
                    lines[2], lines[3] = lines[3], lines[2]
                elif change == "negative":
                    lines[2] = lines[2].rsplit(",", 1)[0] + ",-1"
                elif change == "nan":
                    lines[2] = lines[2].rsplit(",", 1)[0] + ",nan"
                elif change == "asset":
                    lines[2] = lines[2].replace("SYNTHETIC_INDEX", "OTHER_FAKE")
                self.path.write_text("\n".join(lines) + "\n")
                with self.assertRaises(ValueError):
                    read_prices(self.path, hashlib.sha256(self.path.read_bytes()).hexdigest(),
                                self.rows[-1][0].isoformat())

    def test_latest_shadow_is_unissued_and_does_not_claim_known_outcome(self):
        result = latest_shadow(self.rows, "SYNTHETIC_INDEX", "f" * 64)
        self.assertEqual(result["status"], "SHADOW_NOT_ISSUED")
        self.assertIsNone(result["outcome"])
        self.assertIsNone(result["realized_pnl"])
        self.assertFalse(result["forecast_issue_timestamp_verified"])
        self.assertFalse(result["trade_signal_validated"])
        self.assertLessEqual(result["last_resolved_training_label_date"], result["origin_close_date"])
        target = Path(self.tmp.name) / "latest.json"
        write_private_json(result, target)
        with self.assertRaisesRegex(ValueError, "create-only"):
            write_private_json(result, target)

    def test_create_only_no_public_git_output(self):
        path = Path(self.tmp.name) / "oos.csv"
        write_private_csv([], path)
        self.assertTrue(path.exists())
        with self.assertRaisesRegex(ValueError, "create-only"):
            write_private_csv([], path)


if __name__ == "__main__":
    unittest.main()
