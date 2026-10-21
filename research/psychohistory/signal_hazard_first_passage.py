"""AV-084: pre-threshold intensity and decline as possible EARLY signals of regime flips.

Only old-edition deaths are features or fitting labels. Out-of-vintage 25.1/26.1
are outcomes ONLY. This challenger was designed after inspecting both holdouts:
all performance is retrospective, post-hoc and NOT independent validation.
First-year signal is observable at cutoff; year-two unknown intensity is NEVER
imputed or taken from future outcome, and uses duration-only survival hazard.
"""
from __future__ import annotations
import argparse
import json
import math
import random
from pathlib import Path

import historic23_holdout_2024 as historic
import release_separated_holdout as release
from duration_hazard_first_passage import (
    age_bin, streak, fit_duration, first_change_by_duration,
    YEARS_BY_CUTOFF, FUTURES, MODELS
)
from futures import fit, matrix_for
from release_separated_first_passage import first_passage_bins, brier

PRIOR=50
LOW_NEAR_THRESHOLD_MIN=10
HIGH_DECLINE_RATIO=0.5
DRAW_COUNT=2000
SEED=54840


def numeric(raw):
    try:
        value=float(raw)
    except (ValueError,TypeError,OverflowError) as exc:
        raise ValueError("Missing or invalid historical fatality count") from exc
    if not math.isfinite(value) or value<0:
        raise ValueError("Invalid nonnegative historical fatality count")
    return value


def old_lookup(rows,cutoff):
    if not rows:raise ValueError("Empty old source")
    old={}
    for r in rows:
        year=int(r["year"]); cid=int(r["country_id"])
        if year>cutoff:raise ValueError("Later data present in frozen train vintage")
        key=(cid,year)
        if key in old:raise ValueError("Duplicate country-year input")
        death=numeric(r["sb_total_deaths_best"])
        old[key]={"b":int(death>=25),"deaths":death,"name":r["country"],"region":r["region"]}
    if max(y for _,y in old)!=cutoff:
        raise ValueError("Incorrect historical training cut")
    return old


def signal(lookup,cid,year):
    """Only dead counts at or before the asked-for year; no future variables."""
    row=lookup.get((cid,year))
    if row is None:raise ValueError("Missing observed year for feature")
    deaths=row["deaths"]
    if row["b"]==0:
        return int(LOW_NEAR_THRESHOLD_MIN<=deaths<25)
    previous=lookup.get((cid,year-1))
    return int(previous is not None and previous["b"]==1
               and deaths<=HIGH_DECLINE_RATIO*previous["deaths"])


def fit_signal_hazard(old,cutoff):
    duration=fit_duration(old,cutoff)
    cells=[[[[0,0] for _ in range(2)] for _ in range(4)] for _ in range(2)]
    for cid,year in sorted(old):
        if year>cutoff or (cid,year-1) not in old:continue
        prior=old[cid,year-1]
        regime=prior["b"];age=streak(old,cid,year-1)
        flagged=signal(old,cid,year-1)
        switched=int(old[cid,year]["b"]!=regime)
        cells[regime][age_bin(age)][flagged][switched]+=1
    rates=[[[0.0,0.0] for _ in range(4)] for __ in range(2)]
    for r in (0,1):
        for age in range(4):
            for flag in (0,1):
                cell=cells[r][age][flag]
                rates[r][age][flag]=(cell[1]+PRIOR*duration["rates"][r][age])/(sum(cell)+PRIOR)
    return {"duration":duration,"cells":cells,"rates":rates}


def first_change_with_signal(regime,age,flag,trained):
    if regime not in (0,1) or flag not in (0,1) or type(age) is not int or age<1:
        raise ValueError("Invalid fixed pre-origin risk signal")
    # Second-year features are UNKNOWN at issue; use base duration hazard,
    # not look-ahead, and absorb all year-one first changes.
    h1=trained["rates"][regime][age_bin(age)][flag]
    h2=trained["duration"]["rates"][regime][age_bin(age+1)]
    p=[h1,(1-h1)*h2,(1-h1)*(1-h2)]
    if any(not math.isfinite(x) or x<0 or x>1 for x in p) or abs(sum(p)-1)>1e-9:
        raise ValueError("Survival probability failed")
    return p


def paired_bands(rows,cutoff):
    if not rows:raise ValueError("No paired results")
    samples=[[x for x in rows if x["regime"]==r] for r in (0,1)]
    rng=random.Random(SEED+cutoff)
    pairs=("duration_hazard_fixed","country_shrinkage","persistence")
    values={m:[] for m in pairs}
    n=len(rows)
    def mean(d,m):
        return math.fsum(x["losses"]["signal_hazard"]-x["losses"][m] for x in d)/len(d)
    for _ in range(DRAW_COUNT):
        chosen=[]
        for group in samples:
            chosen.extend(group[rng.randrange(len(group))] for __ in range(len(group)))
        for m in pairs:values[m].append(mean(chosen,m))
    def quantile(arr,p):
        arr=sorted(arr)
        ix=(len(arr)-1)*p;j=int(ix)
        return arr[j]+(arr[min(j+1,len(arr)-1)]-arr[j])*(ix-j)
    return {"draws":DRAW_COUNT,"seed":SEED+cutoff,
        "strata":{"low":len(samples[0]),"high":len(samples[1])},
        "contrasts":{m:{"deltaBrier":mean(rows,m),
                  "descriptivePercentile95":[quantile(values[m],.025),quantile(values[m],.975)]}
                  for m in pairs},
        "regionDependenceAccountedFor":False,"confirmatory":False}


