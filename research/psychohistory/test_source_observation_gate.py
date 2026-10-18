"""Synthetic adversarial cases for the forward-only source observation gate."""
import copy
import json
from pathlib import Path
import unittest
from source_observation_gate import assess

HERE = Path(__file__).resolve().parent
ACTUAL_PROTOCOL = json.loads((HERE / "protocol.json").read_text())
ACTUAL_REFERENCE = json.loads((HERE / "source_observation_20261018.json").read_text())


class ForwardSourceObservationTests(unittest.TestCase):
    def test_public_run_observation_is_forward_only_not_independent_tsa(self):
        r = assess(ACTUAL_REFERENCE, ACTUAL_PROTOCOL, target_year=2027)
        self.assertEqual(r["observedNoLaterThanUtc"], "2026-10-18T13:13:19Z")
        self.assertTrue(r["sourceObservedBeforeTargetStart"])
        self.assertFalse(r["eligibleForHistoricalBacktestAsOf"])
        self.assertFalse(r["exactJuneReleaseDateVerified"])
        self.assertFalse(r["sourceAsOfForActualIssuanceCertified"])
        self.assertFalse(r["forecastIssued"])
        self.assertFalse(r["prospectiveEligible"])
        self.assertTrue(r["githubApiAndLogsMustBeRecheckedExternally"])

    def test_future_planned_issue_is_not_real_issuance(self):
        r = assess(ACTUAL_REFERENCE, ACTUAL_PROTOCOL,
                   planned_issue_at="2026-11-01T12:00:00Z")
        self.assertTrue(r["plannedIssuanceAfterObservation"])
        self.assertFalse(r["forecastIssued"])
        for invalid in (
            "2026-10-18T13:13:18Z",
            "2026-01-01T00:00:00Z",
            "2027-01-01T00:00:00Z",
            "not_a_time",
            "2026-10-18T17:00:00+02:00",
        ):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                assess(ACTUAL_REFERENCE, ACTUAL_PROTOCOL, planned_issue_at=invalid)

    def test_historical_origins_cannot_use_october_2026_observation(self):
        for year in (2016, 2020, 2025, 2026):
            with self.subTest(year=year), self.assertRaises(ValueError):
                assess(ACTUAL_REFERENCE, ACTUAL_PROTOCOL, target_year=year)

    def test_hash_swaps_fake_pins_and_misrepresented_public_date_rejected(self):
        examples = [
            ("archiveSha256", "0" * 64),
            ("codebookSha256", "a" * 64),
            ("sourceRows", 9000),
            ("version", "25.1"),
            ("archiveUrl", "https://example.com/patched.zip"),
            ("forecastIssued", True),
            ("sourceByteAvailabilityAtHistoricalBacktestOriginsVerified", True),
            ("externalCryptographicTimestampOfSourceVerified", True),
            ("sourceAvailableOnJune9ForTheseExactBytesVerified", True),
        ]
        for key, value in examples:
            copydata = copy.deepcopy(ACTUAL_REFERENCE)
            copydata[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                assess(copydata, ACTUAL_PROTOCOL)

    def test_forged_url_non_success_and_time_backdating_rejected(self):
        bad_variants = [
            ("id", 1),
            ("url", "http://github.com/mamg97/segundo-cerebro/actions/runs/39130567553"),
            ("conclusion", "failure"),
            ("status", "in_progress"),
            ("repository", "fake/synthetic"),
            ("sourceCommit", "BAD"),
            ("startedAtUtc", "2026-10-19T00:00:00Z"),
            ("endedNoLaterThanUtc", "2027-02-01T00:00:00Z"),
            ("endedNoLaterThanUtc", "2025-12-31T00:00:00Z"),
        ]
        for key, value in bad_variants:
            copydata = copy.deepcopy(ACTUAL_REFERENCE)
            copydata["ciRun"][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                assess(copydata, ACTUAL_PROTOCOL)

    def test_missing_validation_step_and_press_overclaim_rejected(self):
        bad = copy.deepcopy(ACTUAL_REFERENCE)
        bad["ciRun"]["steps"]["hashesMatchedPinsAndSourcePanelValidated"] = "failure"
        with self.assertRaises(ValueError):
            assess(bad, ACTUAL_PROTOCOL)
        bad = copy.deepcopy(ACTUAL_REFERENCE)
        bad["pressAnnouncement"]["exactArchiveBytesDatedByAnnouncement"] = True
        with self.assertRaises(ValueError):
            assess(bad, ACTUAL_PROTOCOL)

    def test_observation_is_not_a_cryptographic_proof_even_if_fields_pass(self):
        r = assess(ACTUAL_REFERENCE, ACTUAL_PROTOCOL)
        self.assertEqual(r["status"],
                         "EXACT_BYTES_OBSERVED_IN_DATED_EXTERNAL_CI_METADATA_ONLY")
        self.assertNotIn("independentTimestampVerified", r)
        self.assertFalse(r["independentCryptographicTimeWitnessVerified"])
        self.assertFalse(r["sourceAsOfForActualIssuanceCertified"])


if __name__ == "__main__":
    unittest.main()
