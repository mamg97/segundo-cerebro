"""Synthetic end-to-end cohort precommitment tests, no real forecasts."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from cohort_2027_precommit import prepare, verify_bundle
from test_issue_2027_preflight import imaginary_report


@unittest.skipUnless(shutil.which("openssl"), "OpenSSL required")
class CohortPrecommitTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="SYNTHETIC_2027_COHORT_")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.candidate = self.root / "fictional.json"
        self.candidate.write_text(json.dumps(imaginary_report(canonical=True),
                                            sort_keys=True), encoding="utf-8")
        self.bundle = self.root / "bundle"

    def test_one_whole_cohort_commitment_has_no_issuance_claim(self):
        report = prepare(self.candidate, self.bundle)
        self.assertEqual(report["status"], "READY_FOR_EXTERNAL_TSA_NOT_SENT_NOT_ISSUED")
        result = verify_bundle(self.candidate, self.bundle)
        self.assertEqual((result["countryCount"], result["modelCount"]), (196, 6))
        self.assertTrue(result["candidateAndCodeHashesMatched"])
        self.assertFalse(result["externalTimestampReceiptVerified"])
        self.assertFalse(result["forecastIssued"])
        self.assertFalse(result["prospectiveEligible"])
        manifest = json.loads((self.bundle / "manifest.json").read_text())
        self.assertEqual(manifest["countries"], 196)
        self.assertEqual(len(manifest["models"]), 6)
        self.assertNotIn("candidates", manifest)
        self.assertNotIn("probabilities", manifest)
        self.assertEqual(len((self.bundle / "salt.txt").read_text().strip()), 64)
        self.assertNotIn("receipt.tsr", [p.name for p in self.bundle.iterdir()])

    def test_same_report_must_have_different_salted_commitments(self):
        prepare(self.candidate, self.bundle)
        other = self.root / "other"
        prepare(self.candidate, other)
        self.assertNotEqual((self.bundle / "commitment.bin").read_bytes(),
                            (other / "commitment.bin").read_bytes())
        self.assertNotEqual((self.bundle / "request.tsq").read_bytes(),
                            (other / "request.tsq").read_bytes())

    def test_changed_candidate_or_model_probabilities_fail_closed(self):
        prepare(self.candidate, self.bundle)
        source = json.loads(self.candidate.read_text())
        source["candidates"][0]["probabilities"]["frequency"] = .999
        self.candidate.write_text(json.dumps(source, sort_keys=True))
        with self.assertRaisesRegex(ValueError, "Frozen manifest differs"):
            verify_bundle(self.candidate, self.bundle)

    def test_altered_salt_or_commitment_fails_closed(self):
        prepare(self.candidate, self.bundle)
        (self.bundle / "salt.txt").write_text("aa" * 32)
        with self.assertRaisesRegex(ValueError, "Salted cohort commitment"):
            verify_bundle(self.candidate, self.bundle)

    def test_changed_query_even_with_rewritten_audit_sha_fails_on_imprint(self):
        prepare(self.candidate, self.bundle)
        (self.bundle / "request.tsq").unlink()
        fake = self.root / "different.bin"
        fake.write_bytes(b"SYNTHETIC_WRONG_IMPRINT")
        subprocess.run(["openssl", "ts", "-query", "-data", str(fake),
                        "-sha256", "-cert", "-out", str(self.bundle / "request.tsq")],
                       check=True, capture_output=True)
        evidence_file = self.bundle / "audit.json"
        evidence = json.loads(evidence_file.read_text())
        evidence["requestSha256"] = hashlib.sha256(
            (self.bundle / "request.tsq").read_bytes()).hexdigest()
        evidence_file.write_text(json.dumps(evidence, sort_keys=True) + "\n")
        with self.assertRaisesRegex(ValueError, "query imprint does not bind"):
            verify_bundle(self.candidate, self.bundle)

    def test_draft_cannot_be_created_from_legacy_wrapper_or_under_git(self):
        wrong = imaginary_report(canonical=False)
        self.candidate.write_text(json.dumps(wrong, sort_keys=True))
        with self.assertRaisesRegex(ValueError, "Only the byte-matched canonical"):
            prepare(self.candidate, self.bundle)
        self.assertFalse(self.bundle.exists())


if __name__ == "__main__":
    unittest.main()
