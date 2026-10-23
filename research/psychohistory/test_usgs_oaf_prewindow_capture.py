import json
from pathlib import Path
import tempfile
import unittest

from usgs_oaf_prewindow_capture import capture


def fixture(start=10_000, url_override=None, technical_override=None, technical_url_override=None):
    url = "https://earthquake.usgs.gov/product/oaf/us6000test/us/500/forecast.json"
    technical_url = url.replace("forecast.json", "forecast_data.json")
    detail = {"id": "us6000test", "properties": {"products": {"oaf": [{
        "status": "UPDATE", "source": "us", "code": "us6000test", "updateTime": 500,
        "contents": {"forecast.json": {"url": url_override or url},
                     "forecast_data.json": {"url": technical_url_override or technical_url}},
    }]}}}
    forecast = {"forecast": [{"label": "1 Day", "timeStart": start,
                              "timeEnd": start + 86_400_000}]}
    technical = {"pdl_event_id": "us6000test", "results": {
        "generic_pdl": False, "bayesian_pdl": True, "bayesian_json": forecast}}
    if technical_override is not None:
        technical = technical_override
    def fetch(requested):
        value = forecast if requested == url else technical if requested == technical_url else detail
        return json.dumps(value).encode(), {"Date": "test"}
    return fetch


class CaptureTests(unittest.TestCase):
    def test_create_only_prewindow_archive_with_integrity(self):
        with tempfile.TemporaryDirectory() as tmp:
            times = iter((1000, 2000, 2500, 3000))
            result = capture("us6000test", Path(tmp), fetch=fixture(), clock=lambda: next(times))
            self.assertEqual(result["status"], "CAPTURED_PREWINDOW")
            folder = Path(result["folder"])
            manifest = json.loads((folder / "MANIFEST.json").read_text())
            self.assertTrue(manifest["capture_before_window"])
            self.assertFalse(manifest["forecast_issued_by_psicohistoria"])
            self.assertTrue(manifest["technical_forecast_pair_verified"])
            self.assertEqual(manifest["selected_published_model"], "bayesian")
            self.assertEqual(len(manifest["files"]), 3)
            for item in manifest["files"]:
                import hashlib
                self.assertEqual(hashlib.sha256((folder / item["file"]).read_bytes()).hexdigest(), item["sha256"])
            with self.assertRaises(FileExistsError):
                capture("us6000test", Path(tmp), fetch=fixture(), clock=lambda: 2000)

    def test_reject_started_window_without_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            times = iter((1000, 2000))
            result = capture("us6000test", Path(tmp), fetch=fixture(start=1500), clock=lambda: next(times))
            self.assertEqual(result["status"], "REJECTED_WINDOW_STARTED")
            self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_reject_late_persistence_even_after_early_fetch(self):
        with tempfile.TemporaryDirectory() as tmp:
            times = iter((1000, 2000, 2200, 3000))
            result = capture("us6000test", Path(tmp), fetch=fixture(start=2500), clock=lambda: next(times))
            self.assertEqual(result["status"], "REJECTED_PERSISTED_LATE")
            self.assertFalse(json.loads((Path(result["folder"]) / "MANIFEST.json").read_text())["capture_before_window"])

    def test_reject_untrusted_url(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                capture("us6000test", Path(tmp), fetch=fixture(url_override="https://example.org/private"), clock=lambda: 1000)
            self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_reject_mismatched_or_ambiguous_technical_product(self):
        cases = [
            {"pdl_event_id": "other", "results": {}},
            {"pdl_event_id": "us6000test", "results": {"bayesian_pdl": True, "bayesian_json": {}}},
            {"pdl_event_id": "us6000test", "results": {"generic_pdl": True, "bayesian_pdl": True}},
            {"pdl_event_id": "us6000test", "results": {"etas_pdl": True}},
        ]
        for technical in cases:
            with self.subTest(technical=technical), tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(ValueError):
                    capture("us6000test", Path(tmp), fetch=fixture(technical_override=technical), clock=lambda: 1000)
                self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_reject_untrusted_technical_url(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                capture("us6000test", Path(tmp), fetch=fixture(technical_url_override="https://example.org/data"), clock=lambda: 1000)
            self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_reject_late_technical_download_without_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            times = iter((1000, 2000, 10_000))
            result = capture("us6000test", Path(tmp), fetch=fixture(), clock=lambda: next(times))
            self.assertEqual(result["status"], "REJECTED_TECHNICAL_RECEIVED_LATE")
            self.assertEqual(list(Path(tmp).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
