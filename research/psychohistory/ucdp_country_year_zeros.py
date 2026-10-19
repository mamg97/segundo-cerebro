"""Read the *official* UCDP OrganizedViolenceCY 24.1 ZIP, aggregate only.

The 2024 codebook says 24.1 includes ALL GW states 1989--2023 and
explicit country-year zero fatalities and state/non-state/one-sided
existence indicators. A zero is a GED-coded absence under UCDP's
definitions and thresholds, never proof of no actual violence.
These are hindsight evaluation OUTCOMES, not issue-date FEATURES.

Original CSV and country codes stay in volatile GitHub Actions runner;
stdout includes checksums, aggregate counts and warnings ONLY.
"""
from __future__ import annotations
from collections import Counter
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
from zipfile import ZipFile, BadZipFile

OFFICIAL_ZIP = "https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-241-csv.zip"
MAX_ZIP = 3_000_000
MAX_CSV = 12_000_000
FIELDS = ("country_id_cy", "year_cy", "sb_exist_cy", "ns_exist_cy", "os_exist_cy")
YEARS = (1989, 2023)
SHA = re.compile("[0-9a-f]{64}\\Z")


def audit(archive_bytes, years, expected_sha256=None):
    if not isinstance(archive_bytes, bytes) or not 100 < len(archive_bytes) <= MAX_ZIP:
        raise ValueError("Unexpected official ZIP size")
    digest = hashlib.sha256(archive_bytes).hexdigest()
    if expected_sha256 is not None and (not isinstance(expected_sha256, str)
            or not SHA.fullmatch(expected_sha256) or expected_sha256 != digest):
        raise ValueError("Official ZIP hash does not match observed pin")
    if not isinstance(years, list) or not 1 <= len(years) <= 12 or (
        any(type(y) is not int or not YEARS[0] <= y <= YEARS[1] for y in years)
        or years != sorted(set(years))):
        raise ValueError("Unique historical year arguments required")
    try:
        with ZipFile(io.BytesIO(archive_bytes)) as z:
            members = z.infolist()
            if not 1 <= len(members) <= 15:
                raise ValueError("Official UCDP ZIP has unexpected member count")
            csv_members = []
            for m in members:
                p = PurePosixPath(m.filename.replace("\\", "/"))
                if (p.is_absolute() or ".." in p.parts or
                        m.file_size > MAX_CSV or
                        ((m.external_attr >> 16) & 0o170000) == 0o120000):
                    raise ValueError("Unsafe or oversized UCDP archive member")
                if not m.is_dir() and p.suffix.lower() == ".csv":
                    csv_members.append(m)
            if len(csv_members) != 1:
                raise ValueError("Exactly one UCDP country-year CSV is required")
            csv_raw = z.read(csv_members[0])
    except (BadZipFile, RuntimeError, OSError) as e:
        raise ValueError("Unreadable official archive") from e
    csv_digest = hashlib.sha256(csv_raw).hexdigest()
    try:
        reader = csv.DictReader(io.StringIO(csv_raw.decode("utf-8-sig"), newline=""))
        cols = reader.fieldnames
        if not cols or len(cols) != len(set(cols)) or not set(FIELDS).issubset(cols):
            raise ValueError("The official country-year/violence indicators are missing")
        seen = set()
        per_year = Counter()
        for row in reader:
            code, yr = row["country_id_cy"], row["year_cy"]
            if not code or not code.isdecimal() or not 0 < int(code) < 1000:
                raise ValueError("Invalid GW state identifier")
            if not yr or not yr.isdecimal() or not YEARS[0] <= int(yr) <= YEARS[1]:
                raise ValueError("Year outside official 24.1 coverage")
            k = (int(code),int(yr))
            if k in seen:
                raise ValueError("Repeated country-year in official UCDP source")
            seen.add(k)
            flags = [row[k] for k in FIELDS[2:]]
            if any(x not in ("0","1") for x in flags):
                raise ValueError("Malformed or missing existence indicators")
            positive = any(x == "1" for x in flags)
            per_year[(int(yr),"rows")] += 1
            per_year[(int(yr),"positive")] += int(positive)
            per_year[(int(yr),"zero_all_three")] += int(not positive)
            for kind, flag in zip(FIELDS[2:],flags):
                per_year[(int(yr),kind)] += int(flag == "1")
            if len(seen) > 25_000:
                raise ValueError("Unexpectedly large UCDP panel")
    except (UnicodeError, csv.Error, KeyError, TypeError) as e:
        raise ValueError("Cannot parse official UCDP country-year file") from e
    if not 1_000 <= len(seen) <= 25_000:
        raise ValueError("Country-year panel is unexpectedly sparse or large")
    all_years = {y for _,y in seen}
    if all_years != set(range(YEARS[0],YEARS[1]+1)):
        raise ValueError("Missing one or more historical years")
    selected = [{
        "year":y,
        "n_explicit_country_year_rows":per_year[(y,"rows")],
        "n_any_three_violence_flags_one":per_year[(y,"positive")],
        "n_all_three_flags_explicit_zero":per_year[(y,"zero_all_three")],
        "n_sb_exist_one":per_year[(y,"sb_exist_cy")],
        "n_ns_exist_one":per_year[(y,"ns_exist_cy")],
        "n_os_exist_one":per_year[(y,"os_exist_cy")],
        "candidate_monthly_zero_labels_authorized":False,
    } for y in years]
    return {
        "schema":"psychohistory.ucdp_official_country_year_zeros.v1",
        "source":OFFICIAL_ZIP,
        "source_release_version":"24.1",
        "historical_outcome_window":["1989-01-01","2023-12-31"],
        "observed_archive_sha256_now":digest,
        "observed_csv_sha256_now":csv_digest,
        "n_all_country_year_rows":len(seen),
        "n_distinct_years":len(all_years),
        "n_all_country_years_with_any_flag_one":sum(per_year[(y,"positive")] for y in all_years),
        "n_all_country_years_with_all_flags_zero":sum(per_year[(y,"zero_all_three")] for y in all_years),
        "sample_years":selected,
        "source_explicitly_has_three_type_zero_indicators":True,
        "covered_gw_states_verified_against_independent_vintage":False,
        "not_recorded_in_ged_does_not_prove_no_actual_violence":True,
        "country_year_presence_is_not_onset_target":True,
        "latest_monthly_candidate_equivalence_verified":False,
        "historically_available_before_issuance_verified":False,
        "source_as_of_verified":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
        "warning":("Official retrospective UCDP/GED country-year zeros are "
                   "explicitly coded, not imputed from absent event rows; "
                   "they are not monthly Candidate negatives or forecast "
                   "origin-time information. UCDP fatality thresholds can "
                   "omit some real-world violence. No onset score permitted."),
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive",type=Path,required=True)
    p.add_argument("--archive-sha256")
    p.add_argument("--year",action="append",type=int,required=True)
    x=p.parse_args()
    print(json.dumps(audit(x.archive.read_bytes(),x.year,x.archive_sha256),sort_keys=True))


if __name__=="__main__":
    main()
