"""Stage two *public* UCDP Onset CSV files in a PRIVATE, create-only directory.

The observed SHA-256 in this manifest is an inventory hash, NOT a separately
pinned historical proof of availability or authorization to publish scores.
This module is intentionally not called by CI or the web application.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import ssl
import urllib.request

from ucdp_onset import SOURCE_URLS, load_onsets, canonical, REPOSITORY

MAX_SOURCE_BYTES = 35_000_000
ALLOWED_HOST = "https://ucdp.uu.se/"


def download_public_csv(url: str, *, opener=None):
    if url not in SOURCE_URLS.values() or not url.startswith(ALLOWED_HOST):
        raise ValueError("Only exact documented UCDP Onset 25.1 sources are permitted")
    if opener is None:
        opener = urllib.request.urlopen
    request = urllib.request.Request(url, headers={"Accept":"text/csv",
                                                    "User-Agent":"PsychohistorySourceAudit/0.5"})
    with opener(request, timeout=20) as response:
        if response.geturl() != url:
            raise ValueError("Redirected source URL is not the pinned official URL")
        size = response.headers.get("Content-Length")
        if size is not None and int(size) > MAX_SOURCE_BYTES:
            raise ValueError("The official source is larger than the private bound")
        raw = response.read(MAX_SOURCE_BYTES + 1)
        if len(raw) > MAX_SOURCE_BYTES:
            raise ValueError("Oversized source")
    if not raw or raw[:50].lstrip().startswith((b"<!DOCTYPE", b"<html")):
        raise ValueError("Unexpected HTML rather than country-level CSV")
    return raw


def stage_sources(directory: pathlib.Path, *, downloader=download_public_csv, at=None):
    """Fail closed, and never overwrite an earlier reproducibility snapshot."""
    root = directory.resolve()
    if root == REPOSITORY or root.is_relative_to(REPOSITORY):
        raise ValueError("Public repository is not a permitted data directory")
    if directory.exists():
        raise FileExistsError("Snapshot directory already exists; use a fresh name")
    prepared=[]
    for kind,url in SOURCE_URLS.items():
        content=downloader(url)
        observed_digest=hashlib.sha256(content).hexdigest()
        parsed=load_onsets(content,kind=kind,expected_sha256=observed_digest)
        if parsed["max_year"] < 2024 or parsed["min_year"] > 2003:
            raise ValueError("Source coverage insufficient for protocol test period")
        prepared.append((kind,content,{
            "kind":kind,"official_url":url,"edition":"25.1",
            "observed_sha256":observed_digest,"n_rows":parsed["n_rows"],
            "n_countries":parsed["n_countries"],
            "first_year":parsed["min_year"],"last_year":parsed["max_year"],
            "integrity":"observed_checksum_not_independently_pinned",
            "as_of_origin_verified":False,"vintage_correct":False,
            "retrospective_backtest_eligible":False,
            "prospective_skill_verified":False
        }))
    directory.mkdir(parents=True,mode=0o700,exist_ok=False)
    now=(at or dt.datetime.now(dt.timezone.utc)).astimezone(dt.timezone.utc)
    manifest={"schema":"psychohistory.onset_staging.v1",
       "retrieval_time_self_reported_utc":now.isoformat(),
       "staging_status":"SOURCE_DOWNLOADED_AWAITING_INDEPENDENT_SHA_REVIEW",
       "scope":"public_UCDP_data_in_private_staging",
       "as_of_availability_independently_verified":False,
       "retrospective_scoring_authorized":False,
       "sources":[]}
    for kind,content,metadata in prepared:
        filename=f"ucdp-{kind.replace('_country','-country')}-onset-251.csv"
        path=directory/filename
        with path.open("xb") as stream:
            stream.write(content)
        path.chmod(0o600)
        manifest["sources"].append({**metadata,"filename":filename})
    path=directory/"manifest.json"
    with path.open("xb") as stream:
        stream.write(canonical(manifest)+b"\n")
    path.chmod(0o600)
    return manifest


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out-dir",type=pathlib.Path,required=True,
                   help="New private directory outside the git repository")
    args=p.parse_args()
    report=stage_sources(args.out_dir)
    print(json.dumps({"status":report["staging_status"],
       "sources":[{"kind":s["kind"],"rows":s["n_rows"],
                   "years":[s["first_year"],s["last_year"]]} for s in report["sources"]],
       "checksum_independently_pinned":False,
       "as_of_verified":False,
       "results_scored":False},sort_keys=True))


if __name__=="__main__":
    main()
