"""Audit a private ALFRED UNRATE initial-release ZIP, without network or scoring."""

import argparse
import csv
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
from pathlib import Path
import zipfile


def month_range(start, end):
    if start.day != 1 or end.day != 1 or start > end:
        raise ValueError("expected ordered month-start boundaries")
    current = start
    while current <= end:
        yield current
        current = date(current.year + (current.month == 12), current.month % 12 + 1, 1)


def audit(raw, expected_sha256, start, end):
    if hashlib.sha256(raw).hexdigest() != expected_sha256:
        raise ValueError("archive hash mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        names = archive.namelist()
        expected = {"README.txt", "obs.,_initial_release_only.csv"}
        if len(names) != 2 or set(names) != expected:
            raise ValueError("unexpected or duplicate ZIP members")
        if any(item.file_size > 2_000_000 for item in archive.infolist()):
            raise ValueError("oversized member")
        readme = archive.read("README.txt").decode("utf-8-sig")
        if "Series ID: UNRATE" not in readme.splitlines() or "Output Format: Observations, Initial Release Only" not in readme.splitlines():
            raise ValueError("wrong series or output format")
        reader = csv.DictReader(io.StringIO(archive.read("obs.,_initial_release_only.csv").decode("utf-8-sig")))
        if reader.fieldnames != ["period_start_date", "UNRATE", "realtime_start_date"]:
            raise ValueError("unexpected CSV schema")
        rows = list(reader)
    expected_months = [d.isoformat() for d in month_range(date.fromisoformat(start), date.fromisoformat(end))]
    if [row["period_start_date"] for row in rows] != expected_months:
        raise ValueError("missing, duplicate, unordered or out-of-range reference month")
    observations = []
    for row in rows:
        if None in row or any(value is None for value in row.values()):
            raise ValueError("malformed CSV row")
        period = date.fromisoformat(row["period_start_date"])
        realtime = date.fromisoformat(row["realtime_start_date"])
        next_month = date(period.year + (period.month == 12), period.month % 12 + 1, 1)
        if realtime < next_month:
            raise ValueError("release date precedes completion of reference month")
        value = row["UNRATE"].strip()
        missing = value in ("", ".")
        if not missing:
            try:
                number = Decimal(value)
            except InvalidOperation as exc:
                raise ValueError("invalid rate") from exc
            if not number.is_finite() or not Decimal(0) <= number <= Decimal(100):
                raise ValueError("invalid rate")
        observations.append({"reference_month": period.isoformat(), "rate_percent": None if missing else value,
                             "alfred_realtime_start_date": realtime.isoformat(),
                             "status": "MISSING" if missing else "INITIAL_RELEASE_ARCHIVED_BY_ALFRED"})
    return {"schema": "alfred-initial-release-audit-v1", "sha256": expected_sha256,
            "temporal_resolution": "day", "intraday_availability_verified": False,
            "original_bls_bytes_verified": False, "forecast_issued": False,
            "observation_count": len(observations), "available_count": sum(o["rate_percent"] is not None for o in observations),
            "observations": observations}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.archive.read_bytes(), args.sha256, args.start, args.end)
    with args.output.open("x") as handle:
        json.dump(result, handle, indent=2)
        handle.write("\n")
    print(json.dumps({key: result[key] for key in ("schema", "observation_count", "available_count", "forecast_issued")}))


if __name__ == "__main__":
    main()
