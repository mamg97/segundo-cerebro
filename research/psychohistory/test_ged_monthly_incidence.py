"""Synthetic-only UCDP GED country-month forecast tests; no real incidents in Git."""
import csv
import hashlib
import io
import tempfile
import unittest
import zipfile
from pathlib import Path

from ged_monthly_incidence import (parse_ged_exact_months,forecast_month,monthly_report,
                                   save_private,TARGET,month_index)
from ucdp_onset import load_onsets
from test_ucdp_onset import source


def create_ged_zip(path, incidents):
    fields=["id","country_id","year","type_of_violence","best",
            "date_start","date_end","date_prec"]
    with io.StringIO() as out:
        writer=csv.DictWriter(out,fieldnames=fields)
        writer.writeheader()
        for e in incidents:writer.writerow(e)
        data=out.getvalue()
    with zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("GED_SYNTHETIC.csv",data)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def incident(eid,country,day,deaths=4,prec=1,typ=1,end=None):
    return {"id":eid,"country_id":country,"year":int(day[:4]),"type_of_violence":typ,
            "best":deaths,"date_start":day,"date_end":end or day,"date_prec":prec}


def fixture(path):
    events=[
        incident(1,1,"2015-09-10"),incident(2,1,"2016-01-10"),
        incident(3,2,"2016-01-12"),incident(4,2,"2016-01-13"),
        incident(5,1,"2016-02-16",prec=3), # uncertain month -> not a negative for general violence
        incident(6,3,"2018-07-01",deaths=0), # no recorded fatality in best estimate
        incident(7,3,"2021-12-20",typ=2),  # non-state violence not part of target
        incident(8,4,"2022-03-01",end="2022-03-12"), # fuzzy interval despite date_prec
        incident(9,3,"2024-02-22",deaths=2),
    ]
    digest=create_ged_zip(path,events)
    raw,onset_sha=source(start=2000,end=2024,n=5)
    roster=load_onsets(raw,kind="intrastate_country",expected_sha256=onset_sha)
    return (parse_ged_exact_months(path,digest,require_full_coverage=False),roster)


