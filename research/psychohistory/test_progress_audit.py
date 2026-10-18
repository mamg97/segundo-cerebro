"""SYNTHETIC scientific progress audit tests. No user-specific data."""
import copy
import csv
from pathlib import Path
import tempfile
import unittest

from progress_audit import (PHASE_FIELDS, EVENT_FIELDS, read_table,
                            validate_tables)


def phase(code="MAD-01", advance="AV-20261018-001"):
    return dict(zip(PHASE_FIELDS, (
        code, "FICTITIOUS DOMAIN", "Hypothesis", "COMPLETADA",
        "Hypothetical target defined", "Fixed prior outcome contract",
        "https://example.org/synthetic-protocol", "",
        "Keep under review", "2026-10-18", advance, "SI",
    )))


def event(code="AV-20261018-001", stage="MAD-01"):
    return dict(zip(EVENT_FIELDS, (
        code, "2026-10-18", "FICTITIOUS DOMAIN", "V2", stage,
        "DESIGN", "Documented entirely synthetic question", "VERIFICADO",
        "https://example.org/synthetic-proof", "SYNTHETIC-PR-1",
        "No real scientific skill is claimed", "Gather independent evidence",
    )))


class ProgressAuditTests(unittest.TestCase):
    def test_valid_synthetic_progress_and_no_scientific_claims(self):
        current = [event(), event("AV-20261018-002")]
        report = validate_tables([phase()], current)
        self.assertEqual(report["completedPhases"], 1)
        self.assertEqual(report["advances"], 2)
        self.assertFalse(report["forecastIssuanceVerified"])
        self.assertFalse(report["prospectiveSkillVerified"])
        self.assertFalse(report["appendOnlyComparedWithPreviousSnapshot"])
        report = validate_tables([phase()], current, [event()])
        self.assertTrue(report["appendOnlyComparedWithPreviousSnapshot"])

    def test_rewritten_or_truncated_history_fails(self):
        original = [event()]
        current = [event(), event("AV-20261018-002")]
        wrong = copy.deepcopy(current)
        wrong[0]["descripcion"] = "historical fact silently changed"
        with self.assertRaisesRegex(ValueError, "previously recorded rows"):
            validate_tables([phase()], wrong, original)
        with self.assertRaisesRegex(ValueError, "cannot shrink"):
            validate_tables([phase()], original, current)

    def test_prepared_forecast_is_not_a_completed_scientific_phase(self):
        p = phase()
        p["estado"] = "PREPARADO_NO_EMITIDO"
        with self.assertRaisesRegex(ValueError, "criterion gate disagree"):
            validate_tables([p], [event()])
        p["criterio_superado"] = "NO"
        valid = validate_tables([p], [event()])
        self.assertEqual(valid["completedPhases"], 0)
        self.assertFalse(valid["forecastIssuanceVerified"])

    def test_duplicate_and_forged_status_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            validate_tables([phase()], [event(), event()])
        a = event()
        a["estado"] = "ISSUED"
        with self.assertRaisesRegex(ValueError, "Unknown advancement state"):
            validate_tables([phase()], [a])
        b = event()
        b["avance_id"] = "AV-20261017-001"
        with self.assertRaisesRegex(ValueError, "calendar day"):
            validate_tables([phase()], [b])

    def test_latest_event_cross_phase_and_phase_dates(self):
        wrong = phase(advance="AV-20261018-002")
        with self.assertRaisesRegex(ValueError, "absent or unrelated"):
            validate_tables([wrong], [event()])
        wrong = phase()
        wrong["actualizado"] = "2026-10-17"
        with self.assertRaisesRegex(ValueError, "before its cited"):
            validate_tables([wrong], [event()])

    def test_non_https_and_malformed_dates_are_rejected(self):
        a = event()
        a["evidencia_url"] = "http://example.org/non-secure"
        with self.assertRaisesRegex(ValueError, "absolute HTTPS"):
            validate_tables([phase()], [a])
        a = event()
        a["fecha"] = "2026-02-30"
        with self.assertRaisesRegex(ValueError, "calendar day"):
            validate_tables([phase()], [a])

    def test_real_csv_column_contract_and_missing_values(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "fictional.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=EVENT_FIELDS)
                writer.writeheader()
                writer.writerow(event())
            self.assertEqual(read_table(path, EVENT_FIELDS), [event()])
            with self.assertRaisesRegex(ValueError, "incorrect columns"):
                read_table(path, PHASE_FIELDS)


if __name__ == "__main__":
    unittest.main()
