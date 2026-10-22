"""Validate a private BLS release-link inventory without reading rates.

The index records official archive links and dates encoded in their URLs.
It is not a cache of release originals or proof of historical availability.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
from datetime import date
from pathlib import Path


HEADERS = ("reference_month", "release_date", "status", "source_url")
RELEASE = re.compile(r"https://www\.bls\.gov/news\.release/archives/empsit_(\d{2})(\d{2})(\d{4})\.(?:htm|pdf)\Z")
ABSENCE_SOURCE = "https://www.bls.gov/cps/methods/2025-federal-government-shutdown-impact-cps.htm"
MAX_FILE_BYTES = 100_000


def _months(start: tuple[int, int], end: tuple[int, int]) -> list[str]:
    year, month = start
    result = []
    while (year, month) <= end:
        result.append(f"{year:04d}-{month:02d}")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return result


def validate(rows: list[dict[str, str]], expected_months: list[str],
             known_absences: set[str]) -> dict:
    if [row["reference_month"] for row in rows] != expected_months:
        raise ValueError("Reference months must be complete, unique and ordered")
    if not known_absences <= set(expected_months):
        raise ValueError("Known absence is outside the expected range")
    releases = 0
    absences = 0
    delayed_over_one_month = 0
    for row in rows:
        month = row["reference_month"]
        if month in known_absences:
            if row["status"] != "not_collected" or row["release_date"] or row["source_url"] != ABSENCE_SOURCE:
                raise ValueError("Known absence must retain its official explanation")
            absences += 1
            continue
        if row["status"] != "archived_release":
            raise ValueError("Unexpected release status")
        match = RELEASE.fullmatch(row["source_url"])
        if match is None:
            raise ValueError("Nonofficial or malformed release URL")
        try:
            encoded = date(int(match.group(3)), int(match.group(1)), int(match.group(2)))
            stated = date.fromisoformat(row["release_date"])
        except ValueError as exc:
            raise ValueError("Invalid release date") from exc
        if encoded != stated:
            raise ValueError("Release date differs from archive filename")
        year, reference = map(int, month.split("-"))
        next_year, next_month = (year + 1, 1) if reference == 12 else (year, reference + 1)
        if stated < date(next_year, next_month, 1):
            raise ValueError("Release precedes the end of the reference month")
        if (stated.year, stated.month) > (next_year, next_month):
            delayed_over_one_month += 1
        releases += 1
    return {
        "schema": "psychohistory.bls_archive_link_inventory.v1",
        "reference_month_count": len(rows),
        "archived_release_link_count": releases,
        "known_absence_count": absences,
        "releases_after_following_month_count": delayed_over_one_month,
        "first_reference_month": expected_months[0],
        "last_reference_month": expected_months[-1],
        "release_dates_from_official_archive_filenames": True,
        "original_release_bytes_archived": False,
        "exact_historical_release_times_verified": False,
        "ruc_vintage_times_verified": False,
        "forecast_issued": False,
    }


def audit(path: Path, expected_sha256: str) -> dict:
    if not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
        raise ValueError("A complete SHA-256 pin is required")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("Oversized archive index")
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected_sha256:
        raise ValueError("Archive index SHA-256 mismatch")
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
    if tuple(reader.fieldnames or ()) != HEADERS:
        raise ValueError("Unexpected archive index columns")
    rows = list(reader)
    if any(set(row) != set(HEADERS) or any(value is None for value in row.values()) for row in rows):
        raise ValueError("Malformed archive index row")
    report = validate(rows, _months((2011, 1), (2026, 9)), {"2025-10"})
    report["index_sha256"] = expected_sha256
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--sha256", required=True)
    arguments = parser.parse_args()
    print(json.dumps(audit(arguments.index, arguments.sha256), sort_keys=True))


if __name__ == "__main__":
    main()
