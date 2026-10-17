"""Fourth *retrospective* GED 24m re-emergence baseline: time since last event.

Adds a recency-only empirical-Bayes comparator to the THREE FROZEN original
baselines on exactly the same country-horizon sample, with no retraining or
edits to the original report. Sources and outputs stay PRIVATE. No claim of
vintage-correctness, prospective forecasts, statistical significance or causal
prediction; older GED 25.1 releases are retrospectively revised.

For target-end month T, known cutoff C=T-24; hypothetical issue is C+1.
Only labels of training cohorts ending <=C may enter recency-bin estimates.
"""
from __future__ import annotations
import argparse
import bisect
import collections
import json
import math
from pathlib import Path

from ged_monthly_incidence import parse_ged_exact_months, build_roster, month_index, save_private
from ged_reemergence import (
    SCHEMA, TARGET, HORIZON_MONTHS, TRAINING_WINDOW_MONTHS,
    SHRINKAGE_STRENGTH, MODELS, QUIET_MONTHS, HISTORY_MONTHS,
    event_calendar, event_count, eligible_at, mature_training_cases,
    full_roster, scores,
)
from ucdp_onset import load_onsets

SCHEMA_NEW = "psychohistory.ged.reemergence_recency_comparator.v1"
NEW_MODEL = "time_since_last_event"
BUCKETS = ("12_23m","24_59m","60plus_documented","history_incomplete")


def recency_bucket(roster, calendar, country, cutoff, earliest):
    """Entirely pre-cutoff evidence; do not misclassify truncated history as quiet."""
    if not eligible_at(roster,calendar,country,cutoff,earliest):
        raise ValueError("Recency requested for a country outside the issued risk set")
    dates=calendar.get(country,[])
    loc=bisect.bisect_right(dates,cutoff)
    since=cutoff-dates[loc-1] if loc else None
    if since is not None and since < QUIET_MONTHS:
        raise ValueError("A recorded recent event contradicts eligibility")
    if since is not None and since < 24:
        return BUCKETS[0]
    if since is not None and since < 60:
        return BUCKETS[1]
    if cutoff-59 >= earliest and full_roster(roster,country,cutoff-59,cutoff):
        return BUCKETS[2]
    return BUCKETS[3]


def fit_recency_at(cutoff, training, roster, calendar, earliest):
    """Only fully matured 24-month historical outcomes, ending by cutoff."""
    last=cutoff-HORIZON_MONTHS
    first=last-TRAINING_WINDOW_MONTHS+1
    by_bucket=collections.defaultdict(lambda:[0,0])
    n=positive=0
    for anchor in range(first,last+1):
        for cid,y in training.get(anchor,()):
            bucket=recency_bucket(roster,calendar,cid,anchor,earliest)
            by_bucket[bucket][0]+=1
            by_bucket[bucket][1]+=y
            n+=1
            positive+=y
    if n<1:
        raise ValueError("No matured cohorts for the recency comparator")
    pooled=(positive+1)/(n+2)
    return pooled, by_bucket, n


def relative_brier_skill(rows):
    """Descriptive same-cohort Brier skill against the frozen global baseline."""
    if not rows:
        raise ValueError("Cannot compare models on an empty anchor")
    base=scores(rows,"global_reemergence")["brier"]
    if base <= 0:
        return {model:None for model in (*MODELS,NEW_MODEL)}
    return {model:1-scores(rows,model)["brier"]/base
            for model in (*MODELS,NEW_MODEL)}


