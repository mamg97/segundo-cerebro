"""All state codes fictitious; no real forecast or retrospective skill."""
import unittest
from onset_four_variant_semantics import resolve_index,four_way
from onset_semantic_triangulation import parse

INDEX=(b'<!doctype html><h2>UCDP Other Dataset</h2><p>version 25.1:'
       b'<a href="/downloads/onset/wrong.csv">Intrastate Country Level Multiple Onset CSV</a></p>'
       b'<h2>UCDP Onset Dataset</h2><p>version 25.1:'
       b'<a href="/downloads/onset/actual.csv">Intrastate Country Level Multiple Onset CSV</a></p>'
       b'<p>version 24.1: <a href="/downloads/onset/wrong24.csv">'
       b'Intrastate Country Level Multiple Onset CSV</a></p>')

def d(*rows):
    return ("gwno_a,year,onset1\n"+"\n".join(rows)+"\n").encode()

class FourVariantTests(unittest.TestCase):
    def test_exact_catalog_section_version_and_unique_link(self):
        self.assertEqual(resolve_index(INDEX),
                         "https://ucdp.uu.se/downloads/onset/actual.csv")

    def test_catalog_malicious_external_and_missing_rejected(self):
        for v in (INDEX.replace(b"/downloads/onset/actual.csv",b"https://evil.invalid/a.csv"),
                  INDEX.replace(b"UCDP Onset Dataset",b"UCDP Random Dataset"),
                  INDEX.replace(b"/downloads/onset/actual.csv",b"/redirect.csv")):
            with self.assertRaises(ValueError):resolve_index(v)

    def test_four_flag_patterns_on_exact_same_keys(self):
        old=parse(d("900,2017,1","901,2017,1","902,2017,0",
                    "903,2017,1"),"old")
        country=parse(d("900,2017,0","901,2017,0","902,2017,1","903,2017,1"),"country")
        conflict=parse(d("900,2017,1","901,2017,0","902,2017,1","903,2017,1"),"conflict")
        multi=parse(d("900,2017,1","901,2017,1","902,2017,0","903,2017,1"),"country")
        r=four_way(old,country,conflict,multi)
        self.assertEqual(r["fixed_common_keys"],4)
        self.assertEqual(r["old_vs_country_disagreements"],3)
        self.assertEqual(r["old_vs_conflict_any_disagreements"],2)
        self.assertEqual(r["old_vs_country_multiple_disagreements"],0)
        self.assertEqual(r["old_one_country_zero_conflict_one_multiple_one"],1)
        for key in ("backtest_authorized","models_scored","forecast_issued","historical_target_identity_established"):
            self.assertFalse(r[key])
        self.assertNotIn("900",repr(r))

    def test_missing_multiple_country_is_not_a_denominator_change(self):
        old=parse(d("900,2017,1","901,2017,1"),"old")
        country=parse(d("900,2017,0","901,2017,1"),"country")
        conflict=parse(d("900,2017,1","901,2017,1"),"conflict")
        multiple=parse(d("900,2017,0"),"country")
        with self.assertRaises(ValueError):four_way(old,country,conflict,multiple)

    def test_unknown_multiple_is_not_negative(self):
        old=parse(d("900,2017,1"),"old")
        country=parse(d("900,2017,0"),"country")
        conflict=parse(d("900,2017,1"),"conflict")
        multiple=parse(d("900,2017,"),"country")
        with self.assertRaises(ValueError):four_way(old,country,conflict,multiple)

if __name__=="__main__":
    unittest.main()
