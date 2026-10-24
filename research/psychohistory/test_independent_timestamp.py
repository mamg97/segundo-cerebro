"""Ephemeral SYNTHETIC authorities only; no real forecast or trusted root keys.

The production pin is patched in memory ONLY in these tests. CLI offers no such
override. Integration assertions execute real OpenSSL verification, including
CRL rejection for the actual token signer.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import independent_timestamp as gate
from prospective_draft_ledger import SCHEMA, append_draft
from sealing import prepare


@unittest.skipUnless(shutil.which("openssl"), "OpenSSL CLI required")
class IndependentTimestampTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="SYNTHETIC_INDEPENDENT_TSA_")
        cls.base = Path(cls.temp.name)
        cls.openssl("req", "-x509", "-new", "-newkey", "rsa:2048", "-nodes",
                "-keyout", "ca.key", "-out", "ca.pem", "-days", "2",
                "-subj", "/CN=SYNTHETIC ROOT",
                "-addext", "basicConstraints=critical,CA:TRUE",
                "-addext", "keyUsage=critical,keyCertSign,cRLSign")
        cls.openssl("req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", "tsa.key",
                "-out", "tsa.csr", "-subj", "/CN=SYNTHETIC TSA")
        for name, value in (("index", ""), ("serial", "01\n"), ("crlnumber", "01\n")):
            (cls.base / name).write_text(value)
        (cls.base / "ca.cnf").write_text(
            "[ca]\ndefault_ca = test\n[test]\ndatabase = index\nnew_certs_dir = .\n"
            "certificate = ca.pem\nprivate_key = ca.key\nserial = serial\n"
            "crlnumber = crlnumber\ndefault_md = sha256\ndefault_days = 2\n"
            "default_crl_days = 1\npolicy = names\nx509_extensions = tsa\n"
            "[names]\ncommonName = supplied\n[tsa]\nbasicConstraints = critical,CA:FALSE\n"
            "keyUsage = critical,digitalSignature,nonRepudiation\n"
            "extendedKeyUsage = critical,timeStamping\nsubjectKeyIdentifier = hash\n"
            "authorityKeyIdentifier = keyid,issuer\n")
        cls.openssl("ca", "-batch", "-config", "ca.cnf", "-in", "tsa.csr", "-out", "tsa-full.pem")
        cls.openssl("x509", "-in", "tsa-full.pem", "-out", "tsa.pem")
        cls.openssl("ca", "-config", "ca.cnf", "-gencrl", "-out", "good.crl.pem")
        cls.openssl("ca", "-config", "ca.cnf", "-revoke", "tsa.pem")
        cls.openssl("ca", "-config", "ca.cnf", "-gencrl", "-out", "revoked.crl.pem")
        (cls.base / "catalog").write_bytes(b"SYNTHETIC INDEPENDENT CATALOG FIXTURE")
        cls.root_hash = hashlib.sha256(cls.openssl("x509", "-in", "ca.pem", "-outform", "DER")).hexdigest()
        cls.catalog_hash = gate.sha((cls.base / "catalog").read_bytes())
        now = dt.datetime.now(dt.timezone.utc)
        sources = {}
        for name in ("data", "code", "model", "resolution"):
            sources[name] = cls.base / name
            sources[name].write_bytes(("SYNTHETIC " + name).encode())
        payload = dict(id="SYNTHETIC-ONLY", phenomenon="SYNTHETIC", region="SYNTHETIC",
                       horizon="SYNTHETIC", issuedAt=(now + dt.timedelta(days=1)).isoformat(),
                       resolutionAt=(now + dt.timedelta(days=3)).isoformat(),
                       asOf=(now - dt.timedelta(days=1)).isoformat(), probability=.3,
                       baselineProbability=.2, modelVersion="SYNTHETIC", datasetVersion="SYNTHETIC",
                       domain="SYNTHETIC", targetDefinition="SYNTHETIC", population="SYNTHETIC",
                       benchmarkId="SYNTHETIC", verificationSource="SYNTHETIC", verificationMethod="SYNTHETIC",
                       sourceEditionReleaseDate=(now - dt.timedelta(days=2)).date().isoformat(),
                       **{field: gate.sha(sources[name].read_bytes()) for field, name in
                          (("dataSha256", "data"), ("codeSha256", "code"), ("modelProtocolSha256", "model"))})
        entry = append_draft(cls.base / "ledger", dict(
            schema=SCHEMA, kind="UNSEALED_DRAFT", entryId="SYNTHETIC-ENTRY", payload=payload,
            sourceAvailabilityVerified=False, independentSealVerified=False, prospectiveEligible=False,
            supersedesEntrySha256=None, resolutionProtocolSha256=gate.sha(sources["resolution"].read_bytes())))
        prepare(payload, cls.base / "bundle")
        (cls.base / "tsa.cnf").write_text(
            "[tsa]\ndefault_tsa = test\n[test]\nserial = tsa.serial\nsigner_cert = tsa.pem\n"
            "certs = tsa.pem\nsigner_key = tsa.key\nsigner_digest = sha256\n"
            "default_policy = 1.2.3.4.1\ndigests = sha256\naccuracy = secs:1\n"
            "ordering = yes\ntsa_name = yes\ness_cert_id_chain = no\n")
        (cls.base / "tsa.serial").write_text("01\n")
        cls.openssl("ts", "-reply", "-config", "tsa.cnf", "-queryfile", "bundle/request.tsq", "-out", "receipt")
        cls.args = dict(content=cls.base / "bundle/commitment.bin", request=cls.base / "bundle/request.tsq",
                        receipt=cls.base / "receipt", trust_root=cls.base / "ca.pem", chain=cls.base / "tsa.pem",
                        crls=[cls.base / "good.crl.pem"], independent_catalog=cls.base / "catalog")
        cls.draft_args = dict(ledger_dir=cls.base / "ledger", entry_sha256=entry["sha256"],
                              prepared_dir=cls.base / "bundle", receipt=cls.args["receipt"],
                              trust_root=cls.args["trust_root"], chain=cls.args["chain"],
                              data_archive=sources["data"], code_archive=sources["code"],
                              model_protocol=sources["model"], resolution_protocol=sources["resolution"],
                              crls=cls.args["crls"], independent_catalog=cls.args["independent_catalog"])

    @classmethod
    def openssl(cls, *args):
        return subprocess.run(["openssl", *map(str, args)], cwd=cls.base, check=True,
                              capture_output=True, timeout=30).stdout

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        pins = patch.multiple(gate, ROOT_DER_SHA256=self.root_hash,
                              CATALOG_SHA256=self.catalog_hash, POLICY_OID="1.2.3.4.1")
        pins.start()
        self.addCleanup(pins.stop)

    def test_exact_ledger_commitment_passes_but_not_issuance(self):
        report = gate.verify_independent_precommitment(**self.draft_args)
        self.assertTrue(report["externalAuthorityIndependenceVerified"])
        self.assertTrue(report["independentTimestamp"]["actualCmsSignerPurposeAndCurrentCrlVerified"])
        for name in ("sourceAvailabilityAsOfVerified", "forecastActuallyIssuedAtClaimedTimeVerified",
                     "prospectiveEligible", "evaluationEligible"):
            self.assertFalse(report[name])

    def test_pins_and_policy_fail_closed(self):
        for constant in ("ROOT_DER_SHA256", "CATALOG_SHA256", "POLICY_OID"):
            with self.subTest(constant=constant), patch.object(gate, constant, "WRONG"):
                with self.assertRaises(ValueError):
                    gate.verify_detached(**self.args)

    def test_actual_token_signer_revocation_rejected(self):
        with self.assertRaises(subprocess.CalledProcessError) as caught:
            gate.verify_detached(**dict(self.args, crls=[self.base / "revoked.crl.pem"]))
        self.assertIn(b"revoked", caught.exception.stderr.lower())

    def test_expired_crl_rejected_by_real_cms_verifier(self):
        # Cert is valid for 48h; CRL for 24h. Advance only CMS's validation
        # clock to 36h without changing signatures or disabling verification.
        original = subprocess.run
        later = int((dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=36)).timestamp())
        def at_future_time(command, **kwargs):
            if command[:3] == ["openssl", "cms", "-verify"]:
                command = command + ["-attime", str(later)]
            return original(command, **kwargs)
        with patch.object(gate.subprocess, "run", side_effect=at_future_time):
            with self.assertRaises(subprocess.CalledProcessError) as caught:
                gate.verify_detached(**self.args)
        self.assertIn(b"crl has expired", caught.exception.stderr.lower())

    def test_missing_crl_and_mixed_ca_bundle_rejected(self):
        with self.assertRaises(ValueError):
            gate.verify_detached(**dict(self.args, crls=[]))
        mixed = self.base / "mixed.pem"
        mixed.write_bytes((self.base / "ca.pem").read_bytes() + (self.base / "tsa.pem").read_bytes())
        with self.assertRaises(ValueError):
            gate.verify_detached(**dict(self.args, trust_root=mixed))
        with self.assertRaises(ValueError):
            gate.verify_detached(**dict(self.args, crls=[mixed]))

    def test_wrong_content_and_replayed_nonce_rejected(self):
        content = self.base / "wrong-content"
        content.write_bytes(b"SYNTHETIC WRONG CONTENT")
        self.openssl("ts", "-query", "-data", self.args["content"], "-sha256", "-cert", "-out", "other.tsq")
        for replacement in (dict(content=content), dict(request=self.base / "other.tsq")):
            with self.subTest(replacement=replacement), self.assertRaises(subprocess.CalledProcessError):
                gate.verify_detached(**dict(self.args, **replacement))

    def test_request_without_nonce_rejected(self):
        self.openssl("ts", "-query", "-data", self.args["content"], "-sha256", "-cert", "-no_nonce", "-out", "no-nonce.tsq")
        self.openssl("ts", "-reply", "-config", "tsa.cnf", "-queryfile", "no-nonce.tsq", "-out", "no-nonce.tsr")
        with self.assertRaisesRegex(ValueError, "nonce"):
            gate.verify_detached(**dict(self.args, request=self.base / "no-nonce.tsq", receipt=self.base / "no-nonce.tsr"))


if __name__ == "__main__":
    unittest.main()
