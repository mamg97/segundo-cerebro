"""Entirely SYNTHETIC tests for the frozen 2027 policy. No real predictions."""
import copy
import json
from pathlib import Path
import unittest

from issue_2027_preflight import inspect_report, digest

HERE = Path(__file__).parent
POLICY = json.loads((HERE / "policy_2027.json").read_text())
PROTOCOL = json.loads((HERE / "protocol.json").read_text())
OBSERVATION = json.loads((HERE / "source_observation_20261018.json").read_text())


def imaginary_report(canonical=False):
    models = POLICY["models"]
    report = {
        "schema": ("psychohistory.ucdp_cy261_future_candidates.v1" if canonical
                   else "psychohistory.ucdp_cy261_6model_private_execution.v1"),
        "status": "UNISSUED_SHADOW_CANDIDATES_ONLY",
        "datasetVersion": "26.1", "targetYear": 2027,
        "featuresAvailableThroughYear": 2025,
        "inputZipSha256": PROTOCOL["archive_sha256"],
        "inputCodebookSha256": PROTOCOL["codebook_sha256"],
        "models": models, "benchmarkModel": "frequency",
        "sourceIntegrityVerified": True,
        "sourcePublicationAsOfVerified": False,
        "independentTimestampVerified": False,
        "forecastIssued": False, "prospectiveEligible": False,
        "candidateGeneratorCodeFromGitExecutedDirectly": False,
        "candidates": [
            {"countryId": i + 10000, "targetYear": 2027,
             "featureCutoffYear": 2025, "trainingLabelsThroughYear": 2025,
             "trainingN": 5000, "outcome": None,
             "probabilities": {key: 0.05 + j * 0.05 for j, key in enumerate(models)}}
            for i in range(196)],
    }
    if canonical:
        report.update({
            "protocolSha256": digest(HERE / "protocol.json"),
            "modelCodeSha256": digest(HERE / "benchmark.py"),
            "candidateCodeSha256": digest(HERE / "future_2027_candidates.py"),
        })
    return report