class MonthlyIncidenceTests(unittest.TestCase):
    def test_precisely_dated_lethal_incidents_only_are_in_target(self):
        with tempfile.TemporaryDirectory() as t:
            ged,_=fixture(Path(t)/"g.zip")
            self.assertEqual(ged["events_by_month"][(1,month_index(2016,1))],1)
            self.assertEqual(ged["events_by_month"][(2,month_index(2016,1))],2)
            self.assertEqual(ged["events_by_month"][(1,month_index(2016,2))],0)
            self.assertEqual(ged["events_by_month"][(3,month_index(2018,7))],0)
            self.assertEqual(ged["events_by_month"][(3,month_index(2021,12))],0)
            self.assertEqual(ged["events_by_month"][(4,month_index(2022,3))],0)
            self.assertEqual(ged["excluded"]["uncertain_date_precision"],1)
            self.assertEqual(ged["excluded"]["zero_best_fatalities"],1)
            self.assertEqual(ged["excluded"]["other_violence_type"],1)
            self.assertEqual(ged["excluded"]["non_exact_or_cross_year_date"],1)
            self.assertFalse(ged["as_of_verified"])

    def test_probability_calculated_only_using_months_through_t_minus_24(self):
        with tempfile.TemporaryDirectory() as t:
            ged,roster=fixture(Path(t)/"g.zip")
            a=forecast_month(ged,roster,2016,1)
            self.assertEqual(a["n_scored"],5)
            self.assertEqual(sum(c["outcome"] for c in a["cases"]),2)
            self.assertEqual(sum(c["documented_events"] for c in a["cases"]),3)
            self.assertTrue(all(c["cutoff_month"]=="2014-01" for c in a["cases"]))
            shifted={**ged,"events_by_month":ged["events_by_month"].copy()}
            shifted["events_by_month"][(1,month_index(2015,3))]=200
            shifted["events_by_month"][(4,month_index(2016,1))]=1
            b=forecast_month(shifted,roster,2016,1)
            for left,right in zip(a["cases"],b["cases"]):
                self.assertEqual(left["probabilities"],right["probabilities"])
            self.assertNotEqual([c["outcome"] for c in a["cases"]],
                                [c["outcome"] for c in b["cases"]])

    def test_strong_local_history_baseline_never_uses_future_ged_months(self):
        with tempfile.TemporaryDirectory() as t:
            ged,roster=fixture(Path(t)/"g.zip")
            before=forecast_month(ged,roster,2016,1)
            for case in before["cases"]:
                p=case["probabilities"]
                self.assertTrue(0<p["country_history_24m"]<1)
                # 24 months with a Beta(1,1) prior and no target-month information.
                expected=(1+sum(ged["events_by_month"][(case["country_id"],idx)]>0
                                for idx in range(month_index(2014,1)-23,
                                                 month_index(2014,1)+1)))/26
                self.assertAlmostEqual(p["country_history_24m"],expected)
            later={**ged,"events_by_month":ged["events_by_month"].copy()}
            later["events_by_month"][(3,month_index(2015,2))]=99
            after=forecast_month(later,roster,2016,1)
            self.assertEqual([x["probabilities"] for x in before["cases"]],
                             [x["probabilities"] for x in after["cases"]])

    def test_all_models_share_country_month_sample_for_skill_comparisons(self):
        with tempfile.TemporaryDirectory() as t:
            ged,roster=fixture(Path(t)/"g.zip")
            report=monthly_report(ged,roster)
            for part in report["partitions"].values():
                d=part["rare_event_diagnostics"]
                self.assertEqual(set(part["models"]),{"global_frequency","country_shrinkage","country_history_24m"})
                self.assertEqual(set(d["models"]),{"global_frequency","country_shrinkage","country_history_24m"})
                for name,m in part["models"].items():
                    self.assertEqual(m["n"],part["n_scored"])
                    self.assertGreaterEqual(m["brier"],0)
                expected=1-part["models"]["country_history_24m"]["brier"]/part["models"]["global_frequency"]["brier"]
                self.assertAlmostEqual(d["country_history_brier_skill_vs_global_frequency"],expected)

    def test_missing_roster_year_excludes_not_negative_imputed(self):
        with tempfile.TemporaryDirectory() as t:
            ged,roster=fixture(Path(t)/"g.zip")
            roster["lookup"].pop((2,2012))
            actual=forecast_month(ged,roster,2016,1)
            self.assertEqual(actual["n_roster"],5)
            self.assertEqual(actual["n_scored"],4)
            self.assertEqual(actual["excluded"]["incomplete_country_roster_in_history"],1)

    def test_genuine_ged_source_checksum_and_ambiguous_rows_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            file=Path(t)/"ged.zip"
            sha=create_ged_zip(file,[incident(1,1,"2016-04-02")])
            with self.assertRaises(ValueError):
                parse_ged_exact_months(file,"0"*64,require_full_coverage=False)
            sha=create_ged_zip(file,[incident(1,1,"2016-04-02"),incident(1,1,"2016-04-03")])
            with self.assertRaisesRegex(ValueError,"Duplicate GED"):
                parse_ged_exact_months(file,sha,require_full_coverage=False)

    def test_evaluation_dimensions_and_no_prospective_skill_claim(self):
        with tempfile.TemporaryDirectory() as t:
            ged,roster=fixture(Path(t)/"g.zip")
            report=monthly_report(ged,roster)
            self.assertEqual(report["schema"],"psychohistory.ged.monthly_incidence.v1")
            self.assertEqual(report["target"],TARGET)
            self.assertFalse(report["source_as_of_verified"])
            self.assertFalse(report["prospective_eligible"])
            self.assertEqual(report["partitions"]["validation"]["n_scored"],4*12*5)
            self.assertEqual(report["partitions"]["test"]["n_scored"],5*12*5)
            for p in report["partitions"].values():
                self.assertEqual(p["n_scored"]+p["n_excluded"],p["n_country_months"])
                for model in ("global_frequency","country_shrinkage","country_history_24m"):
                    self.assertEqual(p["models"][model]["n"],p["n_scored"])
                    self.assertGreaterEqual(p["models"][model]["brier"],0)
                    self.assertTrue(p["rare_event_diagnostics"]["models"][model]["calibration_bins"])
            out=Path(t)/"report.json"
            save_private(report,out)
            self.assertTrue(out.exists())
            with self.assertRaises(FileExistsError): save_private(report,out)


if __name__=="__main__":
    unittest.main()