def comparator_report(original, ged, onset):
    """Refuse source, target, population and original model mismatches."""
    if (original.get("schema")!=SCHEMA or original.get("target")!=TARGET or
        original.get("status")!="RETROSPECTIVE_SOURCE_REVISED_EXPLORATORY" or
        original.get("source_as_of_verified") is not False or
        original.get("prospective_eligible") is not False or
        original.get("outcome_horizon_months")!=HORIZON_MONTHS or
        tuple(original.get("models",()))!=MODELS or
        original.get("source",{}).get("ged_sha256")!=ged.get("source_sha256") or
        original.get("source",{}).get("roster_sha256")!=onset.get("sha256") or
        onset.get("edition")!="25.1"):
        raise ValueError("Original approved GED report or source fingerprints do not match")
    roster=build_roster(onset)
    calendar=event_calendar(ged)
    earliest=month_index(ged["first_year"],1)
    last=month_index(ged["last_year"],12)
    training=mature_training_cases(roster,calendar,earliest,last)
    result={"schema":SCHEMA_NEW,"target":TARGET,
            "status":"POSTHOC_BASELINE_REVISED_RETROSPECTIVE_ONLY",
            "source_as_of_verified":False,"prospective_eligible":False,
            "evaluation":"Same country-horizon outcomes as original, not an emitted forecast",
            "added_model":NEW_MODEL,"original_models":list(MODELS),
            "recency_buckets":list(BUCKETS),
            "shrinkage_equivalent_cases":SHRINKAGE_STRENGTH,
            "partitions":{}}
    for part, years in (("validation",(2016,2019)),("test",(2020,2024))):
        raw=original.get("partitions",{}).get(part,{})
        if raw.get("years")!=list(years) or not isinstance(raw.get("cases"),list):
            raise ValueError("Original temporal split is missing/altered")
        groups=collections.defaultdict(list)
        seen=set()
        for row in raw["cases"]:
            yr,mo,cid=row["origin_year"],row["origin_month"],row["country_id"]
            key=(yr,mo,cid)
            if (key in seen or not years[0]<=yr<=years[1] or not 1<=mo<=12 or
                not isinstance(cid,int) or isinstance(cid,bool) or cid<1 or
                row["outcome"] not in (0,1) or isinstance(row["outcome"],bool)):
                raise ValueError("Invalid/duplicate country-horizon")
            seen.add(key)
            groups[(yr,mo)].append(row)
        if len(groups)!=12*(years[1]-years[0]+1):
            raise ValueError("Missing historical target-end months")
        enriched=[]
        cached_fit={}
        bucket_counts=collections.Counter()
        for (yr,mo),rows in sorted(groups.items()):
            T=month_index(yr,mo)
            cutoff=T-HORIZON_MONTHS
            if cutoff not in cached_fit:
                cached_fit[cutoff]=fit_recency_at(cutoff,training,roster,calendar,earliest)
            pooled,bins,n=cached_fit[cutoff]
            for row in rows:
                cid=row["country_id"]
                if not eligible_at(roster,calendar,cid,cutoff,earliest):
                    raise ValueError("An original scored country was not eligible at cutoff")
                if not full_roster(roster,cid,cutoff+1,T):
                    raise ValueError("The old report scored a country without future roster coverage")
                y=int(event_count(calendar,cid,cutoff+1,T)>0)
                if y!=row["outcome"]:
                    raise ValueError("Historical target labels differ from pinned source")
                rates=row.get("probabilities",{})
                if set(rates)!=set(MODELS) or any(
                    not isinstance(p,(float,int)) or not math.isfinite(p) or not 0<p<1
                    for p in rates.values()
                ):
                    raise ValueError("Unapproved original model output")
                if abs(rates["global_reemergence"]-pooled)>1e-10:
                    raise ValueError("Original global baseline not reproducible from matured training")
                bucket=recency_bucket(roster,calendar,cid,cutoff,earliest)
                bucket_counts[bucket]+=1
                count,events=bins[bucket]
                p=(events+SHRINKAGE_STRENGTH*pooled)/(count+SHRINKAGE_STRENGTH) if count else pooled
                enriched.append({**row,"recency_bucket":bucket,
                                 "probabilities":{**rates,NEW_MODEL:p}})
        if len(enriched)!=raw.get("n_evaluated") or sum(x["outcome"] for x in enriched)!=raw.get("positive_outcomes"):
            raise ValueError("Original country counts/positives changed")
        fixed=[row for row in enriched if row["origin_month"]==1 and
               (row["origin_year"]-years[0])%2==0]
        anchors=list(range(years[0],years[1]+1,2))
        if set(x["origin_year"] for x in fixed)!=set(anchors):
            raise ValueError("Missing preregistered non-overlap dates")
        result["partitions"][part]={
            "years":list(years),"n":len(enriched),
            "events":sum(r["outcome"] for r in enriched),
            "recency_bucket_counts":dict(bucket_counts),
            "all_months":{
                "models":{m:scores(enriched,m) for m in (*MODELS,NEW_MODEL)},
                "outcome_windows_overlap":True,
                "interpretation":"Exploratory only; calendar windows overlap, not independent evidence"
            },
            "nonoverlap":{
                "target_end_months":[f"{year}-01" for year in anchors],
                "hypothetical_issue_months":[f"{year-2}-02" for year in anchors],
                "calendar_blocks":len(anchors),
                "n":len(fixed),
                "events":sum(r["outcome"] for r in fixed),
                "models":{m:scores(fixed,m) for m in (*MODELS,NEW_MODEL)},
                "confidence_interval_95":None,
                "significance_test":None,
                "warning":"Only 2/3 non-overlapping target windows. No inferential CI; shared regional shocks persist.",
                "by_anchor":[{"target_end_month":f"{year}-01",
                              "hypothetical_issue_month":f"{year-2}-02",
                              "n":sum(r["origin_year"]==year for r in fixed),
                              "events":sum(r["outcome"] for r in fixed if r["origin_year"]==year),
                              "brier_skill_vs_global":relative_brier_skill(
                                  [r for r in fixed if r["origin_year"]==year])}
                             for year in anchors],
                "leave_one_anchor_out":[{
                    "omitted_target_end_month":f"{year}-01",
                    "n":sum(r["origin_year"]!=year for r in fixed),
                    "events":sum(r["outcome"] for r in fixed if r["origin_year"]!=year),
                    "brier_skill_vs_global":relative_brier_skill(
                        [r for r in fixed if r["origin_year"]!=year])}
                    for year in anchors],
            },
            # Country-level cases are kept PRIVATE and are intentionally never Git assets.
            "cases":enriched,
        }
    return result


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--original-report",type=Path,required=True)
    cli.add_argument("--ged-zip",type=Path,required=True)
    cli.add_argument("--ged-sha256",required=True)
    cli.add_argument("--roster-csv",type=Path,required=True)
    cli.add_argument("--roster-sha256",required=True)
    cli.add_argument("--out",type=Path,required=True)
    args=cli.parse_args()
    ged=parse_ged_exact_months(args.ged_zip,args.ged_sha256)
    onset=load_onsets(args.roster_csv.read_bytes(),kind="intrastate_country",
                      expected_sha256=args.roster_sha256)
    report=comparator_report(json.loads(args.original_report.read_text()),ged,onset)
    save_private(report,args.out)
    for part in ("validation","test"):
        test=report["partitions"][part]["nonoverlap"]
        print(json.dumps({"partition":part,"n":test["n"],"events":test["events"],
                          "nonoverlap_blocks":test["calendar_blocks"],
                          "no_prospective_skill_claim":True}))


if __name__=="__main__":
    main()
