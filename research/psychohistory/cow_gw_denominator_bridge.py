"""Independent COW 2024 membership versus GW v7 + separate microstate roster.

This is a POPULATION-ONLY comparative audit. COW codes are NOT GW/UCDP
codes and numerical overlap is NOT proof of geographic identity. Historical
timestamps for original file bytes and UCDP event coverage remain unverified.
COW State System Membership v2024 was published in November 2025, so the
2024 roster CANNOT be used as if available to a forecaster during 2024.

No source row, country identity, incident, probability or location is printed.
"""
from __future__ import annotations
import argparse
import csv
from datetime import date, timedelta
from collections import Counter
import hashlib
import io
import json
import re
from pathlib import Path

from independent_gw_roster import parse_intervals, SOURCE_END

FIELDS = ("stateabb","ccode","statenme","styear","stmonth","stday",
          "endyear","endmonth","endday","version")
MAX_SOURCE_BYTES = 90000
MAX_ROWS = 500
LATEST_COW_DATE = date(2024,12,31)
COW_PUBLICATION_EVIDENCE = "https://correlatesofwar.org/news/state-system-membership-update-v2024/"
OFFICIAL_COW_VERSION = "2024"
SHA = re.compile(r"[0-9a-f]{64}\Z")
MONTH = re.compile(r"(19|20)[0-9]{2}-(0[1-9]|1[0-2])\Z")


def _verify_hash(raw, expected):
    if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_SOURCE_BYTES:
        raise ValueError("Empty or oversized COW membership file")
    digest = hashlib.sha256(raw).hexdigest()
    if expected is not None and (
        not isinstance(expected,str) or not SHA.fullmatch(expected) or expected!=digest
    ):
        raise ValueError("Original COW bytes changed or invalid SHA-256")
    return digest


def parse_cow(raw, expected_sha256=None):
    digest = _verify_hash(raw, expected_sha256)
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
        if reader.fieldnames != list(FIELDS):
            raise ValueError("COW 2024 columns differ from expected schema")
        intervals = {}
        count = 0
        for row in reader:
            count += 1
            if count > MAX_ROWS:
                raise ValueError("COW source row limit reached")
            if (not row["ccode"].isdecimal() or not 0 < int(row["ccode"]) < 1000 or
                    not row["stateabb"] or not row["statenme"] or
                    row["version"] != OFFICIAL_COW_VERSION):
                raise ValueError("Unexpected COW identity or version")
            ccode = int(row["ccode"])
            first = date(*[int(row[c]) for c in ("styear","stmonth","stday")])
            last = date(*[int(row[c]) for c in ("endyear","endmonth","endday")])
            if (not date(1816,1,1) <= first <= last <= LATEST_COW_DATE):
                raise ValueError("COW state intervals outside version 2024 scope")
            intervals.setdefault(ccode,[]).append((first,last))
    except (UnicodeError,csv.Error,TypeError,KeyError,OverflowError) as exc:
        raise ValueError("Cannot parse COW v2024 CSV") from exc
    if not intervals or count < 2:
        raise ValueError("Insufficient COW membership data")
    for code, times in intervals.items():
        times.sort()
        if any(a[1] >= z[0] for a,z in zip(times,times[1:])):
            raise ValueError("Overlapping intervals for a COW state code")
    return {"schema":"psychohistory.cow2024_membership_input.v1",
            "version":OFFICIAL_COW_VERSION,"sha256_observed_now":digest,
            "n_intervals":count,"n_distinct_codes_historical":len(intervals),
            "intervals":intervals,
            "hash_matches_prior_observation":expected_sha256 is not None}


def build_gw_with_microstates(gw_base_bytes, gw_micro_bytes,
                              expected_base_sha=None, expected_micro_sha=None):
    base = parse_intervals(gw_base_bytes, expected_base_sha)
    micro = parse_intervals(gw_micro_bytes, expected_micro_sha)
    duplicates = set(base["intervals"]) & set(micro["intervals"])
    if duplicates:
        raise ValueError("GW base/micro membership codes overlap; do not deduplicate silently")
    merged = dict(base["intervals"])
    merged.update(micro["intervals"])
    return {"intervals":merged,
            "n_gw_base_codes":len(base["intervals"]),
            "n_gw_micro_codes":len(micro["intervals"]),
            "n_combined_codes":len(merged),
            "base_sha256_observed_now":base["hash_observed_now"],
            "micro_sha256_observed_now":micro["hash_observed_now"],
            "base_matches_prior_sha":base["source_bytes_pinned_to_prior_observation"],
            "micro_matches_prior_sha":micro["source_bytes_pinned_to_prior_observation"]}


