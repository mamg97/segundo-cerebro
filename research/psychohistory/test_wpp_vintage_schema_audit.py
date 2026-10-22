"""Synthetic tests for the UN demographic vintage boundary."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from wpp_vintage_schema_audit import compare  # noqa: E402


class WppVintageSchemaTests(unittest.TestCase):
    def test_revision_is_not_ground_truth_or_skill(self):
        first = {"AAA": ("1", "A", 100.0), "BBB": ("2", "B", 200.0)}
        second = {"AAA": ("1", "A", 101.0), "BBB": ("2", "B", 200.0)}
        report = compare(first, second, expected_country_count=2)
        self.assertEqual(report["revised_2023_population_count"], 1)
        self.assertFalse(report["2024_estimate_is_independent_ground_truth"])
        self.assertFalse(report["predictive_skill_demonstrated"])

    def test_geography_change_fails_before_comparison(self):
        first = {"AAA": ("1", "A", 100.0)}
        with self.assertRaisesRegex(ValueError, "ISO3 universes"):
            compare(first, {"BBB": ("1", "A", 100.0)}, expected_country_count=1)
        with self.assertRaisesRegex(ValueError, "identifiers"):
            compare(first, {"AAA": ("9", "A", 100.0)}, expected_country_count=1)


if __name__ == "__main__":
    unittest.main()
