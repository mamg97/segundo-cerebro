"""Prepare a private, salted RFC3161 request for the WHOLE frozen 2027 cohort.

This DOES NOT contact a TSA, accept a receipt or issue a forecast. Nothing
with real probabilities or hashes may enter public Git, CI artifacts or logs.
The candidate file stays in its pre-existing private canonical location.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess

from issue_2027_preflight import digest, inspect_report, safe_private_file

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
SCHEMA = "psychohistory.2027.private_cohort_precommitment.v1"
HEX64 = re.compile(r"^[0-9a-f]{64}$")
HEX_SALT = re.compile(r"^[0-9a-f]{64}$")


def canon(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True,
                       separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def private_destination(path):
    target = Path(path).absolute()
    if (target.is_symlink() or target.exists() or
            target.resolve().is_relative_to(REPO) or
            not target.parent.is_dir() or target.parent.is_symlink()):
        raise ValueError("Need a NEW bundle directory beneath an existing private directory")
    return target


def checked_candidate(path):
    source = safe_private_file(path)
    report = json.loads(source.read_text(encoding="utf-8"))
    policy = json.loads((HERE / "policy_2027.json").read_text(encoding="utf-8"))
    protocol = json.loads((HERE / "protocol.json").read_text(encoding="utf-8"))
    check = inspect_report(report, policy, protocol)
    if (check["status"] != "CANONICAL_SHADOW_PREFLIGHT_PASSED_NOT_ISSUED" or
            check["modelProtocolAndCodeMatched"] is not True or
            check["issuanceEligible"] is not False):
        raise ValueError("Only the byte-matched canonical, UNISSUED cohort is accepted")
    return source, report, policy, protocol


def manifest_for(source, report, policy, protocol):
    # The source and code bytes are identified, not duplicated into the bundle.
    return {
        "schema": SCHEMA,
        "kind": "UNISSUED_COHORT_PRECOMMITMENT",
        "targetYear": 2027,
        "countries": len(report["candidates"]),
        "models": list(policy["models"]),
        "candidateReportSha256": digest(source),
        "policySha256": digest(HERE / "policy_2027.json"),
        "protocolSha256": digest(HERE / "protocol.json"),
        "benchmarkCodeSha256": digest(HERE / "benchmark.py"),
        "generatorCodeSha256": digest(HERE / "future_2027_candidates.py"),
        "officialZipSha256": protocol["archive_sha256"],
        "officialCodebookSha256": protocol["codebook_sha256"],
        "featuresThroughYear": 2025,
        "trainingLabelsThroughYear": 2025,
        "outcomesKnown": False,
        "externalTimestampReceiptVerified": False,
        "sourceAsOfIndependentlyVerified": False,
        "forecastIssued": False,
        "prospectiveEligible": False,
    }


def commitment(data, salt_hex):
    if not isinstance(salt_hex, str) or not HEX_SALT.fullmatch(salt_hex):
        raise ValueError("256-bit random salt is required")
    return hashlib.sha256(
        b"PSICOHISTORIA-2027-COHORT-PRECOMMIT-V1\0" +
        bytes.fromhex(salt_hex) + b"\0" + canon(data)
    ).digest()


def prepare(source_path, bundle_path):
    source, report, policy, protocol = checked_candidate(source_path)
    destination = private_destination(bundle_path)
    record = manifest_for(source, report, policy, protocol)
    destination.mkdir(mode=0o700)
    try:
        salt = secrets.token_hex(32)
        (destination / "manifest.json").write_bytes(canon(record))
        (destination / "salt.txt").write_text(salt + "\n", encoding="ascii")
        (destination / "commitment.bin").write_bytes(commitment(record, salt))
        for name in ("manifest.json", "salt.txt", "commitment.bin"):
            (destination / name).chmod(0o600)
        subprocess.run([
            "openssl", "ts", "-query", "-data",
            str(destination / "commitment.bin"), "-sha256", "-cert",
            "-out", str(destination / "request.tsq")],
            check=True, capture_output=True)
        (destination / "request.tsq").chmod(0o600)
        audit = {
            "schema": SCHEMA,
            "status": "READY_FOR_EXTERNAL_TSA_NOT_SENT_NOT_ISSUED",
            "preparedAtUtcLocalClaimOnly": dt.datetime.now(dt.timezone.utc).isoformat(),
            "manifestSha256": digest(destination / "manifest.json"),
            "commitmentSha256": digest(destination / "commitment.bin"),
            "requestSha256": digest(destination / "request.tsq"),
            "candidateReportSha256": record["candidateReportSha256"],
            "tsaContacted": False,
            "externalTimestampReceiptVerified": False,
            "independentTrustValidated": False,
            "sourceAsOfIndependentlyVerified": False,
            "forecastIssued": False,
            "prospectiveEligible": False,
        }
        (destination / "audit.json").write_bytes(canon(audit))
        (destination / "audit.json").chmod(0o600)
    except BaseException:
        shutil.rmtree(destination)
        raise
    return audit


def verify_bundle(source_path, bundle_path):
    source, report, policy, protocol = checked_candidate(source_path)
    bundle = Path(bundle_path).absolute()
    if (bundle.is_symlink() or not bundle.is_dir() or
            bundle.resolve().is_relative_to(REPO)):
        raise ValueError("Bundle is not a private directory")
    names = ("manifest.json", "salt.txt", "commitment.bin",
             "request.tsq", "audit.json")
    for name in names:
        file = bundle / name
        if file.is_symlink() or not file.is_file():
            raise ValueError("Missing or unsafe prepared bundle file")
    raw = (bundle / "manifest.json").read_bytes()
    stored = json.loads(raw)
    expected = manifest_for(source, report, policy, protocol)
    if stored != expected or raw != canon(expected):
        raise ValueError("Frozen manifest differs from original candidate/code/policy")
    salt = (bundle / "salt.txt").read_text().strip()
    signed = (bundle / "commitment.bin").read_bytes()
    if signed != commitment(expected, salt):
        raise ValueError("Salted cohort commitment changed")
    evidence = json.loads((bundle / "audit.json").read_text())
    if (evidence.get("schema") != SCHEMA or
            evidence.get("status") != "READY_FOR_EXTERNAL_TSA_NOT_SENT_NOT_ISSUED" or
            evidence.get("candidateReportSha256") != digest(source) or
            evidence.get("manifestSha256") != digest(bundle / "manifest.json") or
            evidence.get("commitmentSha256") != digest(bundle / "commitment.bin") or
            evidence.get("requestSha256") != digest(bundle / "request.tsq") or
            any(evidence.get(flag) is not False for flag in (
                "tsaContacted", "externalTimestampReceiptVerified",
                "independentTrustValidated", "sourceAsOfIndependentlyVerified",
                "forecastIssued", "prospectiveEligible"))):
        raise ValueError("Prepared audit changed or claims an unverified emission")
    # Parse the original ASN.1 request to reject malformed query files.
    # A later external receipt must be checked with BOTH -data and -queryfile.
    text = subprocess.run([
        "openssl", "ts", "-query", "-in", str(bundle / "request.tsq"), "-text"],
        capture_output=True, text=True, check=True).stdout
    if ("Hash Algorithm: sha256" not in text or
            "Nonce: " not in text or "Certificate required: yes" not in text or
            "Message data:" not in text or "Policy OID:" not in text):
        raise ValueError("RFC3161 query must use SHA256, nonce and certReq")
    imprint_dump = text.split("Message data:", 1)[1].split("Policy OID:", 1)[0]
    values = []
    for line in imprint_dump.splitlines():
        if " - " not in line:
            continue
        hex_part = line.split(" - ", 1)[1].split("   ", 1)[0]
        values.extend(re.findall(r"(?i)\b[0-9a-f]{2}\b", hex_part))
    if bytes.fromhex("".join(values)) != hashlib.sha256(signed).digest():
        raise ValueError("RFC3161 query imprint does not bind the actual commitment")
    return {
        "schema": SCHEMA,
        "status": "PRIVATE_COHORT_PRECOMMITMENT_REVERIFIED_NOT_ISSUED",
        "countryCount": len(report["candidates"]),
        "modelCount": len(policy["models"]),
        "candidateAndCodeHashesMatched": True,
        "requestIntegrityChecked": True,
        "externalTimestampReceiptVerified": False,
        "forecastIssued": False,
        "prospectiveEligible": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "verify"])
    parser.add_argument("--candidate-json", type=Path, required=True)
    parser.add_argument("--bundle", type=Path, required=True)
    args = parser.parse_args()
    result = (prepare(args.candidate_json, args.bundle) if args.action == "prepare"
              else verify_bundle(args.candidate_json, args.bundle))
    # Do not print any real commitment, candidate SHA, salt, private path, or IDs.
    print(json.dumps({
        "status": result["status"],
        "forecastIssued": False,
        "prospectiveEligible": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
