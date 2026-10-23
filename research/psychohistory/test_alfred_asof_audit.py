"""Synthetic boundary, revision and malformed-source cases only."""

import hashlib
import io
import unittest
import zipfile

from alfred_asof_audit import audit, compare_export, select


def packed(csv_text, member="obs._by_real-time_period.csv", fmt="Observations by Real-Time Period", units="Percent"):
    buffer = io.BytesIO()
    readme = (f"Series ID: UNRATE\nOutput Format: {fmt}\nFile Created: 2000-04-10 9:00 AM CDT\n"
              f"Units\n{units} 1960-01-01 Current\nFrequency\nMonthly 1960-01-01 Current\n"
              "Seasonal Adjustment\nSeasonally Adjusted 1960-01-01 Current\n")
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("README.txt", readme)
        archive.writestr(member, csv_text)
    return buffer.getvalue()


ROWS = ["2000-01-01,7.0,2000-02-04,2000-03-02", "2000-01-01,7.2,2000-03-03,",
        "2000-02-01,,2000-03-03,"]
HEADER = "period_start_date,UNRATE,realtime_start_date,realtime_end_date\n"


def make_report(rows=None, units="Percent"):
    raw = packed(HEADER + "\n".join(ROWS if rows is None else rows) + "\n", units=units)
    return audit(raw, hashlib.sha256(raw).hexdigest(), "2000-01-01", "2000-02-01")


def check_vintage(report, data):
    raw = packed(data, "vintages_starting_2000-03-02.csv", "Observations by Vintage Date, All Observations")
    return compare_export(report, raw, hashlib.sha256(raw).hexdigest(), ["2000-03-02", "2000-03-03"])


class AsOfTests(unittest.TestCase):
    def test_inclusive_revision_boundary_and_missing(self):
        report = make_report()
        self.assertEqual(select(report, "2000-02-03")[0]["status"], "NOT_YET_RELEASED")
        self.assertEqual(select(report, "2000-02-04")[0]["rate_percent"], "7.0")
        self.assertEqual(select(report, "2000-03-02")[0]["rate_percent"], "7.0")
        self.assertEqual(select(report, "2000-03-03")[0]["rate_percent"], "7.2")
        self.assertEqual(select(report, "2000-03-03")[1]["status"], "MISSING")
        self.assertEqual(select(report, "2000-04-10")[1]["status"], "MISSING")

    def test_future_cut_is_not_known(self):
        with self.assertRaisesRegex(ValueError, "after export"):
            select(make_report(), "2000-04-11")

    def test_gap_overlap_open_middle_and_reverse_order(self):
        for rows in [
            [ROWS[0].replace("2000-03-02", "2000-03-01"), *ROWS[1:]],
            [ROWS[0].replace("2000-03-02", "2000-03-03"), *ROWS[1:]],
            [ROWS[0].replace("2000-03-02", ""), *ROWS[1:]],
            list(reversed(ROWS)), [ROWS[0], *ROWS],
        ]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                make_report(rows)

    def test_coverage_and_terminal_truncation(self):
        for rows in [ROWS[:-1], [ROWS[0], ROWS[1] + "2000-04-09", ROWS[2]]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                make_report(rows)

    def test_invalid_rate_and_date(self):
        for first in [ROWS[0].replace("7.0", "NaN"), ROWS[0].replace("7.0", "101"),
                      ROWS[0].replace("2000-02-04", "2000-01-31"),
                      ROWS[0].replace("2000-03-02", "2000-02-01")]:
            with self.subTest(first=first), self.assertRaises(ValueError):
                make_report([first, *ROWS[1:]])

    def test_hash_and_transformed_units_rejected(self):
        raw = packed(HEADER + "\n".join(ROWS))
        with self.assertRaisesRegex(ValueError, "integrity"):
            audit(raw, "0" * 64, "2000-01-01", "2000-02-01")
        with self.assertRaisesRegex(ValueError, "units"):
            make_report(units="Change, Percent")

    def test_malformed_rows_and_unexpected_zip_members(self):
        with self.assertRaises(ValueError):
            make_report([ROWS[0] + ",EXTRA", *ROWS[1:]])
        raw = packed(HEADER + "\n".join(ROWS))
        buf = io.BytesIO(raw)
        with zipfile.ZipFile(buf, "a") as archive:
            archive.writestr("unexpected.txt", "unexpected")
        with self.assertRaisesRegex(ValueError, "members"):
            audit(buf.getvalue(), hashlib.sha256(buf.getvalue()).hexdigest(), "2000-01-01", "2000-02-01")

    def test_official_style_vintage_reconstruction(self):
        result = check_vintage(make_report(), "observation_date,UNRATE_20000302,UNRATE_20000303\n2000-01-01,7.0,7.2\n2000-02-01,,\n")
        self.assertEqual(result["cells_matched"], 4)

    def test_mismatched_vintage_or_omitted_available_month(self):
        header = "observation_date,UNRATE_20000302,UNRATE_20000303\n"
        for data in [header + "2000-01-01,7.2,7.2\n", header + "2000-02-01,,\n",
                     header + "2000-01-01,7.0,7.2\n2000-01-01,7.0,7.2\n"]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                check_vintage(make_report(), data)


if __name__ == "__main__":
    unittest.main()
