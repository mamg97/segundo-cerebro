"""Validate ALFRED daily revision intervals and reconstruct vintages; no forecast."""

import argparse
from collections import OrderedDict
import csv
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

from alfred_initial_release_audit import month_range


def iso_day(value):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("expected ISO calendar date")
    return date.fromisoformat(value)


def rate(value):
    if value in ("", "."):
        return None
    try:
        number = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("invalid rate") from exc
    if not number.is_finite() or not Decimal(0) <= number <= Decimal(100):
        raise ValueError("invalid rate")
    return str(number)


def read_export(raw, digest, member, output_format):
    if len(raw) > 5_000_000 or not re.fullmatch(r"[0-9a-f]{64}", digest) or hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError("archive integrity or size failure")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        names = archive.namelist()
        if len(names) != 2 or set(names) != {"README.txt", member}:
            raise ValueError("unexpected or duplicate archive members")
        if any(i.file_size > 2_000_000 for i in archive.infolist()):
            raise ValueError("oversized archive member")
        readme = archive.read("README.txt").decode("utf-8-sig")
        lines = readme.splitlines()
        if "Series ID: UNRATE" not in lines or "Output Format: " + output_format not in lines:
            raise ValueError("wrong series or format")
        for label, value in [("Units", "Percent"), ("Frequency", "Monthly"), ("Seasonal Adjustment", "Seasonally Adjusted")]:
            if not re.search(r"(?m)^" + label + r"\s*\n" + value + r"\s+\d{4}-\d{2}-\d{2}", readme):
                raise ValueError("unexpected units, frequency or adjustment")
        created = re.findall(r"(?m)^File Created: (\d{4}-\d{2}-\d{2}) ", readme)
        if len(created) != 1:
            raise ValueError("missing or ambiguous export date")
        exported_on = iso_day(created[0]).isoformat()
        reader = csv.DictReader(io.StringIO(archive.read(member).decode("utf-8-sig")))
        rows = list(reader)
        if not rows or any(None in row or any(v is None for v in row.values()) for row in rows):
            raise ValueError("empty or malformed CSV")
        return exported_on, reader.fieldnames, rows


def audit(raw, digest, start, end):
    exported_on, headers, rows = read_export(raw, digest, "obs._by_real-time_period.csv", "Observations by Real-Time Period")
    if headers != ["period_start_date", "UNRATE", "realtime_start_date", "realtime_end_date"]:
        raise ValueError("unexpected period schema")
    expected = [d.isoformat() for d in month_range(iso_day(start), iso_day(end))]
    months = OrderedDict()
    previous_key = None
    for row in rows:
        month = iso_day(row["period_start_date"])
        first = iso_day(row["realtime_start_date"])
        last = iso_day(row["realtime_end_date"]) if row["realtime_end_date"] else None
        key = (month, first)
        if previous_key is not None and key <= previous_key:
            raise ValueError("duplicate or unordered interval")
        previous_key = key
        next_month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)
        if month.day != 1 or first < next_month or first.isoformat() > exported_on:
            raise ValueError("invalid reference or release date")
        if last is not None and (last < first or last.isoformat() > exported_on):
            raise ValueError("invalid interval end")
        segments = months.setdefault(month.isoformat(), [])
        if segments:
            prior_end = segments[-1]["end"]
            if prior_end is None or iso_day(prior_end) + timedelta(days=1) != first:
                raise ValueError("gap, overlap or premature open interval")
        segments.append({"start": first.isoformat(), "end": last.isoformat() if last else None, "rate_percent": rate(row["UNRATE"])})
    if list(months) != expected:
        raise ValueError("missing or out-of-range reference months")
    if any(segments[-1]["end"] is not None for segments in months.values()):
        raise ValueError("truncated terminal interval")
    return {"schema": "alfred-asof-audit-v1", "source_sha256": digest, "exported_on": exported_on,
            "month_count": len(months), "interval_count": len(rows), "months": months,
            "temporal_resolution": "day", "intraday_availability_verified": False,
            "original_bls_bytes_verified": False, "forecast_issued": False}


def select(report, cut):
    """Inclusive daily intervals; callers must supply the result of audit()."""
    cut = iso_day(cut).isoformat()
    if cut > report["exported_on"]:
        raise ValueError("cut after export date")
    selected = []
    for month, segments in report["months"].items():
        active = [s for s in segments if s["start"] <= cut and (s["end"] is None or cut <= s["end"])]
        if len(active) > 1 or (not active and cut >= segments[0]["start"]):
            raise ValueError("ambiguous or missing active interval")
        segment = active[0] if active else None
        status = "NOT_YET_RELEASED" if segment is None else "MISSING" if segment["rate_percent"] is None else "AVAILABLE"
        selected.append({"reference_month": month, "status": status,
                         "rate_percent": segment["rate_percent"] if segment else None,
                         "vintage_start": segment["start"] if segment else None})
    return selected


def compare_export(report, raw, digest, cuts):
    if not cuts or len(cuts) != len(set(cuts)) or cuts != sorted(cuts):
        raise ValueError("expected unique ordered cuts")
    for cut in cuts:
        iso_day(cut)
    member = "vintages_starting_" + cuts[0] + ".csv"
    exported_on, headers, rows = read_export(raw, digest, member, "Observations by Vintage Date, All Observations")
    if exported_on != report["exported_on"]:
        raise ValueError("export dates differ")
    columns = ["UNRATE_" + cut.replace("-", "") for cut in cuts]
    if headers != ["observation_date"] + columns:
        raise ValueError("unexpected vintage columns")
    exported_months = [r["observation_date"] for r in rows]
    if len(exported_months) != len(set(exported_months)) or exported_months != sorted(exported_months):
        raise ValueError("duplicate or unordered export months")
    if not set(exported_months) <= set(report["months"]):
        raise ValueError("export outside audited coverage")
    checked = 0
    for cut, column in zip(cuts, columns):
        reconstructed = {r["reference_month"]: r for r in select(report, cut)}
        for row in rows:
            expected, actual = reconstructed[row["observation_date"]]["rate_percent"], rate(row[column])
            if (expected is None) != (actual is None) or (expected is not None and Decimal(expected) != Decimal(actual)):
                raise ValueError("vintage reconstruction mismatch")
            checked += 1
        if any(r["rate_percent"] is not None for m, r in reconstructed.items() if m not in exported_months):
            raise ValueError("export omitted available month")
    return {"cells_matched": checked, "exported_months": len(rows), "cuts": cuts, "vintage_export_sha256": digest}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--cuts", nargs="+", required=True)
    parser.add_argument("--vintage-archive", type=Path, required=True)
    parser.add_argument("--vintage-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = audit(args.archive.read_bytes(), args.sha256, args.start, args.end)
    report["crosscheck"] = compare_export(report, args.vintage_archive.read_bytes(), args.vintage_sha256, args.cuts)
    report["selected_vintages"] = {cut: select(report, cut) for cut in args.cuts}
    with args.output.open("x") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(json.dumps({k: report[k] for k in ["month_count", "interval_count", "crosscheck", "forecast_issued"]}))


if __name__ == "__main__":
    main()
