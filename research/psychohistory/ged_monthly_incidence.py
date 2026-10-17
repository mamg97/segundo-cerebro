"""A precisely defined country-month UCDP GED event-risk baseline.

Target: at least one GED 25.1 *state-based* (type 1) incident in a country
with best fatalities >= 1, date_prec == 1, and identical exact start/end
calendar day, during the target month. Other incident types, undated/uncertain
events, and best=0 are OUTSIDE this target, not "no violence".

Forecast at the first day of each month, with a 24-month lag to observed
source events. Published GED v25.1 is retrospectively revised; this is never
an as-of-correct or prospective prediction. A Gleditsch-Ward annual roster
from UCDP Onset is used only as an evaluation population, not a future feature.

All source bytes are privately supplied and SHA256-checked. Real scores and
country data remain outside the public GitHub repository.
"""
from __future__ import annotations

import argparse
import bisect
import collections
import csv
import datetime as dt
import hashlib
import io
import json
import math
import re
from pathlib import Path

from ged_event_context import _read_source, FIELDS, SOURCE_URL as GED_URL
from ucdp_onset import (load_onsets, canonical, evaluate_cases, diagnostic_summary,
                        average_precision_ties, top_decile_coverage,
                        calibration_five_bins, REPOSITORY)

HISTORY_MONTHS = 24
OBSERVATION_LAG_MONTHS = 24
COUNTRY_PRIOR_WEIGHT = 24
VALIDATION_YEARS = (2016, 2019)
TEST_YEARS = (2020, 2024)
GED_EDITION = "25.1"
TARGET = "at_least_one_exact_dated_lethal_state_based_ged_event"
MODELS = ("global_frequency", "country_shrinkage", "country_history_24m")


def month_index(year: int, month: int) -> int:
    if not isinstance(year, int) or not isinstance(month, int) or isinstance(year, bool) or isinstance(month, bool) or not 1 <= month <= 12:
        raise ValueError("Invalid calendar month")
    return year * 12 + month - 1


def parse_ged_exact_months(path: Path, expected_sha256: str, *, require_full_coverage=True):
    """An event is included only if its observed month is unambiguous."""
    zip_file, member = _read_source(path, expected_sha256)
    seen_ids = set()
    counts = collections.Counter()
    years_seen = set()
    excluded = collections.Counter()
    n_rows = 0
    try:
        with zip_file.open(member) as binary, io.TextIOWrapper(binary, encoding="utf-8-sig", newline="") as content:
            rows = csv.DictReader(content)
            required = {"id", "country_id", "year", "type_of_violence", "best",
                        "date_start", "date_end", "date_prec"}
            if not rows.fieldnames or not required.issubset(rows.fieldnames):
                raise ValueError("Unexpected GED incident-level schema")
            for raw in rows:
                n_rows += 1
                if n_rows > 650_000:
                    raise ValueError("GED archive unexpectedly large")
                try:
                    event_id=int(raw["id"])
                    year=int(raw["year"])
                    country=int(raw["country_id"])
                    typ=int(raw["type_of_violence"])
                    deaths=int(raw["best"])
                    precision=int(raw["date_prec"])
                except (ValueError, KeyError, TypeError) as err:
                    raise ValueError("Missing/invalid event identity, target or date precision") from err
                if event_id < 1 or country < 1 or not 1989 <= year <= 2024 or typ not in (1,2,3) or deaths < 0 or precision < 1:
                    raise ValueError("Invalid GED source row")
                if event_id in seen_ids:
                    raise ValueError("Duplicate GED incident identifier")
                seen_ids.add(event_id)
                years_seen.add(year)
                if typ != 1:
                    excluded["other_violence_type"] += 1
                    continue
                if deaths == 0:
                    excluded["zero_best_fatalities"] += 1
                    continue
                if precision != 1:
                    excluded["uncertain_date_precision"] += 1
                    continue
                try:
                    start=dt.datetime.fromisoformat(raw["date_start"]).date()
                    end=dt.datetime.fromisoformat(raw["date_end"]).date()
                except (ValueError, TypeError) as err:
                    raise ValueError("GED exact-dated row has invalid calendar date") from err
                if start != end or start.year != year:
                    excluded["non_exact_or_cross_year_date"] += 1
                    continue
                counts[(country, month_index(year,start.month))] += 1
        if not n_rows:
            raise ValueError("Empty incident archive")
        if require_full_coverage and (min(years_seen) > 1989 or max(years_seen) < 2024 or n_rows < 10_000):
            raise ValueError("Full historical official GED coverage not established")
    finally:
        zip_file.close()
    return {"events_by_month": counts, "rows": n_rows,
            "source_sha256": expected_sha256, "excluded": dict(excluded),
            "first_year":min(years_seen), "last_year":max(years_seen),
            "target":TARGET, "as_of_verified": False}


