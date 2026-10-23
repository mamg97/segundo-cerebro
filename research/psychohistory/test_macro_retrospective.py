"""Invented cases for temporal leakage, targets, baselines and scoring."""

import copy
import json
from pathlib import Path
import unittest

from macro_retrospective import make_case, training_at, probabilities, run_cases, metrics, shift_month

PROTOCOL = json.loads((Path(__file__).parent / "macro_protocol_v1.json").read_text())


def fixture():
    months = {}
    for i in range(7):
        month = shift_month("2000-01-01", i)
        months[month] = [{"start": shift_month(month, 1), "end": None, "rate_percent": "7.0"}]
    months["2000-07-01"] = [{"start": "2000-08-01", "end": "2000-09-01", "rate_percent": "7.0"},
                            {"start": "2000-09-02", "end": None, "rate_percent": "9.0"}]
    return {"exported_on": "2002-01-01", "months": months}


def historic(origin, label_date, y, x=None):
    return {"origin": origin, "vintage_date": origin[:8] + "15", "status": "ELIGIBLE",
            "label_status": "AVAILABLE", "label_available_on": label_date, "y": y,
            "x": x or [7.0, 0.1, 0.2, 0.3]}


class MacroTests(unittest.TestCase):
    def test_horizon_threshold_and_no_future_revision(self):
        initial = {"2001-01-01": {"rate_percent": "7.5", "alfred_realtime_start_date": "2001-02-02"}}
        row = make_case(fixture(), initial, "2000-08-16", PROTOCOL)
        self.assertEqual(row["base_rate"], "7.0")
        self.assertEqual(row["target_month"], "2001-01-01")
        self.assertEqual(row["y"], 1)
        self.assertEqual(row["issue_timestamp"], "2000-08-16T00:00:00-04:00")
        initial["2001-01-01"]["rate_percent"] = "7.49"
        self.assertEqual(make_case(fixture(), initial, "2000-08-16", PROTOCOL)["y"], 0)

    def test_missing_feature_and_missing_outcome_not_zero(self):
        report = fixture()
        report["months"]["2000-04-01"][0]["rate_percent"] = None
        self.assertEqual(make_case(report, {}, "2000-08-16", PROTOCOL)["status"], "MISSING_FEATURE")
        initial = {"2001-01-01": {"rate_percent": None, "alfred_realtime_start_date": "2001-02-02"}}
        row = make_case(fixture(), initial, "2000-08-16", PROTOCOL)
        self.assertEqual(row["label_status"], "MISSING")
        self.assertNotIn("y", row)

    def test_late_labels_excluded_and_boundary_included(self):
        case = {"origin": "2002-02-16", "vintage_date": "2002-02-15"}
        early = historic("2001-02-16", "2002-02-15", 0)
        late = historic("2001-05-16", "2002-02-16", 1)
        self.assertEqual(training_at([early, late], case), [early])

    def test_target_and_future_case_changes_do_not_change_prediction(self):
        protocol = {**PROTOCOL, "test_origin_start": "2002-02-16", "minimum_training_cases": 2}
        rows = [historic("2001-02-16", "2001-09-01", 0), historic("2001-05-16", "2001-12-01", 0),
                historic("2002-02-16", "2002-09-01", 1), historic("2003-02-16", "2003-09-01", 0)]
        before = run_cases(rows, protocol)["test_cases"][0]
        changed = copy.deepcopy(rows)
        changed[2]["y"] = 0
        changed[3]["x"] = [100, 100, 100, 100]
        after = run_cases(changed, protocol)["test_cases"][0]
        self.assertEqual(before["probability"], after["probability"])
        self.assertEqual(before["training_origins"], after["training_origins"])

    def test_single_class_baseline_explicit(self):
        train = [historic("2001-02-16", "2001-09-01", 0)] * 4
        p, b, method = probabilities(train, [7, 0, 0, 0], PROTOCOL)
        self.assertEqual(p, 1 / 6)
        self.assertEqual(p, b)
        self.assertEqual(method, "SINGLE_CLASS_BASELINE")

    def test_logistic_finite_and_training_order_invariant(self):
        train = [historic("2001-02-16", "2001-09-01", i % 2, [float(i % 2), 0, 0, 0]) for i in range(24)]
        p, _, method = probabilities(train, [1, 0, 0, 0], PROTOCOL)
        self.assertGreater(p, 0.5)
        self.assertLess(p, 1)
        self.assertEqual(method, "LOGISTIC_FITTED")
        self.assertAlmostEqual(p, probabilities(list(reversed(train)), [1, 0, 0, 0], PROTOCOL)[0])

    def test_metrics_paired_and_no_cases(self):
        scored = [{"y": 1, "probability": 0.8, "baseline_probability": 0.5},
                  {"y": 0, "probability": 0.2, "baseline_probability": 0.5}]
        self.assertAlmostEqual(metrics(scored)["brier_model"], 0.04)
        self.assertAlmostEqual(metrics(scored)["brier_skill"], 0.84)
        self.assertIsNone(metrics([])["brier_model"])


if __name__ == "__main__":
    unittest.main()
