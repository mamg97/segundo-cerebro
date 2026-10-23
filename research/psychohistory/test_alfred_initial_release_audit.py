"""Synthetic cases only; no downloaded observations or credentials."""

import hashlib
import io
import unittest
import zipfile

from alfred_initial_release_audit import audit


def fixture(rows, readme=None):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("README.txt", readme or "Series ID: UNRATE\nOutput Format: Observations, Initial Release Only\n")
        archive.writestr("obs.,_initial_release_only.csv", "period_start_date,UNRATE,realtime_start_date\n" + rows)
    return buffer.getvalue()


def run(raw):
    return audit(raw, hashlib.sha256(raw).hexdigest(), "2000-01-01", "2000-02-01")


class AuditTests(unittest.TestCase):
    def test_missing_remains_unknown(self):
        result = run(fixture("2000-01-01,7.1,2000-02-04\n2000-02-01,,2000-03-03\n"))
        self.assertEqual(result["available_count"], 1)
        self.assertIsNone(result["observations"][1]["rate_percent"])
        self.assertFalse(result["intraday_availability_verified"])

    def test_tampered_archive(self):
        raw = fixture("2000-01-01,7.1,2000-02-04\n2000-02-01,7.2,2000-03-03\n")
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            audit(raw, "0" * 64, "2000-01-01", "2000-02-01")

    def test_duplicate_or_omitted_month(self):
        for rows in ["2000-01-01,7.1,2000-02-04\n" * 2, "2000-01-01,7.1,2000-02-04\n"]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                run(fixture(rows))

    def test_wrong_format_rejected(self):
        with self.assertRaisesRegex(ValueError, "wrong series or output"):
            run(fixture("", "Series ID: UNRATE\nOutput Format: Current data\n"))

    def test_nonfinite_and_out_of_range(self):
        for value in ["NaN", "Infinity", "-1", "101", "nonsense"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                run(fixture(f"2000-01-01,{value},2000-02-04\n2000-02-01,7.2,2000-03-03\n"))

    def test_premature_release_date(self):
        with self.assertRaisesRegex(ValueError, "precedes"):
            run(fixture("2000-01-01,7.1,2000-01-30\n2000-02-01,7.2,2000-03-03\n"))


if __name__ == "__main__":
    unittest.main()