def build_roster(onset_source, min_year=1989):
    """GW country-year inclusion, never filled forward through missing years."""
    return {(cid,year):row["name"] for (cid,year),row in onset_source["lookup"].items() if year>=min_year}


def _population_prefix(roster,ged):
    positive=ged["events_by_month"]
    valid=[]
    for (cid,year) in roster:
        for month in range(1,13):
            idx=month_index(year,month)
            valid.append((idx, int(positive[(cid,idx)]>0)))
    valid.sort()
    times, prefix=[],[0]
    for idx,y in valid:
        times.append(idx)
        prefix.append(prefix[-1]+y)
    return times,prefix


def _history(roster, events, cid, cutoff):
    result=[]
    for date in range(cutoff-HISTORY_MONTHS+1, cutoff+1):
        year=date//12
        if (cid,year) not in roster:
            return None
        result.append(int(events[(cid,date)]>0))
    return result


def forecast_month(ged, onset_source, year, month, *, prepared=None):
    origin=month_index(year,month)
    cutoff=origin-OBSERVATION_LAG_MONTHS
    roster, times, prefix = prepared or (
        build_roster(onset_source), *_population_prefix(build_roster(onset_source),ged))
    upto=bisect.bisect_right(times,cutoff)
    n=upto
    if n<2:
        raise ValueError("Insufficient prior country-month population")
    positives=prefix[upto]
    global_probability=(positives+1)/(n+2)
    cases=[]
    rejected=collections.Counter()
    for (cid,yy),name in sorted(roster.items()):
        if yy!=year:
            continue
        past=_history(roster,ged["events_by_month"],cid,cutoff)
        if past is None:
            rejected["incomplete_country_roster_in_history"] += 1
            continue
        own=(sum(past)+COUNTRY_PRIOR_WEIGHT*global_probability)/(HISTORY_MONTHS+COUNTRY_PRIOR_WEIGHT)
        # Stronger, preregistered benchmark from the same strictly lagged 24 months.
        country_history=(sum(past)+1)/(HISTORY_MONTHS+2)
        y=int(ged["events_by_month"][(cid,origin)]>0)
        cases.append({"country_id":cid,"country":name,"origin_year":year,"origin_month":month,
                      "target":TARGET,"cutoff_month":f"{cutoff//12}-{cutoff%12+1:02d}",
                      "outcome":y,"documented_events":ged["events_by_month"][(cid,origin)],
                      "probabilities":{"global_frequency":global_probability,"country_shrinkage":own,
                                       "country_history_24m":country_history}})
    return {"year":year,"month":month,"n_roster":sum(yy==year for _,yy in roster),
            "n_scored":len(cases),"excluded":dict(rejected),"cases":cases}


def evaluate_monthly_model(rows, model):
    """Adapt the additional local baseline to the independent binary scorer.

    Do not modify Onset's allowed comparators or validation protocol.
    """
    if model != "country_history_24m":
        return evaluate_cases(rows, model)
    adapted = [{"outcome":r["outcome"],
                "probabilities":{"country_shrinkage":r["probabilities"][model]}}
               for r in rows]
    return evaluate_cases(adapted, "country_shrinkage")


