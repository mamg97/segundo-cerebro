"""Evidence-conservative textual COW ↔ GW crosswalk *candidate* audit.

Exact three-letter state abbreviations are string tokens, NOT proof of
geographic or historical identity; even identical numeric codes cannot
authorize joining country-level UCDP events. Require a separate, reviewed,
dated concordance and archived as-of coverage before producing labels.
Only aggregate counts go to stdout. Optional individual review queue is
create-only in private filesystem outside the public git repository.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date, timedelta
import io
import json
import os
from pathlib import Path
import re

from cow_gw_denominator_bridge import (
    parse_cow, build_gw_with_microstates, LATEST_COW_DATE)
from independent_gw_roster import SOURCE_END

ROOT = Path(__file__).resolve().parents[2]
VERSION = "psychohistory.cow_gw_token_review.v1"
MONTH = re.compile(r"(19|20)[0-9]{2}-(0[1-9]|1[0-2])\Z")
TOKEN = re.compile(r"[A-Z]{3}\Z")

def _records(raw, source):
    if source not in ("cow", "gw"):
        raise ValueError("Unknown state system")
    try:
        if source == "cow":
            reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
            fields = ("stateabb","ccode","styear","stmonth","stday",
                      "endyear","endmonth","endday")
            if reader.fieldnames != ["stateabb","ccode","statenme",
                    "styear","stmonth","stday","endyear","endmonth","endday","version"]:
                raise ValueError("COW schema mismatch")
        else:
            try:
                decoded = raw.decode("utf-8-sig")
            except UnicodeDecodeError:
                decoded = raw.decode("cp1252")
            reader = csv.DictReader(io.StringIO(decoded, newline=""), delimiter="\t")
            fields = ("stateid","statenumber","start","end")
            if reader.fieldnames != ["statenumber","stateid","countryname","start","end"]:
                raise ValueError("GW schema mismatch")
        output=[]
        for row in reader:
            if source=="cow":
                tok, code = row["stateabb"], int(row["ccode"])
                first = date(*[int(row[k]) for k in ("styear","stmonth","stday")])
                last = date(*[int(row[k]) for k in ("endyear","endmonth","endday")])
            else:
                tok, code = row["stateid"], int(row["statenumber"])
                first, last = date.fromisoformat(row["start"]), date.fromisoformat(row["end"])
            if not isinstance(tok,str) or not TOKEN.fullmatch(tok) or not 0<code<1000:
                raise ValueError("Noncanonical state abbreviation or code")
            output.append((code,tok,first,last))
    except (UnicodeError,csv.Error,KeyError,OverflowError,TypeError) as exc:
        raise ValueError("Unparseable state-system source") from exc
    return output


def _membership(rows, first, last):
    full, partial = {}, set()
    for code, token, start, stop in rows:
        if start <= first and stop >= last:
            if code in full:
                raise ValueError("Ambiguous competing full-month identities")
            full[code] = token
        elif start <= last and stop >= first:
            partial.add(code)
    if partial & full.keys():
        raise ValueError("Competing partial and full month state identities")
    # Ambiguous abbreviations are NOT silently converted to mappings.
    by_token = {}
    conflicted=set()
    for code, token in full.items():
        if token in by_token:
            conflicted.add(token)
        else:
            by_token[token]=code
    for token in conflicted:
        del by_token[token]
    return full, partial, by_token, conflicted


def compare_token_candidates(cow, gw, months):
    if not isinstance(months,list) or not 1<=len(months)<=24 or (
        any(not isinstance(m,str) or not MONTH.fullmatch(m) for m in months)
        or months!=sorted(set(months))):
        raise ValueError("Unique ordered YYYY-MM evaluation months required")
    cw_rows = _records(cow,"cow")
    # Preserve distinct GW base/microstate data and identity; GW was validated
    # before this function by build_gw_with_microstates.
    gw_rows = _records(gw[0],"gw")+_records(gw[1],"gw")
    public=[]
    private_review=[]
    for origin in months:
        y,m=map(int,origin.split("-"))
        first=date(y,m,1)
        last=date(y+(m==12),m%12+1,1)-timedelta(days=1)
        if last > LATEST_COW_DATE:
            public.append({"period":origin,"status":"NO_EVALUABLE_COW_AFTER_2024",
                           "n_cow_full":None,"n_gw_full":None})
            continue
        cfull,cpartial,ctokens,cconf=_membership(cw_rows,first,last)
        if last>SOURCE_END:
            public.append({"period":origin,"status":"COW_ONLY_GW_CENSORED_2020",
                           "n_cow_full":len(cfull),"n_cow_partial":len(cpartial),
                           "n_gw_full":None,"n_proposed_mappings":0})
            continue
        gfull,gpartial,gtokens,gconf=_membership(gw_rows,first,last)
        common=set(ctokens)&set(gtokens)
        # Source-unique token matching is only a textual proposal.
        stable={t for t in common if t not in cconf and t not in gconf}
        with_equal=sum(ctokens[t]==gtokens[t] for t in stable)
        with_different=len(stable)-with_equal
        c_only=sum(t not in gtokens for t in ctokens)
        g_only=sum(t not in ctokens for t in gtokens)
        collision=sum(code in gfull and gfull[code]!=token
                      for code,token in cfull.items() if token not in stable)
        c_unresolved=set(cfull)-{ctokens[t] for t in stable}
        g_unresolved=set(gfull)-{gtokens[t] for t in stable}
        public.append({
            "period":origin,"status":"TEXTUAL_CANDIDATES_MANUAL_REVIEW_REQUIRED",
            "n_cow_full":len(cfull),"n_cow_partial":len(cpartial),
            "n_gw_full":len(gfull),"n_gw_partial":len(gpartial),
            "n_equal_abbreviation_and_equal_number":with_equal,
            "n_equal_abbreviation_but_different_number":with_different,
            "n_textual_proposals":len(stable),
            "n_cow_unmatched_codes":len(c_unresolved),
            "n_gw_unmatched_codes":len(g_unresolved),
            "n_cow_unique_abbreviations_without_counterpart":c_only,
            "n_gw_unique_abbreviations_without_counterpart":g_only,
            "n_numeric_contact_with_different_token_unresolved":collision,
            "n_duplicated_active_abbreviations_cow":len(cconf),
            "n_duplicated_active_abbreviations_gw":len(gconf),
            "all_identity_mapping_approved":False,
        })
        # This list is unapproved and, if requested, never sent to stdout/git.
        for token in sorted(stable):
            private_review.append({
                "period":origin,"cow_ccode":ctokens[token],
                "gw_country_id":gtokens[token],"abbreviation":token,
                "status":"TOKEN_ONLY_NOT_REVIEWED",
                "same_numeric_code":ctokens[token]==gtokens[token],
                "reviewed":False,"eligible_asof":False,
            })
        for code in sorted(c_unresolved):
            private_review.append({
                "period":origin,"cow_ccode":code,"cow_abbreviation":cfull[code],
                "gw_country_id":None,"status":"COW_UNRESOLVED",
                "reviewed":False,"eligible_asof":False})
        for code in sorted(g_unresolved):
            private_review.append({
                "period":origin,"cow_ccode":None,"gw_country_id":code,
                "gw_abbreviation":gfull[code],"status":"GW_UNRESOLVED",
                "reviewed":False,"eligible_asof":False})
    result={
        "schema":VERSION,"status":"CANDIDATE_CROSSWALK_ONLY_NO_APPROVED_IDENTITIES",
        "months":public,"n_private_review_rows":len(private_review),
        "one_to_one_geographic_concordance_verified":False,
        "release_dates_independently_authenticated":False,
        "source_as_of_verified":False,"ucdp_event_coverage_verified":False,
        "absence_of_event_equals_zero_verified":False,
        "vintage_correct_backtest":False,"scores_computed":False,
        "forecast_issued":False,
        "warning":("Same token and same numeric code can still denote different "
                   "state definitions; COW 2024 was released in November 2025 "
                   "and GW v7 ends in 2020. Manual historical concordance, "
                   "UCDP coverage and independent as-of source checks required.")
    }
    return result,private_review


def save_review_private(rows,destination):
    target=destination.resolve()
    if target==ROOT or target.is_relative_to(ROOT):
        raise ValueError("Country-level crosswalk must not be written to public repository")
    target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    flags=os.O_CREAT|os.O_EXCL|os.O_WRONLY
    if hasattr(os,"O_NOFOLLOW"):
        flags|=os.O_NOFOLLOW
    fd=os.open(target,flags,0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as f:
        json.dump({"schema":"psychohistory.cow_gw_private_review.v1",
                   "approved":False,"rows":rows},f,ensure_ascii=False,indent=2)
        f.write("\n")


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--cow",type=Path,required=True)
    cli.add_argument("--gw",type=Path,required=True)
    cli.add_argument("--micro",type=Path,required=True)
    cli.add_argument("--cow-sha256",required=True)
    cli.add_argument("--gw-sha256",required=True)
    cli.add_argument("--micro-sha256",required=True)
    cli.add_argument("--month",action="append",required=True)
    cli.add_argument("--private-review-output",type=Path)
    a=cli.parse_args()
    cb=a.cow.read_bytes()
    gb=a.gw.read_bytes()
    mb=a.micro.read_bytes()
    parse_cow(cb,a.cow_sha256)
    build_gw_with_microstates(gb,mb,a.gw_sha256,a.micro_sha256)
    result,review=compare_token_candidates(cb,(gb,mb),a.month)
    if a.private_review_output:
        save_review_private(review,a.private_review_output)
    print(json.dumps(result,sort_keys=True))

if __name__=="__main__":
    main()
