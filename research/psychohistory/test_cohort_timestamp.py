"""Synthetic RFC3161 request tests, no TSA or private forecast data."""
import hashlib
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from cohort_timestamp import load_candidate, opaque_commitment, prepare_request, verify_receipt
from benchmark import canonical


def fake_candidate(directory):
    folder = directory / "private-cohort"
    folder.mkdir()
    report = {"schema":"psychohistory.prospective_rehearsal.v1",
      "status":"UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE",
      "target_year":2099, "outcomes_included":False,
      "eligible_for_prospective_scoring":False,
      "external_timestamp_receipt_verified":False,
      "source":{"archive_sha256":"a"*64,"as_of_availability_independently_verified":False},
      "model_protocol_sha256":"b"*64,
      "predictions":[{"country":"SYNTHETIC","p":[0.1,0.2,0.3,0.4]}]}
    raw=canonical(report)+b"\n"
    (folder/"forecast-candidate.json").write_bytes(raw)
    manifest={"candidate_sha256":hashlib.sha256(raw).hexdigest(),
      "model_protocol_sha256":"b"*64,"source_sha256":"a"*64,
      "target_year":2099,"prospective_eligible":False,
      "vintage_verified":False,"independent_timestamp_receipt":None}
    (folder/"manifest.json").write_bytes(canonical(manifest)+b"\n")
    return folder


class TimestampTests(unittest.TestCase):
    def test_domain_separated_salted_commitment(self):
        self.assertEqual(opaque_commitment(b"data", b"\x01"*32),
                         opaque_commitment(b"data", b"\x01"*32))
        self.assertNotEqual(opaque_commitment(b"data", b"\x01"*32),
                            opaque_commitment(b"data", b"\x02"*32))
        self.assertNotEqual(opaque_commitment(b"data", b"\x01"*32),
                            opaque_commitment(b"other", b"\x01"*32))
        with self.assertRaises(ValueError): opaque_commitment(b"data", b"\x01"*16)

    @unittest.skipUnless(shutil.which("openssl"), "OpenSSL unavailable")
    def test_prepare_rfc3161_query_is_not_receipt_or_scoring_permit(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); source=fake_candidate(root); seal=root/"seal"
            result=prepare_request(source,seal)
            self.assertEqual(result["status"],"REQUEST_ONLY_NO_TSA_RECEIPT")
            self.assertTrue((seal/"request.tsq").is_file())
            self.assertEqual(len((seal/"nonce.bin").read_bytes()),32)
            self.assertEqual(len((seal/"commitment.bin").read_bytes()),32)
            with self.assertRaises(FileExistsError): prepare_request(source,seal)
            # Any retroactive alteration of the cohort or manifest is rejected
            raw=(source/"forecast-candidate.json").read_bytes()
            (source/"forecast-candidate.json").write_bytes(raw+b" ")
            with self.assertRaises(ValueError): load_candidate(source)
            with self.assertRaises(ValueError):
                verify_receipt(source,seal,root/"fake.tsr",root/"fake.ca",root/"fake.chain","a"*64)


    @unittest.skipUnless(shutil.which("openssl"), "OpenSSL required")
    def test_real_signed_receipt_rejects_replayed_nonce_for_same_content(self):
        # Fictional target 2099 and locally generated synthetic CA only.
        with tempfile.TemporaryDirectory(prefix="SYNTHETIC_LEGACY_TSA_") as t:
            root = Path(t)
            cohort = fake_candidate(root)
            seal = root / "seal"
            prepare_request(cohort, seal)

            def run(*args):
                subprocess.run(["openssl", *map(str, args)], cwd=root, check=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            run("req", "-x509", "-new", "-newkey", "rsa:2048",
                "-keyout", "ca.key", "-out", "ca.crt", "-days", "1",
                "-nodes", "-subj", "/CN=SYNTHETIC OLD COHORT CA",
                "-addext", "basicConstraints=critical,CA:TRUE",
                "-addext", "keyUsage=critical,keyCertSign,cRLSign")
            run("req", "-new", "-newkey", "rsa:2048",
                "-keyout", "tsa.key", "-out", "tsa.csr",
                "-nodes", "-subj", "/CN=SYNTHETIC OLD COHORT TSA")
            (root / "tsa.ext").write_text(
                "basicConstraints=critical,CA:FALSE\n"
                "keyUsage=critical,digitalSignature,nonRepudiation\n"
                "extendedKeyUsage=critical,timeStamping\n"
                "subjectKeyIdentifier=hash\n"
                "authorityKeyIdentifier=keyid,issuer\n")
            run("x509", "-req", "-in", "tsa.csr", "-CA", "ca.crt",
                "-CAkey", "ca.key", "-CAcreateserial",
                "-out", "tsa.crt", "-days", "1", "-extfile", "tsa.ext")
            (root / "tsa.cnf").write_text(
                "[tsa]\ndefault_tsa = tsa_test\n[tsa_test]\n"
                f"serial = {root / 'serial'}\n"
                f"signer_cert = {root / 'tsa.crt'}\n"
                f"certs = {root / 'tsa.crt'}\n"
                f"signer_key = {root / 'tsa.key'}\n"
                "signer_digest = sha256\n"
                "default_policy = 1.2.3.4.1\n"
                "digests = sha256\naccuracy = secs:1\nordering = yes\n"
                "tsa_name = yes\ness_cert_id_chain = no\n")
            (root / "serial").write_text("01\n")
            receipt = root / "receipt.tsr"
            run("ts", "-reply", "-config", "tsa.cnf",
                "-queryfile", seal / "request.tsq", "-out", receipt)

            kwargs = dict(cohort_dir=cohort, seal_dir=seal, receipt=receipt,
                          trust_root=root / "ca.crt", chain=root / "tsa.crt",
                          pinned_root_sha256=hashlib.sha256(
                              (root / "ca.crt").read_bytes()).hexdigest())
            proof = verify_receipt(**kwargs)
            self.assertTrue(proof["original_rfc3161_request_nonce_matched"])
            self.assertFalse(proof["tsa_independence_verified"])
            self.assertFalse(proof["prospective_scoring_authorized"])

            old_request = (seal / "request.tsq").read_bytes()
            run("ts", "-query", "-data", seal / "commitment.bin",
                "-sha256", "-cert", "-out", root / "different-nonce.tsq")
            changed = (root / "different-nonce.tsq").read_bytes()
            self.assertNotEqual(old_request, changed)
            (seal / "request.tsq").write_bytes(changed)
            with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                verify_receipt(**kwargs)
            (seal / "request.tsq").unlink()
            with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                verify_receipt(**kwargs)

    def test_malformed_manifest_or_pretended_seal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=fake_candidate(root)
            manifest=json.loads((source/"manifest.json").read_text())
            manifest["prospective_eligible"]=True
            (source/"manifest.json").write_bytes(canonical(manifest))
            with self.assertRaises(ValueError): load_candidate(source)


if __name__ == "__main__":
    unittest.main()
