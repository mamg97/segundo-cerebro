"""Verify a forecast DRAFT against a real RFC3161 receipt and exact artifacts.

Fail-closed bridge between prospective_draft_ledger.py and sealing.py.
A user-provided CA file is not independently approved here; a valid signature
does NOT prove the dataset existed as-of or that a real forecast was issued.
No network access, writing to the source ledger, or score calculations.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re

from prospective_draft_ledger import canonical, private_root, scan
from sealing import commitment, utc, validate_payload, verify as verify_rfc3161

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA = "psychohistory.prospective_receipt_gate.v1"
SHA = re.compile(r"^[0-9a-f]{64}$")


def private_regular_file(path):
    path = Path(path).absolute()
    if path.is_symlink() or not path.is_file() or path.resolve().is_relative_to(REPO_ROOT):
        raise ValueError("Expected a regular private file outside public Git")
    return path


def file_hash(path):
    path = private_regular_file(path)
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def draft_record(ledger_dir, entry_sha256):
    if not isinstance(entry_sha256, str) or not SHA.fullmatch(entry_sha256):
        raise ValueError("Ledger entry SHA-256 required")
    root = private_root(Path(ledger_dir))
    entries = scan(root)  # checks full chain, sequence, links and draft contents.
    matches = [entry for entry in entries if entry["sha256"] == entry_sha256]
    if len(matches) != 1:
        raise ValueError("Draft not found in verified private ledger")
    entry = matches[0]
    path = root / "entries" / f'{entry["sequence"]:08d}-{entry_sha256}.json'
    if file_hash(path) != entry_sha256:
        raise ValueError("Ledger entry changed during inspection")
    raw = path.read_bytes()
    record = json.loads(raw)
    if raw != canonical(record) or record["draft"]["kind"] != "UNSEALED_DRAFT":
        raise ValueError("Only original canonical drafts may be audited")
    return record["draft"]


def verify_precommitment(*, ledger_dir, entry_sha256, prepared_dir, receipt,
                         trust_root, chain, data_archive, code_archive,
                         model_protocol, resolution_protocol):
    """No ISSUED status: no as-of attestation or independent trust registry exists."""
    draft = draft_record(ledger_dir, entry_sha256)
    payload = draft["payload"]
    validate_payload(payload)
    bundle = private_root(Path(prepared_dir))
    if not bundle.is_dir() or bundle.is_symlink():
        raise ValueError("Sealed preparation bundle is not a private directory")

    prepared_payload_file = private_regular_file(bundle / "payload.json")
    nonce_file = private_regular_file(bundle / "nonce.txt")
    commitment_file = private_regular_file(bundle / "commitment.bin")
    private_regular_file(receipt)
    private_regular_file(trust_root)
    private_regular_file(chain)

    sealed_payload = json.loads(prepared_payload_file.read_text(encoding="utf-8"))
    if canonical(sealed_payload) != canonical(payload):
        raise ValueError("Prepared forecast differs from the ledger draft")
    nonce = nonce_file.read_text(encoding="utf-8").strip()
    if commitment(payload, nonce) != commitment_file.read_bytes():
        raise ValueError("Commitment or nonce does not match ledger forecast")

    artifacts = {
        "dataSha256": data_archive,
        "codeSha256": code_archive,
        "modelProtocolSha256": model_protocol,
    }
    fingerprints = {}
    for field, path in artifacts.items():
        actual = file_hash(path)
        if actual != payload[field]:
            raise ValueError(f"Source artifact does not match pinned {field}")
        fingerprints[field] = actual
    resolution_actual = file_hash(resolution_protocol)
    if resolution_actual != draft["resolutionProtocolSha256"]:
        raise ValueError("Resolution protocol does not match frozen draft hash")
    fingerprints["resolutionProtocolSha256"] = resolution_actual

    # An edition date in the payload is a *claim*; same-day publication with
    # no time-of-day evidence is not enough to prove availability at cutoff.
    try:
        release = dt.date.fromisoformat(payload["sourceEditionReleaseDate"])
    except (ValueError, TypeError) as exc:
        raise ValueError("Invalid source edition date") from exc
    if release.isoformat() != payload["sourceEditionReleaseDate"] or release >= utc(payload["asOf"]).date():
        raise ValueError("Source edition release date is not strictly before as-of day")

    evidence = verify_rfc3161(bundle, Path(receipt), Path(trust_root), Path(chain))
    if (not isinstance(evidence, dict) or evidence.get("verified") is not True or
            evidence.get("payloadMatched") is not True or
            evidence.get("rfc3161SignatureVerifiedWithSuppliedTrustRoot") is not True or
            evidence.get("rfc3161RequestNonceMatched") is not True or
            evidence.get("independentTimestamp") is not False):
        raise ValueError("RFC3161 imprint, original nonce or scoped signature evidence failed")
    instant = utc(evidence["timestamp"])
    if not (instant <= utc(payload["issuedAt"]) and instant < utc(payload["resolutionAt"])):
        raise ValueError("Time stamp is after the declared forecast horizon/issue date")
    if evidence.get("id") != payload["id"] or evidence.get("commitmentSha256") != commitment(payload, nonce).hex():
        raise ValueError("RFC3161 receipt did not bind the draft commitment")
    if evidence.get("receiptSha256") != file_hash(receipt) or evidence.get("trustRootSha256") != file_hash(trust_root):
        raise ValueError("Receipt or certificate changed during inspection")

    return {
        "schema": SCHEMA,
        "status": "RFC3161_SIGNATURE_VALIDATED_PENDING_INDEPENDENT_ASOF_AND_ISSUANCE",
        "entrySha256": entry_sha256,
        "forecastId": payload["id"],
        "commitmentSha256": evidence["commitmentSha256"],
        "receiptSha256": evidence["receiptSha256"],
        "trustRootSha256": evidence["trustRootSha256"],
        "rfc3161Timestamp": instant.isoformat(),
        "artifactHashesVerified": True,
        "artifactSha256": fingerprints,
        "sourceEditionDatePriorToAsOfClaim": True,
        "rfc3161SignatureVerifiedWithSuppliedTrustRoot": True,
        "rfc3161RequestNonceMatched": True,
        "externalAuthorityIndependenceVerified": False,
        "sourceReleaseEvidenceIndependentlyVerified": False,
        "sourceAvailabilityAsOfVerified": False,
        "forecastActuallyIssuedAtClaimedTimeVerified": False,
        "prospectiveEligible": False,
        "evaluationEligible": False,
        "outcomeKnown": False,
        "warning": "A valid RFC3161 signature for a user-supplied trust root and matching "
                   "artifacts does not establish authority independence, source vintage "
                   "availability, real-time forecast publication or predictive skill.",
    }


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--ledger-dir", type=Path, required=True)
    a.add_argument("--entry-sha256", required=True)
    for field in ("prepared-dir", "receipt", "trust-root", "chain", "data-archive",
                  "code-archive", "model-protocol", "resolution-protocol", "report"):
        a.add_argument("--" + field, type=Path, required=True)
    args = a.parse_args()
    result = verify_precommitment(
        ledger_dir=args.ledger_dir, entry_sha256=args.entry_sha256,
        prepared_dir=args.prepared_dir, receipt=args.receipt, trust_root=args.trust_root,
        chain=args.chain, data_archive=args.data_archive, code_archive=args.code_archive,
        model_protocol=args.model_protocol, resolution_protocol=args.resolution_protocol)
    destination = private_root(args.report.parent) / args.report.name
    if destination.resolve().is_relative_to(REPO_ROOT):
        raise ValueError("Report must remain outside Git")
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with destination.open("x", encoding="utf-8") as output:
        json.dump(result, output, sort_keys=True, ensure_ascii=False, indent=2)
        output.write("\n")
    destination.chmod(0o600)
    print(json.dumps({
        "schema": SCHEMA, "status": result["status"],
        "entrySha256": result["entrySha256"], "prospectiveEligible": False,
        "rfc3161SignatureVerifiedWithSuppliedTrustRoot": True,
        "reportSha256": file_hash(destination),
    }, sort_keys=True))


if __name__ == "__main__":
    main()