class FrozenPreflightTests(unittest.TestCase):
    def test_legacy_shadow_is_structurally_valid_but_never_promoted(self):
        out = inspect_report(imaginary_report(), POLICY, PROTOCOL)
        self.assertEqual(out["status"], "LEGACY_SHADOW_STRUCTURALLY_VALID_NOT_CANONICAL")
        self.assertEqual(out["probabilitiesChecked"], 1176)
        self.assertFalse(out["modelProtocolAndCodeMatched"])
        self.assertFalse(out["issuanceEligible"])
        self.assertFalse(out["forecastIssued"])
        self.assertEqual((out["primaryChallenger"], out["baselineModel"]),
                         ("v2_logistic", "frequency"))

    def test_sorted_json_dictionary_keys_do_not_change_model_identity(self):
        # Actual archived JSON was written with sort_keys=True; probabilities
        # are alphabetical even though the canonical model-list order is not.
        original = imaginary_report()
        rewritten = json.loads(json.dumps(original, sort_keys=True))
        self.assertNotEqual(list(rewritten["candidates"][0]["probabilities"]), POLICY["models"])
        evidence = inspect_report(rewritten, POLICY, PROTOCOL)
        self.assertEqual(evidence["probabilitiesChecked"], 1176)
        self.assertFalse(evidence["modelProtocolAndCodeMatched"])
        self.assertFalse(evidence["issuanceEligible"])

    def test_canonical_shadow_still_is_not_issued_without_external_evidence(self):
        out = inspect_report(imaginary_report(canonical=True), POLICY, PROTOCOL)
        self.assertTrue(out["modelProtocolAndCodeMatched"])
        self.assertTrue(out["status"].startswith("CANONICAL_SHADOW"))
        self.assertFalse(out["issuanceEligible"])
        self.assertFalse(out["independentTsaVerified"])
        self.assertFalse(out["sourcePublicationAsOfVerified"])

    def test_forward_source_observation_in_canonical_preflight_does_not_issue(self):
        r = inspect_report(imaginary_report(canonical=True), POLICY, PROTOCOL,
                           source_observation=OBSERVATION)
        self.assertEqual(r["status"], "CANONICAL_SHADOW_PREFLIGHT_PASSED_NOT_ISSUED")
        self.assertTrue(r["forwardSourceByteObservation"]["sourceObservedBeforeTargetStart"])
        self.assertFalse(r["forwardSourceByteObservation"]["sourceAsOfForActualIssuanceCertified"])
        self.assertTrue(r["forwardSourceByteObservation"]["githubApiAndLogsMustBeRecheckedExternally"])
        self.assertFalse(r["forecastIssued"])
        self.assertFalse(r["issuanceEligible"])
        self.assertFalse(r["independentTsaVerified"])

    def test_future_planned_issue_is_hypothetical_not_an_issuance(self):
        r = inspect_report(imaginary_report(canonical=True), POLICY, PROTOCOL,
                           source_observation=OBSERVATION,
                           planned_issue_at="2026-11-01T12:00:00Z")
        self.assertTrue(r["forwardSourceByteObservation"]["plannedIssuanceAfterObservation"])
        self.assertFalse(r["issuanceEligible"])
        for issue in ("2026-06-09T00:00:00Z", "2027-01-01T00:00:00Z"):
            with self.subTest(issue=issue), self.assertRaises(ValueError):
                inspect_report(imaginary_report(canonical=True), POLICY, PROTOCOL,
                               source_observation=OBSERVATION, planned_issue_at=issue)

    def test_witness_mismatch_cannot_turn_canonical_report_into_certified_asof(self):
        bad = copy.deepcopy(OBSERVATION)
        bad["archiveSha256"] = "0" * 64
        with self.assertRaises(ValueError):
            inspect_report(imaginary_report(canonical=True), POLICY, PROTOCOL,
                           source_observation=bad)
        with self.assertRaisesRegex(ValueError, "requires a source observation"):
            inspect_report(imaginary_report(canonical=True), POLICY, PROTOCOL,
                           planned_issue_at="2026-11-01T12:00:00Z")

    def test_outcome_lookahead_duplicate_nonfinite_and_model_selection_are_rejected(self):
        for mutate in ("outcome", "year", "feature", "training", "duplicate",
                       "missing_model", "nan", "issued", "asof", "wrong_zip", "wrong_roster"):
            report = imaginary_report()
            first = report["candidates"][0]
            if mutate == "outcome": first["outcome"] = 1
            elif mutate == "year": first["targetYear"] = 2026
            elif mutate == "feature": first["featureCutoffYear"] = 2026
            elif mutate == "training": first["trainingLabelsThroughYear"] = 2026
            elif mutate == "duplicate": report["candidates"][1]["countryId"] = first["countryId"]
            elif mutate == "missing_model": del first["probabilities"]["markov"]
            elif mutate == "nan": first["probabilities"]["frequency"] = float("nan")
            elif mutate == "issued": report["forecastIssued"] = True
            elif mutate == "asof": report["sourcePublicationAsOfVerified"] = True
            elif mutate == "wrong_zip": report["inputZipSha256"] = "0" * 64
            elif mutate == "wrong_roster": report["candidates"].pop()
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                inspect_report(report, POLICY, PROTOCOL)

    def test_canonical_forged_provenance_rejected(self):
        bad = imaginary_report(canonical=True)
        bad["candidateCodeSha256"] = "f" * 64
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            inspect_report(bad, POLICY, PROTOCOL)

    def test_policy_cannot_change_primary_comparator_after_registration(self):
        for change in ("baseline", "primary_challenger", "expected_roster_size",
                       "input_zip_sha256", "scoring_authorized"):
            policy = copy.deepcopy(POLICY)
            policy[change] = True if change == "scoring_authorized" else "UNAPPROVED"
            with self.subTest(change=change), self.assertRaises(ValueError):
                inspect_report(imaginary_report(), policy, PROTOCOL)


if __name__ == "__main__":
    unittest.main()
