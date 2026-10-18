"""Fictional reports exclusively. No UCDP country data or private forecasts."""
import copy
import json
from pathlib import Path
import unittest

from core_model_readiness import grade

POLICY = json.loads((Path(__file__).resolve().parent /
                     "core_readiness_policy.json").read_text())


def fake_report(*, model_brier=.01, base_brier=.08, onset_improvement=.00001,
                events=25, interval_lo=.10):
    def task(m, b, cases):
        n=1000
        def metric(brier):
            return {
                "n":n,"events":cases,"brier":brier,
                "by_year":[{
                    "year":y,"n":100,"events":cases//10 + (1 if y<2016+cases%10 else 0),
                    "brier":brier
                } for y in range(2016,2026)],
            }
        # Ensure total events from yearly equals the top summary.
        def normalized_metric(brier):
            x=metric(brier)
            x["events"]=sum(z["events"] for z in x["by_year"])
            return x
        mm=normalized_metric(m)
        bb=normalized_metric(b)
        mm["comparisons"]={"frequency":{
            "brier_skill":1-m/b,
            "brier_skill_95":[interval_lo,.85],
            "brier_difference_95":[-.10,-.000001],
        }}
        return {"rows":n,"metrics":{"v2_logistic":mm,"frequency":bb}}
    return {
        "run_type":"retrospective_revised_release",
        "prospective_eligible":False,"as_of_verified":False,
        "tasks":{
            "presence":{"test":task(model_brier,base_brier,events)},
            "onset":{"test":task(.08-onset_improvement,.08,events)},
        },
    }


class CoreReadinessGateTests(unittest.TestCase):
    def test_well_scored_fixture_still_not_prospectively_approved(self):
        doc=fake_report(onset_improvement=.012)
        result=grade(doc,POLICY)
        self.assertEqual(result["retrospective_screen"]["presence"]["retrospective_screen"],
                         "RESEARCH_CANDIDATE_NOT_CONFIRMATORY")
        self.assertEqual(result["retrospective_screen"]["onset"]["retrospective_screen"],
                         "RESEARCH_CANDIDATE_NOT_CONFIRMATORY")
        self.assertFalse(result["operational_model_approved"])
        self.assertFalse(result["stock_market_module_unblocked"])
        self.assertFalse(result["prospective_skill_demonstrated"])

    def test_marginal_rare_onset_brier_cannot_be_called_skill(self):
        doc=fake_report(onset_improvement=.00001,interval_lo=-.25)
        r=grade(doc,POLICY)["retrospective_screen"]["onset"]
        self.assertEqual(r["retrospective_screen"],"NOT_DEMONSTRATED")
        self.assertFalse(r["checks"]["positive_lower_paired_block_skill_95"])

    def test_yearly_temporal_instability_rejects_even_positive_pooled(self):
        doc=fake_report(onset_improvement=.012)
        model=doc["tasks"]["onset"]["test"]["metrics"]["v2_logistic"]
        base=doc["tasks"]["onset"]["test"]["metrics"]["frequency"]
        for i,r in enumerate(model["by_year"]):
            r["brier"] = .11 if i>=5 else .02
        model["brier"]=sum(r["brier"] for r in model["by_year"])/10
        model["comparisons"]["frequency"]["brier_skill"]=1-model["brier"]/base["brier"]
        result=grade(doc,POLICY)["retrospective_screen"]["onset"]
        self.assertTrue(result["checks"]["positive_point_skill"])
        self.assertFalse(result["checks"]["both_fixed_time_halves_improve"])
        self.assertEqual(result["retrospective_screen"],"NOT_DEMONSTRATED")

    def test_fail_closed_on_forged_issued_or_asof_flags(self):
        doc=fake_report()
        for key in ("as_of_verified","prospective_eligible"):
            x=copy.deepcopy(doc);x[key]=True
            with self.subTest(key=key),self.assertRaises(ValueError):
                grade(x,POLICY)
        x=copy.deepcopy(doc);x["run_type"]="issued_prospective"
        with self.assertRaises(ValueError):
            grade(x,POLICY)

    def test_bad_denominator_year_or_comparison_fails(self):
        for kind in ("n","events","year","brier","comparison","nan"):
            doc=fake_report()
            metrics=doc["tasks"]["onset"]["test"]["metrics"]
            if kind=="n":metrics["frequency"]["n"]=1200
            elif kind=="events":metrics["v2_logistic"]["events"]=99
            elif kind=="year":metrics["v2_logistic"]["by_year"][0]["year"]=2025
            elif kind=="brier":metrics["v2_logistic"]["by_year"][0]["brier"]=.9
            elif kind=="comparison":metrics["v2_logistic"]["comparisons"]["frequency"]["brier_skill"]=.9
            elif kind=="nan":metrics["v2_logistic"]["brier"]=float("nan")
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                grade(doc,POLICY)

    def test_policy_must_be_versioned_and_nontrivial(self):
        changed=copy.deepcopy(POLICY);changed["minimum_distinct_test_years"]=1
        with self.assertRaises(ValueError):
            grade(fake_report(),changed)
        changed=copy.deepcopy(POLICY);changed["require_positive_brier_skill_ci_lower"]=False
        with self.assertRaises(ValueError):
            grade(fake_report(),changed)


if __name__ == "__main__":
    unittest.main()
