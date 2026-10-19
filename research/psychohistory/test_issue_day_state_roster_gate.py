"""Completely fictional memberships; no real-country identities or labels."""
import csv
from datetime import date
from io import StringIO
import unittest

from issue_day_state_roster_gate import (
    _month_dates, inspect_membership, temporal_gate, analyze, SCHEMA)


def csv_bytes(columns,rows,delimiter=","):
    out=StringIO(newline="")
    w=csv.writer(out,delimiter=delimiter)
    w.writerow(columns)
    w.writerows(rows)
    return out.getvalue().encode()


def fake():
    cow=csv_bytes(["stateabb","ccode","statenme","styear","stmonth","stday",
                   "endyear","endmonth","endday","version"],[
        ["AAA",100,"Fictionia",2010,1,1,2024,12,31,2024],
        ["BBB",200,"Simuland",2015,1,1,2024,12,31,2024]])
    gw=csv_bytes(["statenumber","stateid","countryname","start","end"],[
        [100,"AAA","Fictionia","2010-01-01","2020-12-31"],
        [200,"BBB","Simuland","2015-01-01","2020-12-31"]],delimiter="\t")
    micro=csv_bytes(["statenumber","stateid","countryname","start","end"],[
        [300,"CCC","Small Fictionia","2019-01-01","2020-12-31"],
        [400,"DDD","Little Simuland","2018-01-01","2020-12-31"]],delimiter="\t")
    import hashlib
    hashes={"COW2024":hashlib.sha256(cow).hexdigest(),
            "GW7":hashlib.sha256(gw).hexdigest(),
            "GW7_MICRO":hashlib.sha256(micro).hexdigest()}
    return cow,gw,micro,hashes


class IssueDayRosterTests(unittest.TestCase):
    def test_midmonth_exit_must_not_disappear_at_issue_day(self):
        rows=[
            (100,"AAA",date(2010,1,1),date(2020,12,31)),
            (200,"BBB",date(2010,1,1),date(2020,6,10)),
            (300,"CCC",date(2020,6,15),date(2020,12,31)),
        ]
        result=inspect_membership(rows,*_month_dates("2020-06"))
        self.assertEqual(result["n_first_day_members"],2)
        self.assertEqual(result["n_full_month_members"],1)
        self.assertEqual(result["n_first_day_not_full_month"],1)
        self.assertEqual(result["n_future_month_entrants_observed_retrospectively"],1)
        self.assertEqual(result["n_within_month_exits_observed_retrospectively"],1)
        self.assertFalse(result["unambiguous_issue_day_roster_independently_verified"])

    def test_same_day_ambiguous_predecessor_successor_excluded(self):
        rows=[
            (100,"OLD",date(1999,1,1),date(2020,6,1)),
            (100,"NEW",date(2020,6,1),date(2020,12,31)),
            (200,"AAA",date(2010,1,1),date(2020,12,31)),
        ]
        result=inspect_membership(rows,*_month_dates("2020-06"))
        self.assertEqual(result["n_ambiguous_issue_day_codes"],1)
        self.assertEqual(result["n_first_day_members"],1)
        self.assertEqual(result["n_full_month_members"],2)
        # If a disputed issue-day state would be treated as stable, reject
        # the contradiction rather than including it retrospectively.
        # This assertion is intentionally reached only through a raised error.

    def test_bad_interval_is_rejected(self):
        with self.assertRaises(ValueError):
            inspect_membership([(100,"AAA",date(2020,7,1),date(2020,1,1))],
                               *_month_dates("2020-06"))
        with self.assertRaises(ValueError):
            inspect_membership([(100,"aa!",date(2020,1,1),date(2020,12,31))],
                               *_month_dates("2020-06"))

    def test_origin_gate_is_independent_of_member_counts(self):
        a,b,c,h=fake()
        result=analyze(a,b,c,["2020-12","2024-12","2025-01"],h)
        self.assertEqual(result["schema"],SCHEMA)
        self.assertEqual(result["periods"][0]["COW2024"]["status"],
                         "DOCUMENTED_RELEASE_NOT_BEFORE_ISSUE")
        self.assertEqual(result["periods"][0]["GW7"]["status"],
                         "DOCUMENTED_RELEASE_NOT_BEFORE_ISSUE")
        self.assertEqual(result["periods"][1]["GW7"]["status"],
                         "SOURCE_COVERAGE_EXPIRED")
        self.assertEqual(result["periods"][1]["COW2024"]["status"],
                         "DOCUMENTED_RELEASE_NOT_BEFORE_ISSUE")
        self.assertEqual(result["periods"][2]["COW2024"]["status"],
                         "SOURCE_COVERAGE_EXPIRED")
        self.assertEqual(result["periods"][0]["GW7"]["geometry"]["n_first_day_members"],4)
        self.assertFalse(result["as_of_roster_admissible"])
        self.assertFalse(result["country_negative_labels_validated"])
        self.assertFalse(result["forecast_issued"])

    def test_tampering_dates_and_hashes_fail_closed(self):
        a,b,c,h=fake()
        with self.assertRaises(ValueError):
            analyze(a,b,c,["2020-12"],{**h,"COW2024":"f"*64})
        for dates in ([],["2024-12","2020-12"],["2020-12","2020-12"],["2020-00"]):
            with self.subTest(dates=dates),self.assertRaises(ValueError):
                analyze(a,b,c,dates,h)
        self.assertEqual(temporal_gate("COW2024",*_month_dates("2024-12")),
                         "DOCUMENTED_RELEASE_NOT_BEFORE_ISSUE")


if __name__=="__main__":
    unittest.main()
