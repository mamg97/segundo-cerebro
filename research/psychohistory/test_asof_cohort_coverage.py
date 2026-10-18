"""Adversarial tests use only synthetic countries and source bytes."""
import copy
from datetime import date
import hashlib
from pathlib import Path
import tempfile
import unittest

from asof_cohort_coverage import audit, parse_roster, save_private, PRESENT, MISSING
from ged_asof_provenance import verify_vintage_manifest, VINTAGE_SCHEMA


def roster():
    return {"schema": "psychohistory.candidate_country_origin_roster.v1",
            "origins": [
                {"issue_month": "2020-02", "cutoff_month": "2020-01",
                 "country_ids": [123, 456]},
                {"issue_month": "2020-03", "cutoff_month": "2020-02",
                 "country_ids": [123, 456]}]}


class CandidateAsOfCoverageTests(unittest.TestCase):
    def test_full_population_includes_unknown_negatives_and_hash_guard(self):
        with tempfile.TemporaryDirectory() as t:
            folder = Path(t)
            files = [folder / "SYNTHETIC_19.csv", folder / "SYNTHETIC_20.csv"]
            for i, file in enumerate(files):
                file.write_bytes(("FAKE SOURCE " + str(i)).encode())
            items = []
            for path, edition, published, ids in [
                (files[0], "19.0.12", "2019-12-31", [123]),
                (files[1], "20.0.2", "2020-02-15", [123,456])]:
                items.append({
                    "source_type": "UCDP_CANDIDATE", "edition": edition,
                    "archive_file": path.name,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "release_date": published,
                    "release_date_evidence_url": "https://ucdp.uu.se/downloads/olddw.html",
                    "source_scope_verified": True,
                    "target_comparability_verified": False,
                    "country_ids_in_verified_scope": ids})
            snapshots = verify_vintage_manifest({"schema": VINTAGE_SCHEMA,
                                                  "snapshots": items}, folder)
            result = audit(roster(), snapshots)
            self.assertEqual(result["summary"], {
                "n_origins": 2, "n_country_origins": 4,
                "n_pinned_declared_scope": 3, "n_missing": 1,
                "n_fully_covered_origins": 1})
            self.assertEqual([x["status"] for x in result["country_origins"]],
                             [PRESENT, MISSING, PRESENT, PRESENT])
            self.assertFalse(result["source_as_of_verified"])
            self.assertFalse(result["vintage_correct_backtest"])
            self.assertFalse(result["forecast_issued"])
            self.assertFalse(result["scores_computed"])
            private = folder / "private_audit.json"
            save_private(result, private)
            self.assertTrue(private.exists())
            with self.assertRaises(FileExistsError):
                save_private(result, private)
            files[1].write_bytes(b"TAMPERED SYNTHETIC ARCHIVE")
            with self.assertRaises(ValueError):
                verify_vintage_manifest({"schema": VINTAGE_SCHEMA,
                                         "snapshots": items}, folder)

    def test_outcome_leak_cutoff_and_duplicate_population_fail(self):
        for case in ("outcome", "future", "duplicate_origin", "duplicate_country",
                     "bool_country", "backwards", "empty", "invalid_month"):
            data = copy.deepcopy(roster())
            if case == "outcome":
                data["origins"][0]["outcome"] = 0
            elif case == "future":
                data["origins"][0]["cutoff_month"] = "2020-02"
            elif case == "duplicate_origin":
                data["origins"][1] = copy.deepcopy(data["origins"][0])
            elif case == "duplicate_country":
                data["origins"][0]["country_ids"] = [123,123]
            elif case == "bool_country":
                data["origins"][0]["country_ids"] = [True]
            elif case == "backwards":
                data["origins"].reverse()
            elif case == "empty":
                data["origins"][0]["country_ids"] = []
            else:
                data["origins"][0]["issue_month"] = "2020-00"
            with self.subTest(case=case), self.assertRaises(ValueError):
                parse_roster(data)

    def test_same_day_is_not_before_issue_and_never_scored(self):
        doc = {"schema": roster()["schema"], "origins": [{
            "issue_month": "2020-02", "cutoff_month": "2020-01",
            "country_ids": [123]}]}
        snapshot = {"release_date": date(2020,2,1), "country_ids": {123},
                    "edition": "20.0.2", "sha256": "a"*64}
        report = audit(doc, [snapshot])
        self.assertEqual(report["status"], "NO_EVALUABLE")
        self.assertEqual(report["country_origins"][0]["status"], MISSING)
        self.assertFalse(report["source_release_dates_independently_authenticated"])

    def test_ambiguous_same_day_and_fake_snapshot_rejected(self):
        doc = {"schema": roster()["schema"], "origins": [{
            "issue_month": "2020-03", "cutoff_month": "2020-02",
            "country_ids": [123]}]}
        snapshot = {"release_date": date(2020,2,1), "country_ids": {123},
                    "edition": "20.0.2", "sha256": "a"*64}
        with self.assertRaises(ValueError):
            audit(doc, [snapshot, dict(snapshot, edition="20.0.3")])
        with self.assertRaises(ValueError):
            audit(doc, [dict(snapshot, release_date="2020-02-01")])

    def test_public_repo_output_refused(self):
        report = audit(roster(), [])
        with self.assertRaises(ValueError):
            save_private(report, Path(__file__).resolve().parent / "NEVER_WRITE.json")


if __name__ == "__main__":
    unittest.main()
