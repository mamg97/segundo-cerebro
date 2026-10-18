"""Synthetic private-package integrity tests. No real UCDP records or scores."""
import csv
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import warnings
import zipfile

from private_archive_intake import verify_private_archive
from test_source_release_intake import fixture_rows


def digest(data):
    return hashlib.sha256(data).hexdigest()


class PrivateArchiveIntakeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "private-synthetic-repro.zip"
        rows = fixture_rows()
        memory = io.StringIO()
        writer = csv.DictWriter(memory, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
        zipped = io.BytesIO()
        with zipfile.ZipFile(zipped, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("SYNTHETIC.csv", memory.getvalue())
        self.source = zipped.getvalue()
        self.codebook = b"%PDF-1.4 fictional codebook only"
        self.protocol = {
            "dataset_version": "26.1",
            "archive_url": "https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip",
            "codebook_url": "https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_261.pdf",
            "archive_sha256": digest(self.source),
            "codebook_sha256": digest(self.codebook),
            "raw_years": [1989, 2025],
            "expected_raw_rows": 37,
            "expected_countries": 1,
        }
        self.payload = {
            "sources/ucdp.zip": self.source,
            "sources/codebook.pdf": self.codebook,
            "code/protocol.json": json.dumps(self.protocol).encode(),
            "sources/sources.json": json.dumps({
                "datasetVersion": "26.1",
                "inputs": [
                    {"name": "ucdp.zip", "url": self.protocol["archive_url"],
                     "sha256": digest(self.source), "bytes": len(self.source)},
                    {"name": "codebook.pdf", "url": self.protocol["codebook_url"],
                     "sha256": digest(self.codebook), "bytes": len(self.codebook)},
                ],
            }).encode(),
            "run/predictions.json": b'{"SYNTHETIC": "not an actual forecast"}',
        }
        self.generate()

    def generate(self, manifest=None):
        manifest = manifest if manifest is not None else {
            name: digest(data) for name, data in self.payload.items()
        }
        with zipfile.ZipFile(self.path, "w", zipfile.ZIP_DEFLATED) as z:
            for name, data in self.payload.items():
                z.writestr(name, data)
            z.writestr("MANIFEST.json", json.dumps(manifest))

    def test_exact_private_archive_and_original_source_checks_pass(self):
        report = verify_private_archive(self.path, self.protocol)
        self.assertEqual((report["sourceRows"], report["sourceCountries"]), (37, 1))
        self.assertEqual(report["sourceYearRange"], [1989, 2025])
        self.assertEqual(report["manifestEntriesVerified"], 5)
        self.assertTrue(report["sourceChecksumMatchesPinnedProtocol"])
        self.assertFalse(report["sourcePublicationAsOfVerified"])
        self.assertFalse(report["prospectiveForecastIssued"])
        self.assertFalse(report["prospectiveEligible"])
        self.assertNotIn("SYNTHETIC", str(report))

    def test_tampered_private_prediction_member_is_detected_without_disclosure(self):
        self.payload["run/predictions.json"] = b'{"SYNTHETIC": "secret changed"}'
        self.generate(manifest={
            **{name: digest(data) for name, data in self.payload.items()},
            "run/predictions.json": digest(b'{"SYNTHETIC": "not an actual forecast"}'),
        })
        with self.assertRaisesRegex(ValueError, "internal content hash"):
            verify_private_archive(self.path, self.protocol)

    def test_original_source_change_rejected_even_with_rewritten_manifest(self):
        self.payload["sources/ucdp.zip"] = b"changed source"
        self.generate()
        with self.assertRaisesRegex(ValueError, "pinned bytes"):
            verify_private_archive(self.path, self.protocol)

    def test_protocol_substitution_rejected_even_with_rewritten_manifest(self):
        bad = dict(self.protocol, threshold_deaths=99)
        self.payload["code/protocol.json"] = json.dumps(bad).encode()
        self.generate()
        with self.assertRaisesRegex(ValueError, "not the currently pinned protocol"):
            verify_private_archive(self.path, self.protocol)

    def test_incomplete_manifest_rejected(self):
        self.generate(manifest={"sources/ucdp.zip": digest(self.source)})
        with self.assertRaisesRegex(ValueError, "does not cover exact"):
            verify_private_archive(self.path, self.protocol)

    def test_zip_slip_and_duplicate_member_rejected(self):
        self.payload["../OUTSIDE"] = b"wrong"
        self.generate()
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            verify_private_archive(self.path, self.protocol)
        del self.payload["../OUTSIDE"]
        self.generate()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.path, "a") as z:
                z.writestr("sources/ucdp.zip", self.source)
        with self.assertRaisesRegex(ValueError, "duplicate"):
            verify_private_archive(self.path, self.protocol)


if __name__ == "__main__":
    unittest.main()
