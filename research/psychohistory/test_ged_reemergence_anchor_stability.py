"""All values are fabricated, never copied from a UCDP case or private report."""
import copy
import tempfile
import unittest
from pathlib import Path

from ged_reemergence_anchor_stability import anchor_stability
from ged_monthly_incidence import save_private
from test_ged_reemergence_sensitivity import fixture


class AnchorStabilityTests(unittest.TestCase):
    def test_fixed_dates_yearly_scores_and_drop_one(self):
        out = anchor_stability(fixture())
        assert out["source_as_of_verified"] is False
        assert out["prospective_eligible"] is False
        self.assertIsNone(out["confidence_interval_95"])
        self.assertIsNone(out["significance_test"])
        test = out["partitions"]["test"]
        self.assertEqual(test["anchors"], [2020, 2022, 2024])
        self.assertEqual(test["n"], 6)
        self.assertEqual(test["events"], 1)
        self.assertEqual([x["year"] for x in test["by_anchor"]], [2020, 2022, 2024])
        self.assertEqual([x["n"] for x in test["by_anchor"]], [2, 2, 2])
        self.assertEqual([x["events"] for x in test["by_anchor"]], [0, 1, 0])
        self.assertEqual(len(test["leave_one_anchor_out"]), 3)
        for r in test["leave_one_anchor_out"]:
            self.assertEqual(r["n"], 4)
            self.assertEqual(r["events"], 1 - int(r["omitted_year"] == 2022))
            self.assertIn("country_history", r["brier_skill_vs_global"])
        self.assertEqual(out["partitions"]["validation"]["calendar_blocks"], 2)

    def test_unselected_month_and_future_labels_cannot_change_anchors(self):
        report = fixture()
        modified = copy.deepcopy(report)
        modified["partitions"]["test"]["cases"][-1]["outcome"] ^= 1
        self.assertEqual(anchor_stability(report), anchor_stability(modified))

    def test_failure_conditions_delegate_to_approved_nonoverlap_validator(self):
        for tweak in ("invalid_source", "missing_anchor", "duplicate"):
            report = fixture()
            if tweak == "invalid_source":
                report["source_as_of_verified"] = True
            if tweak == "missing_anchor":
                report["partitions"]["test"]["cases"] = [
                    c for c in report["partitions"]["test"]["cases"]
                    if c["origin_year"] != 2022]
            if tweak == "duplicate":
                report["partitions"]["test"]["cases"].append(
                    copy.deepcopy(report["partitions"]["test"]["cases"][0]))
            with self.subTest(tweak=tweak), self.assertRaises(ValueError):
                anchor_stability(report)

    def test_outputs_private_create_only(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "private" / "synthetic.json"
            save_private(anchor_stability(fixture()), target)
            self.assertTrue(target.is_file())
            with self.assertRaises(FileExistsError):
                save_private(anchor_stability(fixture()), target)


if __name__ == "__main__":
    unittest.main()