def comparative_diagnostics(cases):
    """Exactly the same country-months for all three models, no score tuning."""
    base=diagnostic_summary(cases)
    if base is None:
        return None
    name="country_history_24m"
    yearly=collections.defaultdict(list)
    for case in cases:
        yearly[case["origin_year"]].append(case)
    base["models"][name]={
        "average_precision":average_precision_ties(cases,name),
        "top_10_percent":top_decile_coverage(cases,name),
        "calibration_bins":calibration_five_bins(cases,name),
        "yearly":[{"year":year,"n":len(group),
                   "events":sum(r["outcome"] for r in group),
                   "brier":evaluate_monthly_model(group,name)["brier"],
                   "average_precision":average_precision_ties(group,name)}
                  for year,group in sorted(yearly.items())],
    }
    base["country_history_brier_skill_vs_global_frequency"] = (
        1-evaluate_monthly_model(cases,name)["brier"]/evaluate_cases(cases,"global_frequency")["brier"])
    base["country_history_brier_skill_vs_country_shrinkage"] = (
        1-evaluate_monthly_model(cases,name)["brier"]/evaluate_cases(cases,"country_shrinkage")["brier"])
    return base


def monthly_report(ged, onset_source):
    if ged["target"]!=TARGET or onset_source["edition"]!="25.1":
        raise ValueError("Mismatched GED target or UCDP roster edition")
    roster=build_roster(onset_source)
    times,prefix=_population_prefix(roster,ged)
    result={
      "schema":"psychohistory.ged.monthly_incidence.v1",
      "target":TARGET,
      "unit":"country-month",
      "event_definition":"GED state-based type 1, best deaths >=1, date_prec 1, start=end",
      "issue_time":"first_day_of_target_month",
      "information_lag_months":OBSERVATION_LAG_MONTHS,
      "history_months":HISTORY_MONTHS,
      "source":{"ged":"25.1","ged_sha256":ged["source_sha256"],
                "onset_roster":"25.1","onset_roster_sha256":onset_source["sha256"]},
      "source_as_of_verified":False,"prospective_eligible":False,
      "coverage_warning":"Non-exact-dated incidents and missing GW country-years are not a negative outcome.",
      "partitions":{}
    }
    for name,span in (("validation",VALIDATION_YEARS),("test",TEST_YEARS)):
        runs=[forecast_month(ged,onset_source,year,month,prepared=(roster,times,prefix))
              for year in range(span[0],span[1]+1) for month in range(1,13)]
        cases=[case for run in runs for case in run["cases"]]
        result["partitions"][name]={
            "years":list(span),
            "n_country_months":sum(run["n_roster"] for run in runs),
            "n_scored":len(cases),
            "n_excluded":sum(run["n_roster"]-run["n_scored"] for run in runs),
            "positive_months":sum(case["outcome"] for case in cases),
            "models":{model:evaluate_monthly_model(cases,model) for model in MODELS},
            "rare_event_diagnostics":comparative_diagnostics(cases),
            "cases":cases,
        }
    return result


def save_private(report,path:Path):
    if path.resolve().is_relative_to(REPOSITORY):
        raise ValueError("Country-month results cannot be committed to public Git")
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    with path.open("xb") as out:
        out.write(canonical(report)+b"\n")
    path.chmod(0o600)


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--ged-zip",type=Path,required=True)
    cli.add_argument("--ged-sha256",required=True)
    cli.add_argument("--onset-country-csv",type=Path,required=True)
    cli.add_argument("--onset-sha256",required=True)
    cli.add_argument("--out",type=Path,required=True)
    args=cli.parse_args()
    ged=parse_ged_exact_months(args.ged_zip,args.ged_sha256)
    onset=load_onsets(args.onset_country_csv.read_bytes(),
                      kind="intrastate_country",expected_sha256=args.onset_sha256)
    if onset["max_year"]<2024:raise ValueError("Source roster does not cover test through 2024")
    report=monthly_report(ged,onset)
    save_private(report,args.out)
    print(json.dumps({"status":"RETROSPECTIVE_SOURCE_REVISED_PRIVATE",
                      "n_test":report["partitions"]["test"]["n_scored"],
                      "n_positive":report["partitions"]["test"]["positive_months"],
                      "source_as_of_verified":False,"prospective_eligible":False}))


if __name__ == "__main__":
    main()
