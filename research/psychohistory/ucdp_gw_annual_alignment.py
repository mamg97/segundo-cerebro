"""Compare UCDP official country-years with independent GW7 member-year codes.

NUMERICAL state code overlap is only a descriptive concordance candidate.
Covers only years <= 2020 (GW v7 dataset ends 2020); later UCDP years
are CENSORED, never silently filled by carrying 2020 membership forward.

Separately count 0->1 *country-level coded-violence transitions*. This is
NOT a new dyadic conflict, nor an independently admissible backtest:
past UCDP outcomes and GW v7 are retrospectively published editions.
Original country rows live in ephemeral CI memory; stdout only aggregates.
"""
from __future__ import annotations

from collections import Counter
import argparse
import csv
from datetime import date
import io
import json
from pathlib import Path
from zipfile import ZipFile

from cow_gw_denominator_bridge import build_gw_with_microstates
from ucdp_country_year_zeros import audit as validate_official, FIELDS

GW_LAST_YEAR = 2020
FIRST_YEAR = 1989
UCDP_LAST_YEAR = 2023
SCHEMA = "psychohistory.ucdp_gw_annual_roster_transitions.v1"


def _official_rows(raw_zip):
    with ZipFile(io.BytesIO(raw_zip)) as z:
        choices = [m for m in z.infolist()
                   if not m.is_dir() and m.filename.lower().endswith(".csv")]
        if len(choices) != 1:
            raise ValueError("Expected one official country-year CSV")
        contents = z.read(choices[0])
    reader = csv.DictReader(io.StringIO(contents.decode("utf-8-sig"), newline=""))
    if not reader.fieldnames or not set(FIELDS).issubset(reader.fieldnames):
        raise ValueError("Missing UCDP labels or geography")
    observed = {}
    for row in reader:
        code_text, year_text = row["country_id_cy"], row["year_cy"]
        if not code_text.isdecimal() or not year_text.isdecimal():
            raise ValueError("Non numeric GW-style country or year")
        code, year = int(code_text), int(year_text)
        if not 0 < code < 1000 or not FIRST_YEAR <= year <= UCDP_LAST_YEAR:
            raise ValueError("UCDP row outside expected 24.1 scope")
        key = (code, year)
        if key in observed:
            raise ValueError("Duplicate UCDP country/year")
        flags = [row[k] for k in FIELDS[2:]]
        if any(v not in ("0","1") for v in flags):
            raise ValueError("Missing/invalid violence indicators")
        observed[key] = int("1" in flags)
    return observed


def _gw_anypart_year_roster(intervals, year):
    first, last = date(year, 1, 1), date(year, 12, 31)
    return {code for code, windows in intervals.items()
            if any(a <= last and z >= first for a, z in windows)}


def _transition_summary(observed, year):
    codes = {code for code, y in observed if y == year}
    summary = Counter()
    for code in codes:
        now = observed[(code, year)]
        prior = observed.get((code, year-1))
        if prior is None:
            summary["no_previous_row"] += 1
        elif prior == 0 and now == 1:
            summary["zero_to_one"] += 1
        elif prior == 1 and now == 1:
            summary["one_to_one_persistence"] += 1
        elif prior == 1 and now == 0:
            summary["one_to_zero"] += 1
        else:
            summary["zero_to_zero"] += 1
    return {
        "year": year,
        "n_country_year_rows": len(codes),
        "n_prior_row_missing_left_censored": summary["no_previous_row"],
        "n_annual_coded_violence_zero_to_one_not_dyadic_onset": summary["zero_to_one"],
        "n_annual_coded_violence_one_to_one_persistence": summary["one_to_one_persistence"],
        "n_annual_coded_violence_one_to_zero": summary["one_to_zero"],
        "n_annual_coded_violence_zero_to_zero": summary["zero_to_zero"],
        "onset_of_new_dyadic_conflict_verified": False,
        "country_zero_means_absence_of_all_actual_violence": False,
        "backtest_authorized": False,
    }


