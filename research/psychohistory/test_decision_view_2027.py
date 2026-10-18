"""Synthetic ranking tests: never include actual countries or 2027 probabilities."""
import copy
import csv
from pathlib import Path
import tempfile
import unittest

from decision_view_2027 import build_risk_rows, safe_name, write_private_table


def fake_policy():
    return {"target_year": 2027, "expected_roster_size": 196,
            "models": ["frequency","persistence","markov","v1_memory_index",
                       "v2_logistic","interaction_table"]}


def fake_report():
    policy=fake_policy()
    rows=[]
    for x in range(196):
        rows.append({
            "countryId": 10000+x, "targetYear": 2027,
            "featureCutoffYear": 2025, "outcome": None,
            "probabilities": {
                "frequency": 0.16, "persistence": 0,
                "markov": 0.1, "v1_memory_index": 0.18,
                "v2_logistic": (x+1)/200, "interaction_table": 0.20,
            }})
    return {"schema":"psychohistory.ucdp_cy261_future_candidates.v1",
            "forecastIssued":False,"prospectiveEligible":False,
            "targetYear":2027,"models":policy["models"],
            "candidates":rows}


class DecisionViewTests(unittest.TestCase):
    def setUp(self):
        self.report=fake_report()
        self.policy=fake_policy()
        self.names={10000+i: "FICTIONAL-NATION-"+str(i) for i in range(196)}

    def test_sorted_row_and_declared_model_differences(self):
        rows=build_risk_rows(self.report,self.policy,self.names)
        self.assertEqual(len(rows),196)
        self.assertEqual(rows[0]["country_id"],10195)
        self.assertEqual(rows[0]["ranking_por_v2"],1)
        self.assertAlmostEqual(rows[0]["diferencia_vs_baseline_pp"],81.99999999999999,places=6)
        self.assertAlmostEqual(rows[0]["desacuerdo_v2_interaction_pp"],78,places=6)
        self.assertEqual(rows[0]["estado"],"SHADOW_NO_EMITIDO")
        self.assertNotIn("confidenceInterval",rows[0])
        self.assertNotIn("onset",rows[0])

    def test_reject_outcome_model_switch_duplicate_unmapped(self):
        for mutate in ("outcome","wrong_year","extra_model","missing","duplicate","unknown","issued","incomplete"):
            r=copy.deepcopy(self.report)
            n=dict(self.names)
            if mutate=="outcome":r["candidates"][0]["outcome"]=1
            elif mutate=="wrong_year":r["candidates"][0]["featureCutoffYear"]=2026
            elif mutate=="extra_model":r["candidates"][0]["probabilities"]["unauthorized"]=.4
            elif mutate=="missing":del r["candidates"][0]["probabilities"]["v2_logistic"]
            elif mutate=="duplicate":r["candidates"][1]["countryId"]=r["candidates"][0]["countryId"]
            elif mutate=="unknown":del n[10000]
            elif mutate=="issued":r["forecastIssued"]=True
            elif mutate=="incomplete":r["candidates"].pop()
            with self.subTest(case=mutate),self.assertRaises(ValueError):
                build_risk_rows(r,self.policy,n)

    def test_injection_safe_country_labels_and_private_create_only_csv(self):
        self.names[10195]="=HYPOTHETICAL_FORMULA()"
        rows=build_risk_rows(self.report,self.policy,self.names)
        self.assertTrue(rows[0]["pais_ucdp"].startswith("'="))
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"fictional.csv"
            result=write_private_table(rows,path)
            self.assertFalse(result["forecastIssued"])
            with path.open("r",encoding="utf-8-sig",newline="") as f:
                reader=list(csv.DictReader(f))
            self.assertEqual(len(reader),196)
            self.assertEqual(reader[0]["estado"],"SHADOW_NO_EMITIDO")
            self.assertTrue(reader[0]["pais_ucdp"].startswith("'="))
            with self.assertRaisesRegex(ValueError,"must be a new file"):
                write_private_table(rows,path)

    def test_no_forged_numeric_probabilities(self):
        for value in (float("nan"),float("inf"),-1,2,"0.7"):
            r=copy.deepcopy(self.report)
            r["candidates"][0]["probabilities"]["v2_logistic"]=value
            with self.subTest(value=value),self.assertRaises(ValueError):
                build_risk_rows(r,self.policy,self.names)


if __name__=="__main__":
    unittest.main()
