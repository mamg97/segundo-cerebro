"""Audit UCDP Onset v25.1 official intrastate conflict/country target regimes.

Country and conflict definitions are NOT interchangeable. Conflict-level
source can have multiple rows for a country/year while country-level is
unique. Official retrospective outcome labels are NOT historical predictor
vintages, and an inactive-onset indicator does not by itself prove an
eligible country-year forecasting risk set.

Only aggregate counts and observed source digests leave temporary CI.
"""
from __future__ import annotations

from collections import Counter
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re

SOURCE_VERSION="25.1"
SCHEMA="psychohistory.ucdp_official_onset_semantics_v251.v1"
REQUIRED={"abc","name","year","gwno_a","newconf","onset1","onset2",
          "onset3","onset5","onset10","onset20","conflict_ids","year_prev"}
FLAGS=("newconf","onset1","onset2","onset3","onset5","onset10","onset20")
SELECTED=(1989,2006,2019,2020,2023,2024)


def _verify(raw,expected,tag):
    if not isinstance(raw,bytes) or not 100<len(raw)<20_000_000:
        raise ValueError(tag+": invalid source size")
    observed=hashlib.sha256(raw).hexdigest()
    if (not isinstance(expected,str)
            or not re.fullmatch("[0-9a-f]{64}",expected)
            or observed!=expected):
        raise ValueError(tag+": source hash does not match exact pinned bytes")
    return observed


def read_source(raw,sha,level,selected_years=SELECTED):
    if level not in ("intrastate_conflict","intrastate_country"):
        raise ValueError("Only intrastate conflict or country level supported")
    _verify(raw,sha,level)
    if not isinstance(selected_years,tuple) or (
        not selected_years or len(selected_years)>12
        or any(type(y) is not int or not 1946<=y<=2024 for y in selected_years)
        or list(selected_years)!=sorted(set(selected_years))):
        raise ValueError("Distinct, ordered historical years required")
    try:
        reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig"),newline=""))
        original=reader.fieldnames
        normalized=[h.strip() for h in original] if original else []
        if not normalized or len(set(normalized))!=len(normalized) or not REQUIRED.issubset(normalized):
            raise ValueError("Unexpected official onset fields, including after whitespace normalization")
        reader.fieldnames=normalized
        counts=Counter()
        country_years=Counter()
        distinct_years=set()
        malformed_flag_count=0
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ValueError("Malformed onset CSV row")
            ytxt,ctxt=row["year"],row["gwno_a"]
            if (not ytxt.isdecimal() or not ctxt.isdecimal()
                    or not 1946<=int(ytxt)<=2024 or not 0<int(ctxt)<1000):
                raise ValueError("Out of range UCDP onset year/GW code")
            y=int(ytxt); code=int(ctxt)
            distinct_years.add(y)
            country_years[(code,y)]+=1
            counts[("rows",y)]+=1
            # UCDP documents 1815 as a sentinel for no previous onset.
            # Blank/NA is a distinct raw-field state: NEVER interpret
            # blank as no past conflict, no onset, or eligibility.
            previous=row["year_prev"].strip()
            if previous not in ("","NA") and (
                    not previous.isdecimal() or not 1815<=int(previous)<y):
                raise ValueError("Invalid previous-record year")
            counts[("unknown_previous",y)]+=int(previous in ("","NA"))
            for flag in FLAGS:
                value=row[flag].strip()
                if value in ("0","1"):
                    counts[("yes",y,flag)]+=int(value=="1")
                elif value in ("","NA"):
                    counts[("missing",y,flag)]+=1
                else:
                    malformed_flag_count+=1
            if len(country_years)>25_000 or sum(counts[("rows",y)] for y in distinct_years)>60_000:
                raise ValueError("Onset source unexpectedly large")
        if malformed_flag_count:
            raise ValueError("Nonbinary onset indicator in official source")
    except (UnicodeError,csv.Error,KeyError,TypeError) as exc:
        raise ValueError("Cannot parse UCDP onset 25.1") from exc
    if distinct_years!=set(range(1946,2025)):
        raise ValueError("Official 25.1 onset edition missing required years")
    duplicates=sum(n-1 for n in country_years.values() if n>1)
    if level=="intrastate_country" and duplicates:
        raise ValueError("Country-level source must have one row per GW/year")
    years=[]
    for y in selected_years:
        years.append({
          "year":y,
          "n_rows":counts[("rows",y)],
          "n_country_years":sum(k[1]==y for k in country_years),
          "n_newconf_ones":counts[("yes",y,"newconf")],
          "n_onset1":counts[("yes",y,"onset1")],
          "n_onset2":counts[("yes",y,"onset2")],
          "n_onset3":counts[("yes",y,"onset3")],
          "n_onset5":counts[("yes",y,"onset5")],
          "n_onset10":counts[("yes",y,"onset10")],
          "n_onset20":counts[("yes",y,"onset20")],
          "n_missing_onset1":counts[("missing",y,"onset1")],
          "n_year_prev_field_blank_or_NA":counts[("unknown_previous",y)],
          "eligible_denominator_at_issue_verified":False,
        })
    return {
       "kind":level,"version":SOURCE_VERSION,
       "observed_sha256_now":sha,
       "raw_header_has_leading_whitespace":any(a!=b for a,b in zip(original,normalized)),
       "n_rows":sum(v for k,v in counts.items() if k[0]=="rows"),
       "n_unique_country_years":len(country_years),
       "n_duplicate_country_year_rows":duplicates,
       "selected_years":years,
       "source_asof_verified":False,
       "outcome_labeled_after_year":True,
       "forecast_issued":False,
    }


def compare(conflict_bytes,country_bytes,conflict_sha,country_sha):
    conflict=read_source(conflict_bytes,conflict_sha,"intrastate_conflict")
    country=read_source(country_bytes,country_sha,"intrastate_country")
    return {
      "schema":SCHEMA,
      "codebook":"https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf",
      "method":"REPLAY_OFFICIAL_2025_RETROSPECTIVE_OUTCOMES_ONLY",
      "sources":[conflict,country],
      "comparison":[
        {
          "year":c["year"],
          "n_conflict_level_newconf":c["n_newconf_ones"],
          "n_country_level_newconf":n["n_newconf_ones"],
          "n_conflict_level_onset5":c["n_onset5"],
          "n_country_level_onset5":n["n_onset5"],
          "not_same_target_or_risk_set":True,
        }
        for c,n in zip(conflict["selected_years"],country["selected_years"])
      ],
      "newconf_does_not_equal_all_onset_events":True,
      "country_level_at_risk_with_ongoing_conflict":False,
      "historical_coverage_verified_for_issued_forecasts":False,
      "retrospective_labels_are_not_feature_bytes":True,
      "historical_vintage_byte_timestamps_verified":False,
      "backtest_authorized":False,
      "models_scored":False,
      "forecast_issued":False,
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--conflict",type=Path,required=True)
    p.add_argument("--country",type=Path,required=True)
    p.add_argument("--conflict-sha256",required=True)
    p.add_argument("--country-sha256",required=True)
    a=p.parse_args()
    print(json.dumps(compare(a.conflict.read_bytes(),a.country.read_bytes(),
                             a.conflict_sha256,a.country_sha256),sort_keys=True))


if __name__=="__main__":
    main()
