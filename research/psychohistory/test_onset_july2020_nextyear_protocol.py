"""Synthetic-only AV-046 geometry tests: never load countries or real scores."""
from copy import deepcopy
import unittest
from onset_july2020_nextyear_protocol import analyze, proposal, TARGET


class JulyOriginTests(unittest.TestCase):
    def test_july_with_prior_full_year_is_chronologically_feasible_only(self):
        r=analyze(proposal())
        self.assertTrue(r["publisher_announcement_before_origin"])
        self.assertTrue(r["date_geometry_is_chronologically_possible"])
        self.assertEqual(r["forecast_window"],["2021-01-01","2021-12-31"])
        self.assertEqual(r["hypothetical_issue_to_target_lead_months"],6)
        self.assertEqual(r["estimand"],
                         "UNCONDITIONAL_COUNTRY_INCIDENCE_NOT_CONDITIONAL_AT_RISK_ONSET")
        self.assertTrue(r["missing_outcome_countries_must_remain_unresolvable"])

    def test_new_horizon_must_not_be_2020_or_original_january_origin(self):
        for key,value in [
            ("issue_utc","2020-01-01T00:00:00Z"),
            ("population_frame_asof_utc","2020-06-01T00:00:00Z"),
            ("target_first_day","2020-07-01"),
            ("target_last_day","2021-06-30"),
            ("covariate_observation_cutoff","2020-12-31"),
            ("declared_source_release_day","2020-07-01"),
        ]:
            with self.subTest(key=key),self.assertRaises(ValueError):
                analyze({**proposal(),key:value})

    def test_no_hindsight_release_training_or_rescoped_target(self):
        for key,value in [
            ("source_edition","25.1"),
            ("target_id","ucdp25.1_intrastate_country_onset1"),
            ("target_id",TARGET.replace("unconditional","conditional")),
            ("evaluation_population_policy","ONLY_COUNTRIES_WITH_POSTHOC_PEACE"),
            ("training_label_policy","USE_RESOLUTION_25_1_IN_TRAIN"),
            ("resolution_label_edition","26.1"),
            ("declared_source_release_evidence_url","https://example.org/forged"),
        ]:
            with self.subTest(key=key),self.assertRaises(ValueError):
                analyze({**proposal(),key:value})

    def test_unknown_witness_and_false_confidence_never_approve(self):
        sample=proposal()
        sample.update({
            "source_bytes_sha256":"a"*64,
            "roster_bytes_sha256":"b"*64,
            "training_labels_bytes_sha256":"c"*64,
            "independent_source_bytes_witness_utc":"2020-06-18T17:00:00Z",
        })
        r=analyze(sample)
        for key in ("country_frame_verified_asof","historical_byte_witness_independently_authenticated",
                    "historical_training_labels_verified","vintage_correct_model_fit_authorized",
                    "backtest_authorized","scores_computed","forecast_issued"):
            with self.subTest(key=key):
                self.assertFalse(r[key])
        self.assertFalse(r["revised_outcome_may_be_used_as_historical_train_labels"])

    def test_late_or_forged_witness_rejected(self):
        for witness in ("2020-07-01T00:00:00Z", "2021-01-01T00:00:00Z",
                        "2020-02-32T10:00:00Z","2020-01-01","2020-06-15T00:00:00+02:00"):
            with self.subTest(witness=witness),self.assertRaises(ValueError):
                analyze({**proposal(),"independent_source_bytes_witness_utc":witness})
        with self.assertRaises(ValueError):
            analyze({**proposal(),"source_bytes_sha256":"future"})

    def test_cannot_inject_outcome_or_country_selection(self):
        with self.assertRaises(ValueError):
            analyze({**proposal(),"country_ids":[101,102]})
        with self.assertRaises(ValueError):
            analyze({**proposal(),"outcome2021":1})
        for obj in (None,[],{"issue_utc":"2020-07-01T00:00:00Z"}):
            with self.subTest(obj=obj),self.assertRaises(ValueError): analyze(obj)

    def test_output_is_aggregate_no_model_score_countries(self):
        r=analyze(proposal())
        self.assertNotIn("countries",r)
        self.assertNotIn("country_ids",r)
        self.assertNotIn("scores",r)
        self.assertNotIn("brier",r)
        self.assertNotIn("probability",r)
        self.assertFalse(r["forecast_issued"])
        self.assertIn("HISTORICAL_TRAINING_LABEL_VINTAGES_NOT_VERIFIED",
                      r["blocking_reasons"])


if __name__=="__main__":
    unittest.main()
