"""UCDP GED: *re-emergence* of state-based lethal incidents after a quiet year.

A retrospectively reconstructed 24-month *target ends* in month T and uses
GED through C=T-24 only. Hypothetical issuance is on day 1 of C+1,
not day 1 of T. Original release availability at C remains unverified. An eligible country must have 12 consecutive months without
an eligible incident ending at the information cutoff C=T-24. Outcome Y=1
means >=1 eligible incident during the NEXT 24 months (C+1..T). This is NOT a
prediction of a specific battle, an invasion or official UCDP conflict onset.

Historical training cohorts have their 24-month outcomes FULLY OBSERVED by C.
Future outcomes and membership never filter issuance eligibility; they enter
only retrospective resolution. Country-months absent from the explicit G-W
roster cannot be silently imputed as zeros. No historical as-of source vintages
have been reconstructed. The resulting report is NOT prospective skill.
"""
from __future__ import annotations
import argparse
import bisect
import collections
import json
import math
from pathlib import Path

from ged_monthly_incidence import (
    parse_ged_exact_months, build_roster, month_index, save_private,
    OBSERVATION_LAG_MONTHS,
)
from ucdp_onset import (
    load_onsets, canonical, average_precision_ties, top_decile_coverage,
    calibration_five_bins,
)

SCHEMA = "psychohistory.ged.reemergence_24m.v1"
TARGET = "at_least_one_exact_dated_state_based_lethal_GED_incident_within_24m_after_12m_quiet_at_cutoff"
QUIET_MONTHS = 12
HISTORY_MONTHS = 24
HORIZON_MONTHS = 24
TRAINING_WINDOW_MONTHS = 60
SHRINKAGE_STRENGTH = 20
MODELS = ("global_reemergence","country_shrinkage","country_history")
VALIDATION_YEARS = (2016,2019)
TEST_YEARS = (2020,2024)


def event_calendar(ged):
    """Sorted *positive months* per country; ZIP event IDs already audited."""
    months=collections.defaultdict(list)
    for (country,month),count in ged["events_by_month"].items():
        if count>0:
            months[country].append(month)
    for c in months:
        months[c]=sorted(set(months[c]))
    return months


def event_count(calendar,country,first,last):
    dates=calendar.get(country,[])
    return bisect.bisect_right(dates,last)-bisect.bisect_left(dates,first)