def members(intervals, year, month):
    first=date(year,month,1)
    following=date(year+(month==12),month%12+1,1)
    final=following-timedelta(days=1)
    full=set()
    partial=set()
    for code, times in intervals.items():
        if any(a<=first and z>=final for a,z in times):
            full.add(code)
        elif any(a<=final and z>=first for a,z in times):
            partial.add(code)
    if full & partial:
        raise ValueError("GW/COW full versus partial membership conflict")
    return full,partial


def compare(cow, gw, months):
    if (not isinstance(months,list) or not 1<=len(months)<=20 or
            any(not isinstance(m,str) or not MONTH.fullmatch(m) for m in months) or
            months!=sorted(set(months))):
        raise ValueError("Unique chronological YYYY-MM periods required")
    result=[]
    for ym in months:
        year,month=map(int,ym.split("-"))
        month_last=date(year+(month==12),month%12+1,1)-timedelta(days=1)
        if month_last > LATEST_COW_DATE:
            result.append({"period":ym,"status":"NO_EVALUABLE_COW_AFTER_2024",
                           "n_cow_full_month":None,"n_gw_full_month":None})
            continue
        cow_full,cow_partial=members(cow["intervals"],year,month)
        if month_last > SOURCE_END:
            result.append({
                "period":ym,"status":"COW_POPULATION_ONLY_GW_CENSORED",
                "n_cow_full_month":len(cow_full),
                "n_cow_partial_month":len(cow_partial),
                "n_gw_full_month":None,
                "n_gw_partial_month":None,
                "numeric_code_overlap_not_identity_verified":False,
            })
        else:
            gw_full,gw_partial=members(gw["intervals"],year,month)
            result.append({
                "period":ym,"status":"COW_GW_NUMERIC_CODE_DISCORDANCE_NOT_RECONCILED",
                "n_cow_full_month":len(cow_full),
                "n_cow_partial_month":len(cow_partial),
                "n_gw_full_month":len(gw_full),
                "n_gw_partial_month":len(gw_partial),
                "n_same_numeric_code":len(cow_full & gw_full),
                "n_cow_codes_only":len(cow_full - gw_full),
                "n_gw_codes_only":len(gw_full - cow_full),
                "numeric_code_overlap_not_identity_verified":False,
            })
    return {
        "schema":"psychohistory.cow_gw_denominator_comparison.v1",
        "status":"DESCRIPTIVE_INDEPENDENT_ROSTERS_ONLY_NOT_ASOF",
        "cow_version":"2024","cow_original_scope_ends":"2024-12-31",
        "cow_release_announced_in":"2025-11",
        "cow_release_preprediction_verified_for_2024":False,
        "cow_sha256_observed_now":cow["sha256_observed_now"],
        "cow_hash_matches_prior_observation":cow["hash_matches_prior_observation"],
        "gw_version":"7.0","gw_source_ends":"2020-12-31",
        "gw_base_sha256_observed_now":gw["base_sha256_observed_now"],
        "gw_micro_sha256_observed_now":gw["micro_sha256_observed_now"],
        "n_cow_historical_intervals":cow["n_intervals"],
        "n_cow_historical_codes":cow["n_distinct_codes_historical"],
        "n_gw_base_codes":gw["n_gw_base_codes"],
        "n_gw_micro_codes":gw["n_gw_micro_codes"],
        "n_gw_combined_codes":gw["n_combined_codes"],
        "months":result,
        "cow_code_equals_ucdp_gw_code_proven":False,
        "geographic_concordance_reviewed":False,
        "source_as_of_verified":False,
        "ucdp_event_archive_coverage_verified":False,
        "absent_ucdp_record_means_negative":False,
        "vintage_correct_backtest":False,
        "models_scored":False,"forecast_issued":False,
        "warning":("COW country code is not GW country_id. 2024 roster is "
                   "retrospectively published November 2025; cannot have "
                   "been used by a 2024 forecaster. Published membership "
                   "does not prove UCDP event coverage or zero events."),
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cow",type=Path,required=True)
    p.add_argument("--gw",type=Path,required=True)
    p.add_argument("--micro",type=Path,required=True)
    p.add_argument("--cow-sha256")
    p.add_argument("--gw-sha256")
    p.add_argument("--micro-sha256")
    p.add_argument("--month",action="append",required=True)
    a=p.parse_args()
    cow=parse_cow(a.cow.read_bytes(),a.cow_sha256)
    gw=build_gw_with_microstates(a.gw.read_bytes(),a.micro.read_bytes(),
                                a.gw_sha256,a.micro_sha256)
    print(json.dumps(compare(cow,gw,a.month),sort_keys=True))


if __name__=="__main__":
    main()
