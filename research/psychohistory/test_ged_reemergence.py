"""Synthetic-only tests: exact GED reappearance is NOT conflict onset."""
import tempfile
import unittest
from pathlib import Path

from ged_reemergence import (
    TARGET, SCHEMA, eligible_at, event_calendar, event_count,
    full_roster, mature_training_cases, issue_cohort, reemergence_report,
    month_index, scores,
)
from test_ged_monthly_incidence import fixture
from ged_monthly_incidence import build_roster


def prepared():
    folder=tempfile.TemporaryDirectory()
    ged,onset=fixture(Path(folder.name)/"g.zip")
    # Synthetic events start in 2015; dataset time axis is independently
    # declared to start at 2000 to make prior quiet months observable.
    ged["first_year"]=2000
    roster=build_roster(onset)
    calendar=event_calendar(ged)
    training=mature_training_cases(roster,calendar,month_index(2000,1),month_index(2024,12))
    return folder,ged,onset,roster,calendar,training


class GEDReemergenceTests(unittest.TestCase):
    def test_risk_set_uses_only_complete_prior_roster_and_pre_cutoff_quiet(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            cutoff=month_index(2014,1)
            self.assertTrue(eligible_at(roster,calendar,1,cutoff,month_index(2000,1)))
            self.assertEqual(event_count(calendar,1,month_index(2014,1),month_index(2016,1)),2)
            newer={**ged,"events_by_month":ged["events_by_month"].copy()}
            newer["events_by_month"][(1,month_index(2013,12))]=8
            modified=event_calendar(newer)
            self.assertFalse(eligible_at(roster,modified,1,cutoff,month_index(2000,1)))
            self.assertTrue(full_roster(roster,1,cutoff-23,cutoff))
            self.assertFalse(full_roster({k:v for k,v in roster.items() if k!=(1,2013)},1,cutoff-23,cutoff))
        finally:folder.cleanup()

    def test_24_month_outcomes_never_appear_in_forecast_probabilities(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            before=issue_cohort(ged,roster,calendar,training,2016,1)
            self.assertEqual(before["cutoff"],"2014-01")
            self.assertEqual(before["n_issued"],5)
            self.assertEqual(before["n_evaluated"],5)
            self.assertEqual(sum(c["outcome"] for c in before["cases"]),2)
            other={**ged,"events_by_month":ged["events_by_month"].copy()}
            other["events_by_month"][(5,month_index(2015,7))]=1
            other["events_by_month"][(3,month_index(2016,1))]=1
            changed=event_calendar(other)
            # Even though all historical training windows are recomputed,
            # only matured endpoints <=cutoff can enter the forecasts.
            new_training=mature_training_cases(roster,changed,month_index(2000,1),month_index(2024,12))
            after=issue_cohort(other,roster,changed,new_training,2016,1)
            self.assertEqual([x["probabilities"] for x in before["cases"]],
                             [x["probabilities"] for x in after["cases"]])
            self.assertEqual(before["n_issued"],after["n_issued"])
            self.assertNotEqual([x["outcome"] for x in before["cases"]],
                                [x["outcome"] for x in after["cases"]])
        finally:folder.cleanup()

    def test_future_roster_controls_resolution_not_cohort_issuance(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            baseline=issue_cohort(ged,roster,calendar,training,2016,1)
            different={k:v for k,v in roster.items() if k!=(3,2015)}
            modified=mature_training_cases(different,calendar,month_index(2000,1),month_index(2024,12))
            test=issue_cohort(ged,different,calendar,modified,2016,1)
            self.assertEqual(test["n_issued"],baseline["n_issued"])
            self.assertEqual(test["n_unresolved"],1)
            self.assertEqual(test["n_evaluated"],baseline["n_evaluated"]-1)
            self.assertEqual(test["unresolved_reasons"]["incomplete_future_roster"],1)
        finally:folder.cleanup()

    def test_one_target_horizon_not_a_war_narrative_or_annual_threshold(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            report=reemergence_report(ged,onset)
            self.assertEqual(report["schema"],SCHEMA)
            self.assertEqual(report["target"],TARGET)
            self.assertEqual(report["quiet_months_known_at_cutoff"],12)
            self.assertEqual(report["outcome_horizon_months"],24)
            self.assertFalse(report["source_as_of_verified"])
            self.assertFalse(report["prospective_eligible"])
            for period in report["partitions"].values():
                self.assertEqual(period["n_evaluated"]+period["n_unresolved"],period["n_issued"])
                self.assertEqual(sum(y["n"] for y in period["by_year"]),period["n_evaluated"])
                self.assertEqual(sum(y["positives"] for y in period["by_year"]),period["positive_outcomes"])
                for model in ("global_reemergence","country_shrinkage","country_history"):
                    self.assertEqual(period["models"][model]["n"],period["n_evaluated"])
                    self.assertTrue(0<=period["models"][model]["brier"]<=1)
                self.assertEqual(period["brier_skill_vs_global"]["global_reemergence"],0)
        finally:folder.cleanup()

    def test_no_event_cohort_reports_undefined_average_precision(self):
        synthetic=[{"outcome":0,"probabilities":{"global_reemergence":.05}} for _ in range(3)]
        self.assertIsNone(scores(synthetic,"global_reemergence")["average_precision"])
        self.assertIsNone(scores(synthetic,"global_reemergence")["top_decile"]["recall"])

    def test_dataset_does_not_claim_independent_prospective_skill(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            result=issue_cohort(ged,roster,calendar,training,2024,1)
            self.assertTrue(all(0<p<1 for x in result["cases"] for p in x["probabilities"].values()))
            self.assertTrue(all(x["cutoff"]=="2022-01" for x in result["cases"]))
            self.assertEqual(result["hypothetical_issue_month"],"2022-02")
            self.assertEqual(result["target_end_month"],"2024-01")
            self.assertTrue(all(x["hypothetical_issue_month"]=="2022-02" for x in result["cases"]))
        finally:folder.cleanup()


if __name__=="__main__":
    unittest.main()
