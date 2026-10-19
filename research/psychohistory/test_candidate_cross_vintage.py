"""Adversarial, wholly fictional UCDP Candidate revision/identity scenarios."""
import csv
import hashlib
import io
import unittest

from candidate_cross_vintage import read_month, compare


FIELDS = ("id", "country_id", "type_of_violence", "date_start", "date_end", "date_prec")


def make(rows):
    out = io.StringIO(newline="")
    writer = csv.DictWriter(out, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue().encode("utf-8")


def event(eid, cid, start, end, precision, kind=1):
    return {"id": str(eid), "country_id": str(cid), "type_of_violence": str(kind),
            "date_start": start, "date_end": end, "date_prec": str(precision)}


def december():
    return make([
        event(100, 123, "2024-12-30", "2025-01-01", "0"),
        event(101, 456, "2024-12-31", "2025-01-03", "0", 2),
        event(102, 123, "2024-12-15", "2024-12-15", "1"),
    ])


def january():
    return make([
        event(100, 123, "2024-12-30", "2025-01-02", "3"),
        event(103, 789, "2025-01-06", "2025-01-06", "1"),
    ])


class CrossVintageTests(unittest.TestCase):
    def test_matched_zero_transition_is_descriptive_not_prospective(self):
        d_raw = december()
        digest = hashlib.sha256(d_raw).hexdigest()
        d = read_month(d_raw, "24.0.12", digest)
        j = read_month(january(), "25.0.1")
        result = compare(d, j)
        self.assertEqual(result["event_counts"], {"december": 3, "january": 2})
        self.assertEqual(result["n_matched_identifiers"], 1)
        self.assertEqual(result["n_comparable_changed_date_bounds"], 1)
        self.assertEqual(result["n_comparable_changed_date_prec"], 1)
        self.assertEqual(result["december_code_zero"], {
            "n": 2, "n_with_end_in_2025": 2,
            "n_same_identity_observed_in_january": 1,
            "n_not_observed_with_same_identity_in_january": 1,
            "n_transitioned_to_documented_1_to_5": 1,
            "n_retaining_code_zero": 0, "n_changed_date_interval": 1,
        })
        self.assertEqual(result["monthly_window_mismatch_counts"], {"december": 0, "january": 0})
        self.assertEqual(result["code_zero_date_geometry_by_edition"]["december"], {
            "n": 2, "n_started_in_nominal_month": 2,
            "n_end_after_nominal_month": 2,
            "n_end_in_nominal_month": 0, "n_same_day_interval": 0})
        self.assertEqual(result["code_zero_date_geometry_by_edition"]["january"]["n"], 0)

        self.assertTrue(result["december_pinned_from_prior_2026_observation"])
        self.assertFalse(result["january_pinned_from_prior_observation"])
        self.assertFalse(result["event_identity_stable_across_editions_verified"])
        self.assertFalse(result["country_zero_event_roster_verified"])
        self.assertFalse(result["source_as_of_verified"])
        self.assertFalse(result["forecast_issued"])
        self.assertNotIn("country_id", result)
        self.assertNotIn("event_id", result)
        self.assertNotIn("rows", result)

    def test_identity_conflict_never_masquerades_as_precision_transition(self):
        altered = make([
            event(100, 999, "2024-12-30", "2025-01-02", "1"),
            event(103, 789, "2025-01-06", "2025-01-06", "1"),
        ])
        result = compare(read_month(december(), "24.0.12"),
                         read_month(altered, "25.0.1"))
        self.assertEqual(result["n_matched_identifiers"], 1)
        self.assertEqual(result["n_identity_conflicts_country_or_type"], 1)
        self.assertEqual(result["n_comparable_matched_identifiers"], 0)
        self.assertEqual(result["december_code_zero"]["n_same_identity_observed_in_january"], 0)

    def test_changed_archive_rejected(self):
        with self.assertRaisesRegex(ValueError, "Pinned archive changed"):
            read_month(december(), "24.0.12", "f" * 64)
        with self.assertRaisesRegex(ValueError, "Invalid expected SHA"):
            read_month(december(), "24.0.12", "INVALID")
        with self.assertRaises(ValueError):
            read_month(december(), "25.0.2")

    def test_reject_invalid_and_duplicate_ids(self):
        for dataset in (
            make([event(100, 123, "2024-12-30", "2024-12-30", 1)] * 2),
            make([event("NOT_ID", 123, "2024-12-30", "2024-12-30", 1)]),
            make([event(100, -1, "2024-12-30", "2024-12-30", 1)]),
            make([event(100, 123, "2025-01-03", "2024-12-30", 1)]),
            b"id,id,country_id,type_of_violence,date_start,date_end,date_prec\n",
            b"\xff\xfe",
        ):
            with self.subTest(dataset=dataset[:35]), self.assertRaises(ValueError):
                read_month(dataset, "24.0.12")

    def test_window_mismatch_is_flagged_never_scored(self):
        dec = make([event(100, 123, "2024-11-10", "2024-11-11", 1)])
        r = compare(read_month(dec, "24.0.12"),
                    read_month(january(), "25.0.1"))
        self.assertEqual(r["monthly_window_mismatch_counts"]["december"], 1)
        self.assertFalse(r["source_as_of_verified"])
        self.assertFalse(r["models_scored"])


if __name__ == "__main__":
    unittest.main()
