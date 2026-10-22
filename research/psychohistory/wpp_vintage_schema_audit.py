"""Audit two official UN demographic editions without scoring projections.

WPP 2024 retrospectively estimates 2023. It is not independent ground truth
for judging WPP 2022 projections, and no forecast metric is computed here.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
import re
from pathlib import Path


REQUIRED = ("SortOrder", "LocID", "Notes", "ISO3_code", "ISO2_code",
            "SDMX_code", "LocTypeID", "LocTypeName", "ParentID",
            "Location", "VarID", "Variant", "Time", "TPopulation1Jan",
            "TPopulation1July")
MAX_FILE_BYTES = 50_000_000
MAX_ROWS = 100_000


def _pinned_sha(path: Path, expected: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{64}", expected):
        raise ValueError("A complete SHA-256 pin is required")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("Oversized WPP source")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != expected:
        raise ValueError("WPP source SHA-256 mismatch")


def _countries(path: Path, *, compressed: bool) -> tuple[list[str], dict[str, tuple[str, str, float]], int]:
    opener = gzip.open if compressed else open
    with opener(path, "rt", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        header = list(reader.fieldnames or [])
        if len(header) != 67 or tuple(header[:len(REQUIRED)]) != REQUIRED:
            raise ValueError("Unexpected WPP demographic schema")
        countries: dict[str, tuple[str, str, float]] = {}
        count = 0
        for row in reader:
            count += 1
            if count > MAX_ROWS:
                raise ValueError("Too many WPP rows")
            if None in row or any(value is None for value in row.values()):
                raise ValueError("Malformed WPP row")
            if row["Time"] != "2023" or row["LocTypeID"] != "4":
                continue
            if row["Variant"] != "Medium":
                raise ValueError("Unexpected country variant")
            iso = row["ISO3_code"]
            if not re.fullmatch(r"[A-Z]{3}", iso) or iso in countries:
                raise ValueError("Invalid or duplicated country ISO3")
            if not row["LocID"].isdigit() or not row["Location"]:
                raise ValueError("Invalid country identity")
            try:
                population = float(row["TPopulation1July"])
            except ValueError as exc:
                raise ValueError("Invalid population value") from exc
            if not math.isfinite(population) or population <= 0:
                raise ValueError("Invalid population value")
            countries[iso] = row["LocID"], row["Location"], population
    return header, countries, count


def compare(first: dict[str, tuple[str, str, float]],
            second: dict[str, tuple[str, str, float]],
            expected_country_count: int = 237) -> dict:
    if len(first) != expected_country_count or len(second) != expected_country_count:
        raise ValueError("Unexpected country universe")
    if set(first) != set(second):
        raise ValueError("Country ISO3 universes differ")
    if any(first[iso][:2] != second[iso][:2] for iso in first):
        raise ValueError("Country identifiers differ between editions")
    return {
        "schema": "psychohistory.wpp_vintage_schema_audit.v1",
        "country_count": expected_country_count,
        "matched_country_count": len(first),
        "revised_2023_population_count": sum(first[iso][2] != second[iso][2] for iso in first),
        "2022_edition_2023_projection_compared_with_2024_edition_2023_estimate": True,
        "2024_estimate_is_independent_ground_truth": False,
        "historic_byte_availability_verified": False,
        "predictive_skill_demonstrated": False,
        "forecast_issued": False,
    }


def audit(path_2022: Path, sha_2022: str, path_2024: Path, sha_2024: str) -> dict:
    _pinned_sha(path_2022, sha_2022)
    _pinned_sha(path_2024, sha_2024)
    head_2022, countries_2022, rows_2022 = _countries(path_2022, compressed=False)
    head_2024, countries_2024, rows_2024 = _countries(path_2024, compressed=True)
    if head_2022 != head_2024:
        raise ValueError("Demographic columns differ between editions")
    report = compare(countries_2022, countries_2024)
    report.update({
        "column_count": len(head_2022),
        "rows_2022": rows_2022,
        "rows_2024": rows_2024,
        "source_2022_member_sha256": sha_2022,
        "source_2024_gzip_sha256": sha_2024,
        "complete_2022_parent_zip_verified": False,
    })
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv-2022", required=True, type=Path)
    parser.add_argument("--sha256-2022", required=True)
    parser.add_argument("--gzip-2024", required=True, type=Path)
    parser.add_argument("--sha256-2024", required=True)
    args = parser.parse_args()
    print(json.dumps(audit(args.csv_2022, args.sha256_2022,
                           args.gzip_2024, args.sha256_2024), sort_keys=True))


if __name__ == "__main__":
    main()
