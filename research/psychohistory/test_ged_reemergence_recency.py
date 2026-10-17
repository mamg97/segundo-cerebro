"""No actual country names, real UCDP observations or historical scores."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from ged_reemergence import (
    reemergence_report, event_calendar, mature_training_cases, month_index,
)
from ged_reemergence_recency import recency_bucket, fit_recency_at, comparator_report
from ged_monthly_incidence import build_roster, save_private
from test_ged_reemergence import prepared


class RecencyTests(unittest.TestCase):
    def test_recency_categories_are_known_at_cutoff_and_unknown_is_not_assumed_quiet(self):
        folder, ged, onset, roster, calendar, training = prepared()
        try:
            cutoff=month_index(2014,1)
            earliest=month_index(2000,1)
            self.assertIn(recency_bucket(roster,calendar,1,cutoff,earliest),
                          ('12_23m','24_59m','60plus_documented','history_incomplete'))
            truncated={k:v for k,v in roster.items() if k!=(2,2009)}
            self.assertEqual(recency_bucket(truncated,calendar,2,cutoff,earliest),
                             'history_incomplete')
            # Historical events can exist before the 60-month verification window.
            # A roster gap still cannot be interpreted as 60 documented quiet months.
        finally:
            folder.cleanup()

    def test_source_verified_comparison_keeps_original_three_models_exact(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            # Reproduce the actual private JSON format: canonical sort_keys=True.
            old=json.loads(json.dumps(reemergence_report(ged,onset),sort_keys=True))
            new=comparator_report(old,ged,onset)
            self.assertFalse(new["prospective_eligible"])
            self.assertEqual(new["schema"],"psychohistory.ged.reemergence_recency_comparator.v1")
            for name,part in new["partitions"].items():
                source=old["partitions"][name]
                self.assertEqual(part["n"],source["n_evaluated"])
                self.assertEqual(part["events"],source["positive_outcomes"])
                self.assertEqual(len(part["cases"]),len(source["cases"]))
                self.assertEqual(len(part["cases"]),sum(part["recency_bucket_counts"].values()))
                for original,added in zip(source["cases"],part["cases"]):
                    self.assertEqual(original["probabilities"],
                                     {k:added["probabilities"][k] for k in original["probabilities"]})
                    self.assertEqual(original["outcome"],added["outcome"])
                    self.assertTrue(0<added["probabilities"]["time_since_last_event"]<1)
                fixed=part["nonoverlap"]
                self.assertIsNone(fixed["confidence_interval_95"])
                self.assertIsNone(fixed["significance_test"])
                self.assertEqual(fixed["calendar_blocks"],2 if name=="validation" else 3)
                self.assertEqual(len(fixed["by_anchor"]),fixed["calendar_blocks"])
                self.assertEqual(sum(x["events"] for x in fixed["by_anchor"]),fixed["events"])
                self.assertEqual(len(fixed["leave_one_anchor_out"]),fixed["calendar_blocks"])
                for entry in fixed["by_anchor"]:
                    self.assertIn("time_since_last_event",entry["brier_skill_vs_global"])
                    self.assertEqual(entry["brier_skill_vs_global"]["global_reemergence"],0)
                for entry in fixed["leave_one_anchor_out"]:
                    dropped=int(entry["omitted_target_end_month"][:4])
                    removed=next(x for x in fixed["by_anchor"] if int(x["target_end_month"][:4])==dropped)
                    self.assertEqual(entry["n"],fixed["n"]-removed["n"])
                    self.assertEqual(entry["events"],fixed["events"]-removed["events"])
                    self.assertIn("time_since_last_event",entry["brier_skill_vs_global"])
                self.assertEqual(
                    fixed["hypothetical_issue_months"],
                    ["2014-02","2016-02"] if name=="validation"
                    else ["2018-02","2020-02","2022-02"])
        finally:folder.cleanup()

    def test_future_ged_events_cannot_change_cutoff_recency_or_fitted_prior(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            cutoff=month_index(2014,1)
            previous=fit_recency_at(cutoff,training,roster,calendar,month_index(2000,1))
            modified={**ged,"events_by_month":ged["events_by_month"].copy()}
            modified["events_by_month"][(5,month_index(2014,6))]=1
            new_cal=event_calendar(modified)
            other=mature_training_cases(roster,new_cal,month_index(2000,1),month_index(2024,12))
            after=fit_recency_at(cutoff,other,roster,new_cal,month_index(2000,1))
            self.assertEqual(dict(previous[1]),dict(after[1]))
            self.assertEqual(previous[0],after[0])
            self.assertEqual(
                recency_bucket(roster,calendar,1,cutoff,month_index(2000,1)),
                recency_bucket(roster,new_cal,1,cutoff,month_index(2000,1)))
        finally:folder.cleanup()

    def test_source_and_private_historical_report_tampering_are_rejected(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            original=reemergence_report(ged,onset)
            changes=[
                lambda x:x.update(prospective_eligible=True),
                lambda x:x["source"].update(ged_sha256="0"*64),
                lambda x:x["partitions"]["test"]["cases"][0]["probabilities"].update(global_reemergence=.999),
                lambda x:x["partitions"]["validation"]["cases"][0].update(outcome=1-x["partitions"]["validation"]["cases"][0]["outcome"]),
                lambda x:x["partitions"]["test"]["cases"].append(copy.deepcopy(x["partitions"]["test"]["cases"][0])),
            ]
            for mutate in changes:
                altered=copy.deepcopy(original)
                mutate(altered)
                with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                    comparator_report(altered,ged,onset)
        finally:folder.cleanup()

    def test_private_results_create_only(self):
        folder,ged,onset,roster,calendar,training=prepared()
        try:
            report=comparator_report(reemergence_report(ged,onset),ged,onset)
            with tempfile.TemporaryDirectory() as dest:
                path=Path(dest)/"private"/"synthetic-recency.json"
                save_private(report,path)
                self.assertTrue(path.exists())
                with self.assertRaises(FileExistsError):
                    save_private(report,path)
        finally:folder.cleanup()


if __name__=="__main__":
    unittest.main()