def reconcile(zip_bytes, gw_bytes, micro_bytes, years,
              *, ucdp_sha256, gw_sha256, micro_sha256):
    if (not isinstance(years, list) or not 1 <= len(years) <= 12 or
        any(type(y) is not int or not FIRST_YEAR <= y <= UCDP_LAST_YEAR for y in years)
        or years != sorted(set(years))):
        raise ValueError("Unique ordered UCDP country-years 1989..2023 required")
    ucdp_metadata = validate_official(zip_bytes, years, ucdp_sha256)
    gw = build_gw_with_microstates(gw_bytes, micro_bytes, gw_sha256, micro_sha256)
    observations = _official_rows(zip_bytes)
    if len(observations) != ucdp_metadata["n_all_country_year_rows"]:
        raise ValueError("Official rows disagree with UCDP structural validator")
    roster = {}
    for year in years:
        obs_codes = {code for code, y in observations if y == year}
        if year > GW_LAST_YEAR:
            roster[year] = {
                "year":year,"status":"NO_EVALUABLE_GW7_EXPIRED_2020",
                "n_udcp_country_years":len(obs_codes),
                "n_gw_any_year_members":None,
                "n_numeric_matches":None,
                "n_ucdp_codes_without_gw_member":None,
                "n_gw_members_without_ucdp_row":None,
                "numeric_identity_approved":False,
            }
            continue
        gw_codes = _gw_anypart_year_roster(gw["intervals"], year)
        roster[year] = {
            "year":year,"status":"NUMERIC_ROSTER_CANDIDATE_UNREVIEWED",
            "n_udcp_country_years":len(obs_codes),
            "n_gw_any_year_members":len(gw_codes),
            "n_numeric_matches":len(obs_codes & gw_codes),
            "n_ucdp_codes_without_gw_member":len(obs_codes-gw_codes),
            "n_gw_members_without_ucdp_row":len(gw_codes-obs_codes),
            "numeric_identity_approved":False,
        }
    transitions=[_transition_summary(observations,y) for y in years]
    if any(x["n_country_year_rows"] != roster[x["year"]]["n_udcp_country_years"]
           for x in transitions):
        raise ValueError("Cross-check of country-year denominator failed")
    return {
        "schema":SCHEMA,
        "data_type":"RETROSPECTIVE_CROSS_SOURCE_GEOGRAPHY_AND_LABEL_GEOMETRY",
        "ucdp_release_version":"24.1",
        "gw_membership_version":"7.0+microstates",
        "gw_temporal_end":"2020-12-31",
        "source_observed_sha256_now":{
            "ucdp_zip":ucdp_metadata["observed_archive_sha256_now"],
            "gw":gw["base_sha256_observed_now"],
            "micro":gw["micro_sha256_observed_now"],
        },
        "n_official_ucdp_country_year_rows":len(observations),
        "roster_comparisons":[roster[y] for y in years],
        "country_annual_violence_state_transitions":transitions,
        "source_independent_geography_concordance_approved":False,
        "retrospective_annual_transitions_are_new_conflicts":False,
        "feature_bytes_available_asof_verified":False,
        "ucdp_candidate_monthly_scope_verified":False,
        "backtest_authorized":False,
        "brier_computed":False,
        "forecast_issued":False,
        "warning":(
            "GW7 ends in 2020. Cross-source numerical matches are not "
            "approved territorial identities; a 0->1 UCDP country-year "
            "transition is NOT new dyadic conflict onset. Neither UCDP "
            "2024 outcome labels nor GW 2021 roster was known at earlier "
            "issue dates; do not use them as historical predictors."),
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for param in ("ucdp-zip","gw","micro"):
        p.add_argument("--"+param,type=Path,required=True)
        p.add_argument("--"+param+"-sha256",required=True)
    p.add_argument("--year",type=int,action="append",required=True)
    args=p.parse_args()
    result=reconcile(
        args.ucdp_zip.read_bytes(),args.gw.read_bytes(),args.micro.read_bytes(),
        args.year,ucdp_sha256=args.ucdp_zip_sha256,
        gw_sha256=args.gw_sha256,micro_sha256=args.micro_sha256)
    print(json.dumps(result,sort_keys=True))


if __name__=="__main__":
    main()
