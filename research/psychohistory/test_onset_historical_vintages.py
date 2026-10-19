"""Synthetic/metadata-only tests: no state or event rows anywhere."""
import unittest
from onset_historical_vintages import SOURCES, audit, review_source, source_index_presence


class HistoricalVintageTests(unittest.TestCase):
    def test_current_index_links_never_certify_historical_bytes(self):
        index = (b'<html><a href="ged/ged191-csv.zip">GED</a>'
                 b'<a href="candidateged/GEDEvent_v20_0_10.csv">Candidate</a></html>')
        result = audit(("2019-01-01", "2020-01-01", "2021-01-01"), index)
        self.assertEqual(result["current_index_present"], {
            "ucdp_ged_19_1": True, "ucdp_candidate_20_0_10": True})
        for flag in ("independent_historical_byte_witness_verified",
                     "full_risk_set_at_issue_verified", "backtest_authorized",
                     "models_scored", "forecast_issued"):
            self.assertFalse(result[flag])

    def test_ged_191_for_2020_is_lagged_context_not_prior_year(self):
        outcome = review_source(SOURCES[0], "2020-01-01")
        self.assertTrue(outcome["chronology_candidate_only"])
        self.assertFalse(outcome["prior_year_full_activity_observed"])
        self.assertIn("PREVIOUS_YEAR_INTRASTATE_ACTIVITY_UNRESOLVED",
                      outcome["blocking_reasons"])
        self.assertFalse(outcome["asof_intrastate_activity_verified"])
        self.assertFalse(outcome["complete_country_risk_set_verified"])

    def test_candidate_2020_cannot_predict_january_2020(self):
        outcome = review_source(SOURCES[1], "2020-01-01")
        self.assertFalse(outcome["chronology_candidate_only"])
        self.assertIn("RELEASE_YEAR_NOT_BEFORE_ORIGIN", outcome["blocking_reasons"])
        self.assertIn("SOURCE_OBSERVATION_END_UNKNOWN", outcome["blocking_reasons"])

    def test_all_reviewed_dates_fail_closed(self):
        for year in (2018, 2019, 2020, 2021, 2024):
            for source in SOURCES:
                with self.subTest(year=year, source=source["source_id"]):
                    result = review_source(source, f"{year}-01-01")
                    self.assertFalse(result["backtest_authorized"])
                    self.assertFalse(result["models_scored"])
                    self.assertFalse(result["forecast_issued"])
                    self.assertFalse(result["independent_historical_byte_witness_verified"])

    def test_source_identity_dates_and_extra_claims_rejected(self):
        for issue in ("2020-02-01", "2020-01-00", "2020-01-01Z"):
            with self.subTest(issue=issue), self.assertRaises(ValueError):
                review_source(SOURCES[0], issue)
        edits = (
            {"observation_through": "2019-12-31"},
            {"released_in_year_claim": 2018},
            {"source_id": "other"},
            {"can_directly_resolve_country_onset1": True},
            {"independent_historical_byte_witness_verified": True},
        )
        for change in edits:
            with self.subTest(change=change), self.assertRaises(ValueError):
                review_source({**SOURCES[0], **change}, "2020-01-01")
        for issues in ((), ["2020-01-01"], ("2021-01-01", "2020-01-01"),
                       ("2020-01-01", "2020-01-01"),
                       tuple(f"{y}-01-01" for y in range(2000, 2013))):
            with self.subTest(issues=issues), self.assertRaises(ValueError):
                audit(issues)

    def test_fake_link_and_missing_html_rejected(self):
        wrong = (b'<html><a href="https://evil.example/ged/ged191-csv.zip">'
                 b'https://ucdp.uu.se/downloads/ged/ged191-csv.zip</a></html>')
        self.assertFalse(any(source_index_presence(wrong).values()))
        with self.assertRaises(ValueError):
            source_index_presence(b"")


if __name__ == "__main__":
    unittest.main()