def evaluate(old_rows,later_rows,cutoff):
    if cutoff not in YEARS_BY_CUTOFF or not later_rows:
        raise ValueError("Unsupported vintage/cutoff")
    old=old_lookup(old_rows,cutoff)
    trained=fit_signal_hazard(old,cutoff)
    fitted=fit(old,cutoff+2,FUTURES)
    years=YEARS_BY_CUTOFF[cutoff]
    future={}
    for row in later_rows:
        yr=int(row["year"])
        if yr not in years:continue
        key=(int(row["country_id"]),yr)
        if key in future:raise ValueError("Duplicate future country-year")
        future[key]=int(numeric(row["sb_total_deaths_best"])>=25)
    names=[*MODELS,"duration_hazard_fixed","signal_hazard"]
    total={m:0.0 for m in names}
    change={m:0.0 for m in names}
    stable={m:0.0 for m in names}
    flags=[[0,0] for _ in range(2)]
    outcomes_by_flag=[[[0,0,0] for _ in range(2)] for __ in range(2)]
    predicted_event_mass=[[[0.0,0.0] for _ in range(2)] for __ in range(2)]
    n=missing=events=none=firstYear=secondYear=0
    pairs=[]
    for country in fitted["countries"]:
        cid=country["id"]
        if any((cid,y) not in future for y in years):
            missing+=1;continue
        regime=country["initial"]%2
        age=streak(old,cid,cutoff)
        flag=signal(old,cid,cutoff)
        flags[regime][flag]+=1
        actual=next((i for i,y in enumerate(years) if future[cid,y]!=regime),2)
        outcomes_by_flag[regime][flag][actual]+=1
        n+=1
        if actual<2:events+=1
        else:none+=1
        if actual==0:firstYear+=1
        if actual==1:secondYear+=1
        scores={}
        for m in names:
            if m=="signal_hazard":
                dist=first_change_with_signal(regime,age,flag,trained)
                predicted_event_mass[regime][flag][0]+=dist[0]+dist[1]
                predicted_event_mass[regime][flag][1]+=1
            elif m=="duration_hazard_fixed":
                dist=first_change_by_duration(regime,age,trained["duration"]["rates"])
            else:
                dist=first_passage_bins(country["initial"],matrix_for(fitted,country,m,FUTURES))
            loss=brier(dist,actual)
            scores[m]=loss
            total[m]+=loss
            if actual<2:change[m]+=loss
            else:stable[m]+=loss
        pairs.append({"regime":regime,"losses":scores})
    if n<1 or n+missing!=len(fitted["countries"]):
        raise ValueError("Invalid old-only cohort accounting")
    return {"schema":"psychohistory.futures.prethreshold_signal_first_passage.v1",
        "status":"RETROSPECTIVE_POSTHOC_EXPLORATION_DO_NOT_PROMOTE",
        "cutoff":cutoff,"horizonYears":list(years),
        "n":n,"excludedMissing":missing,"oldOnlyRoster":len(fitted["countries"]),
        "firstChangeYearOne":firstYear,"firstChangeYearTwo":secondYear,
        "firstChanges":events,"noChanges":none,
        "sourceSignal":{
            "lowRegimeNearThreshold":"10<=old sb_total_deaths_best<25",
            "highRegimePriorYearDecline":"old current>=25 and old prior>=25 and old current<=0.5*old prior",
            "flagCountsByRegime":flags,
            "observedFirstChangeOutcomeByRegimeAndFlag":outcomes_by_flag,
            "meanPredictedEventRiskByRegimeAndFlag":[
                [predicted_event_mass[r][f][0]/predicted_event_mass[r][f][1] if predicted_event_mass[r][f][1] else None
                    for f in (0,1)] for r in (0,1)],
            "bucketEdges":["1","2-3","4-7","8+"],"fixedPseudoCount":PRIOR,
            "yearTwoSignalSource":"UNKNOWN; FALLBACK TO DURATION-ONLY HAZARD",
            "trainedCellCounts":trained["cells"]},
        "models":{m:{"brier":total[m]/n,
            "observedChangeBrier":change[m]/events if events else None,
            "observedStabilityBrier":stable[m]/none if none else None}
            for m in names},
        "pairedUncertainty":paired_bands(pairs,cutoff),
        "modelChosenAfterEarlierHoldouts":True,
        "historicallyIssuedForecast":False,"prospectiveSkillProven":False,
        "historicalSourceTimeAttested":False,
        "warning":"Both target windows were inspected before AV084 hypothesis design; 2024 overlaps. Signal model is for research only, not prospective proof or trading."}


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--old",type=Path,required=True)
    cli.add_argument("--new",type=Path,required=True)
    cli.add_argument("--pair",choices=["23to25","24to26"],required=True)
    a=cli.parse_args()
    if a.pair=="23to25":
        old,_=historic.rows_23_xlsx(a.old,historic.PIN_231)
        new,_=historic.bounded_zip(a.new,historic.PIN_251,historic.NEW_VERSION)
        report=evaluate(old,new,2022)
    else:
        old,_=release.probe(a.old,"00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260",release.OLD_VERSION)
        new,_=release.probe(a.new,release.PROTOCOL["archive_sha256"],release.NEW_VERSION)
        report=evaluate(old,new,2023)
    print(json.dumps(report,indent=2,sort_keys=True,allow_nan=False))


if __name__=="__main__":main()
