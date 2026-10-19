"""COW state-year "present any time" versus January 1 population gate.

Implements the documented *rule* for COW system2024 using the dated
states2024 source intervals. This DOES NOT inspect or certify the
system2024 CSV's historical bytes or identities. COW v2024 was released
in 2025; NONE of these descriptive populations is a historical as-of
forecasting roster. COW code is not UCDP/GW country_id.
Only per-year aggregate figures are printed. No training, labels, scores.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from datetime import date
import json
from pathlib import Path

from cow_gw_denominator_bridge import parse_cow
from cow_gw_token_review import _records

SCHEMA = "psychohistory.cow_annual_state_year_origin_gate.v1"
LAST_YEAR = 2024
DECLARED_RELEASE = date(2025, 11, 3)


def _group(rows):
    groups = defaultdict(set)
    for code, token, first, last in rows:
        groups[code].add(token)
    return groups


def _year_geometry(rows, year):
    first, last = date(year, 1, 1), date(year, 12, 31)
    # system2024 codebook: a state-year is included if membership overlaps
    # ANY portion of the year. No direct official system2024 CSV read here.
    any_rows = [r for r in rows if r[2] <= last and r[3] >= first]
    issue_rows = [r for r in any_rows if r[2] <= first <= r[3]]
    full_rows = [r for r in any_rows if r[2] <= first and r[3] >= last]
    post_origin = [r for r in any_rows if first < r[2] <= last]
    exited = [r for r in any_rows if first <= r[3] < last]
    any_codes, issue_codes, full_codes = map(
        lambda arr: set(_group(arr)), (any_rows, issue_rows, full_rows)
    )
    ambiguous_issue = {
        c for c, entries in _group(issue_rows).items()
        if len(entries) > 1 or sum(r[0] == c for r in issue_rows) > 1
    }
    if ambiguous_issue:
        return {
            "status": "AMBIGUOUS_JAN_1_CODE_DO_NOT_JOIN",
            "n_issue_day_ambiguous_codes": len(ambiguous_issue),
            "n_any_time_year_codes": len(any_codes),
            "n_jan_1_codes": None,
            "n_year_only_codes_not_in_january_roster": None,
            "origin_roster_unique_identity_verified": False,
        }
    if not issue_codes.issubset(any_codes) or not full_codes.issubset(issue_codes):
        raise ValueError("Contradictory state-system time geometry")
    any_pairs={(c,t) for c,t,_,_ in any_rows}
    issue_pairs={(c,t) for c,t,_,_ in issue_rows}
    annual_duplicate_code={c for c, names in _group(any_rows).items()
                           if len(names)>1}
    # Multiple year rows can share code across a political succession,
    # e.g. two abbreviations under one code. Do not collapse into an
    # approved territorial identity or treat pairs as separate countries.
    return {
        "status": "DESCRIPTIVE_RULE_REPLAY_NOT_ASOF",
        "n_any_time_year_codes": len(any_codes),
        "n_jan_1_codes": len(issue_codes),
        "n_full_year_codes": len(full_codes),
        "n_year_only_codes_not_in_january_roster": len(any_codes - issue_codes),
        "n_january_codes_not_stable_whole_year": len(issue_codes - full_codes),
        "n_annual_code_token_pairs":len(any_pairs),
        "n_january_code_token_pairs":len(issue_pairs),
        "n_annual_pairs_not_present_jan_1":len(any_pairs-issue_pairs),
        "n_annual_codes_with_multiple_names":len(annual_duplicate_code),
        "n_future_entry_intervals":len(post_origin),
        "n_exit_intervals_during_year":len(exited),
        "n_issue_day_ambiguous_codes":0,
        "origin_roster_unique_identity_verified":False,
    }


def audit(raw, years, expected_sha256):
    if not isinstance(years,list) or not 1<=len(years)<=30 or (
        any(not isinstance(y,int) or isinstance(y,bool) or
            not 1816<=y<=2100 for y in years) or
        years != sorted(set(years))
    ):
        raise ValueError("1-30 distinct increasing calendar years required")
    src = parse_cow(raw, expected_sha256)
    rows = _records(raw, "cow")
    report=[]
    for year in years:
        if year > LAST_YEAR:
            report.append({
                "origin_date":f"{year}-01-01",
                "status":"NO_EVALUABLE_COW_SOURCE_ENDS_2024",
                "year_geometry":None,
                "source_as_of_verified":False,
            })
            continue
        geom=_year_geometry(rows,year)
        report.append({
            "origin_date":f"{year}-01-01",
            "status":"DOCUMENTED_RELEASE_LATER_THAN_ORIGIN",
            "year_geometry":geom,
            "source_as_of_verified":False,
        })
    return {
        "schema":SCHEMA,
        "origin_policy":"1 January of each requested year",
        "cow_version":"2024",
        "source_declared_release":DECLARED_RELEASE.isoformat(),
        "source_temporal_end":"2024-12-31",
        "source_observed_sha256_now":src["sha256_observed_now"],
        "used_official_system2024_csv":False,
        "official_system2024_year_rows_independently_verified":False,
        "rule_source":"COW State System Membership Codebook v2024, system2024",
        "years":report,
        "cross_system_country_id_concordance_verified":False,
        "source_as_of_verified":False,
        "country_negative_labels_verified":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
        "warning":(
            "COW system2024 includes states belonging at ANY time in a year. "
            "It must not silently become a January 1 forecasting roster. "
            "This reconstructs the documented annual rule from states2024, "
            "NOT the actual system2024 dataset. Current data released 2025 "
            "do not prove historical information available at each origin."
        ),
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cow-states",required=True,type=Path)
    parser.add_argument("--cow-sha256",required=True)
    parser.add_argument("--year",type=int,action="append",required=True)
    args=parser.parse_args()
    print(json.dumps(audit(args.cow_states.read_bytes(),args.year,
                           args.cow_sha256),sort_keys=True))


if __name__=="__main__":
    main()
