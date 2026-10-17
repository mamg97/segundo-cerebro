"""Prepare and verify an RFC3161 commitment for an entire private forecast cohort.

The TSA sees only the hash of a salted digest: no countries, probabilities or
private Sheet identifiers are sent to it. No TSA contacted automatically.

A verified receipt proves a *specific cohort* existed by a signed timestamp.
It does NOT by itself establish that the underlying source was available as-of
or authorize prospectively resolved rows in the Cloudflare Worker.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import secrets
import subprocess
from pathlib import Path

from benchmark import canonical

REPO = Path(__file__).resolve().parents[2]
DOMAIN = b"PSYCHOHISTORY-FORECAST-COHORT-RFC3161-V1\x00"


def load_candidate(folder: Path):
    forecast_file = folder / "forecast-candidate.json"
    manifest_file = folder / "manifest.json"
    raw = forecast_file.read_bytes()
    report = json.loads(raw)
    manifest = json.loads(manifest_file.read_bytes())
    expected = hashlib.sha256(raw).hexdigest()
    if manifest.get("candidate_sha256") != expected:
        raise ValueError("Candidate content differs from frozen manifest")
    if report.get("schema") != "psychohistory.prospective_rehearsal.v1" or (
        report.get("status") != "UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE" or
        report.get("outcomes_included") is not False or
        report.get("eligible_for_prospective_scoring") is not False or
        report.get("external_timestamp_receipt_verified") is not False or
        report.get("source", {}).get("as_of_availability_independently_verified") is not False
    ):
        raise ValueError("Not a genuine unsealed forecast candidate")
    if manifest.get("source_sha256") != report["source"]["archive_sha256"] or (
        manifest.get("model_protocol_sha256") != report["model_protocol_sha256"] or
        manifest.get("prospective_eligible") is not False or
        manifest.get("vintage_verified") is not False or
        manifest.get("independent_timestamp_receipt") is not None
    ):
        raise ValueError("Manifest and forecast metadata inconsistent")
    if report.get("target_year") != manifest.get("target_year") or (
        not isinstance(report.get("target_year"), int) or
        isinstance(report["target_year"], bool)
    ):
        raise ValueError("Target year was changed")
    target = dt.datetime(report["target_year"], 1, 1, tzinfo=dt.timezone.utc)
    return raw, report, expected, target


def opaque_commitment(raw, salt: bytes) -> bytes:
    if not isinstance(salt, bytes) or len(salt) != 32:
        raise ValueError("Exactly 256 random bits of salt required")
    return hashlib.sha256(DOMAIN + salt + hashlib.sha256(raw).digest()).digest()


def prepare_request(cohort_dir: Path, seal_dir: Path):
    raw, report, source_sha, target = load_candidate(cohort_dir)
    if seal_dir.resolve().is_relative_to(REPO):
        raise ValueError("No real forecast commitments in public repository")
    if dt.datetime.now(dt.timezone.utc) >= target:
        raise ValueError("Forecast origin already begun: cannot prepare retroactively")
    if seal_dir.exists():
        raise FileExistsError("Refusing to replace prior timestamp request")
    seal_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    salt = secrets.token_bytes(32)
    imprint = opaque_commitment(raw, salt)
    artifacts = {
        "nonce.bin": salt,
        "commitment.bin": imprint,
        "candidate-sha256.txt": (source_sha + "\n").encode(),
    }
    for name, content in artifacts.items():
        item = seal_dir / name
        with item.open("xb") as out:
            out.write(content)
        item.chmod(0o600)
    # OpenSSL produces an RFC3161 request, NOT a timestamp or TSA acceptance.
    request = seal_dir / "request.tsq"
    subprocess.run(["openssl", "ts", "-query", "-data", str(seal_dir / "commitment.bin"),
                    "-sha256", "-cert", "-out", str(request)], check=True, capture_output=True)
    request.chmod(0o600)
    return {"target_year": report["target_year"], "candidate_sha256": source_sha,
            "commitment_sha256": imprint.hex(), "request_path": str(request),
            "status": "REQUEST_ONLY_NO_TSA_RECEIPT"}


def _timestamp_from_reply(response_text):
    found = re.search(r"^Time stamp:\s*(.+)$", response_text, flags=re.M)
    if not found:
        raise ValueError("Missing TSA signed timestamp")
    raw = found.group(1).strip()
    pattern = "%b %d %H:%M:%S.%f %Y GMT" if re.search(r"\d{2}:\d{2}:\d{2}\.\d+", raw) else "%b %d %H:%M:%S %Y GMT"
    return dt.datetime.strptime(raw, pattern).replace(tzinfo=dt.timezone.utc)


def verify_receipt(cohort_dir: Path, seal_dir: Path, receipt: Path,
                   trust_root: Path, chain: Path, pinned_root_sha256: str):
    raw, report, expected_sha, target = load_candidate(cohort_dir)
    if not re.fullmatch(r"[a-f0-9]{64}", pinned_root_sha256 or ""):
        raise ValueError("Pinned CA digest is required")
    root_bytes = trust_root.read_bytes()
    if hashlib.sha256(root_bytes).hexdigest() != pinned_root_sha256:
        raise ValueError("Trust root does not match separately pinned digest")
    salt = (seal_dir / "nonce.bin").read_bytes()
    digest = opaque_commitment(raw, salt)
    if digest != (seal_dir / "commitment.bin").read_bytes():
        raise ValueError("Cohort changed since request preparation")
    if (seal_dir / "candidate-sha256.txt").read_text().strip() != expected_sha:
        raise ValueError("Candidate digest does not match prepared request")
    # First verify RFC3161 cryptography and the data imprint via OpenSSL;
    # the CA is reviewed/pinned by an operator outside the forecast inputs.
    subprocess.run(["openssl", "ts", "-verify", "-data", str(seal_dir / "commitment.bin"),
                    "-in", str(receipt), "-CAfile", str(trust_root),
                    "-untrusted", str(chain)], check=True, capture_output=True)
    response = subprocess.run(["openssl", "ts", "-reply", "-in", str(receipt), "-text"],
                              check=True, capture_output=True, text=True).stdout
    signed = _timestamp_from_reply(response)
    if signed >= target:
        raise ValueError("Independent seal was issued on/after first target-year day")
    return {
        "signature_verified_against_operator_pinned_ca": True,
        "candidate_bytes_match_receipt": True,
        "independently_signed_utc": signed.isoformat(),
        "candidate_sha256": expected_sha, "commitment_sha256": digest.hex(),
        "receipt_sha256": hashlib.sha256(receipt.read_bytes()).hexdigest(),
        "trust_root_sha256": pinned_root_sha256,
        "source_as_of_independently_verified": False,
        "prospective_scoring_authorized": False,
        "status": "TIMESTAMP_VERIFIED_SOURCE_AND_REGISTER_GATES_STILL_PENDING",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("prepare", "verify"))
    parser.add_argument("--cohort-dir", type=Path, required=True)
    parser.add_argument("--seal-dir", type=Path, required=True)
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--trust-root", type=Path)
    parser.add_argument("--chain", type=Path)
    parser.add_argument("--pinned-root-sha256")
    args = parser.parse_args()
    if args.operation == "prepare":
        result = prepare_request(args.cohort_dir, args.seal_dir)
    else:
        if not all([args.receipt, args.trust_root, args.chain, args.pinned_root_sha256]):
            parser.error("Receipt, trust root, chain and independently pinned CA SHA-256 required")
        result = verify_receipt(args.cohort_dir, args.seal_dir,
                                args.receipt, args.trust_root, args.chain,
                                args.pinned_root_sha256)
    print(json.dumps(result, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
