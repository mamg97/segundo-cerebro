"""Completely fictional onset tables and fictitious HTML URLs under UCDP host."""
import hashlib
import unittest

from ucdp_official_onset_v241 import parse_catalog, summarize_csv


def fake_catalog():
    return ("""
    <html><body><h2>UCDP Country-Year Dataset on Organized Violence</h2>
    <p>version 24.1: <a href="https://example.org/evil.csv">Intrastate Conflict Level Onset CSV</a></p>
    <h2>UCDP Onset Dataset</h2>
    <p>version 25.1:
       <a href="/downloads/onset/fake-new.csv">Intrastate Conflict Level Onset CSV</a>
       <a href="/downloads/onset/fake-new-country.csv">Intrastate Country Level Onset CSV</a>
       <a href="/downloads/onset/fake-new-codebook.pdf">Codebook</a>
    </p>
    <p>version 24.1:
       <a href="/downloads/onset/fake-intrastate-country.csv">Intrastate Country Level Onset CSV</a>
       <a href="/downloads/onset/fake-intrastate-conflict.csv">Intrastate Conflict Level Onset CSV</a>
       <a href="/downloads/onset/fake-codebook.pdf">Codebook</a>
    </p>
    <p>version 23.1: <a href="/downloads/onset/fake-old.csv">Intrastate Conflict Level Onset CSV</a></p>
    </body></html>
    """+"synthetic catalog filler "*40).encode()


class OfficialOnsetProbeTests(unittest.TestCase):
    def test_catalog_selects_only_historical_24_1_official_host(self):
        x=parse_catalog(fake_catalog())
        self.assertEqual(set(x["source_urls"]),{
            "intrastate_conflict","intrastate_country","codebook"})
        self.assertTrue(x["source_urls"]["intrastate_conflict"].endswith("fake-intrastate-conflict.csv"))
        self.assertFalse(x["files_historically_available_before_issue_verified"])
        self.assertFalse(x["forecast_issued"])
        self.assertEqual(len(x["index_observed_sha256_now"]),64)

    def test_25_1_kept_distinct_from_24_1_and_all_sources_approved_only_by_index(self):
        x=parse_catalog(fake_catalog(),version="25.1")
        self.assertTrue(x["source_urls"]["intrastate_conflict"].endswith("fake-new.csv"))
        self.assertTrue(x["source_urls"]["intrastate_country"].endswith("fake-new-country.csv"))
        self.assertEqual(x["version"],"25.1")
        self.assertFalse(x["files_historically_available_before_issue_verified"])
        with self.assertRaises(ValueError):
            parse_catalog(fake_catalog(),version="26.1")

    def test_catalog_injection_and_duplicates_are_rejected(self):
        examples=[
            fake_catalog().replace(b"/downloads/onset/fake-intrastate-country.csv",
                                   b"https://example.org/poison.csv"),
            fake_catalog().replace(b"/downloads/onset/fake-intrastate-country.csv",
                                   b"/../../data/private.csv"),
            fake_catalog().replace(b"fake-codebook.pdf",b"fake-codebook.html"),
            fake_catalog().replace(b"version 24.1",b"version 24.2"),
            fake_catalog().replace(b"Intrastate Conflict Level Onset CSV",b"Missing Label")
        ]
        for x in examples:
            with self.subTest(sha=hashlib.sha256(x).hexdigest()),self.assertRaises(ValueError):
                parse_catalog(x)

    def test_synthetic_csv_schema_no_prediction_or_row_output(self):
        fake=b"year,conflict_id,onset5\\n2019,9999,0\\n2020,9999,1\\n".replace(b"\\n",b"\n")
        x=summarize_csv(fake,"intrastate_conflict",hashlib.sha256(fake).hexdigest())
        self.assertEqual(x["n_rows"],2)
        self.assertEqual(x["min_observed_year"],2019)
        self.assertEqual(x["max_observed_year"],2020)
        self.assertFalse(x["source_asof_verified"])
        self.assertFalse(x["forecast_issued"])
        self.assertNotIn("9999",str(x))

    def test_malformed_file_and_source_hash_blocked(self):
        rows=b"year,conflict_id\\n2019,9999\\n".replace(b"\\n",b"\n")
        with self.assertRaises(ValueError):
            summarize_csv(rows,"intrastate_conflict","f"*64)
        with self.assertRaises(ValueError):
            summarize_csv(rows.replace(b"2019",b"2040"),"intrastate_conflict")
        with self.assertRaises(ValueError):
            summarize_csv(rows,"dyadic")
        with self.assertRaises(ValueError):
            summarize_csv(b"year,conflict_id\\nnotayear,444\\n".replace(b"\\n",b"\n"),"intrastate_conflict")


if __name__=="__main__":
    unittest.main()
