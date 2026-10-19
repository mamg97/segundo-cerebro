"""Independently enumerate eligible GW states, never impute conflict-free countries.

GW states list version 7.0 ends on 2020-12-31; its researcher page says
posted 2021-05-13. Download of a public mirror in 2026 does not prove
availability of the identical bytes before a historical prediction origin.

This is an outcome-blind, population-only diagnostic, NOT an as-of backtest.
Do NOT merge this roster with UCDP incidents to label missing countries zero
until geographic coverage and release vintages have been authenticated.
"""
from __future__ import annotations

import argparse
import csv
from collections import Counter
from datetime import date, timedelta
import hashlib
import io
import json
import re
from pathlib import Path

GW_SCHEMA = "psychohistory.gw_state_roster_probe.v1"
SOURCE_END = date(2020, 12, 31)
SOURCE_DECLARED_POSTED = date(2021, 5, 13)
GW_VERSION = "7.0"
FIELDS = ("statenumber", "stateid", "countryname", "start", "end")
MONTH_RE = re.compile(r"20[0-9]{2}-(0[1-9]|1[0-2])\Z")
SHA = re.compile(r"[0-9a-f]{64}\Z")
MAX_BYTES = 300000
MAX_INTERVALS = 400


def parse_intervals(raw, expected_sha256=None):
    if not isinstance(raw, bytes) or not raw or len(raw) > MAX_BYTES:
        raise ValueError("Missing/oversized GW state membership source")
    digest = hashlib.sha256(raw).hexdigest()
    if expected_sha256 is not None and (
        not isinstance(expected_sha256, str) or not SHA.fullmatch(expected_sha256)
        or expected_sha256 != digest
    ):
        raise ValueError("Pinned GW mirror bytes differ")
    try:
        # The published GW v7.0 tab file contains legacy non-UTF8 names.
        # Keep original raw bytes/hash untouched; explicitly allow cp1252.
        try:
            decoded = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = raw.decode("cp1252")
        reader = csv.DictReader(io.StringIO(decoded, newline=""), delimiter="\t")
        if reader.fieldnames != list(FIELDS):
            raise ValueError("Unexpected GW source columns")
        records = {}
        count = 0
        for row in reader:
            count += 1
            if count > MAX_INTERVALS:
                raise ValueError("Too many historical state intervals")
            code_text = row["statenumber"]
            if not isinstance(code_text, str) or not code_text.isdecimal():
                raise ValueError("Invalid GW state code")
            code = int(code_text)
            if not 0 < code < 1000:
                raise ValueError("Unexpected GW state code range")
            if not row["stateid"] or not row["countryname"]:
                raise ValueError("Empty GW state description")
            first = date.fromisoformat(row["start"])
            last = date.fromisoformat(row["end"])
            if (first < date(1816, 1, 1) or last > SOURCE_END or first > last):
                raise ValueError("GW coverage outside official version 7.0 span")
            records.setdefault(code, []).append((first, last))
    except (UnicodeError, csv.Error, KeyError, TypeError, OverflowError) as exc:
        raise ValueError("Malformed GW state list") from exc
    if not records or count < 2:
        raise ValueError("GW membership cannot be empty or single-record")
    for code, intervals in records.items():
        intervals.sort()
        if any(a[1] >= b[0] for a, b in zip(intervals, intervals[1:])):
            raise ValueError("Overlapping intervals for the same GW code")
    return {"hash_observed_now": digest, "intervals": records, "n_source_intervals": count,
            "n_distinct_codes_all_time": len(records),
            "source_bytes_pinned_to_prior_observation": expected_sha256 is not None}


def audit_months(dataset, months):
    if not isinstance(months, list) or not 1 <= len(months) <= 30:
        raise ValueError("1-30 requested months required")
    dates = []
    for item in months:
        if not isinstance(item, str) or not MONTH_RE.fullmatch(item):
            raise ValueError("Require modern YYYY-MM month")
        dates.append(date.fromisoformat(item + "-01"))
    if dates != sorted(set(dates)):
        raise ValueError("Origins must be increasing without duplicates")
    rows = []
    for issue in dates:
        next_month = date(issue.year + (issue.month == 12), issue.month % 12 + 1, 1)
        month_end = next_month - timedelta(days=1)
        if month_end > SOURCE_END:
            rows.append({"month": issue.strftime("%Y-%m"),
                         "status": "NO_EVALUABLE_SOURCE_CENSORED_2020",
                         "n_members_full_month": None,
                         "n_part_month_members": None,
                         "source_covers_requested_month": False,
                         "source_as_of_verified": False})
            continue
        full, partial = set(), set()
        for code, intervals in dataset["intervals"].items():
            if any(start <= issue and stop >= month_end for start, stop in intervals):
                full.add(code)
            elif any(start <= month_end and stop >= issue for start, stop in intervals):
                partial.add(code)
        if full & partial:
            raise ValueError("Full and partial memberships overlap")
        rows.append({
            "month": issue.strftime("%Y-%m"),
            "status": "DESCRIPTIVE_GW_ROSTER_NOT_UCDP_TARGET",
            "n_members_full_month": len(full),
            "n_part_month_members": len(partial),
            "source_covers_requested_month": True,
            "source_as_of_verified": False,
        })
    return {
        "schema": GW_SCHEMA,
        "state_system": "Gleditsch-Ward independent states excluding separately listed microstates",
        "state_system_version": GW_VERSION,
        "source_end": SOURCE_END.isoformat(),
        "source_declared_posted": SOURCE_DECLARED_POSTED.isoformat(),
        "observed_mirror_sha256": dataset["hash_observed_now"],
        "source_byte_hash_independently_timestamped_before_historical_issue": False,
        "state_system_is_all_sovereign_countries_including_microstates": False,
        "source_bytes_pinned_to_prior_observation": dataset["source_bytes_pinned_to_prior_observation"],
        "n_historical_source_intervals": dataset["n_source_intervals"],
        "n_distinct_state_codes_over_all_history": dataset["n_distinct_codes_all_time"],
        "months": rows,
        "target_geography_compatible_with_ucdp_verified": False,
        "ucdp_coverage_including_zero_event_states_verified": False,
        "absence_of_events_means_zero_target": False,
        "source_as_of_verified": False,
        "vintage_correct_backtest": False,
        "models_scored": False,
        "forecast_issued": False,
        "warning": (
            "GW membership is an independent population source, not evidence of "
            "UCDP coverage, incident absence, source availability at a historical issue, "
            "or target definition. Source version 7.0 ends 2020 and was posted 2021. "
            "No extrapolation to 2021-2026 is admitted."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gw-list", type=Path, required=True)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--month", action="append", required=True)
    args = parser.parse_args()
    dataset = parse_intervals(args.gw_list.read_bytes(), args.expected_sha256)
    print(json.dumps(audit_months(dataset, args.month), sort_keys=True))


if __name__ == "__main__":
    main()
