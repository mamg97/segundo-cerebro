"""Compare official COW System2024 country-years to independent states2024 intervals.

Directly reads official System2024.zip published by Correlates of War.
All source bytes and country rows stay in an ephemeral runner. The
reconciliation validates code/year *sets*, NOT country label identity,
GW/UCDP concordance, historical as-of availability, negative outcomes,
or forecasting performance. Stdout contains counts and hashes ONLY.
"""
from __future__ import annotations

from collections import defaultdict
import csv
import hashlib
import io
import json
from zipfile import ZipFile

from cow_gw_denominator_bridge import parse_cow
from cow_gw_token_review import _records
from cow_official_system2024 import inspect as inspect_zip

OFFICIAL_PATH = "System2024/system2024.csv"
SCHEMA = "psychohistory.cow_official_system2024_reconciliation.v1"
FIELDS = ["ccode", "stateabb", "statenme", "year"]


def reconcile(raw_zip, states_raw, archive_hash, states_hash, csv_hash, years):
    """Fail closed on missing exact pins, conflicting IDs and malformed rows."""
    def checked(data, expected, label):
        if (not isinstance(expected, str) or len(expected) != 64
                or any(c not in "0123456789abcdef" for c in expected)
                or hashlib.sha256(data).hexdigest() != expected):
            raise ValueError(label + " SHA-256 mismatch")
    checked(raw_zip, archive_hash, "Official ZIP")
    checked(states_raw, states_hash, "Independent state intervals")
    metadata = inspect_zip(raw_zip)
    with ZipFile(io.BytesIO(raw_zip)) as archive:
        csv_data = archive.read(OFFICIAL_PATH)
    checked(csv_data, csv_hash, "Extracted official CSV")
    if not isinstance(years, list) or not 1 <= len(years) <= 24 or (
            any(not isinstance(y, int) or isinstance(y, bool)
                or not 1816 <= y <= 2024 for y in years)
            or years != sorted(set(years))):
        raise ValueError("Years must be sorted unique integers 1816..2024")

    official = {}
    for record in csv.DictReader(io.StringIO(csv_data.decode("utf-8-sig"), newline="")):
        if list(record) != FIELDS or None in record:
            raise ValueError("Unexpected official COW system2024 header/row")
        ccode = record["ccode"]
        year_txt = record["year"]
        token = record["stateabb"]
        if (not ccode.isdecimal() or not year_txt.isdecimal()
                or not 0 < int(ccode) < 1000
                or not 1816 <= int(year_txt) <= 2024
                or not token or not token.isupper()
                or len(token) != 3
                or not record["statenme"].strip()):
            raise ValueError("Malformed official state-year")
        key = (int(ccode), int(year_txt))
        if key in official:
            raise ValueError("Official dataset has repeated code/year")
        official[key] = token
    if len(official) != metadata["official_csv_rows"]:
        raise ValueError("Official row cardinality changed")

    parse_cow(states_raw, states_hash)
    expected = set()
    expected_tokens = defaultdict(set)
    for c, token, begin, end in _records(states_raw, "cow"):
        for year in range(begin.year, end.year + 1):
            key=(c,year)
            expected.add(key)
            expected_tokens[key].add(token)

    official_set=set(official)
    intersection=official_set & expected
    extra=official_set - expected
    missing=expected - official_set
    expected_ambiguous={k for k,tokens in expected_tokens.items() if len(tokens)>1}
    token_mismatch=sum(official[k] not in expected_tokens[k] for k in intersection)
    same_token=sum(official[k] in expected_tokens[k] for k in intersection)
    yearly=[]
    for year in years:
        actual={c for c,y in official_set if y==year}
        expected_year={c for c,y in expected if y==year}
        collisions={c for c,y in expected_ambiguous if y==year}
        yearly.append({
            "year":year,"n_official_codes":len(actual),
            "n_reconstructed_codes":len(expected_year),
            "n_missing_reconstructed":len(expected_year-actual),
            "n_extra_official":len(actual-expected_year),
            "n_multi_abbreviation_codes_in_intervals":len(collisions),
            "n_official_token_absent_from_source_intervals":sum(
                official[(c,year)] not in expected_tokens[(c,year)]
                for c in actual & expected_year),
            "source_as_of_verified":False,
        })
    return {
        "schema":SCHEMA,
        "status":("CODE_YEAR_SETS_MATCHED_NO_ASOF" if not extra and not missing
                  else "OFFICIAL_AND_RECONSTRUCTED_CODE_YEAR_DISCORDANCE"),
        "official_archive_sha256_observed_2026":archive_hash,
        "official_csv_sha256_observed_2026":csv_hash,
        "external_interval_sha256_observed_2026":states_hash,
        "n_official_code_years":len(official),
        "n_reconstructed_code_years":len(expected),
        "n_matching_code_years":len(intersection),
        "n_official_only_code_years":len(extra),
        "n_reconstruction_only_code_years":len(missing),
        "n_reconstructed_code_years_with_multiple_abbreviations":len(expected_ambiguous),
        "n_official_tokens_matching_any_source_interval":same_token,
        "n_official_tokens_not_present_in_source_interval_candidates":token_mismatch,
        "years":yearly,
        "official_code_year_set_reconciled":not extra and not missing,
        "historical_state_identity_reconciled":False,
        "source_as_of_verified":False,
        "historical_byte_timestamp_verified":False,
        "country_negative_labels_verified":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
        "warning":(
            "Direct official System2024 CSV checked against an independent "
            "interval source; code-year equality is not geographic identity "
            "or temporal availability. Published COW edition dates to 2025. "
            "No UCDP event coverage, absence-as-zero, or forecast is certified."),
    }


if __name__ == "__main__":
    import argparse
    from pathlib import Path
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--official-zip",type=Path,required=True)
    p.add_argument("--intervals",type=Path,required=True)
    p.add_argument("--official-zip-sha256",required=True)
    p.add_argument("--official-csv-sha256",required=True)
    p.add_argument("--interval-sha256",required=True)
    p.add_argument("--year",action="append",type=int,required=True)
    a=p.parse_args()
    print(json.dumps(reconcile(a.official_zip.read_bytes(),a.intervals.read_bytes(),
        a.official_zip_sha256,a.interval_sha256,a.official_csv_sha256,a.year),
        sort_keys=True))
