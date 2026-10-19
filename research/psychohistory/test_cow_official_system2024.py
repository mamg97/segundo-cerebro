"""Fictional ZIP archives, no live country records."""
import io
import unittest
from zipfile import ZipFile, ZIP_DEFLATED
from cow_official_system2024 import inspect, MAX_MEMBER_SIZE

def zippath(entries):
    dest=io.BytesIO()
    with ZipFile(dest,"w",ZIP_DEFLATED) as z:
        for name,content in entries:
            z.writestr(name,content)
    return dest.getvalue()


class OfficialZIPTests(unittest.TestCase):
    def test_safe_archive_only_metadata(self):
        raw=zippath([("System2024.csv",b"ccode,year\n100,2010\n"),
                     ("System2024.dta",b"fictional")])
        x=inspect(raw)
        self.assertEqual(len(x["files"]),2)
        self.assertTrue(x["downloaded_in_current_runner"])
        self.assertFalse(x["source_as_of_verified"])
        self.assertFalse(x["official_country_year_rows_verified"])
        self.assertFalse(x["forecast_issued"])
        self.assertNotIn("100",str(x))
        self.assertNotIn("2010",str(x))
    def test_bad_or_unsafe_archives_rejected(self):
        samples=[b"notzip",b"",zippath([("../outside.txt",b"fictional")]),
                 zippath([("/absolute.csv",b"fictional")]),
                 zippath([("SYSTEM.CSV",b"x")]*21)]
        for data in samples:
            with self.subTest(data_len=len(data)),self.assertRaises(ValueError):
                inspect(data)
    def test_oversized_member_rejected(self):
        with self.assertRaises(ValueError):
            inspect(zippath([("System2024.csv",b"a"*(MAX_MEMBER_SIZE+1))]))

if __name__ == "__main__":
    unittest.main()
