"""Offline RFC3161 verifier with a reviewed, pinned external trust anchor.

Only the AV134 DigiCert G4 policy is admitted. No network, arbitrary root
override, forecast publication or scoring. CRLs must validate NOW, not merely
at the token's date. A future archival-validation policy needs a separate review.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

from prospective_receipt_gate import private_regular_file, verify_precommitment
from sealing import utc

ROOT_DER_SHA256 = "552f7bdcf1a7af9e6ce672017f4f12abf77240c78e761ac203d1d9d20ac89988"
CATALOG_SHA256 = "bd12dbfa73908a8ac1d63bbcf2ee0da23a3f54e79868ab0aadd8a0c336f12ca2"
CATALOG_URL = "https://support.apple.com/en-us/126047"
POLICY_OID = "2.16.840.1.114412.7.1"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def pem_blocks(raw, label):
    pattern = (rb"-----BEGIN " + label + rb"-----\s*[A-Za-z0-9+/=\s]+"
               rb"-----END " + label + rb"-----")
    blocks = re.findall(pattern, raw)
    if not blocks or re.sub(pattern, b"", raw).strip():
        raise ValueError("Unexpected content in PEM certificate/CRL file")
    return blocks


def timestamp(text):
    match = re.search(r"^Time stamp:\s*(.+)$", text, re.M)
    if not match:
        raise ValueError("Missing RFC3161 timestamp")
    raw = match.group(1)
    pattern = "%b %d %H:%M:%S.%f %Y GMT" if re.search(r"\d{2}:\d{2}:\d{2}\.\d+", raw) else "%b %d %H:%M:%S %Y GMT"
    return dt.datetime.strptime(raw, pattern).replace(tzinfo=dt.timezone.utc)


def verify_detached(*, content, request, receipt, trust_root, chain, crls,
                    independent_catalog):
    """Verify exact content AND original nonce; CMS verifies the actual signer.

    Inputs are snapshotted to avoid changing bytes between OpenSSL commands.
    Only the single pinned root enters the CAfile. Neither embedded certificates
    nor a supplied chain become trust anchors. Extra CRLs are not trusted roots.
    """
    inputs = dict(content=content, request=request, receipt=receipt,
                  trust_root=trust_root, chain=chain, catalog=independent_catalog)
    raw = {key: private_regular_file(path).read_bytes() for key, path in inputs.items()}
    crl_raw = [private_regular_file(path).read_bytes() for path in crls]
    if not crl_raw:
        raise ValueError("Current issuer CRLs required")
    if sha(raw["catalog"]) != CATALOG_SHA256:
        raise ValueError("Independent catalog differs from reviewed archive")
    roots = pem_blocks(raw["trust_root"], b"CERTIFICATE")
    if len(roots) != 1:
        raise ValueError("Exactly one pinned root certificate required")
    pem_blocks(raw["chain"], b"CERTIFICATE")
    blocks = [block for item in crl_raw for block in pem_blocks(item, b"X509 CRL")]

    with tempfile.TemporaryDirectory(prefix="psycho_tsa_verify_") as temp:
        base = Path(temp)
        for key, value in raw.items():
            (base / key).write_bytes(value)
        (base / "ca").write_bytes(roots[0] + b"\n" + b"\n".join(blocks) + b"\n")
        (base / "empty_ca_path").mkdir()
        env = dict(os.environ, LC_ALL="C", SSL_CERT_FILE=str(base / "ca"),
                   SSL_CERT_DIR=str(base / "empty_ca_path"))

        def run(*args):
            return subprocess.run(["openssl", *map(str, args)], cwd=base, env=env,
                                  check=True, capture_output=True, timeout=30).stdout

        der = run("x509", "-in", "trust_root", "-outform", "DER")
        if sha(der) != ROOT_DER_SHA256:
            raise ValueError("Unapproved root fingerprint")
        ca_args = ["-CAfile", "ca", "-CApath", "empty_ca_path"]
        for mode, filename in (("-data", "content"), ("-queryfile", "request")):
            run("ts", "-verify", mode, filename, "-in", "receipt",
                *ca_args, "-untrusted", "chain")
        query_text = run("ts", "-query", "-in", "request", "-text").decode("ascii")
        text = run("ts", "-reply", "-in", "receipt", "-text").decode("ascii")
        for item in (query_text, text):
            if not re.search(r"^Nonce:\s*0x[0-9A-Fa-f]+\s*$", item, re.M):
                raise ValueError("Original request and response must include a nonce")
        policy = re.search(r"^Policy OID:\s*(\S+)\s*$", text, re.M)
        if not policy or policy.group(1) != POLICY_OID:
            raise ValueError("Unexpected timestamp policy OID")
        instant = timestamp(text)
        if instant > dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=5):
            raise ValueError("Timestamp is in the future relative to verifier clock")
        # Extract afresh from THIS receipt; never accept a separate supplied CMS.
        run("ts", "-reply", "-in", "receipt", "-token_out", "-out", "token.der")
        run("cms", "-verify", "-inform", "DER", "-in", "token.der", *ca_args,
            "-purpose", "timestampsign", "-crl_check_all", "-out", "tstinfo.der")
        token_hash = sha((base / "token.der").read_bytes())

    return {
        "schema": "psychohistory.independent_timestamp.v1",
        "status": "INDEPENDENT_TIMESTAMP_VERIFIED_ONLY",
        "timestamp": instant.isoformat(), "policyOid": POLICY_OID,
        "inputSha256": {key: sha(value) for key, value in raw.items()},
        "crlSha256": [sha(value) for value in crl_raw], "tokenSha256": token_hash,
        "trustRootDerSha256": ROOT_DER_SHA256, "independentCatalogUrl": CATALOG_URL,
        "contentImprintVerified": True, "originalRequestNonceVerified": True,
        "externalAuthorityIndependenceVerified": True,
        "actualCmsSignerPurposeAndCurrentCrlVerified": True,
        "checkedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sourceAvailabilityAsOfVerified": False,
        "forecastActuallyIssuedAtClaimedTimeVerified": False,
        "prospectiveEligible": False, "evaluationEligible": False,
    }


def verify_independent_precommitment(*, crls, independent_catalog, **draft_args):
    """Compose the existing ledger/artifact gate; do not promote to ISSUED."""
    old = verify_precommitment(**draft_args)
    bundle = Path(draft_args["prepared_dir"])
    verified = verify_detached(content=bundle / "commitment.bin", request=bundle / "request.tsq",
                               receipt=draft_args["receipt"], trust_root=draft_args["trust_root"],
                               chain=draft_args["chain"], crls=crls,
                               independent_catalog=independent_catalog)
    payload_raw = private_regular_file(bundle / "payload.json").read_bytes()
    payload = json.loads(payload_raw)
    # Re-run the ledger gate after the independent verification: all bindings
    # must still agree, including exact commitment, receipt and timestamp.
    if verify_precommitment(**draft_args) != old:
        raise ValueError("Draft artifacts changed during independent verification")
    if (verified["inputSha256"]["content"] != sha(bytes.fromhex(old["commitmentSha256"])) or
            verified["inputSha256"]["receipt"] != old["receiptSha256"] or
            verified["inputSha256"]["trust_root"] != old["trustRootSha256"] or
            verified["timestamp"] != old["rfc3161Timestamp"]):
        raise ValueError("Independent receipt does not match ledger verification")
    if not utc(payload["asOf"]) <= utc(verified["timestamp"]) <= utc(payload["issuedAt"]):
        raise ValueError("Independent timestamp must fall between as-of and issuance")
    return dict(old, schema="psychohistory.independent_precommitment.v1",
                status="INDEPENDENT_TIMESTAMP_VALIDATED_PENDING_ASOF_AND_ISSUANCE",
                externalAuthorityIndependenceVerified=True, independentTimestamp=verified,
                warning="External timestamp proves commitment existence, not source availability, "
                        "forecast publication or predictive skill. No ISSUED transition.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("content", "request", "receipt", "trust-root", "chain", "independent-catalog", "report"):
        parser.add_argument("--" + name, required=True, type=Path)
    parser.add_argument("--crl", action="append", required=True, type=Path)
    args = parser.parse_args()
    if args.report.exists():
        parser.error("Report must be new")
    # Reuse the repository's private-directory boundary before creating output.
    from prospective_draft_ledger import private_root
    private_root(args.report.parent)
    result = verify_detached(content=args.content, request=args.request, receipt=args.receipt,
                             trust_root=args.trust_root, chain=args.chain, crls=args.crl,
                             independent_catalog=args.independent_catalog)
    with args.report.open("x", encoding="utf-8") as f:
        json.dump(result, f, indent=2, allow_nan=False)
        f.write("\n")


if __name__ == "__main__":
    main()
