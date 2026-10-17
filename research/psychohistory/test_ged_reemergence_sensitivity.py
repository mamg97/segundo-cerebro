"""Synthetic, independent of any real country or historical UCDP dataset."""
import copy
import tempfile
import unittest
from pathlib import Path

from ged_reemergence import SCHEMA, TARGET
from ged_reemergence_sensitivity import independent_sensitivity
from ged_monthly_incidence import save_private


def fixture():
    def row(y,month,cid,positive):
        return {"country_id":cid,"origin_year":y,"origin_month":month,"outcome":positive,
                "probabilities":{"global_reemergence":.16,
                                 "country_shrinkage":.12 if cid==1 else .22,
                                 "country_history":.08 if cid==1 else .29}}
    return {"schema":SCHEMA,"target":TARGET,"source_as_of_verified":False,
      "prospective_eligible":False,"status":"RETROSPECTIVE_SOURCE_REVISED_EXPLORATORY",
      "outcome_horizon_months":24,
      "partitions":{
        "validation":{"years":[2016,2019],
           "cases":[row(y,1,cid,int(cid==1 and y==2018))
                    for y in (2016,2018) for cid in (1,2)] + [row(2017,8,1,1)]},
        "test":{"years":[2020,2024],
           "cases":[row(y,1,cid,int(cid==1 and y==2022))
                    for y in (2020,2022,2024) for cid in (1,2)] + [row(2021,7,2,1)]}
      }}


class IndependentWindowTests(unittest.TestCase):
    def test_exactly_two_or_three_24m_issue_windows_without_other_months(self):
        x=independent_sensitivity(fixture())
        self.assertEqual(x["partitions"]["validation"]["anchors"],[2016,2018])
        self.assertEqual(x["partitions"]["test"]["anchors"],[2020,2022,2024])
        self.assertEqual(x["partitions"]["test"]["hypothetical_issue_months"],["2018-02","2020-02","2022-02"])
        self.assertEqual(x["anchor_semantics"],"target_end_not_issue_date")
        self.assertEqual(x["partitions"]["test"]["n_evaluated"],6)
        self.assertEqual(x["partitions"]["test"]["positive_outcomes"],1)
        self.assertEqual(x["partitions"]["validation"]["n_evaluated"],4)
        self.assertFalse(x["prospective_eligible"])
        self.assertIsNone(x["partitions"]["test"]["confidence_interval_95"])
        self.assertIsNone(x["partitions"]["test"]["significance_test"])
        self.assertIn("Only 3 disjoint target windows",x["partitions"]["test"]["limitations"])

    def test_cannot_select_best_month_after_examining_labels(self):
        x=fixture()
        other=copy.deepcopy(x)
        other["partitions"]["test"]["cases"][-1]["outcome"]=0
        self.assertEqual(independent_sensitivity(x)["partitions"]["test"]["models"],
                         independent_sensitivity(other)["partitions"]["test"]["models"])
        self.assertEqual(independent_sensitivity(x)["partitions"]["test"]["positive_outcomes"],1)

    def test_reject_duplicates_missing_anchor_or_source_metadata_tampering(self):
        x=fixture()
        x["partitions"]["test"]["cases"].append(copy.deepcopy(x["partitions"]["test"]["cases"][0]))
        with self.assertRaises(ValueError):independent_sensitivity(x)
        x=fixture()
        x["partitions"]["test"]["cases"]=[y for y in x["partitions"]["test"]["cases"]
                                             if y["origin_year"]!=2022]
        with self.assertRaises(ValueError):independent_sensitivity(x)
        x=fixture()
        x["source_as_of_verified"]=True
        with self.assertRaises(ValueError):independent_sensitivity(x)
        x=fixture()
        x["outcome_horizon_months"]=12
        with self.assertRaises(ValueError):independent_sensitivity(x)

    def test_write_only_private_without_overwriting_previous_runs(self):
        result=independent_sensitivity(fixture())
        with tempfile.TemporaryDirectory() as dir:
            p=Path(dir)/"new"/"synthetic.json"
            save_private(result,p)
            self.assertTrue(p.is_file())
            with self.assertRaises(FileExistsError):save_private(result,p)


if __name__=="__main__":
    unittest.main()
