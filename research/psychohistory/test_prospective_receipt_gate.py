"""Synthetic unit tests for the receipt-to-draft binding and fail-closed gates.

The mocked TSA helper in these tests is NOT evidence of a real signed receipt.
Production executes sealing.verify, which calls OpenSSL.
"""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from prospective_draft_ledger import SCHEMA as DRAFT_SCHEMA, append_draft
from prospective_receipt_gate import verify_precommitment
from sealing import commitment


def sha(x):
    return hashlib.sha256(x).hexdigest()


class ReceiptGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.ledger = root / "private-ledger"
        self.prepared = root / "sealed"
        self.prepared.mkdir()
        self.artifacts = {}
        for key in ("data", "code", "model", "resolution"):
            path = root / (key + ".bin")
            path.write_bytes(("SYNTHETIC_" + key).encode())
            self.artifacts[key] = path
        self.draft = {
            "schema": DRAFT_SCHEMA, "kind": "UNSEALED_DRAFT",
            "entryId": "SYNTHETIC-SEALED-ENTRY-001",
            "sourceAvailabilityVerified": False, "independentSealVerified": False,
            "prospectiveEligible": False, "supersedesEntrySha256": None,
            "resolutionProtocolSha256": sha(self.artifacts["resolution"].read_bytes()),
            "payload": {
                "id": "SYNTHETIC-FORECAST-001",
                "phenomenon": "SYNTHETIC target", "region": "SYNTHETIC REGION",
                "horizon": "2029", "issuedAt": "2028-12-01T12:00:00Z",
                "resolutionAt": "2030-07-01T00:00:00Z",
                "asOf": "2028-11-30T00:00:00Z", "probability": 0.25,
                "baselineProbability": 0.20, "modelVersion": "SYNTHETIC MODEL",
                "datasetVersion": "SYNTHETIC DATA",
                "domain": "SYNTHETIC GEOPOLITICS",
                "targetDefinition": "SYNTHETIC EVENT >= 25",
                "population": "SYNTHETIC COUNTRIES",
                "benchmarkId": "SYNTHETIC BENCHMARK",
                "verificationSource": "SYNTHETIC SOURCE",
                "verificationMethod": "SYNTHETIC RESOLUTION RULE",
                "sourceEditionReleaseDate": "2028-11-28",
                "dataSha256": sha(self.artifacts["data"].read_bytes()),
                "codeSha256": sha(self.artifacts["code"].read_bytes()),
                "modelProtocolSha256": sha(self.artifacts["model"].read_bytes()),
            },
        }
        self.entry = append_draft(self.ledger, self.draft)
        self.nonce = "bc" * 32
        self.commit = commitment(self.draft["payload"], self.nonce)
        (self.prepared / "payload.json").write_text(json.dumps(self.draft["payload"]))
        (self.prepared / "nonce.txt").write_text(self.nonce)
        (self.prepared / "commitment.bin").write_bytes(self.commit)
        for name in ("receipt", "root", "chain"):
            (root / (name + ".pem")).write_text("SYNTHETIC_NOT_A_CERTIFICATE")
        self.paths = {name: root / (name + ".pem") for name in ("receipt", "root", "chain")}

    def tearDown(self):
        self.tmp.cleanup()

    def kwargs(self):
        return {
            "ledger_dir": self.ledger, "entry_sha256": self.entry["sha256"],
            "prepared_dir": self.prepared, "receipt": self.paths["receipt"],
            "trust_root": self.paths["root"], "chain": self.paths["chain"],
            "data_archive": self.artifacts["data"],
            "code_archive": self.artifacts["code"],
            "model_protocol": self.artifacts["model"],
            "resolution_protocol": self.artifacts["resolution"],
        }

    def mock_verified(self, timestamp="2028-11-30T15:00:00Z"):
        return {
            "verified": True, "payloadMatched": True, "independentTimestamp": False,
            "rfc3161SignatureVerifiedWithSuppliedTrustRoot": True,
            "rfc3161RequestNonceMatched": True,
            "timestamp": timestamp, "id": self.draft["payload"]["id"],
            "commitmentSha256": self.commit.hex(),
            "receiptSha256": sha(self.paths["receipt"].read_bytes()),
            "trustRootSha256": sha(self.paths["root"].read_bytes()),
        }

    def test_verified_cryptographic_shape_is_not_issued_or_asof_verified(self):
        # Synthetic mock verifies plumbing ONLY, not a real RFC3161 token.
        with patch("prospective_receipt_gate.verify_rfc3161", return_value=self.mock_verified()) as verifier:
            report = verify_precommitment(**self.kwargs())
            verifier.assert_called_once()
        self.assertEqual(report["status"], "RFC3161_SIGNATURE_VALIDATED_PENDING_INDEPENDENT_ASOF_AND_ISSUANCE")
        self.assertTrue(report["artifactHashesVerified"])
        self.assertTrue(report["rfc3161SignatureVerifiedWithSuppliedTrustRoot"])
        self.assertTrue(report["rfc3161RequestNonceMatched"])
        for key in ("prospectiveEligible", "evaluationEligible", "sourceAvailabilityAsOfVerified",
                    "externalAuthorityIndependenceVerified", "forecastActuallyIssuedAtClaimedTimeVerified"):
            self.assertFalse(report[key], key)
        self.assertEqual(report["entrySha256"], self.entry["sha256"])

    def test_any_changed_artifact_blocks_before_receipt_verification(self):
        for key in ("data", "code", "model", "resolution"):
            original = self.artifacts[key].read_bytes()
            self.artifacts[key].write_bytes(b"UNAPPROVED_CHANGE")
            with self.subTest(field=key):
                with patch("prospective_receipt_gate.verify_rfc3161") as verifier:
                    with self.assertRaises(ValueError):
                        verify_precommitment(**self.kwargs())
                    verifier.assert_not_called()
            self.artifacts[key].write_bytes(original)

    def test_changed_payload_or_nonce_never_reaches_tsa(self):
        source = (self.prepared / "payload.json").read_text()
        (self.prepared / "payload.json").write_text(source.replace("0.25", "0.65"))
        with patch("prospective_receipt_gate.verify_rfc3161") as verifier:
            with self.assertRaises(ValueError):
                verify_precommitment(**self.kwargs())
            verifier.assert_not_called()
        (self.prepared / "payload.json").write_text(source)
        (self.prepared / "nonce.txt").write_text("ff" * 32)
        with patch("prospective_receipt_gate.verify_rfc3161") as verifier:
            with self.assertRaises(ValueError):
                verify_precommitment(**self.kwargs())
            verifier.assert_not_called()

    def test_ledger_tampering_or_wrong_entry_never_reaches_tsa(self):
        with self.assertRaises(ValueError):
            verify_precommitment(**{**self.kwargs(), "entry_sha256": "f" * 64})
        entry_file = next((self.ledger / "entries").glob("*.json"))
        entry_file.write_text(entry_file.read_text().replace("0.25", "0.75"))
        with patch("prospective_receipt_gate.verify_rfc3161") as verifier:
            with self.assertRaises(ValueError):
                verify_precommitment(**self.kwargs())
            verifier.assert_not_called()

    def test_bad_tsa_claim_or_late_stamp_fails(self):
        invalid = self.mock_verified()
        invalid["receiptSha256"] = "a" * 64
        for fake in (invalid, self.mock_verified("2029-01-01T00:00:00Z"),
                     {**self.mock_verified(), "verified": False},
                     {**self.mock_verified(), "rfc3161RequestNonceMatched": False},
                     {**self.mock_verified(), "independentTimestamp": True}):
            with self.subTest(fake=fake):
                with patch("prospective_receipt_gate.verify_rfc3161", return_value=fake):
                    with self.assertRaises(ValueError):
                        verify_precommitment(**self.kwargs())

    def test_same_day_or_future_release_rejected_without_independent_evidence(self):
        # This test operates on NEW synthetic ledgers, as historical entries cannot mutate.
        for when in ("2028-11-30", "2028-12-01"):
            with self.subTest(release=when):
                root = Path(self.tmp.name) / ("revision-" + when)
                changed = json.loads(json.dumps(self.draft))
                changed["payload"]["sourceEditionReleaseDate"] = when
                entry = append_draft(root, changed)
                args = {**self.kwargs(), "ledger_dir": root, "entry_sha256": entry["sha256"]}
                (self.prepared / "payload.json").write_text(json.dumps(changed["payload"]))
                (self.prepared / "commitment.bin").write_bytes(commitment(changed["payload"], self.nonce))
                with patch("prospective_receipt_gate.verify_rfc3161") as verifier:
                    with self.assertRaisesRegex(ValueError, "strictly before as-of"):
                        verify_precommitment(**args)
                    verifier.assert_not_called()
                (self.prepared / "payload.json").write_text(json.dumps(self.draft["payload"]))
                (self.prepared / "commitment.bin").write_bytes(self.commit)

    def test_cryptographic_verifier_is_not_optional(self):
        with patch("prospective_receipt_gate.verify_rfc3161", side_effect=ValueError("TSA invalid")):
            with self.assertRaisesRegex(ValueError, "TSA invalid"):
                verify_precommitment(**self.kwargs())


if __name__ == "__main__":
    unittest.main()
