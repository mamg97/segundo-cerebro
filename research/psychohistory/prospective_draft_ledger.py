"""Private append-only DRAFT ledger for future scientific forecast issuance.

This is a tamper-evident, hash-chained *preparation* register. It never upgrades
local hashes or timestamps into prospective validation. ISSUED / SCORED events
are intentionally unavailable until independent TSA receipts, source as-of
verification, and a frozen resolution protocol are integrated and tested.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
from sealing import validate_payload, utc

HERE = Path(__file__).resolve().parents[2]
SCHEMA = "psychohistory.prospective_draft_ledger.v1"
HEX = re.compile(r"^[0-9a-f]{64}$")
IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{2,119}$")
FILENAME = re.compile(r"^(\d{8})-([0-9a-f]{64})\.json$")


def canonical(value):
    return (json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False,allow_nan=False)+"\n").encode("utf-8")


def private_root(path):
    base=path.absolute()
    if base.resolve().is_relative_to(HERE) or base.is_symlink():
        raise ValueError("Private ledger directory cannot be inside public Git")
    if base.exists() and not base.is_dir():
        raise ValueError("Ledger must be a directory")
    return base


def valid_draft(draft):
    if not isinstance(draft,dict) or set(draft)!={"schema","kind","entryId","payload",
        "sourceAvailabilityVerified","independentSealVerified","prospectiveEligible",
        "supersedesEntrySha256","resolutionProtocolSha256"}:
        raise ValueError("Unrecognised draft schema")
    if draft["schema"]!=SCHEMA or draft["kind"]!="UNSEALED_DRAFT" or not isinstance(draft["entryId"],str) or not IDENTIFIER.fullmatch(draft["entryId"]):
        raise ValueError("Not a valid draft event")
    if any(draft[k] is not False for k in ("sourceAvailabilityVerified","independentSealVerified","prospectiveEligible")):
        raise ValueError("Draft cannot claim issuance/independent temporal evidence")
    if (draft["supersedesEntrySha256"] is not None and
        (not isinstance(draft["supersedesEntrySha256"],str) or not HEX.fullmatch(draft["supersedesEntrySha256"]))):
        raise ValueError("Amendment must link a committed historical draft")
    if not isinstance(draft["resolutionProtocolSha256"],str) or not HEX.fullmatch(draft["resolutionProtocolSha256"]):
        raise ValueError("Frozen resolution protocol SHA-256 is required even for drafts")
    payload=draft["payload"]
    if not isinstance(payload,dict):
        raise ValueError("Expected canonical forecast payload")
    validate_payload(payload)  # Reuse existing date/probability and outcome exclusion checks.
    if not isinstance(payload.get("id"),str) or not IDENTIFIER.fullmatch(payload["id"]):
        raise ValueError("Forecast identifier invalid")
    if not all(isinstance(payload.get(k),str) and 0<len(payload[k])<=4000 for k in (
        "phenomenon","region","horizon","modelVersion","datasetVersion",
        "domain","targetDefinition","population","benchmarkId",
        "verificationSource","verificationMethod","sourceEditionReleaseDate")):
        raise ValueError("Forecast domain, target, universe or resolution contract missing")
    if any(not isinstance(payload.get(k),str) or not HEX.fullmatch(payload[k])
           for k in ("codeSha256","dataSha256","modelProtocolSha256")):
        raise ValueError("Code, dataset and model protocol must have SHA256 identity")
    if utc(payload["issuedAt"])<=dt.datetime.now(dt.timezone.utc):
        raise ValueError("Cannot prepare a would-be prospective issuance after its declared issue time")
    if set(draft).intersection({"outcome","brier","score"}):
        raise ValueError("Draft cannot be scored")


def scan(path):
    root=private_root(path)
    entries=root/"entries"
    if not entries.exists():
        return []
    if entries.is_symlink() or not entries.is_dir():
        raise ValueError("Unsafe ledger entries directory")
    files=sorted(entries.iterdir(),key=lambda p:p.name)
    output=[]
    previous="0"*64
    ids=set()
    for index,file in enumerate(files,1):
        if file.is_symlink() or not file.is_file():
            raise ValueError("Unexpected ledger entry path")
        match=FILENAME.fullmatch(file.name)
        if not match or int(match.group(1))!=index:
            raise ValueError("Missing/renamed/duplicate ledger sequence")
        raw=file.read_bytes()
        digest=hashlib.sha256(raw).hexdigest()
        if digest!=match.group(2):
            raise ValueError("Ledger entry bytes changed")
        record=json.loads(raw)
        if canonical(record)!=raw or record.get("schema")!=SCHEMA or record.get("sequence")!=index or record.get("previousSha256")!=previous:
            raise ValueError("Ledger chain or canonicalization mismatch")
        valid_draft(record["draft"])
        item=record["draft"]
        if item["entryId"] in ids:
            raise ValueError("Duplicate immutable entry id")
        ids.add(item["entryId"])
        supersedes=item["supersedesEntrySha256"]
        if supersedes is not None and supersedes not in {x["sha256"] for x in output}:
            raise ValueError("Amendment cannot supersede missing/future entry")
        previous=digest
        output.append({"sequence":index,"sha256":digest,"entryId":item["entryId"],
                       "kind":item["kind"],"supersedes":supersedes})
    return output


def append_draft(path,draft):
    valid_draft(draft)
    root=private_root(path)
    root.mkdir(mode=0o700,parents=True,exist_ok=True)
    (root/"entries").mkdir(mode=0o700,exist_ok=True)
    lock=root/".writer.lock"
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        os.write(fd,b"Writing an unsealed ledger draft. Stale lock needs manual audit.\n")
        os.fsync(fd)
        chain=scan(root)
        if draft["entryId"] in {row["entryId"] for row in chain}:
            raise ValueError("Existing ledger entry cannot be replaced")
        parent=draft["supersedesEntrySha256"]
        if parent is not None and parent not in {row["sha256"] for row in chain}:
            raise ValueError("Amendment parent not present")
        now=dt.datetime.now(dt.timezone.utc).isoformat()
        record={"schema":SCHEMA,"sequence":len(chain)+1,
                "previousSha256":chain[-1]["sha256"] if chain else "0"*64,
                "recordedLocallyAtUtc":now,"localTimeIsIndependentSeal":False,
                "draft":draft}
        raw=canonical(record)
        digest=hashlib.sha256(raw).hexdigest()
        target=root/"entries"/f"{len(chain)+1:08d}-{digest}.json"
        with target.open("xb") as file:
            file.write(raw)
            file.flush()
            os.fsync(file.fileno())
        os.chmod(target,0o600)
        if scan(root)[-1]["sha256"]!=digest:
            raise ValueError("Post-append verification failed")
        return {"sequence":len(chain)+1,"sha256":digest,"prospectiveEligible":False,
                "independentlyTimestamped":False}
    finally:
        os.close(fd)
        lock.unlink()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action",choices=("append-draft","verify"))
    parser.add_argument("--ledger-dir",type=Path,required=True)
    parser.add_argument("--draft",type=Path)
    args=parser.parse_args()
    if args.action=="append-draft":
        if not args.draft:parser.error("--draft is required to append")
        print(json.dumps(append_draft(args.ledger_dir,json.loads(args.draft.read_text()))))
    else:
        rows=scan(args.ledger_dir)
        print(json.dumps({"schema":SCHEMA,"drafts":len(rows),
            "headSha256":rows[-1]["sha256"] if rows else None,
            "verifiedLocalChain":True,"prospectiveForecastsIssued":0,
            "externalCheckpointVerified":False}))


if __name__=="__main__":
    main()
