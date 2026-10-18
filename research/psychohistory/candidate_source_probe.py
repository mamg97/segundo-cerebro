"""Inspect archived PUBLIC UCDP Candidate event CSV in an ephemeral/private place.

An event CSV lists observed incidents, NEVER the set of zero-event countries.
Its current availability does NOT attest historical publication time or
point-in-time coverage. No event-level data, IDs or forecasts are logged.
"""
from __future__ import annotations
import argparse
import csv
from datetime import date, datetime, time
import hashlib
import io
import json
from pathlib import Path
import re

SOURCE_EDITION = "24.0.12"
SOURCE_URL = "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_0_12.csv"
MAX_BYTES = 80_000_000
MAX_ROWS = 500_000
SHA = re.compile(r"[0-9a-f]{64}\Z")


def _parse_event_date(value):
    # Candidate may encode midnight as YYYY-MM-DD 00:00:00.000.
    # Never silently truncate a genuine non-midnight time or a timezone.
    if not isinstance(value, str):
        raise ValueError("Missing source event date")
    if re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", value):
        return date.fromisoformat(value)
    if not re.fullmatch(r"\\d{4}-\\d{2}-\\d{2} 00:00:00\\.\\d{3}", value):
        raise ValueError("Unexpected Candidate event date format")
    parsed = datetime.fromisoformat(value)
    if parsed.time() != time(0, 0) or parsed.tzinfo is not None:
        raise ValueError("Non-midnight or timezone-specific event date")
    return parsed.date()


def summarize(raw: bytes, *, edition=SOURCE_EDITION, expected_sha256=None):
    if edition != SOURCE_EDITION or not isinstance(raw, bytes):
        raise ValueError("Unsupported Candidate vintage or content type")
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("Empty/oversized Candidate CSV")
    observed_sha = hashlib.sha256(raw).hexdigest()
    if expected_sha256 is not None:
        if not isinstance(expected_sha256, str) or not SHA.fullmatch(expected_sha256):
            raise ValueError("Malformed SHA-256")
        if observed_sha != expected_sha256:
            raise ValueError("Archive bytes differ from pinned SHA-256")
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
        fields = reader.fieldnames
        if fields is None or len(set(fields)) != len(fields):
            raise ValueError("Empty or ambiguous CSV columns")
        id_field = "country_id" if "country_id" in fields else "country_id_ged"
        if id_field not in fields or "date_start" not in fields or "date_end" not in fields:
            raise ValueError("Unsupported event-level Candidate CSV layout")
        if "type_of_violence" not in fields:
            raise ValueError("Missing violence type: unable to interpret event scope")
        count = 0
        countries = set()
        years = set()
        types = set()
        for row in reader:
            count += 1
            if count > MAX_ROWS:
                raise ValueError("Too many Candidate events")
            country = int(row[id_field])
            if country < 1:
                raise ValueError("Invalid country ID")
            start, end = _parse_event_date(row["date_start"]), _parse_event_date(row["date_end"])
            if start > end or end.year > 2024 or start.year < 1989:
                raise ValueError("Future, reversed or invalid event bounds")
            typ = int(row["type_of_violence"])
            if typ not in (1, 2, 3):
                raise ValueError("Unknown type of organized violence")
            countries.add(country)
            years.add(start.year)
            types.add(typ)
    except (UnicodeError, csv.Error, TypeError, KeyError, OverflowError) as exc:
        raise ValueError("Unparseable Candidate event CSV") from exc
    if not count:
        raise ValueError("No events in Candidate source")
    return {
        "schema": "psychohistory.ucdp_candidate_observation.v1",
        "source": "UCDP_CANDIDATE", "edition": edition,
        "url": SOURCE_URL, "observed_sha256": observed_sha,
        "integrity": "OBSERVED_NOT_INDEPENDENTLY_PINNED" if expected_sha256 is None else "MATCHED_SUPPLIED_SHA",
        "n_event_rows": count,
        "n_countries_with_recorded_events": len(countries),
        "first_event_year": min(years),
        "last_event_year": max(years),
        "n_violence_types_observed": len(types),
        "full_country_coverage_known_from_events": False,
        "absent_country_is_conflict_free": False,
        "historical_release_time_independently_verified": False,
        "as_of_verified": False,
        "candidate_equals_final_ged": False,
        "backtest_authorized": False,
        "forecast_issued": False,
        "warning": ("Current bytes and event-country counts do not establish historical "
                    "release date, zero-event country roster or final GED target equivalence."),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--expected-sha256")
    args = parser.parse_args()
    report = summarize(args.csv.read_bytes(), expected_sha256=args.expected_sha256)
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
