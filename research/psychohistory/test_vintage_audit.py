"""Synthetic tests for historical UCDP release comparison; no private files."""
import csv
import hashlib
import io
import tempfile
import unittest
import zipfile
from pathlib import Path

from vintage_audit import load_csv_vintage, compare_vintages, vintage_gate


def make_archive(path, version, records, suffix=False):
    buf = io.StringIO()
    cols = ["country_id", "year", "sb_total_deaths_best", "Version"]
    if suffix:
        cols = [x + "_cy" if x != "Version" else x for x in cols]
    writer = csv.DictWriter(buf, fieldnames=cols)
    writer.writeheader()
    for cid, year, dead in records:
        writer.writerow(dict(zip(cols, [cid, year, dead, version])))
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("SYNTHETIC_vintage.csv", buf.getvalue())
    return hashlib.sha256(path.read_bytes()).hexdigest()


class VintageTests(unittest.TestCase):
    def test_revision_only_on_common_population_without_roster_padding(self):
        with tempfile.TemporaryDirectory() as d:
            p1, p2 = Path(d) / "v24.zip", Path(d) / "v25.zip"
            h1 = make_archive(p1, "24.1", [(1,2022,10),(1,2023,27),(2,2023,35)],suffix=True)
            h2 = make_archive(p2, "25.1", [(1,2022,50),(1,2023,28),(3,2024,0)])
            a=load_csv_vintage(p1,"24.1",h1); b=load_csv_vintage(p2,"25.1",h2)
            stats=compare_vintages(a,b)
            self.assertEqual(stats["shared_country_years"],2)
            self.assertEqual(stats["changed_death_counts"],2)
            self.assertEqual(stats["changed_threshold_labels"],1)
            self.assertEqual(stats["only_earlier"],1)
            self.assertEqual(stats["only_later"],1)
            self.assertFalse(stats["as_of_verified"])
            self.assertAlmostEqual(stats["changed_label_fraction"],0.5)

    def test_source_is_checksum_pinned_and_version_cannot_be_faked(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"v25.zip"
            digest=make_archive(path,"25.1",[(1,2024,20)])
            with self.assertRaises(ValueError):
                load_csv_vintage(path,"25.1","0"*64)
            with self.assertRaises(ValueError):
                load_csv_vintage(path,"24.1",digest)
            with self.assertRaises(ValueError):
                load_csv_vintage(path,"23.1",digest)
            with self.assertRaises(ValueError):
                load_csv_vintage(path,"25.1","not-a-sha")

    def test_duplicates_and_future_year_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"invalid.zip"
            digest=make_archive(path,"24.1",[(1,2023,0),(1,2023,0)])
            with self.assertRaises(ValueError): load_csv_vintage(path,"24.1",digest)
            digest=make_archive(path,"24.1",[(1,2024,0)])
            with self.assertRaises(ValueError): load_csv_vintage(path,"24.1",digest)

    def test_archive_version_is_never_as_of_proof(self):
        old=vintage_gate("25.1",2020)
        self.assertFalse(old["nominally_possible"])
        self.assertFalse(old["available_as_of_verified"])
        later=vintage_gate("25.1",2027)
        self.assertTrue(later["nominally_possible"])
        self.assertFalse(later["available_as_of_verified"])


if __name__=="__main__":
    unittest.main()
