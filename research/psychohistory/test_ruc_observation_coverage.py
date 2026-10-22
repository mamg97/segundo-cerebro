"""Check censoring and missing months before RUC can be used for targets."""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ruc_observation_coverage import coverage  # noqa: E402
from test_ruc_vintage_audit import fixture  # noqa: E402


class RucCoverageTests(unittest.TestCase):
    def test_first_vintage_is_left_censored_and_gaps_remain_unknown(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ruc.xlsx"
            sha = fixture(path)
            report = coverage(path, sha)
            self.assertEqual(report["left_censored_months"], 1)
            self.assertEqual(report["assessed_months"], 1)
            self.assertEqual(report["never_observed_months_after_first_cutoff"],
                             ["2025-02", "2025-03"])
            self.assertEqual(report["first_ruc_appearance_lag_months"], {0: 1})
            self.assertEqual(report["last_observation_lag_by_vintage_months"],
                             {0: 2})
            self.assertFalse(report["first_bls_release_identified"])
            self.assertFalse(report["predictive_skill_demonstrated"])


if __name__ == "__main__":
    unittest.main()