def full_roster(roster,country,start,end):
    return all((country,index//12) in roster for index in range(start,end+1))


def eligible_at(roster,calendar,country,cutoff,earliest):
    """All conditions measurable at cutoff; never consult a future month."""
    start=cutoff-HISTORY_MONTHS+1
    return (start>=earliest and full_roster(roster,country,start,cutoff)
            and event_count(calendar,country,cutoff-QUIET_MONTHS+1,cutoff)==0)


def mature_training_cases(roster,calendar,earliest,last):
    """Only anchors whose *outcome window* has matured can train a prior."""
    by_anchor=collections.defaultdict(list)
    countries=sorted({cid for cid,_ in roster})
    for anchor in range(earliest+HISTORY_MONTHS-1,last-HORIZON_MONTHS+1):
        for country in countries:
            if not eligible_at(roster,calendar,country,anchor,earliest):
                continue
            if not full_roster(roster,country,anchor+1,anchor+HORIZON_MONTHS):
                continue
            outcome=int(event_count(calendar,country,anchor+1,anchor+HORIZON_MONTHS)>0)
            by_anchor[anchor].append((country,outcome))
    return by_anchor


def training_at(anchor,training):
    """No training label after anchor: allow completed cohorts ending <= anchor."""
    latest=anchor-HORIZON_MONTHS
    earliest=latest-TRAINING_WINDOW_MONTHS+1
    counts=collections.Counter()
    positives=collections.Counter()
    for month in range(earliest,latest+1):
        for country,observed in training.get(month,()):
            counts[country]+=1
            positives[country]+=observed
    return counts,positives


def issue_cohort(ged,roster,calendar,training,year,month):
    origin=month_index(year,month)  # Legacy name: TARGET END month, NOT issue date.
    cutoff=origin-OBSERVATION_LAG_MONTHS
    hypothetical_issue=cutoff+1
    earliest=month_index(ged["first_year"],1)
    last=month_index(ged["last_year"],12)
    if not (earliest+HISTORY_MONTHS+HORIZON_MONTHS <= cutoff
            and origin<=last and year in range(VALIDATION_YEARS[0],TEST_YEARS[1]+1)):
        raise ValueError("Origin outside measurable and historically mature test")
    counts,positive=training_at(cutoff,training)
    n=sum(counts.values())
    events=sum(positive.values())
    if n<1:
        raise ValueError("No fully matured eligible training cohorts")
    pooled=(events+1)/(n+2)
    rows=[]
    unresolved=collections.Counter()
    for cid in sorted({c for c,y in roster if y==cutoff//12}):
        if not eligible_at(roster,calendar,cid,cutoff,earliest):
            continue
        past_n,past_events=counts[cid],positive[cid]
        country=(past_events+SHRINKAGE_STRENGTH*pooled)/(past_n+SHRINKAGE_STRENGTH)
        own=(past_events+1)/(past_n+2) if past_n else pooled
        rates={"global_reemergence":pooled,"country_shrinkage":country,
               "country_history":own}
        # The cohort was ISSUED based on cutoff only. Resolution may be missing
        # when a country exits G-W membership; keep counts of those instances.
        if not full_roster(roster,cid,cutoff+1,origin):
            unresolved["incomplete_future_roster"]+=1
            continue
        result=int(event_count(calendar,cid,cutoff+1,origin)>0)
        rows.append({"country_id":cid,"origin_year":year,"origin_month":month,
                     "hypothetical_issue_month":f"{hypothetical_issue//12}-{hypothetical_issue%12+1:02d}",
                     "target_end_month":f"{origin//12}-{origin%12+1:02d}",
                     "cutoff":f"{cutoff//12}-{cutoff%12+1:02d}",
                     "outcome":result,"probabilities":rates})
    return {"year":year,"month":month,"cutoff":f"{cutoff//12}-{cutoff%12+1:02d}",
            "hypothetical_issue_month":f"{hypothetical_issue//12}-{hypothetical_issue%12+1:02d}",
            "target_end_month":f"{origin//12}-{origin%12+1:02d}",
            "n_issued":len(rows)+sum(unresolved.values()),"n_evaluated":len(rows),
            "n_unresolved":sum(unresolved.values()),"unresolved_reasons":dict(unresolved),
            "training_mature_country_anchors":n,"cases":rows}


def scores(rows,model):
    if not rows:
        return None
    brier=math.fsum((r["probabilities"][model]-r["outcome"])**2 for r in rows)/len(rows)
    log_loss=math.fsum(-(r["outcome"]*math.log(r["probabilities"][model])+
                         (1-r["outcome"])*math.log1p(-r["probabilities"][model]))
                       for r in rows)/len(rows)
    return {"n":len(rows),"events":sum(r["outcome"] for r in rows),"brier":brier,
            "log_loss":log_loss,"average_precision":average_precision_ties(rows,model),
            "top_decile":top_decile_coverage(rows,model),
            "calibration":calibration_five_bins(rows,model)}


def reemergence_report(ged,onset):
    if ged["target"] != "at_least_one_exact_dated_lethal_state_based_ged_event" or onset["edition"]!="25.1":
        raise ValueError("Source targets/editions do not match")
    roster=build_roster(onset)
    calendar=event_calendar(ged)
    earliest,last=month_index(ged["first_year"],1),month_index(ged["last_year"],12)
    training=mature_training_cases(roster,calendar,earliest,last)
    report={
        "schema":SCHEMA,"target":TARGET,"unit":"country and target-end month",
        "outcome_horizon_months":HORIZON_MONTHS,
        "issue_date":"hypothetical first day of month immediately after last known cutoff month",
        "target_end_date":"last day of month T; binary event window is C+1 through T",
        "legacy_origin_year_month_semantics":"target-end year/month, NOT issuance year/month",
        "input_data_cutoff_lag_months":OBSERVATION_LAG_MONTHS,
        "quiet_months_known_at_cutoff":QUIET_MONTHS,
        "history_months":HISTORY_MONTHS,
        "training_window_months":TRAINING_WINDOW_MONTHS,
        "training_maturity_months":HORIZON_MONTHS,
        "models":MODELS,"status":"RETROSPECTIVE_SOURCE_REVISED_EXPLORATORY",
        "source_as_of_verified":False,"prospective_eligible":False,
        "source":{"ged_edition":"25.1","ged_sha256":ged["source_sha256"],
                  "roster_edition":"25.1","roster_sha256":onset["sha256"]},
        "caveat":"Incident-free means none eligible in date-exact state-based GED, NOT peace. 24-month outcomes overlap; no independent prospective validation.",
        "partitions":{}
    }
    for name,years in (("validation",VALIDATION_YEARS),("test",TEST_YEARS)):
        runs=[issue_cohort(ged,roster,calendar,training,year,month)
              for year in range(years[0],years[1]+1) for month in range(1,13)]
        cases=[case for run in runs for case in run["cases"]]
        model_scores={model:scores(cases,model) for model in MODELS}
        baseline=model_scores["global_reemergence"]
        report["partitions"][name]={
            "years":list(years),"n_issued":sum(run["n_issued"] for run in runs),
            "n_evaluated":len(cases),"n_unresolved":sum(run["n_unresolved"] for run in runs),
            "positive_outcomes":sum(c["outcome"] for c in cases),
            "models":model_scores,
            "brier_skill_vs_global":{
                model:(1-value["brier"]/baseline["brier"])
                  if value and baseline and baseline["brier"]>0 else None
                for model,value in model_scores.items()
            },
            "by_year":[{"year":year,
                        "n":sum(1 for c in cases if c["origin_year"]==year),
                        "positives":sum(c["outcome"] for c in cases if c["origin_year"]==year)}
                       for year in range(years[0],years[1]+1)],
            "cases":cases
        }
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ged-zip",type=Path,required=True)
    parser.add_argument("--ged-sha256",required=True)
    parser.add_argument("--roster-csv",type=Path,required=True)
    parser.add_argument("--roster-sha256",required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    ged=parse_ged_exact_months(args.ged_zip,args.ged_sha256)
    roster=load_onsets(args.roster_csv.read_bytes(),kind="intrastate_country",
                       expected_sha256=args.roster_sha256)
    report=reemergence_report(ged,roster)
    save_private(report,args.out)
    result=report["partitions"]["test"]
    print(json.dumps({"schema":SCHEMA,"n_evaluated":result["n_evaluated"],
                      "positives":result["positive_outcomes"],
                      "source_as_of_verified":False,"prospective_eligible":False}))


if __name__=="__main__":
    main()
