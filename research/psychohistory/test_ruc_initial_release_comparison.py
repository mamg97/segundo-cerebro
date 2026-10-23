"""Synthetic alignment and missingness checks."""

import unittest
from ruc_initial_release_comparison import compare


class ComparisonTests(unittest.TestCase):
    def test_first_available_is_not_last_revision(self):
        cells = {(2, 1): "RUC00Q1", (3, 1): "RUC00Q2", (1, 2): "2000:01", (2, 2): 7.1, (3, 2): 7.3}
        observations = [{"reference_month": "2000-01-01", "rate_percent": "7.0"},
                        {"reference_month": "2000-02-01", "rate_percent": "7.2"}]
        result = compare(cells, 2, 1, observations)
        self.assertEqual(result["max_absolute_difference_pp"], "0.1")
        self.assertEqual(result["outside_ruc_observation_range"], ["2000-02"])

    def test_missing_is_separate_and_conflict_fails(self):
        cells = {(2, 1): "RUC00Q1", (1, 2): "2000:01", (2, 2): 7.1, (1, 3): "2000:02"}
        observations = [{"reference_month": "2000-01-01", "rate_percent": "7.1"},
                        {"reference_month": "2000-02-01", "rate_percent": None}]
        self.assertEqual(compare(cells, 1, 2, observations)["missing_in_both"], ["2000-02"])
        cells[2, 3] = 0.0
        with self.assertRaisesRegex(ValueError, "ALFRED-missing"):
            compare(cells, 1, 2, observations)

    def test_duplicate_initial_month_fails(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            compare({}, 0, 0, [{"reference_month": "2000-01-01"}] * 2)


if __name__ == "__main__":
    unittest.main()
