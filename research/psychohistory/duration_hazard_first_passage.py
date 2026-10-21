"""AV-083, exploratory regime-duration hazard for time-to-FIRST threshold crossing.

A sixth research CHALLENGER, not a modification to the five frozen models.
Duration bins and prior=20 are locked in this source BEFORE scoring.
Both official source-release pairings must be SHA-checked by their original readers.
No country-wise scores/IDs returned, no model selection, not an issued forecast.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
from collections import defaultdict

import historic23_holdout_2024 as historic
import release_separated_holdout as release
from release_separated_first_passage import first_passage_bins, brier, FUTURES
from futures import prepare, fit, matrix_for, MODELS

BINS=(1,2,4,8)  # 1; 2-3; 4-7; >=8 years in unchanged regime
CONCENTRATION=20
YEARS_BY_CUTOFF={2022:(2023,2024),2023:(2024,2025)}

def age_bin(age):
    if type(age) is not int or age<1:
        raise ValueError("Duration must be positive")
    return min(3,sum(age>=cut for cut in BINS[1:]))

def streak(lookup,cid,year):
    """Length of observed run ending at cutoff (right bounded at source start)."""
    if (cid,year) not in lookup:
        raise ValueError("Missing state at origin cutoff")
    regime=lookup[cid,year]["b"]
    age=0
    while (cid,year-age) in lookup and lookup[cid,year-age]["b"]==regime:
        age+=1
    return age

def fit_duration(lookup,cutoff):
    """Only events and run ages from years <= cutoff; no later labels."""
    if type(cutoff) is not int:
        raise ValueError("Bad cutoff")
    counts=[[[0,0] for _ in BINS] for __ in range(2)]
    global_counts=[[0,0],[0,0]]
    for cid,t in sorted(lookup):
        if t>cutoff or (cid,t-1) not in lookup:continue
        regime=lookup[cid,t-1]["b"]
        switched=int(lookup[cid,t]["b"]!=regime)
        age=streak(lookup,cid,t-1)
        counts[regime][age_bin(age)][switched]+=1
        global_counts[regime][switched]+=1
    if any(sum(row)<1 for row in global_counts):
        raise ValueError("Insufficient low/high regime histories")
    global_rates=[(g[1]+1)/(sum(g)+2) for g in global_counts]
    # Do not learn, select or tune concentration/bins using the holdout outcome.
    rates=[[(counts[r][b][1]+CONCENTRATION*global_rates[r])/
            (sum(counts[r][b])+CONCENTRATION) for b in range(4)]
           for r in range(2)]
    return {"cutoff":cutoff,"counts":counts,"globalRates":global_rates,"rates":rates}

def first_change_by_duration(regime,age,rates,steps=2):
    if regime not in (0,1) or type(age) is not int or age<1 or steps!=2:
        raise ValueError("Unexpected duration forecast input")
    still=1.0
    bins=[]
    for t in range(steps):
        hazard=rates[regime][age_bin(age+t)]
        if not 0<=hazard<=1:raise ValueError("Invalid hazard")
        bins.append(still*hazard)
        still*=1-hazard
    bins.append(still)
    if any(not math.isfinite(p) or p<0 or p>1 for p in bins) or abs(sum(bins)-1)>1e-10:
        raise ValueError("First-event mass violation")
    return bins

def evaluate(early_rows,later_rows,cutoff):
    if cutoff not in YEARS_BY_CUTOFF or not early_rows or not later_rows:
        raise ValueError("Invalid source-separated vintage design")
    lookup=prepare(early_rows,{"threshold_deaths":25})
    if max(year for _,year in lookup)!=cutoff:
        raise ValueError("Training vintage must end at the specified cutoff")
    # Original five models fitted from *the same* old vintage, untouched.
    fitted=fit(lookup,cutoff+2,FUTURES)
    duration=fit_duration(lookup,cutoff)
    years=YEARS_BY_CUTOFF[cutoff]
    resolution={(int(r["country_id"]),int(r["year"])):
        int(float(r["sb_total_deaths_best"])>=25) for r in later_rows
        if int(r["year"]) in years}
    model_ids=[*MODELS,"duration_hazard_fixed"]
    totals={m:0.0 for m in model_ids}
    event_losses={m:0.0 for m in model_ids}
    stable_losses={m:0.0 for m in model_ids}
    zero={m:0 for m in model_ids}
    n=missing=events=stable=event0=event1=low=high=0
    for country in fitted["countries"]:
        cid=country["id"]
        if any((cid,yr) not in resolution for yr in years):
            missing+=1;continue
        init=country["initial"]%2
        age=streak(lookup,cid,cutoff)
        actual=next((i for i,y in enumerate(years) if resolution[cid,y]!=init),2)
        n+=1
        if init:high+=1
        else:low+=1
        if actual==2:stable+=1
        else:events+=1
        if actual==0:event0+=1
        if actual==1:event1+=1
        for model in model_ids:
            if model=="duration_hazard_fixed":
                probs=first_change_by_duration(init,age,duration["rates"])
            else:
                probs=first_passage_bins(country["initial"],matrix_for(fitted,country,model,FUTURES))
            score=brier(probs,actual)
            totals[model]+=score
            if actual==2:stable_losses[model]+=score
            else:event_losses[model]+=score
            zero[model]+=int(probs[actual]==0)
    if n<1 or n+missing!=len(fitted["countries"]):
        raise ValueError("No evaluable cases or missing cohort accounting")
    return {
        "schema":"psychohistory.futures.duration_hazard_exploratory.v1",
        "status":"EXPLORATORY_RELEASE_SEPARATED_POST_HOC_MODEL_DO_NOT_PROMOTE",
        "trainingCutoff":cutoff,"outcomeYears":list(years),
        "countryN":n,"frozenOldRoster":len(fitted["countries"]),"missingLaterLabels":missing,
        "firstChangeAtBridge":event0,"firstChangeAtTarget":event1,
        "firstChangesTotal":events,"noChange":stable,
        "initialLow":low,"initialHigh":high,
        "durationSpecification":{
            "bins":["1","2-3","4-7","8+"],
            "priorStrength":CONCENTRATION,
            "trainingGlobalRates":duration["globalRates"],
            "trainingBinCounts":duration["counts"]},
        "models":{m:{"meanBrier":totals[m]/n,
                      "meanBrierOnObservedChange":event_losses[m]/events if events else None,
                      "meanBrierOnNoChange":stable_losses[m]/stable if stable else None,
                      "zeroProbabilityForActual":zero[m]} for m in model_ids},
        "trainFromLaterVintage":False,"forecastIssuedBeforeOutcome":False,
        "sourceBytesIndependentlyTimeWitnessedAtOrigin":False,
        "prespecifiedBeforeInspectedHoldout":False,"prospectiveSkillProven":False,
        "outcomeYearsOverlapPreviousExperiments":True,
        "warning":"Duration feature is learned ONLY from old training vintage but designed after AV-080/082 outcomes were inspected. This is exploratory in-sample scientific development; do not claim holdout success or trade."}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--old",type=Path,required=True)
    p.add_argument("--new",type=Path,required=True)
    p.add_argument("--edition",choices=["23to25","24to26"],required=True)
    a=p.parse_args()
    if a.edition=="23to25":
        old,_=historic.rows_23_xlsx(a.old,historic.PIN_231)
        new,_=historic.bounded_zip(a.new,historic.PIN_251,historic.NEW_VERSION)
        report=evaluate(old,new,2022)
    else:
        if release.PROTOCOL["archive_sha256"]!= "66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34":
            raise ValueError("Unexpected official pinned modern vintage")
        old,_=release.probe(a.old,"00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260",release.OLD_VERSION)
        new,_=release.probe(a.new,release.PROTOCOL["archive_sha256"],release.NEW_VERSION)
        report=evaluate(old,new,2023)
    print(json.dumps(report,sort_keys=True,indent=2,allow_nan=False))
if __name__=="__main__":main()
