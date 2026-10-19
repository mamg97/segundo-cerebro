"""Synthetic-only UCDP Dyadic tests: anonymous country-years, no forecast."""
import unittest
from ucdp_dyadic_lineage_av053 import dyadic_urls,read_dyads,compare_dyads
from ucdp_prio_conflict_lineage_av052 import acd_years

INDEX=b"""<!doctype html><h2>Other Dataset</h2><p>version 19.1:
<a href='/downloads/dyadic/forged.csv'>CSV</a></p>
<h2>UCDP Dyadic Dataset</h2>
<p>version 25.1: <a href='/downloads/dyadic/modern-csv.zip'>CSV</a></p>
<p>version 19.1: <a href='/downloads/dyadic/older.csv'>CSV</a></p>
<p>version 18.1: <a href='/downloads/dyadic/ignore.csv'>CSV</a></p>
</html>"""

def dyad(*rows):
    return ("year,conflict_id,dyad_id,type_of_conflict,gwno_loc\n"+"\n".join(rows)+"\n").encode()

def conflict(*rows):
    return ("year,conflict_id,type_of_conflict,gwno_loc\n"+"\n".join(rows)+"\n").encode()

def onset(*rows):
    return ("gwno_a,year,onset1,newconf,onset5\n"+"\n".join(rows)+"\n").encode()

class DyadVintageTests(unittest.TestCase):
    def test_catalog_edition_urls_are_exact_and_approved(self):
        found=dyadic_urls(INDEX)
        self.assertEqual(found["19.1"],"https://ucdp.uu.se/downloads/dyadic/older.csv")
        self.assertEqual(found["25.1"],"https://ucdp.uu.se/downloads/dyadic/modern-csv.zip")
        for html in (INDEX.replace(b"/downloads/dyadic/older.csv",b"https://evil.invalid/older.csv"),
                     INDEX.replace(b"UCDP Dyadic Dataset",b"Some Dataset")):
            with self.assertRaises(ValueError):dyadic_urls(html)

    def test_parses_multi_country_and_conflict_dyad_ids(self):
        d=read_dyads(dyad("2017,33,90,3,\"900,901\"","2017,33,91,4,900","2017,88,92,2,900"),"19.1")
        self.assertEqual(d["keys"][(900,2017)],{(90,33),(91,33)})
        self.assertEqual(d["keys"][(901,2017)],{(90,33)})
        self.assertEqual(d["rows"],3)

    def test_fixed_population_and_orphan_accounting_not_adjudication(self):
        o=onset("900,2017,1,1,1","901,2017,1,1,1","902,2017,1,1,1")
        m=onset("900,2017,0,0,0","901,2017,0,0,0","902,2017,0,0,0")
        d19=read_dyads(dyad("2017,33,90,3,900","2017,35,91,3,901"),"19.1")
        d25=read_dyads(dyad("2017,33,90,3,900","2017,36,92,3,902"),"25.1")
        a19=acd_years(conflict("2017,33,3,900","2017,35,3,901"),"19.1")
        a25=acd_years(conflict("2017,33,3,900","2017,36,3,902"),"25.1")
        r=compare_dyads(o,m,m,d19,d25,a19,a25,strict=False)
        self.assertEqual(r["dyad_activity_status"]["both"],1)
        self.assertEqual(r["dyad_activity_status"]["only_19"],1)
        self.assertEqual(r["dyad_activity_status"]["only_25"],1)
        self.assertEqual(r["both_vintages_shared_dyad_id"],1)
        self.assertFalse(r["revision_cause_adjudicated"])
        self.assertFalse(r["backtest_authorized"])
        self.assertNotIn("900",str(r))

    def test_no_false_2020_backtest_from_small_fixture(self):
        o=onset("900,2017,1,1,1")
        m=onset("900,2017,0,0,0")
        d=read_dyads(dyad("2017,33,90,3,900"),"19.1")
        a=acd_years(conflict("2017,33,3,900"),"19.1")
        with self.assertRaises(ValueError):compare_dyads(o,m,m,d,d,a,a,strict=True)

    def test_invalid_dyadic_data_not_fabricated(self):
        for data in (dyad("2019,33,90,3,900"),dyad("2017,33,90,8,900"),
                     dyad("2017,33,0,3,900"),b"gwno_a,year\n900,2017\n"):
            with self.assertRaises(ValueError):
                read_dyads(data,"19.1")

if __name__=="__main__":
    unittest.main()
