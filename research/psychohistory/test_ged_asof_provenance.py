"""Synthetic tests: source publication and UCDP availability must never collapse."""
import copy
from datetime import date
import hashlib
import tempfile
import unittest
from pathlib import Path

from ged_asof_provenance import (
    audit, day, source_publications, verify_vintage_manifest,
    CASEBOOK_SCHEMA, VINTAGE_SCHEMA,
)


def event(id, when, source):
    return {
        "ged_id": id, "date": when, "source_article_publication_dates_raw": source,
        "side_a": "SYNTHETIC ALPHA", "side_b": "SYNTHETIC BETA",
    }


def link(cid, end, issue, cutoff, eid):
    return {
        "country_id": cid, "target_end_month": end,
        "hypothetical_issue_month": issue, "cutoff_month": cutoff,
        "horizon_months": 24, "event_target_binary": 1,
        "earliest_event_ged_id": eid,
    }


def fake_casebook():
    return {
        "schema": CASEBOOK_SCHEMA, "ged_version": "25.1",
        "ged_zip_sha256": "a" * 64, "recency_report_sha256": "b" * 64,
        "prospective_eligible": False,
        "information_available_at_historical_issue_verified": False,
        "event_is_not_specific_forecast": True,
        "source_article_dates_are_not_ucdp_availability": True,
        "events_by_id": {
            "101": event(101, "2017-11-16", "2017-11-17;2018-06-20"),
            "102": event(102, "2021-05-18", "2021-05-19"),
        },
        "distinct_ged_events_first_in_any_horizon": 2,
        "total_positive_horizon_links": 2,
        "partitions": {
            "validation": {
                "positive_horizons": 1, "linked_positive_horizons": 1,
                "links": [link(5, "2018-01", "2016-02", "2016-01", 101)],
            },
            "test": {
                "positive_horizons": 1, "linked_positive_horizons": 1,
                "links": [link(6, "2022-01", "2020-02", "2020-01", 102)],
            },
        },
    }


class AsOfProvenanceTests(unittest.TestCase):
    def test_date_normalization_and_source_date_uncertainty(self):
        self.assertEqual(day("2019-01-31"), date(2019, 1, 31))
        self.assertEqual(source_publications("2020-01-15;2020-01-15")["dates"], ["2020-01-15"])
        self.assertEqual(source_publications("")["status"], "NOT_RECORDED")
        self.assertEqual(source_publications("bad-date;2021-03-16")["status"], "PARTLY_UNPARSEABLE")
        with self.assertRaises(ValueError):
            day("2021-02-29")
        with self.assertRaises(ValueError):
            day("2020-02-01T19:20Z")

    def test_no_snapshot_means_no_asof_even_when_article_exists(self):
        result = audit(fake_casebook(), "d" * 64)
        self.assertEqual(result["casebook_events"], 2)
        self.assertEqual(result["country_horizon_links"], 2)
        self.assertEqual(result["snapshot_status_counts"], {"NO_PINNED_IN_SCOPE_VINTAGE": 2})
        self.assertFalse(result["source_as_of_verified"])
        self.assertFalse(result["model_scores_computed"])
        self.assertIsNone(result["events"]["101"]["ucdp_record_first_available"])
        self.assertEqual(result["events"]["101"]["first_source_article_date"], "2017-11-17")
        self.assertNotIn("forecast_probability", str(result["links"]))

    def test_reject_target_anchor_duplicates_and_invented_prospective_flags(self):
        for kind in ("future", "issue_date", "duplicate", "asof"):
            doc = fake_casebook()
            if kind == "future":
                doc["events_by_id"]["101"]["date"] = "2018-02-01"
            elif kind == "issue_date":
                doc["partitions"]["test"]["links"][0]["hypothetical_issue_month"] = "2021-01"
            elif kind == "duplicate":
                row = doc["partitions"]["validation"]["links"][0]
                doc["partitions"]["validation"]["links"].append(copy.deepcopy(row))
                doc["partitions"]["validation"]["positive_horizons"] = 2
                doc["partitions"]["validation"]["linked_positive_horizons"] = 2
                doc["total_positive_horizon_links"] = 3
            else:
                doc["information_available_at_historical_issue_verified"] = True
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                audit(doc, "d" * 64)

    def test_verified_snapshot_is_still_NOT_a_vintage_correct_forecast(self):
        with tempfile.TemporaryDirectory() as root:
            loc = Path(root) / "SYNTHETIC_CANDIDATE.zip"
            loc.write_bytes(b"FICTIONAL DATA ONLY")
            digest = hashlib.sha256(loc.read_bytes()).hexdigest()
            v = {
                "schema": VINTAGE_SCHEMA,
                "snapshots": [{
                    "source_type": "UCDP_CANDIDATE",
                    "edition": "19.0.12", "archive_file": loc.name,
                    "sha256": digest, "release_date": "2019-12-31",
                    "release_date_evidence_url": "https://ucdp.uu.se/downloads/olddw.html",
                    "source_scope_verified": True,
                    "target_comparability_verified": False,
                    "country_ids_in_verified_scope": [6],
                }],
            }
            snaps = verify_vintage_manifest(v, Path(root))
            out = audit(fake_casebook(), "d" * 64, snaps)
            self.assertEqual(out["snapshot_status_counts"]["NO_PINNED_IN_SCOPE_VINTAGE"], 1)
            self.assertEqual(out["snapshot_status_counts"]["SNAPSHOT_PRESENT_REBUILD_TARGET_REQUIRED"], 1)
            self.assertFalse(out["source_as_of_verified"])
            self.assertFalse(out["vintage_target_rebuilt"])
            self.assertFalse(out["links"][1]["forecast_issued_in_real_time_verified"])
            loc.write_bytes(b"TAMPERED")
            with self.assertRaises(ValueError):
                verify_vintage_manifest(v, Path(root))

    def test_same_day_release_is_not_proven_prior_to_month_start(self):
        # Actual timestamps within a day may be unknown. Fail closed.
        result = audit(fake_casebook(), "e" * 64, [{
            "edition": "20.0.2", "release_date": date(2020, 2, 1),
            "country_ids": {6}, "sha256": "f" * 64,
        }])
        self.assertEqual(result["snapshot_status_counts"]["NO_PINNED_IN_SCOPE_VINTAGE"], 2)

    def test_manifest_rejects_final_dataset_scope_fraud(self):
        with tempfile.TemporaryDirectory() as root:
            loc = Path(root) / "example.zip"
            loc.write_bytes(b"FAKE")
            spec = {
                "schema": VINTAGE_SCHEMA, "snapshots": [{
                    "source_type": "UCDP_GED_FINAL", "edition": "25.1",
                    "archive_file": "example.zip", "sha256": hashlib.sha256(b"FAKE").hexdigest(),
                    "release_date": "2025-06-01",
                    "release_date_evidence_url": "https://ucdp.uu.se/downloads/olddw.html",
                    "source_scope_verified": True,
                    "target_comparability_verified": False,
                    "country_ids_in_verified_scope": [6],
                }],
            }
            with self.assertRaises(ValueError):
                verify_vintage_manifest(spec, Path(root))
            spec["snapshots"][0]["source_type"] = "UCDP_CANDIDATE"
            spec["snapshots"][0]["edition"] = "20.0.2"
            spec["snapshots"][0]["archive_file"] = "../example.zip"
            with self.assertRaises(ValueError):
                verify_vintage_manifest(spec, Path(root))


if __name__ == "__main__":
    unittest.main()
