"""Synthetic-only tests for UCDP/PRIO ACD country-conflict IDs; no real data."""
import io
import unittest
import zipfile
from collections import defaultdict
from ucdp_prio_conflict_lineage_av052 import official_acd_links,safe_csv,acd_years,reconcile

CATALOG=b"""<!doctype html><html><h2>Other data</h2>
<p>version 19.1: <a href='/downloads/ucdpprio/wrong-csv.zip'>CSV</a></p>
<h2>UCDP/PRIO Armed Conflict Dataset</h2>
<p>version 25.1: <a href='/downloads/ucdpprio/prio251-csv.zip'>CSV</a></p>
<p>version 19.1: <a href='/downloads/ucdpprio/prio191-csv.zip'>CSV</a></p>
<p>version 18.1: <a href='/downloads/ucdpprio/wrong18-csv.zip'>CSV</a></p>
</html>"""


def z_csv(data=b'year,conflict_id,type_of_conflict,gwno_loc\n2017,188,3,900\n',
          name="dataset.csv"):
    file=io.BytesIO()
    with zipfile.ZipFile(file,"w",zipfile.ZIP_DEFLATED) as arc:
        arc.writestr(name,data)
    return file.getvalue()


def onset(*rows):
    return ("gwno_a,year,onset1,newconf,onset5\n"+"\n".join(rows)+"\n").encode()


def acd(data,edition):
    return acd_years(data.encode(),edition)


class PrioHistoricalLineageTests(unittest.TestCase):
    def test_index_cannot_swap_edition(self):
        u=official_acd_links(CATALOG)
        self.assertEqual(u["19.1"],"https://ucdp.uu.se/downloads/ucdpprio/prio191-csv.zip")
        self.assertEqual(u["25.1"],"https://ucdp.uu.se/downloads/ucdpprio/prio251-csv.zip")
        for body in (
            CATALOG.replace(b"/downloads/ucdpprio/prio191-csv.zip",b"https://evil.example.org/191-csv.zip"),
            CATALOG.replace(b"UCDP/PRIO Armed Conflict Dataset",b"Unknown dataset"),
            CATALOG.replace(b"</html>",b"<p>version 19.1: <a href='/downloads/ucdpprio/dup-csv.zip'>CSV</a></p></html>"),
        ):
            with self.subTest(value=body),self.assertRaises(ValueError):
                official_acd_links(body)

    def test_zip_only_one_safe_member(self):
        raw=b'year,conflict_id,type_of_conflict,gwno_loc\n2017,188,3,900\n'
        self.assertEqual(safe_csv(z_csv(raw)),raw)
        for filename in ("../hacked.csv","/absolute.csv"):
            with self.assertRaises(ValueError):
                safe_csv(z_csv(raw,filename))

    def test_gwno_location_is_internal_conflict_country(self):
        d=acd("year,conflict_id,type_of_conflict,gwno_loc\n"
              "2017,188,3,900\n"
              "2017,189,4,\"900, 901\"\n"
              "2017,190,2,900\n","19.1")
        self.assertEqual(d["keys"][(900,2017)],{188,189})
        self.assertEqual(d["keys"][(901,2017)],{189})
        self.assertEqual(d["rows"],3)

    def test_disagreement_counters_are_not_causal(self):
        old=onset("900,2017,1,1,1","901,2017,1,1,1","902,2017,1,1,1","903,2017,1,1,1")
        now=onset("900,2017,0,0,0","901,2017,0,0,0","902,2017,0,0,0","903,2017,0,0,0")
        v19=acd("year,conflict_id,type_of_conflict,gwno_loc\n"
                "2017,41,3,900\n2017,42,4,901\n2017,43,3,902\n","19.1")
        v25=acd("year,conflict_id,type_of_conflict,gwno_loc\n"
                "2017,41,3,900\n2017,77,3,901\n2017,79,3,903\n","25.1")
        r=reconcile(old,now,now,v19,v25,strict=False)
        self.assertEqual(r["old_newconf_positive_residuals"],4)
        self.assertEqual(r["acd_coverage_status"]["both_vintages"],2)
        self.assertEqual(r["acd_coverage_status"]["only_acd191"],1)
        self.assertEqual(r["acd_coverage_status"]["only_acd251"],1)
        self.assertEqual(r["both_active_shared_numeric_conflict_id"],1)
        self.assertEqual(r["both_active_without_shared_numeric_id"],1)
        for attr in ("numeric_conflict_id_equivalence_independently_verified",
                     "dyad_lineage_reconciled","changes_in_newconf_causes_proven",
                     "backtest_authorized","forecast_issued"):
            self.assertFalse(r[attr])
        self.assertNotIn("900",str(r))

    def test_strict_cannot_pass_tiny_fictional_sample(self):
        old=onset("900,2017,1,1,1")
        modern=onset("900,2017,0,0,0")
        v=acd("year,conflict_id,type_of_conflict,gwno_loc\n2017,88,3,900\n","19.1")
        with self.assertRaises(ValueError):
            reconcile(old,modern,modern,v,v,strict=True)

    def test_edition_errors_rejected(self):
        for data in (
            "year,conflict_id,type_of_conflict,gwno_loc\n2019,88,3,900\n",
            "year,conflict_id,type_of_conflict,gwno_loc\n2017,88,7,900\n",
            "year,conflict_id,type_of_conflict,gwno_loc\n2017,88,3,900\n2017,88,3,\n",
            "year,conflict_id,type_of_conflict,wrong\n2017,88,3,900\n",
        ):
            with self.subTest(csv=data),self.assertRaises(ValueError):
                acd(data,"19.1")


if __name__=="__main__":
    unittest.main()
