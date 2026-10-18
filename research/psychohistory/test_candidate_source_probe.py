"""Synthetic samples only: event rows cannot establish zero-case countries."""
import csv
import hashlib
import io
import unittest

from candidate_source_probe import summarize, SOURCE_URL


FIELDS = ["id", "country_id", "date_start", "date_end", "date_prec", "type_of_violence", "best"]


def fake(rows):
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue().encode()


def row(cid=123, start="2024-03-02", end="2024-03-02", typ=1):
    return {"id":"FICTIONAL", "country_id":str(cid), "date_start":start,
            "date_end":end, "date_prec":"3", "type_of_violence":str(typ), "best":"1"}


class CandidateSourceProbeTests(unittest.TestCase):
    def test_aggregate_only_and_no_inferred_zero_case_roster(self):
        raw = fake([row(123, "2024-12-02 00:00:00.000", "2024-12-02 00:00:00.000"), row(456, "2024-12-06", "2024-12-08", 2)])
        out = summarize(raw)
        self.assertEqual(out["n_event_rows"], 2)
        self.assertEqual(out["n_countries_with_recorded_events"], 2)
        self.assertEqual(out["url"], SOURCE_URL)
        self.assertFalse(out["full_country_coverage_known_from_events"])
        self.assertFalse(out["absent_country_is_conflict_free"])
        self.assertFalse(out["as_of_verified"])
        self.assertTrue(out["source_date_scope_valid_for_nominal_2024"])
        self.assertEqual(out["status"], "NOMINAL_EVENT_MONTH_ENDPOINTS_INTACT_NOT_ASOF")
        self.assertFalse(out["backtest_authorized"])
        self.assertFalse(out["forecast_issued"])
        self.assertNotIn("FICTIONAL", str(out))
        digest = hashlib.sha256(raw).hexdigest()
        self.assertEqual(summarize(raw, expected_sha256=digest)["integrity"], "MATCHED_SUPPLIED_SHA")
        with self.assertRaises(ValueError):
            summarize(raw, expected_sha256="f"*64)

    def test_cross_year_event_end_is_not_automatically_future_information(self):
        doc = summarize(fake([
            row(start="2024-12-29", end="2025-01-03"),
            row(start="2024-12-31", end="2025-01-01"),
        ]))
        self.assertEqual(doc["status"], "CROSS_YEAR_ENDS_COMPATIBLE_WITH_CODEBOOK_NOT_ASOF")
        self.assertEqual(doc["date_scope_violation_counts"]["after_2024"], 2)
        self.assertEqual(doc["month_window_audit"]["late_end_december_to_2025"], 2)
        self.assertEqual(doc["month_window_audit"]["late_end_date_precision_counts"], {"3": 2})
        self.assertEqual(doc["month_window_audit"]["neither_endpoint_in_export_month"], 0)
        self.assertTrue(doc["event_month_window_compatible_with_codebook"])
        self.assertFalse(doc["as_of_verified"])
        self.assertFalse(doc["backtest_authorized"])

    def test_temporal_scope_and_schema_fail_closed(self):
        for anomaly, testrow in [
            ("reversed", row(start="2024-12-07", end="2024-12-06")),
            ("before_1989", row(start="1980-01-01")),
            ("future_start", row(start="2025-01-01", end="2025-01-02")),
            ("no_december_endpoint", row(start="2024-11-25", end="2025-01-02")),
        ]:
            with self.subTest(anomaly=anomaly):
                result = summarize(fake([testrow]))
                self.assertEqual(result["status"], "SOURCE_MONTH_SCOPE_MISMATCH_REVIEW_REQUIRED")
                self.assertFalse(result["event_month_window_compatible_with_codebook"])
                self.assertFalse(result["as_of_verified"])
                self.assertFalse(result["backtest_authorized"])
        for testrow in [
            row(cid=0), row(typ=4),
            row(start="2024-08-01 12:30:00.000"),
            row(start="2024-08-01 00:00:00.001"),
        ]:
            with self.subTest(testrow=testrow), self.assertRaises(ValueError):
                summarize(fake([testrow]))
        with self.assertRaises(ValueError):
            summarize(fake([row()]), edition="23.0.12")

    def test_empty_bad_utf8_and_duplicate_columns(self):
        with self.assertRaises(ValueError):
            summarize(b"")
        with self.assertRaises(ValueError):
            summarize(b"\xff\xfe")
        with self.assertRaises(ValueError):
            summarize(b"country_id,country_id,date_start,date_end,type_of_violence\n1,2,2024-01-01,2024-01-01,1\n")
        with self.assertRaises(ValueError):
            summarize(fake([]))


if __name__ == "__main__":
    unittest.main()
