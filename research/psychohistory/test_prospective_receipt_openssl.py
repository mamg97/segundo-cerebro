"""OpenSSL integration test using an EPHEMERAL SYNTHETIC CA/TSA.

This locally generated certificate demonstrates only the RFC3161 plumbing.
It is NOT an independent timestamp authority, usable trust anchor or
prospective forecast seal. Never include private cert keys in Git.
"""
import hashlib
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from prospective_draft_ledger import SCHEMA as DRAFT_SCHEMA, append_draft
from prospective_receipt_gate import verify_precommitment
from sealing import prepare


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


@unittest.skipUnless(shutil.which("openssl"), "OpenSSL CLI required")
class SyntheticOpenSSLReceiptTests(unittest.TestCase):
    def test_real_openssl_signature_verification_still_blocks_prospective_claim(self):
        with tempfile.TemporaryDirectory(prefix="SYNTHETIC_PSYCHO_TSA_") as t:
            base = Path(t)
            def run(*args):
                subprocess.run(["openssl", *map(str, args)], cwd=base, check=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            run("req", "-x509", "-new", "-newkey", "rsa:2048",
                "-keyout", "ca.key", "-out", "ca.crt", "-days", "1",
                "-nodes", "-subj", "/CN=SYNTHETIC TEST ROOT CA",
                "-addext", "basicConstraints=critical,CA:TRUE",
                "-addext", "keyUsage=critical,keyCertSign,cRLSign")
            run("req", "-new", "-newkey", "rsa:2048",
                "-keyout", "tsa.key", "-out", "tsa.csr",
                "-nodes", "-subj", "/CN=SYNTHETIC TEST TSA")
            (base / "tsa.ext").write_text(
                "basicConstraints=critical,CA:FALSE\n"
                "keyUsage=critical,digitalSignature,nonRepudiation\n"
                "extendedKeyUsage=critical,timeStamping\n"
                "subjectKeyIdentifier=hash\n"
                "authorityKeyIdentifier=keyid,issuer\n")
            run("x509", "-req", "-in", "tsa.csr", "-CA", "ca.crt",
                "-CAkey", "ca.key", "-CAcreateserial",
                "-out", "tsa.crt", "-days", "1", "-extfile", "tsa.ext")

            sources = {}
            for name in ("data", "code", "model", "resolution"):
                sources[name] = base / f"{name}.bin"
                sources[name].write_bytes(f"FAKE_SYNTHETIC_{name}".encode("ascii"))

            payload = {
                "id": "SYNTHETIC-FORECAST-900", "phenomenon": "SYNTHETIC NO REAL EVENT",
                "region": "SYNTHETIC COUNTRY", "horizon": "year 2029",
                "issuedAt": "2028-12-01T00:00:00Z",
                "resolutionAt": "2030-01-01T00:00:00Z",
                "asOf": "2028-11-30T00:00:00Z",
                "probability": 0.3, "baselineProbability": 0.2,
                "modelVersion": "SYNTHETIC-v1", "datasetVersion": "SYNTHETIC-1",
                "domain": "SYNTHETIC", "targetDefinition": "SYNTHETIC binary",
                "population": "SYNTHETIC population", "benchmarkId": "FAKE BENCHMARK",
                "verificationSource": "FAKE SOURCE", "verificationMethod": "FAKE METHOD",
                "sourceEditionReleaseDate": "2028-11-01",
                "codeSha256": digest(sources["code"]),
                "dataSha256": digest(sources["data"]),
                "modelProtocolSha256": digest(sources["model"]),
            }
            draft = {
                "schema": DRAFT_SCHEMA, "kind": "UNSEALED_DRAFT",
                "entryId": "SYNTHETIC-ENTRY-900", "payload": payload,
                "sourceAvailabilityVerified": False,
                "independentSealVerified": False,
                "prospectiveEligible": False, "supersedesEntrySha256": None,
                "resolutionProtocolSha256": digest(sources["resolution"]),
            }
            entry = append_draft(base / "ledger", draft)
            bundle = base / "sealed"
            prepare(payload, bundle)
            (base / "tsa.cnf").write_text(
                "[tsa]\ndefault_tsa = tsa_test\n[tsa_test]\n"
                f"serial = {base / 'serial'}\n"
                f"signer_cert = {base / 'tsa.crt'}\n"
                f"certs = {base / 'tsa.crt'}\n"
                f"signer_key = {base / 'tsa.key'}\n"
                "signer_digest = sha256\n"
                "default_policy = 1.2.3.4.1\n"
                "digests = sha256\naccuracy = secs:1\nordering = yes\n"
                "tsa_name = yes\ness_cert_id_chain = no\n"
            )
            (base / "serial").write_text("01\n")
            response = base / "receipt.tsr"
            run("ts", "-reply", "-config", "tsa.cnf", "-queryfile",
                bundle / "request.tsq", "-out", response)

            args = dict(ledger_dir=base / "ledger", entry_sha256=entry["sha256"],
                        prepared_dir=bundle, receipt=response, trust_root=base / "ca.crt",
                        chain=base / "tsa.crt", data_archive=sources["data"],
                        code_archive=sources["code"], model_protocol=sources["model"],
                        resolution_protocol=sources["resolution"])
            report = verify_precommitment(**args)
            self.assertTrue(report["rfc3161SignatureVerifiedWithSuppliedTrustRoot"])
            self.assertFalse(report["externalAuthorityIndependenceVerified"])
            self.assertFalse(report["sourceAvailabilityAsOfVerified"])
            self.assertFalse(report["forecastActuallyIssuedAtClaimedTimeVerified"])
            self.assertFalse(report["prospectiveEligible"])
            self.assertFalse(report["evaluationEligible"])
            self.assertEqual(report["entrySha256"], entry["sha256"])

            # Altering the binary response must fail actual OpenSSL verification.
            response.write_bytes(response.read_bytes()[:30] + b"CORRUPT")
            with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                verify_precommitment(**args)


if __name__ == "__main__":
    unittest.main()
