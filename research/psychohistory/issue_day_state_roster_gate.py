"""Issue-day state-system roster audit: prevent intra-month look-ahead.

Historical source vintages here are retrospectively observed in 2026.
COW 2024 was published in 2025; GW v7 in 2021. Calculating membership
on the first day from those files does NOT make it genuinely as-of.
Nothing in this module authorizes forecasts, UCDP labels or backtests.
Only bounded aggregate counts may be printed. No country rows/IDs.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import date, timedelta
import json
from pathlib import Path
import re

from cow_gw_denominator_bridge import parse_cow, build_gw_with_microstates
from cow_gw_token_review import _records

SCHEMA = "psychohistory.issue_day_state_roster_gate.v1"
MONTH = re.compile(r"(?:19|20)[0-9]{2}-(?:0[1-9]|1[0-2])\Z")
# Publication dates are DOCUMENTED CLAIMS: insufficient for byte-level as-of proof.
SOURCE_INFO = {
    "COW2024": {"declared_release": date(2025,11,3),
                "coverage_end": date(2024,12,31)},
    "GW7": {"declared_release": date(2021,5,13),
            "coverage_end": date(2020,12,31)},
}


def _month_dates(month):
    if not isinstance(month, str) or not MONTH.fullmatch(month):
        raise ValueError("Canonical YYYY-MM month required")
    y,m=map(int, month.split("-"))
    first=date(y,m,1)
    next_month=date(y+(m==12),m%12+1,1)
    return first,next_month-timedelta(days=1)


def inspect_membership(rows, first, last):
    """Source-internal retrospective geometry, not eligible forecast features."""
    if first>last:
        raise ValueError("Invalid window")
    issue_day = defaultdict(list)
    full_month = defaultdict(list)
    new_after_issue = set()
    exit_after_issue = set()
    for code, token, start, stop in rows:
        if not isinstance(code,int) or isinstance(code,bool) or not 0<code<1000:
            raise ValueError("Invalid state code")
        if not isinstance(token,str) or not re.fullmatch("[A-Z]{3}",token):
            raise ValueError("Invalid state token")
        if not isinstance(start,date) or not isinstance(stop,date) or start>stop:
            raise ValueError("Invalid state interval")
        if start<=first<=stop:
            issue_day[code].append(token)
        if start<=first and stop>=last:
            full_month[code].append(token)
        if first<start<=last:
            new_after_issue.add(code)
        if first<=stop<last:
            exit_after_issue.add(code)
    ambiguous_issue = {k for k,v in issue_day.items() if len(v)>1}
    ambiguous_full = {k for k,v in full_month.items() if len(v)>1}
    first_codes=set(issue_day)-ambiguous_issue
    full_codes=set(full_month)-ambiguous_full
    # Full-month members are a subset of first-day members unless the
    # source contradicts itself. Reject unknown geometry rather than impute.
    if not full_codes.issubset(first_codes):
        raise ValueError("Full-month member absent at first-day anchor")
    return {
        "n_full_month_members":len(full_codes),
        "n_first_day_members":len(first_codes),
        "n_first_day_not_full_month":len(first_codes-full_codes),
        "n_future_month_entrants_observed_retrospectively":len(new_after_issue),
        "n_within_month_exits_observed_retrospectively":len(exit_after_issue),
        "n_ambiguous_issue_day_codes":len(ambiguous_issue),
        "n_ambiguous_full_month_codes":len(ambiguous_full),
        "unambiguous_issue_day_roster_independently_verified":False,
    }


def temporal_gate(source, issue, last):
    info=SOURCE_INFO[source]
    if last>info["coverage_end"]:
        return "SOURCE_COVERAGE_EXPIRED"
    if info["declared_release"]>=issue:
        return "DOCUMENTED_RELEASE_NOT_BEFORE_ISSUE"
    return "METADATA_ONLY_NO_TIME_AUTHENTICATED_BYTES"


def analyze(cow, gw, micro, months, hashes):
    if not isinstance(months,list) or not 1<=len(months)<=24 or months!=sorted(set(months)):
        raise ValueError("Unique ordered issue months required")
    if not isinstance(hashes,dict) or set(hashes)!={"COW2024","GW7","GW7_MICRO"}:
        raise ValueError("Exact source hash controls required")
    checked_cow=parse_cow(cow,hashes["COW2024"])
    checked_gw=build_gw_with_microstates(gw,micro,hashes["GW7"],hashes["GW7_MICRO"])
    cow_records=_records(cow,"cow")
    gw_records=_records(gw,"gw")+_records(micro,"gw")
    periods=[]
    for month in months:
        first,last=_month_dates(month)
        item={"issue_date":first.isoformat(),"issue_month":month}
        for source, rows in (("COW2024",cow_records),("GW7",gw_records)):
            state=temporal_gate(source,first,last)
            section={
                "status":state,
                "source_declared_release":SOURCE_INFO[source]["declared_release"].isoformat(),
                "source_coverage_end":SOURCE_INFO[source]["coverage_end"].isoformat(),
                "retrospective_2026_membership_only":True,
                "source_as_of_verified":False,
                "month_end_membership_used_for_issue_day":False,
                "eligible_for_prediction":False,
            }
            if state=="SOURCE_COVERAGE_EXPIRED":
                section["geometry"]=None
            else:
                section["geometry"]=inspect_membership(rows,first,last)
            item[source]=section
        item["joint_geography_as_of_verified"]=False
        item["country_negative_labels_validated"]=False
        periods.append(item)
    return {
        "schema":SCHEMA,
        "scope":"COW2024 and GW7+micro issue-day state-system membership",
        "observed_sha256":{"cow":checked_cow["sha256_observed_now"],
                           "gw":checked_gw["base_sha256_observed_now"],
                           "micro":checked_gw["micro_sha256_observed_now"]},
        "periods":periods,
        "crosswalk_verified":False,
        "historically_authenticated_vintages":False,
        "country_negative_labels_validated":False,
        "as_of_roster_admissible":False,
        "model_scored":False,
        "forecast_issued":False,
        "warning":("Full-month membership is not the same as issue-day "
                   "membership when a country enters or exits during that "
                   "month. Current retrospective exports were not available "
                   "at historical origins. No UCDP negative labels or "
                   "country ID equivalence are inferred."),
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ("cow","gw","micro"):
        p.add_argument("--"+name,type=Path,required=True)
        p.add_argument("--"+name+"-sha256",required=True)
    p.add_argument("--month",action="append",required=True)
    a=p.parse_args()
    print(json.dumps(analyze(a.cow.read_bytes(),a.gw.read_bytes(),a.micro.read_bytes(),a.month,{
        "COW2024":a.cow_sha256,"GW7":a.gw_sha256,
        "GW7_MICRO":a.micro_sha256}),sort_keys=True))


if __name__=="__main__":
    main()
