"""Entirely imaginary country intervals. No real country table or event labels."""
import csv
import hashlib
from io import StringIO
import unittest

from cow_annual_origin_gate import audit, SCHEMA


COLS=("stateabb","ccode","statenme","styear","stmonth","stday",
      "endyear","endmonth","endday","version")


def data(rows):
    stream=StringIO(newline="")
    w=csv.writer(stream)
    w.writerow(COLS)
    w.writerows(rows)
    return stream.getvalue().encode()


def row(abbr,code,first,last):
    a,b,c=map(int,first.split("-"))
    d,e,f=map(int,last.split("-"))
    return (abbr,code,"Invented "+abbr,a,b,c,d,e,f,2024)


def fiction():
    return data([
        row("AAA",100,"2010-01-01","2024-12-31"),
        row("BBB",200,"2020-07-01","2024-12-31"),
        row("CCC",300,"2010-01-01","2020-03-15"),
        row("OLD",400,"2010-01-01","2020-06-01"),
        row("NEW",400,"2020-06-01","2024-12-31"),
    ])


class COWAnnualYearGateTests(unittest.TestCase):
    def test_post_issue_entries_and_reused_codes_are_not_future_ready(self):
        buf=fiction()
        sha=hashlib.sha256(buf).hexdigest()
        output=audit(buf,[2019,2020,2024,2025],sha)
        self.assertEqual(output["schema"],SCHEMA)
        item=output["years"][1]["year_geometry"]
        self.assertEqual(item["n_any_time_year_codes"],4)
        self.assertEqual(item["n_jan_1_codes"],3)
        self.assertEqual(item["n_full_year_codes"],1)
        self.assertEqual(item["n_year_only_codes_not_in_january_roster"],1)
        self.assertEqual(item["n_january_codes_not_stable_whole_year"],2)
        self.assertEqual(item["n_annual_code_token_pairs"],5)
        self.assertEqual(item["n_january_code_token_pairs"],3)
        self.assertEqual(item["n_annual_pairs_not_present_jan_1"],2)
        self.assertEqual(item["n_annual_codes_with_multiple_names"],1)
        self.assertEqual(item["n_future_entry_intervals"],2)
        self.assertEqual(item["n_exit_intervals_during_year"],2)
        self.assertEqual(output["years"][3]["status"],
                         "NO_EVALUABLE_COW_SOURCE_ENDS_2024")
        self.assertIsNone(output["years"][3]["year_geometry"])
        self.assertFalse(output["used_official_system2024_csv"])
        self.assertFalse(output["official_system2024_year_rows_independently_verified"])
        for k in ("cross_system_country_id_concordance_verified",
                  "source_as_of_verified","country_negative_labels_verified",
                  "backtest_authorized","models_scored","forecast_issued"):
            self.assertFalse(output[k])
        self.assertNotIn("country_codes",output)
        self.assertNotIn("countries",output)

    def test_shared_january_first_code_succession_is_not_automatically_resolved(self):
        buf=data([
            row("AAA",100,"2010-01-01","2024-12-31"),
            row("OLD",400,"2010-01-01","2020-01-01"),
            row("NEW",400,"2020-01-01","2024-12-31"),
        ])
        report=audit(buf,[2020],hashlib.sha256(buf).hexdigest())
        g=report["years"][0]["year_geometry"]
        self.assertEqual(g["status"],"AMBIGUOUS_JAN_1_CODE_DO_NOT_JOIN")
        self.assertEqual(g["n_issue_day_ambiguous_codes"],1)
        self.assertIsNone(g["n_jan_1_codes"])
        self.assertFalse(g["origin_roster_unique_identity_verified"])

    def test_sha_date_and_sequence_fail_closed(self):
        buf=fiction()
        sha=hashlib.sha256(buf).hexdigest()
        for years in ([],[2020,2020],[2024,2020],[1800],[2101],[True]):
            with self.subTest(years=years),self.assertRaises(ValueError):
                audit(buf,years,sha)
        with self.assertRaises(ValueError):
            audit(buf,[2020],"f"*64)
        with self.assertRaises(ValueError):
            audit(data([row("AAA",100,"2025-01-01","2025-12-31"),
                        row("BBB",200,"2020-01-01","2024-12-31")]),[2020],None)

    def test_no_anytime_membership_does_not_create_negative_conflict_label(self):
        report=audit(fiction(),[2018,2019],hashlib.sha256(fiction()).hexdigest())
        self.assertEqual(report["years"][0]["status"],
                         "DOCUMENTED_RELEASE_LATER_THAN_ORIGIN")
        self.assertFalse(report["country_negative_labels_verified"])
        self.assertFalse(report["backtest_authorized"])
        self.assertFalse(report["forecast_issued"])


if __name__=="__main__":
    unittest.main()
