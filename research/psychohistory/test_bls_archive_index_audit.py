"""Synthetic contract checks for the private BLS archive-link inventory."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from bls_archive_index_audit import ABSENCE_SOURCE, validate  # noqa: E402


class BlsArchiveIndexTests(unittest.TestCase):
    def test_missing_month_is_explicit_and_release_date_matches_url(self):
        months = ["2025-09", "2025-10", "2025-11"]
        rows = [
            {"reference_month": "2025-09", "release_date": "2025-11-20", "status": "archived_release",
             "source_url": "https://www.bls.gov/news.release/archives/empsit_11202025.htm"},
            {"reference_month": "2025-10", "release_date": "", "status": "not_collected",
             "source_url": ABSENCE_SOURCE},
            {"reference_month": "2025-11", "release_date": "2025-12-16", "status": "archived_release",
             "source_url": "https://www.bls.gov/news.release/archives/empsit_12162025.pdf"},
        ]
        report = validate(rows, months, {"2025-10"})
        self.assertEqual((report["archived_release_link_count"], report["known_absence_count"]), (2, 1))
        self.assertEqual(report["releases_after_following_month_count"], 1)
        self.assertFalse(report["original_release_bytes_archived"])
        rows[0]["release_date"] = "2025-11-21"
        with self.assertRaisesRegex(ValueError, "differs"):
            validate(rows, months, {"2025-10"})

    def test_omission_and_nonofficial_links_fail(self):
        months = ["2025-09", "2025-10"]
        rows = [{"reference_month": "2025-09", "release_date": "2025-11-20",
                 "status": "archived_release", "source_url": "https://example.org/empsit_11202025.htm"}]
        with self.assertRaisesRegex(ValueError, "complete"):
            validate(rows, months, {"2025-10"})
        rows.append({"reference_month": "2025-10", "release_date": "",
                     "status": "not_collected", "source_url": ABSENCE_SOURCE})
        with self.assertRaisesRegex(ValueError, "Nonofficial"):
            validate(rows, months, {"2025-10"})


if __name__ == "__main__":
    unittest.main()
