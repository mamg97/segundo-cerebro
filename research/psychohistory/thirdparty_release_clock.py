"""Third-party release metadata clock for UCDP Candidate: exclusion ONLY.

A third-party's publication *claim* and recorded access are not independently
authenticated timestamps, nor evidence that the same CSV bytes existed then.
This gate is deliberately unable to approve a vintage-correct replay. It
determines whether the available metadata already RULES OUT a historical
hypothetical issue date, without treating version names or event dates as
publication dates.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime
import json
import re
from urllib.parse import urlparse

SCHEMA = "psychohistory.ucdp_candidate_thirdparty_clock.v1"
VERSION = re.compile(r"v?[0-9]{2}\.(?:0\.[0-9]{1,2}|[0-9]{2}\.[0-9]{2}\.[0-9]{2})\Z")
ISSUE_MONTH = re.compile(r"[0-9]{4}-(0[1-9]|1[0-2])\Z")
STRICT_DAY = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}\Z")
OWID_HOST = "datasette-public.owid.io"
UCDP_HOST = "ucdp.uu.se"


def parse_day(value):
    if isinstance(value, str) and STRICT_DAY.fullmatch(value):
        return date.fromisoformat(value)
    raise ValueError("Noncanonical date field")


def parse_observation(value):
    if not isinstance(value, str) or not re.fullmatch(
            r"[0-9]{4}-[0-9]{2}-[0-9]{2}T00:00:00", value):
        raise ValueError("Unexpected third-party observation date precision")
    dt = datetime.fromisoformat(value)
    if dt.time().isoformat() != "00:00:00" or dt.tzinfo is not None:
        raise ValueError("Time zone or non-midnight observation requires manual verification")
    return dt.date()


def parse_catalog(raw, *, expected_version, expected_download_url, evidence_url):
    if not isinstance(raw, dict) or raw.get("ok") is not True:
        raise ValueError("Malformed third-party catalog response")
    if not isinstance(expected_version, str) or not VERSION.fullmatch(expected_version):
        raise ValueError("Invalid Candidate version")
    if not isinstance(expected_download_url, str):
        raise ValueError("Missing expected download URL")
    source = urlparse(expected_download_url)
    if (source.scheme != "https" or source.hostname != UCDP_HOST or
            source.port not in (None,443) or source.username or source.password or
            not re.fullmatch(r"/downloads/candidateged/GEDEvent_v[0-9_]+\.csv",source.path)
            or source.query or source.fragment):
        raise ValueError("Expected URL not an official Candidate CSV")
    advertised = urlparse(evidence_url)
    if not isinstance(evidence_url,str) or (advertised.scheme != "https" or
            advertised.hostname != OWID_HOST or advertised.port not in (None,443)
            or advertised.username or advertised.password or advertised.path != "/owid.json"):
        raise ValueError("Unsupported independent catalog endpoint")
    cols, rows = raw.get("columns"), raw.get("rows")
    if (not isinstance(cols,list) or len(cols)!=len(set(cols)) or not isinstance(rows,list)
            or len(rows)!=1 or not isinstance(rows[0],list)
            or len(rows[0])!=len(cols)):
        raise ValueError("Require one unambiguous catalog match")
    required={"versionProducer","urlDownload","datePublished","dateAccessed","producer"}
    if not required.issubset(cols):
        raise ValueError("Missing independent record identity/date fields")
    entry=dict(zip(cols,rows[0]))
    if entry["versionProducer"] != expected_version or entry["urlDownload"] != expected_download_url:
        raise ValueError("Edition/URL mismatch: may be a different UCDP product")
    if entry["producer"] != "Uppsala Conflict Data Program":
        raise ValueError("Publisher not verified")
    published=parse_day(entry["datePublished"])
    accessed=parse_observation(entry["dateAccessed"])
    if published > accessed:
        raise ValueError("Claimed publication after observation")
    return {
        "producer":"Uppsala Conflict Data Program",
        "edition":expected_version,
        "source_url":expected_download_url,
        "evidence_url":evidence_url,
        "claimed_published":published,
        "catalog_access_observed":accessed,
    }


def audit(record, issues):
    if not isinstance(issues,list) or not issues or len(issues)>240:
        raise ValueError("Bounded nonempty issue dates required")
    parsed=[]
    for ym in issues:
        if not isinstance(ym,str) or not ISSUE_MONTH.fullmatch(ym):
            raise ValueError("Expected issue YYYY-MM")
        issue=date.fromisoformat(ym+"-01")
        parsed.append(issue)
    if parsed!=sorted(set(parsed)):
        raise ValueError("Issue origins must be unique and strictly increasing")
    cells=[]
    for issue in parsed:
        if record["claimed_published"]>=issue:
            state="NOT_PUBLISHED_BY_DECLARED_DATE"
        elif record["catalog_access_observed"]>=issue:
            state="NO_THIRD_PARTY_ACCESS_BEFORE_ISSUE"
        else:
            state="METADATA_PREISSUE_BYTES_NOT_ATTESTED"
        cells.append({"issue_month":issue.strftime("%Y-%m"),"status":state,
                      "source_as_of_verified":False,"vintage_correct_replay_authorized":False})
    return {
        "schema":SCHEMA, "status":"THIRD_PARTY_METADATA_ONLY_NO_HISTORICAL_BYTE_WITNESS",
        "edition":record["edition"], "catalog_provider":"Our World in Data",
        "metadata_claimed_publication_date":record["claimed_published"].isoformat(),
        "metadata_observed_access_date":record["catalog_access_observed"].isoformat(),
        "metadata_claims_identity_match":True,
        "historical_byte_hash_attested_by_third_party":False,
        "independent_timestamp_cryptographically_authenticated":False,
        "source_as_of_verified":False,"vintage_correct_replay_authorized":False,
        "models_scored":False,"forecast_issued":False,
        "cells":cells,
        "warning":("Third-party metadata documents a catalog claim and access date, "
                   "not an independently verifiable timestamped byte witness. "
                   "A later observation cannot prove earlier availability; "
                   "a prior observation does not prove identical source bytes."),
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog-json",required=True,type=__import__("pathlib").Path)
    parser.add_argument("--expected-version",required=True)
    parser.add_argument("--expected-download-url",required=True)
    parser.add_argument("--catalog-evidence-url",required=True)
    parser.add_argument("--issue-month",action="append",required=True)
    args=parser.parse_args()
    record=parse_catalog(json.loads(args.catalog_json.read_text(encoding="utf-8")),
        expected_version=args.expected_version,
        expected_download_url=args.expected_download_url,
        evidence_url=args.catalog_evidence_url)
    print(json.dumps(audit(record,args.issue_month),sort_keys=True))


if __name__=="__main__":
    main()
