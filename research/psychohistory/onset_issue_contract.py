"""Fail-closed issue-date contract for experimental UCDP country-year onset1.

Target: intrastate COUNTRY onset1 in calendar year Y; hypothetical
issue 1 January Y. UCDP 25.1 is a retrospective RESOLUTION
dataset, not evidence that its bytes or covariates were available at
the issue origin. Absence of an event row, an existence flag or a
previous-year country-year row cannot certify the eligible risk set.

The exercise computes NO probabilities, Brier scores, or real issues.
All printed output consists of aggregate counts and immutable rules.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date, timedelta
from hashlib import sha256
import io
import json
from pathlib import Path
import re

from ucdp_onset_v251_semantics import _verify, read_source

SCHEMA = "psychohistory.ucdp_country_onset_issue_contract.v1"
TARGET = "ucdp25.1_intrastate_country_onset1"
VERSION = "25.1"
MIN_YEAR = 1947
MAX_YEAR = 2024
SOURCE_SHA = "e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe6a"
REQUIRED = ("year", "gwno_a", "newconf", "onset1", "onset5")


def parse_day(text):
    if not isinstance(text, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        raise ValueError("Require a complete ISO calendar date YYYY-MM-DD")
    try:
        d = date.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("Not a valid calendar date") from exc
    if d.isoformat() != text:
        raise ValueError("Noncanonical date")
    return d


def decide_fixture(f):
    """Evaluate a *synthetic-only* manifest. No external witness verifier exists.

    Even synthetically complete, early-available evidence cannot turn this
    function into a real-source time witness or authorize scoring.
    """
    expected = {"issue_date", "target_year", "target_id", "outcome_version",
                "prior_year", "prior_year_intrastate_active",
                "prior_year_coverage_verified", "prior_year_membership_verified",
                "activity_source_available_at", "membership_source_available_at",
                "feature_set_frozen_at"}
    if not isinstance(f, dict) or set(f) != expected:
        raise ValueError("Missing/extra issue contract fields")
    issue = parse_day(f["issue_date"])
    if type(f["target_year"]) is not int or not MIN_YEAR <= f["target_year"] <= MAX_YEAR:
        raise ValueError("Outside 25.1's eligible research year range")
    if issue != date(f["target_year"], 1, 1):
        raise ValueError("Must issue at 00:00 on January 1 of the target year")
    if (f["target_id"] != TARGET or f["outcome_version"] != VERSION
            or type(f["prior_year"]) is not int
            or f["prior_year"] != issue.year-1):
        raise ValueError("Target identity, version and prior-year semantics are fixed")
    active = f["prior_year_intrastate_active"]
    if active is not None and type(active) is not bool:
        raise ValueError("Unknown or boolean intrastate status required")
    if any(type(f[k]) is not bool for k in (
            "prior_year_coverage_verified",
            "prior_year_membership_verified")):
        raise ValueError("Evidence decisions must be boolean, not truthy strings")

    seen={}
    for field in ("activity_source_available_at",
                  "membership_source_available_at","feature_set_frozen_at"):
        val=f[field]
        seen[field]=parse_day(val) if val is not None else None
        # A completed 2020 annual observation, for example, cannot
        # legitimately be described as publicly available during 2020.
        if field=="activity_source_available_at" and seen[field] is not None:
            if seen[field] <= date(f["prior_year"],12,31):
                raise ValueError("Prior-year outcome source cannot predate year-end")
    missing_reasons=[]
    if active is True:
        missing_reasons.append("COUNTRY_WITH_PREVIOUS_INTRASTATE_ACTIVITY_NOT_PROVISIONAL_RISK")
    elif active is None:
        missing_reasons.append("PRIOR_ACTIVITY_UNKNOWN")
    if not f["prior_year_coverage_verified"]:
        missing_reasons.append("PRIOR_ACTIVITY_COVERAGE_UNVERIFIED")
    if not f["prior_year_membership_verified"]:
        missing_reasons.append("ISSUE_DAY_COUNTRY_MEMBERSHIP_UNVERIFIED")
    for field in seen:
        if seen[field] is None:
            missing_reasons.append(field.upper()+"_MISSING")
        elif seen[field] >= issue:
            missing_reasons.append(field.upper()+"_NOT_BEFORE_ISSUE")
    if not missing_reasons:
        missing_reasons.append("BYTE_LEVEL_HISTORICAL_WITNESSES_NOT_INTEGRATED")
    return {
        "schema":SCHEMA,
        "target":TARGET,"outcome_version":VERSION,
        "hypothetical_issue_date":issue.isoformat(),
        "hypothetical_resolution_year":issue.year,
        "horizon":"one complete calendar year",
        "risk_unit":"country-year (not future conflict ID)",
        "provisional_prior_activity_clear":active is False,
        "blocking_reasons":missing_reasons,
        "vintage_verified_by_independent_historical_witness":False,
        "geographic_crosswalk_approved":False,
        "full_risk_set_at_issue_verified":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
    }


def reference_audit(raw, expected_sha=SOURCE_SHA, years=(1989, 2006, 2019, 2020, 2023, 2024)):
    """Read official 25.1 outcomes, report predecessor-row availability only.

    Existence of a row in Y-1 does NOT mean no ongoing conflict in Y-1
    or that row was available before the issue date in Y.
    """
    _verify(raw, expected_sha, "official country onset reference")
    if (not isinstance(years, tuple) or not years or len(years)>12 or
            any(type(y) is not int or not MIN_YEAR <= y <= MAX_YEAR for y in years)
            or list(years)!=sorted(set(years))):
        raise ValueError("Ordered unique research years required")
    # Assert the official schema, temporal coverage, unique codes/year
    # and country-level zero-duplicate property before inspecting.
    read_source(raw, expected_sha, "intrastate_country")
    reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig"),newline=""))
    original=reader.fieldnames
    stripped=[s.strip() for s in original] if original else []
    if len(set(stripped))!=len(stripped) or not set(REQUIRED).issubset(stripped):
        raise ValueError("Onset reference has changed fields")
    reader.fieldnames=stripped
    records={}
    for row in reader:
        k=(int(row["gwno_a"]),int(row["year"]))
        if k in records:
            raise ValueError("Repeated country-year reference row")
        records[k]=row
    totals=[]
    for year in years:
        selected=[(code,row) for (code,y),row in records.items() if y==year]
        prior=sum((code,year-1) in records for code,_ in selected)
        onset1=sum(row["onset1"].strip()=="1" for _,row in selected)
        onset5=sum(row["onset5"].strip()=="1" for _,row in selected)
        unknown=sum(row["onset1"].strip() not in ("0","1") for _,row in selected)
        incompatible=sum(row["onset5"].strip()=="1" and
                         row["onset1"].strip()!="1" for _,row in selected)
        totals.append({
            "year":year,"n_country_year_records":len(selected),
            "n_with_previous_year_country_row":prior,
            "n_without_previous_year_country_row":len(selected)-prior,
            "n_onset1_ones":onset1,"n_onset5_ones":onset5,
            "n_missing_onset1":unknown,
            "n_onset5_without_onset1":incompatible,
            "known_activity_before_issue_from_this_file":False,
            "confirmed_risk_set_size":None,
        })
    return {
        "schema":"psychohistory.udcp_25_1_country_outcome_row_coverage.v1",
        "source_version":VERSION,
        "observed_source_sha256_now":sha256(raw).hexdigest(),
        "n_annual_country_year_outcome_rows":len(records),
        "years":totals,
        "target_contract":TARGET,
        "prior_country_row_does_not_certify_prior_year_peace":True,
        "outcomes_cannot_be_early_predictor_features":True,
        "historical_issue_evidence_verified":False,
        "country_risk_set_eligible_asof":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reference-csv",type=Path,required=True)
    p.add_argument("--sha256",default=SOURCE_SHA)
    p.add_argument("--year",type=int,action="append",required=True)
    a=p.parse_args()
    print(json.dumps(reference_audit(a.reference_csv.read_bytes(),a.sha256,
                                     tuple(a.year)),sort_keys=True))


if __name__=="__main__":
    main()
