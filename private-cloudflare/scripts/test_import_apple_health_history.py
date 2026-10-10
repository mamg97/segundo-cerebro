#!/usr/bin/env python3
"""Synthetic-only regression tests; never load personal HealthKit exports."""

import importlib.util
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("import-apple-health-history.py")
SPEC = importlib.util.spec_from_file_location("apple_health_history_import", MODULE_PATH)
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class AppleHealthBackfillGuardsTest(unittest.TestCase):
    def test_phone_only_after_watch_start_keeps_missing_watch_kcal_unknown(self):
        xml = """<HealthData>
          <Record type="HKQuantityTypeIdentifierBasalEnergyBurned" sourceName="Apple Watch"
            startDate="2026-01-01 00:00:00 +0100" endDate="2026-01-01 01:00:00 +0100" value="65"/>
          <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="Apple Watch"
            startDate="2026-01-01 12:00:00 +0100" endDate="2026-01-01 12:10:00 +0100" value="110"/>
          <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
            startDate="2026-01-02 08:00:00 +0100" endDate="2026-01-02 08:10:00 +0100" value="2000"/>
          <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="iPhone"
            startDate="2026-01-02 09:00:00 +0100" endDate="2026-01-02 09:10:00 +0100" value="130"/>
        </HealthData>"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic-export.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("apple_health_export/export.xml", xml)
            rows, _, _ = IMPORTER.build(path, through="2026-01-02")

        by_day = {row["date"]: row for row in rows}
        self.assertEqual(by_day["2026-01-01"]["active"], 110.0)
        self.assertEqual(by_day["2026-01-02"]["source"], "apple_health_export_partial")
        self.assertEqual(by_day["2026-01-02"]["quality"], "no_watch")
        self.assertIsNone(by_day["2026-01-02"]["active"])
        self.assertIsNone(by_day["2026-01-02"]["resting"])
        self.assertIsNone(by_day["2026-01-02"]["total"])
        self.assertEqual(by_day["2026-01-02"]["steps"], 2000)
        self.assertEqual(by_day["2026-01-02"]["sampledAt"], "2026-01-02T09:00:00+01:00")

    def test_repeated_import_never_overwrites_existing_activity_or_body(self):
        def activity(value, source):
            return {
                "date": "2026-01-01", "sampledAt": "2026-01-01T08:00:00+01:00",
                "active": value, "resting": 1400, "total": value + 1400,
                "steps": 4000, "exercise": None, "workouts": [], "source": source,
                "note": "synthetic fixture", "details": [], "quality": "full",
            }

        original_body = {
            "type": "bodyMass", "value": 80.0, "unit": "kg",
            "date": "2026-01-01", "measuredAt": "2026-01-01T06:00:00+01:00",
            "source": "Zepp Life",
        }
        replacement_body = dict(original_body, value=90.0)
        with sqlite3.connect(":memory:") as db:
            db.executescript(IMPORTER.sql_for(
                [activity(300.0, "apple_health_export_watch")], [original_body]
            ))
            db.executescript(IMPORTER.sql_for(
                [activity(0.0, "apple_health_export_phone")], [replacement_body]
            ))
            snapshot = db.execute(
                "SELECT active_kcal, total_kcal, source, sampled_at "
                "FROM health_energy_daily WHERE energy_date = '2026-01-01'"
            ).fetchone()
            body = db.execute("SELECT metric_value FROM health_body_samples").fetchall()
        self.assertEqual(snapshot, (
            300.0, 1700.0, "apple_health_export_watch", "2026-01-01T08:00:00+01:00"
        ))
        self.assertEqual(body, [(80.0,)])


if __name__ == "__main__":
    unittest.main()
