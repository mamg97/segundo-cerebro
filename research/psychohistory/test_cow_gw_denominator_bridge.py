"""Entirely fictional GW and COW source records, no event labels."""
import csv
from io import StringIO
import hashlib
import unittest

from cow_gw_denominator_bridge import parse_cow, build_gw_with_microstates, compare


GW_HEAD = "statenumber\tstateid\tcountryname\tstart\tend\n"
COW_HEAD = ("stateabb","ccode","statenme","styear","stmonth","stday",
            "endyear","endmonth","endday","version")


def gw(*rows):
    return (GW_HEAD+"".join("\t".join(map(str,row))+"\n" for row in rows)).encode()


def cow(*rows):
    output=StringIO()
    writer=csv.writer(output)
    writer.writerow(COW_HEAD)
    writer.writerows(rows)
    return output.getvalue().encode()


def fake_inputs():
    return (
        cow(("FKA",100,"Fictitious A",2010,1,1,2024,12,31,2024),
            ("FKB",200,"Fictitious B",2010,1,1,2024,12,31,2024)),
        gw((100,"A","Fictitious A", "2010-01-01","2020-12-31"),
           (300,"C","Fictitious C", "2010-01-01","2020-12-31")),
        gw((400,"D","Fictitious D", "2011-01-01","2020-12-31"),
           (500,"E","Fictitious E", "2019-01-01","2020-12-31"))
    )


class COWGWRosterTests(unittest.TestCase):
    def test_cow2024_population_is_not_a_2024_asof_label(self):
        cow_raw,base_raw,micro_raw=fake_inputs()
        cow_src=parse_cow(cow_raw,hashlib.sha256(cow_raw).hexdigest())
        gw_src=build_gw_with_microstates(base_raw,micro_raw)
        report=compare(cow_src,gw_src,["2020-12","2024-12","2025-01"])
        self.assertEqual(report["n_gw_base_codes"],2)
        self.assertEqual(report["n_gw_micro_codes"],2)
        self.assertEqual(report["months"][0]["n_cow_full_month"],2)
        self.assertEqual(report["months"][0]["n_gw_full_month"],4)
        self.assertEqual(report["months"][0]["n_same_numeric_code"],1)
        self.assertEqual(report["months"][0]["n_cow_codes_only"],1)
        self.assertEqual(report["months"][0]["n_gw_codes_only"],3)
        self.assertEqual(report["months"][1]["n_cow_full_month"],2)
        self.assertIsNone(report["months"][1]["n_gw_full_month"])
        self.assertEqual(report["months"][2]["status"],"NO_EVALUABLE_COW_AFTER_2024")
        for field in ("cow_release_preprediction_verified_for_2024",
                      "cow_code_equals_ucdp_gw_code_proven",
                      "source_as_of_verified","ucdp_event_archive_coverage_verified",
                      "absent_ucdp_record_means_negative","vintage_correct_backtest",
                      "models_scored","forecast_issued"):
            self.assertIs(report[field],False)
        self.assertNotIn("country_id",report)
        self.assertNotIn("countries",report)

    def test_cohort_is_never_defined_by_positive_events(self):
        cow_raw,base_raw,micro_raw=fake_inputs()
        c=parse_cow(cow_raw)
        g=build_gw_with_microstates(base_raw,micro_raw)
        for periods in (["2024-12","2020-12"],["2020-12","2020-12"],["2024-13"],[],["2040-01"]):
            with self.subTest(periods=periods),self.assertRaises(ValueError):
                compare(c,g,periods)

    def test_duplicate_state_code_intervals_and_gw_micro_overlap_rejected(self):
        cow_raw,base_raw,micro_raw=fake_inputs()
        with self.assertRaises(ValueError):
            parse_cow(cow_raw, "f"*64)
        invalid=cow(("FKA",100,"Fictitious A",2010,1,1,2024,12,31,2024),
                    ("FKA",100,"Fictitious A",2020,1,1,2024,12,31,2024))
        with self.assertRaises(ValueError):
            parse_cow(invalid)
        with self.assertRaises(ValueError):
            build_gw_with_microstates(base_raw,
                gw((100,"X","Conflicted X","2000-01-01","2020-12-31"),
                   (500,"E","Fictitious E","2019-01-01","2020-12-31")))
        with self.assertRaises(ValueError):
            parse_cow(cow_raw.replace(b",2024\r\n",b",2025\r\n"))

    def test_same_day_code_handoff_is_counted_not_silently_merged(self):
        boundary = cow(
            ("OLD",345,"Fictional predecessor",1944,10,20,2006,6,3,2024),
            ("NEW",345,"Fictional successor",2006,6,3,2024,12,31,2024),
        )
        c = parse_cow(boundary)
        self.assertEqual(c["n_touching_boundary_dates_unresolved"],1)
        gw_raw,base_raw,micro_raw = fake_inputs()
        g = build_gw_with_microstates(base_raw,micro_raw)
        result = compare(c,g,["2006-06","2024-12"])
        self.assertEqual(result["n_cow_shared_day_handoffs_not_disambiguated"],1)
        self.assertEqual(result["months"][0]["n_cow_full_month"],0)
        self.assertEqual(result["months"][0]["n_cow_partial_month"],1)
        self.assertEqual(result["months"][1]["n_cow_full_month"],1)
        self.assertFalse(result["geographic_concordance_reviewed"])

    def test_no_future_state_or_invalid_schema(self):
        bad=cow(("FKA",100,"Fictitious A",2010,1,1,2025,12,31,2024),
                ("FKB",200,"Fictitious B",2010,1,1,2024,12,31,2024))
        with self.assertRaises(ValueError):
            parse_cow(bad)
        with self.assertRaises(ValueError):
            parse_cow(b"code,start,end\n123,2020-01-01,2024-12-31\n")


if __name__=="__main__":
    unittest.main()
