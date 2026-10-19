"""No real countries/events in tests; all identifiers and observations fictitious."""
import io
import json
import unittest
import zipfile

from historical_training_source_audit import (
    official_link_index, audit_table, unpack_csv,
)

INDEX=b"""<!DOCTYPE html><html><h2>UCDP Georeferenced Event Dataset (GED)</h2>
<p>GED 21.1: <a href='/downloads/ged/ged211-csv.zip'>CSV</a></p>
<p>GED 20.1: <a href='/downloads/ged/ged201-csv.zip'>CSV</a>
<a href='/downloads/ged/ged201.pdf'>Codebook</a></p>
<p>GED 19.1: <a href='/downloads/ged/ged191-csv.zip'>CSV</a></p>
<h2>UCDP Onset Dataset</h2>
<p>version 25.1: <a href='/downloads/onset/current.csv'>CSV</a></p>
<p>version 19.1: <a href='/downloads/onset/onset191.csv'>CSV</a>
<a href='/downloads/onset/old.pdf'>Codebook</a></p>
</html>"""


def archive(name="ged201.csv",body=b"year,type_of_violence\n2019,1\n"):
    out=io.BytesIO()
    with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr(name,body)
    return out.getvalue()


class HistoricalOfficialAuditTests(unittest.TestCase):
    def test_official_index_two_exact_versions(self):
        d=official_link_index(INDEX)
        self.assertEqual(d["ged20"],"https://ucdp.uu.se/downloads/ged/ged201-csv.zip")
        self.assertEqual(d["onset19"],"https://ucdp.uu.se/downloads/onset/onset191.csv")

    def test_index_rejects_duplicate_official_anchor(self):
        html=INDEX.replace(b"</html>",
            b"<p>version 19.1: <a href='/downloads/onset/forged.csv'>CSV</a></p></html>")
        with self.assertRaises(ValueError): official_link_index(html)

    def test_index_rejects_cross_domain_replacement(self):
        html=INDEX.replace(b"/downloads/ged/ged201-csv.zip",
                           b"https://attacker.invalid/ged201.zip")
        with self.assertRaises(ValueError): official_link_index(html)

    def test_onset_country_year_counts_and_unknown_not_zero(self):
        data=b"year,gwno_a,onset1\n2017,900,0\n2018,900,1\n2018,901,\n"
        r=audit_table(data,"onset19")
        self.assertEqual(r["source_rows"],3)
        self.assertEqual(r["latest_year_onset1_positives"],1)
        self.assertEqual(r["latest_year_onset1_unknown"],1)
        self.assertFalse(r["source_bytes_historically_authenticated"])
        self.assertFalse(r["complete_issue_roster_certified"])
        self.assertFalse(r["backtest_authorized"])

    def test_onset_duplicates_hindsight_and_bad_labels_rejected(self):
        for data in (
            b"year,gwno_a,onset1\n2018,900,1\n2018,900,0\n",
            b"year,gwno_a,onset1\n2020,900,1\n",
            b"year,gwno_a,onset1\n2018,900,maybe\n",
            b"year,gwno_a,onset1\n2018,9AB,1\n",
            b"year,gwno_a,onset1\n2017,900,1\n",
        ):
            with self.subTest(data=data), self.assertRaises(ValueError):
                audit_table(data,"onset19")

    def test_ged_2019_intrastate_not_country_risk_set(self):
        data=b"year,type_of_violence\n1989,1\n2019,1\n2019,2\n2019,3\n"
        r=audit_table(data,"ged20")
        self.assertEqual(r["ged_latest_year_intrastate_event_rows"],1)
        self.assertEqual(r["latest_year_rows"],3)
        self.assertIsNone(r["latest_year_onset1_positives"])
        self.assertFalse(r["complete_issue_roster_certified"])
        self.assertFalse(r["backtest_authorized"])

    def test_ged_invalid_event_and_future_year(self):
        for data in (
            b"year,type_of_violence\n2019,4\n",
            b"year,type_of_violence\n2020,1\n",
            b"year,other\n2019,1\n",
        ):
            with self.subTest(data=data),self.assertRaises(ValueError):
                audit_table(data,"ged20")

    def test_safe_single_csv_zip(self):
        data=archive()
        self.assertEqual(unpack_csv(data,"https://ucdp.uu.se/downloads/ged/ged201-csv.zip"),
                         b"year,type_of_violence\n2019,1\n")
        with self.assertRaises(ValueError):
            unpack_csv(archive("../data.csv"),"https://ucdp.uu.se/downloads/ged/ged201-csv.zip")
        with self.assertRaises(ValueError):
            unpack_csv(b"unknown","https://ucdp.uu.se/downloads/ged/ged201.csv")

    def test_no_outcome_state_rows_ever_returned(self):
        r=audit_table(b"year,gwno_a,onset1\n2018,98765,1\n","onset19")
        payload=json.dumps(r)
        self.assertNotIn("98765",payload)
        self.assertNotIn("country_id",payload)
        self.assertNotIn("probability",payload)


if __name__ == "__main__":
    unittest.main()
