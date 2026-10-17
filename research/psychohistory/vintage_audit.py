"""Offline audit of historical UCDP OrganizedViolenceCY source *versions*.

An old release is not necessarily the set of files available at an earlier
forecast origin. In particular, 2025-published v25.1 cannot validate a forecast
purportedly issued in 2016 or 2020. Archived 23.1 is XLSX-only and intentionally
not parsed through this standard-library CSV tool.

No network calls, credentials, outputs in Git, or invented release timestamps.
Only accepts ZIP archives supplied with a previously documented SHA-256.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
import math
import re
import zipfile
from pathlib import Path

OFFICIAL_VINTAGES = {
    "24.1": {"earliest_possible_year": 2024, "archive": "https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-241-csv.zip"},
    "25.1": {"earliest_possible_year": 2025, "archive": "https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-251-csv.zip"},
    "26.1": {"earliest_possible_year": 2026, "archive": "https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip"},
}
THRESHOLD = 25
MAX_CSV_BYTES = 50_000_000


def _field(row, name):
    available = (name, name + "_cy")
    choices = [row[key] for key in available if key in row and row[key] not in (None, "")]
    if len(choices) != 1:
        raise ValueError("Missing or ambiguous country-year field: " + name)
    return choices[0]


def load_csv_vintage(path: Path, version: str, expected_sha256: str):
    """Reads a source archive without extracting files, checking bytes first."""
    if version not in OFFICIAL_VINTAGES:
        raise ValueError("Unsupported CSV version: no inferred field mapping")
    if not isinstance(expected_sha256, str) or not re.fullmatch(r"[a-f0-9]{64}", expected_sha256):
        raise ValueError("A 64-character pinned SHA-256 is required")
    raw = path.read_bytes()
    actual_sha = hashlib.sha256(raw).hexdigest()
    if actual_sha != expected_sha256:
        raise ValueError("Archive bytes changed from the expected checksum")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        entries = [i for i in z.infolist() if i.filename.lower().endswith(".csv") and not i.is_dir()]
        if len(entries) != 1 or entries[0].file_size > MAX_CSV_BYTES:
            raise ValueError("Archive should have exactly one bounded CSV")
        csv_bytes = z.read(entries[0])
    try:
        reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
        rows = {}
        for raw_row in reader:
            country = int(_field(raw_row, "country_id"))
            year = int(_field(raw_row, "year"))
            deaths = float(_field(raw_row, "sb_total_deaths_best"))
            if country < 1 or year < 1989 or not math.isfinite(deaths) or deaths < 0 or int(deaths) != deaths:
                raise ValueError("Invalid country-year or fatalities")
            v = raw_row.get("Version", raw_row.get("Version_cy"))
            if v is not None and str(v).strip().lstrip("v") != version:
                raise ValueError("Version column contradicts requested vintage")
            key = (country, year)
            if key in rows:
                raise ValueError("Duplicate country-year in vintage")
            rows[key] = int(deaths)
    except (UnicodeError, KeyError, TypeError) as exc:
        raise ValueError("Invalid official CSV structure") from exc
    if not rows:
        raise ValueError("Empty country-year source")
    years = sorted({y for _, y in rows})
    if years[-1] > OFFICIAL_VINTAGES[version]["earliest_possible_year"] - 1:
        raise ValueError("Archived version reports a future year beyond the nominal release")
    return {"version": version, "sha256": actual_sha, "rows": rows,
            "countries": len({c for c, _ in rows}), "year_from": years[0],
            "year_to": years[-1], "url": OFFICIAL_VINTAGES[version]["archive"]}


def compare_vintages(earlier, later, threshold=THRESHOLD):
    """Descriptive revision diagnostics only; never report forecasting skill."""
    if earlier["version"] == later["version"]:
        raise ValueError("Need two different releases")
    if int(earlier["version"].split(".")[0]) >= int(later["version"].split(".")[0]):
        raise ValueError("Chronological versions must be increasing")
    if not isinstance(threshold, int) or isinstance(threshold, bool) or threshold < 1:
        raise ValueError("Invalid observation threshold")
    old, new = earlier["rows"], later["rows"]
    shared = sorted(old.keys() & new.keys())
    if not shared:
        raise ValueError("No common country-year observations")
    revised_deaths = sum(old[k] != new[k] for k in shared)
    revised_binary = sum((old[k] >= threshold) != (new[k] >= threshold) for k in shared)
    # Differences in roster size are unknown coverage, not negative observations.
    return {"schema": "psychohistory.vintage_comparison.v1",
            "earlier_version": earlier["version"], "later_version": later["version"],
            "source_sha256": {"earlier": earlier["sha256"], "later": later["sha256"]},
            "shared_country_years": len(shared),
            "changed_death_counts": revised_deaths,
            "changed_threshold_labels": revised_binary,
            "changed_label_fraction": revised_binary / len(shared),
            "only_earlier": len(old.keys() - new.keys()), "only_later": len(new.keys() - old.keys()),
            "threshold": threshold,
            "as_of_verified": False, "prospective_eligible": False,
            "caveat": "Version comparison only. Source release dates, as-of provenance and origin-date availability were not independently verified."}


def vintage_gate(version: str, issue_year: int):
    """Fail closed: an official archive label is not independently dated proof."""
    if version not in OFFICIAL_VINTAGES or not isinstance(issue_year, int):
        raise ValueError("Invalid release or origin")
    earliest = OFFICIAL_VINTAGES[version]["earliest_possible_year"]
    return {"nominally_possible": issue_year >= earliest,
            "available_as_of_verified": False,
            "status": "NOMINALLY_IMPOSSIBLE" if issue_year < earliest else "NEEDS_INDEPENDENT_DATE_EVIDENCE",
            "reason": "Year of release is a necessary, not sufficient, condition for availability at issue time."}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--earlier", type=Path, required=True)
    cli.add_argument("--earlier-version", choices=tuple(OFFICIAL_VINTAGES), required=True)
    cli.add_argument("--earlier-sha256", required=True)
    cli.add_argument("--later", type=Path, required=True)
    cli.add_argument("--later-version", choices=tuple(OFFICIAL_VINTAGES), required=True)
    cli.add_argument("--later-sha256", required=True)
    cli.add_argument("--output", type=Path, required=True)
    a = cli.parse_args()
    e = load_csv_vintage(a.earlier, a.earlier_version, a.earlier_sha256)
    l = load_csv_vintage(a.later, a.later_version, a.later_sha256)
    report = compare_vintages(e, l)
    # Never write evidence or results inside the public source repository.
    if a.output.resolve().is_relative_to(Path(__file__).resolve().parents[2]):
        raise ValueError("Private results must not be written inside the repository")
    a.output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with a.output.open("x") as out:
        json.dump(report, out, sort_keys=True, indent=2)
        out.write("\n")
    a.output.chmod(0o600)
    print(json.dumps({"shared": report["shared_country_years"], "changed_labels": report["changed_threshold_labels"],
                      "as_of_verified": False, "written": True}))


if __name__ == "__main__":
    main()
