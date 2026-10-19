"""Synthetic-only risk manifests and imaginary UCDP 25.1 country-year source."""
import csv
import hashlib
import io
import unittest
from onset_issue_contract import decide_fixture, reference_audit, TARGET


def manifest(**changes):
    data={
        "issue_date":"2020-01-01",
        "target_year":2020,
        "target_id":TARGET,
        "outcome_version":"25.1",
        "prior_year":2019,
        "prior_year_intrastate_active":False,
        "prior_year_coverage_verified":True,
        "prior_year_membership_verified":True,
        "activity_source_available_at":"2020-02-01",
        "membership_source_available_at":"2019-01-01",
        "feature_set_frozen_at":"2019-12-30",
    }
    return {**data,**changes}


def synthetic_outcomes():
    stream=io.StringIO(newline="")
    writer=csv.writer(stream)
    writer.writerow(["abc","name","year","gwno_a","newconf","onset1",
                     "onset2","onset3","onset5","onset10","onset20",
                     "              conflict_ids","year_prev"])
    for y in range(1946,2025):
        for code in (100,200):
            values=[int(y==2020 and code==100)]*7
            writer.writerow(["AAA","Invented Fictionia",y,code]+values+[
                "fiction-id",1815 if y==1946 else y-1])
    return stream.getvalue().encode()


class IssueContractTests(unittest.TestCase):
    def test_full_previous_calendar_year_cannot_be_late_and_be_early(self):
        x=decide_fixture(manifest())
        self.assertFalse(x["backtest_authorized"])
        self.assertFalse(x["forecast_issued"])
        self.assertTrue(x["provisional_prior_activity_clear"])
        self.assertIn("ACTIVITY_SOURCE_AVAILABLE_AT_NOT_BEFORE_ISSUE",x["blocking_reasons"])
        self.assertFalse(x["vintage_verified_by_independent_historical_witness"])
        self.assertFalse(x["full_risk_set_at_issue_verified"])

    def test_real_missing_or_positive_history_blocks_even_if_nominal_dates_early(self):
        for f,reason in [
            ({"prior_year_intrastate_active":True},
             "COUNTRY_WITH_PREVIOUS_INTRASTATE_ACTIVITY_NOT_PROVISIONAL_RISK"),
            ({"prior_year_intrastate_active":None},"PRIOR_ACTIVITY_UNKNOWN"),
            ({"prior_year_coverage_verified":False},"PRIOR_ACTIVITY_COVERAGE_UNVERIFIED"),
            ({"prior_year_membership_verified":False},
             "ISSUE_DAY_COUNTRY_MEMBERSHIP_UNVERIFIED"),
            ({"membership_source_available_at":None},
             "MEMBERSHIP_SOURCE_AVAILABLE_AT_MISSING"),
            ({"feature_set_frozen_at":"2020-01-01"},
             "FEATURE_SET_FROZEN_AT_NOT_BEFORE_ISSUE"),
        ]:
            with self.subTest(f=f):
                outcome=decide_fixture(manifest(**f))
                self.assertIn(reason,outcome["blocking_reasons"])
                self.assertFalse(outcome["backtest_authorized"])

    def test_invalid_origin_outcome_and_type_rejected(self):
        cases=[
            {"issue_date":"2020-02-01"},{"issue_date":"2020-01-00"},
            {"target_year":2021},{"target_year":"2020"},{"prior_year":2018},
            {"target_id":"intrastate_conflict_onset1"},
            {"target_id":"ucdp25.1_intrastate_country_onset5"},
            {"outcome_version":"24.1"},
            {"prior_year_intrastate_active":"0"},
            {"prior_year_coverage_verified":"true"},
            {"activity_source_available_at":"2019-12-20"},
        ]
        for change in cases:
            with self.subTest(change=change),self.assertRaises(ValueError):
                decide_fixture(manifest(**change))
        with self.assertRaises(ValueError):
            decide_fixture({**manifest(),"future_conflict_id":999})

    def test_official_country_outcomes_cannot_supply_issue_date_risk_data(self):
        raw=synthetic_outcomes()
        result=reference_audit(raw,hashlib.sha256(raw).hexdigest(),(2019,2020,2024))
        self.assertEqual(result["n_annual_country_year_outcome_rows"],158)
        self.assertEqual(result["years"][1]["n_country_year_records"],2)
        self.assertEqual(result["years"][1]["n_with_previous_year_country_row"],2)
        self.assertEqual(result["years"][1]["n_onset1_ones"],1)
        self.assertEqual(result["years"][1]["n_onset5_ones"],1)
        self.assertEqual(result["years"][1]["n_onset5_without_onset1"],0)
        self.assertIsNone(result["years"][1]["confirmed_risk_set_size"])
        self.assertFalse(result["historical_issue_evidence_verified"])
        self.assertFalse(result["country_risk_set_eligible_asof"])
        self.assertFalse(result["forecast_issued"])
        self.assertNotIn("gwno_a",result)
        self.assertNotIn("country_ids",result)

    def test_tampered_csv_and_invalid_years_fail_closed(self):
        raw=synthetic_outcomes()
        with self.assertRaises(ValueError):
            reference_audit(raw,"f"*64,(2020,))
        for years in ((2020,2019),(2020,2020),(),(2025,),[2020]):
            with self.subTest(years=years),self.assertRaises(ValueError):
                reference_audit(raw,hashlib.sha256(raw).hexdigest(),years)


if __name__=="__main__":
    unittest.main()
