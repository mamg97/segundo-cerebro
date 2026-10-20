"""AV-081: uncertainty of AV-080's release-separated first-change holdout.

Retrain nothing: historical fit and eligibility use 24.1 ONLY; labels 2024/25
use 26.1 ONLY. Scores remain private; CLI outputs aggregate statistics only.
Intervals are descriptive, conditional on countries and a single period.
"""
from __future__ import annotations
import argparse
import json
import math
import random
from collections import Counter
from pathlib import Path

from release_separated_first_passage import (
    OUTCOMES, ORIGIN, TRAIN_END, FUTURES, SOURCE_PROTOCOL, OLD_VERSION, NEW_VERSION,
    MODELS, EPS, first_passage_bins, brier, probe,
)
from futures import prepare, fit, matrix_for

DRAW_COUNT=3000
SEED=54181
COMPARATORS=("frequency","markov","country_shrinkage","memory2")


def _quantile(values,q):
    ordered=sorted(values)
    x=(len(ordered)-1)*q
    lo=int(x)
    hi=min(lo+1,len(ordered)-1)
    return ordered[lo]+(ordered[hi]-ordered[lo])*(x-lo)


def paired_country_losses(earlier,later):
    """In-memory only; caller MUST NOT serialize country-level observations."""
    old=prepare(earlier,SOURCE_PROTOCOL)
    if not old or max(year for _,year in old)!=TRAIN_END:
        raise ValueError("Old source must end at 2023")
    fitted=fit(old,ORIGIN,FUTURES)
    if fitted["cutoff"]!=TRAIN_END:
        raise ValueError("Frozen fit cutoff changed")
    # Labels are segregated from historical counts and country eligibility.
    actual={(int(x["country_id"]),int(x["year"])):int(float(x["sb_total_deaths_best"])>=25)
            for x in later if int(x["year"]) in OUTCOMES}
    country_losses=[]
    for country in fitted["countries"]:
        cid=country["id"]
        if any((cid,year) not in actual for year in OUTCOMES):
            continue
        current=country["initial"]%2
        labels=[actual[cid,year] for year in OUTCOMES]
        first=next((i for i,bit in enumerate(labels) if bit!=current),len(OUTCOMES))
        losses={}
        for model in MODELS:
            probs=first_passage_bins(country["initial"],matrix_for(fitted,country,model,FUTURES))
            losses[model]=brier(probs,first)
        country_losses.append({"country":cid,"initial_high":current,"first":first,
                               "losses":losses})
    if not country_losses:
        raise ValueError("No scored country after source separation")
    return country_losses


def uncertainty_summary(rows,repetitions=DRAW_COUNT,seed=SEED):
    if not isinstance(rows,list) or len(rows)<3 or type(repetitions) is not int or not 100<=repetitions<=10000 or type(seed) is not int or not 0<=seed<=2**32-1:
        raise ValueError("Invalid paired uncertainty specification")
    ordered=sorted(rows,key=lambda r:r["country"])
    keys=set()
    groups={0:[],1:[]}
    for row in ordered:
        cid=row.get("country")
        init=row.get("initial_high")
        first=row.get("first")
        losses=row.get("losses")
        if (type(cid) is not int or cid in keys or type(init) is not int or init not in (0,1) or
            type(first) is not int or first not in (0,1,2) or
            not isinstance(losses,dict) or set(losses)!=set(MODELS) or
            any(type(p) not in (int,float) or not math.isfinite(p) or not 0<=p<=2 for p in losses.values())):
            raise ValueError("Invalid or duplicate per-country score")
        keys.add(cid)
        groups[init].append(row)
    n=len(ordered)
    rng=random.Random(seed)
    stats={m:[] for m in COMPARATORS}
    observed={m:math.fsum(r["losses"][m]-r["losses"]["persistence"] for r in ordered)/n for m in COMPARATORS}
    for _ in range(repetitions):
        sums={m:0.0 for m in COMPARATORS}
        for stratum in (groups[0],groups[1]):
            for __ in range(len(stratum)):
                loss=stratum[rng.randrange(len(stratum))]["losses"]
                baseline=loss["persistence"]
                for m in COMPARATORS:
                    sums[m]+=loss[m]-baseline
        for m in COMPARATORS:
            stats[m].append(sums[m]/n)
    events=[r for r in ordered if r["first"]!=2]
    nonevents=[r for r in ordered if r["first"]==2]
    def subgroup(g):
        if not g:return {"n":0,"meanBrierByModel":None}
        return {"n":len(g),"meanBrierByModel":{m:math.fsum(r["losses"][m] for r in g)/len(g) for m in MODELS}}
    # Wilson interval is descriptive; independence of countries is NOT established.
    p=len(events)/n
    z=1.959963984540054
    factor=1+z*z/n
    mid=(p+z*z/(2*n))/factor
    width=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/factor
    return {
        "schema":"psychohistory.futures.release_holdout_first_change_uncertainty.v1",
        "status":"POSTHOC_SINGLE_ORIGIN_DESCRIPTIVE_ONLY",
        "origin":ORIGIN,"last_training_year":TRAIN_END,
        "nCountries":n,
        "nInitialLow":len(groups[0]),"nInitialHigh":len(groups[1]),
        "eventRate":{"observedFirstChange":len(events),"nNoChange":len(nonevents),
                     "rate":p,"descriptiveWilson95AssumesIndependence":[mid-width,mid+width]},
        "byOutcome":{"observedAnyChange":subgroup(events),"noChange":subgroup(nonevents)},
        "comparisonsVsPersistence":{m:{
            "meanDeltaBrier":observed[m],
            "descriptivePairedBootstrap95":[_quantile(stats[m],.025),_quantile(stats[m],.975)],
            "bootstrapIntervalContainsZero":_quantile(stats[m],.025)<=0<=_quantile(stats[m],.975),
        } for m in COMPARATORS},
        "bootstrap":{"draws":repetitions,"seed":seed,
          "method":"paired_country_resampling_stratified_by_initial_regime"},
        "observationsAreDependent":True,"regionDependenceModelled":False,
        "sourceVintagesIndependentlyAttestedAt2025Issue":False,
        "prespecifiedConfirmatoryTest":False,"forecastIssued":False,
        "prospectiveSkillProven":False,
        "warning":"Eight observed first changes across one overlapping two-year target in actual AV080 holdout. Countries share shocks, so percentile bands and Wilson interval are conditional descriptions, NOT significance or future skill. No model winner is selected."
    }


def run(old_path,new_path,sha24,sha26,repetitions=DRAW_COUNT,seed=SEED):
    if sha26!=SOURCE_PROTOCOL["archive_sha256"]:
        raise ValueError("Frozen outcome SHA mismatch")
    old,_=probe(old_path,sha24,OLD_VERSION)
    new,_=probe(new_path,sha26,NEW_VERSION)
    rows=paired_country_losses(old,new)
    return {**uncertainty_summary(rows,repetitions,seed),
            "sourceHashes":{"train":sha24,"outcome":sha26}}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--earlier",type=Path,required=True)
    p.add_argument("--later",type=Path,required=True)
    p.add_argument("--sha24",required=True)
    p.add_argument("--sha26",default=SOURCE_PROTOCOL["archive_sha256"])
    args=p.parse_args()
    print(json.dumps(run(args.earlier,args.later,args.sha24,args.sha26),sort_keys=True,indent=2,allow_nan=False))

if __name__=="__main__":main()
