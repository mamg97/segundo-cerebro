"""Synthetic RFC3161 request tests, no TSA or private forecast data."""
import hashlib
import json
import shutil
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

    def test_malformed_manifest_or_pretended_seal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=fake_candidate(root)
            manifest=json.loads((source/"manifest.json").read_text())
            manifest["prospective_eligible"]=True
            (source/"manifest.json").write_bytes(canonical(manifest))
            with self.assertRaises(ValueError): load_candidate(source)


if __name__ == "__main__":
    unittest.main()
