"""AV-080: first-event timing with frozen OrganizedViolenceCY 24.1 training.

2024/25 outcomes are read only from later 26.1; no new-vintage feature,
country eligibility, transition count, model parameter or training label
may influence the frozen fit. Sources must match explicitly pinned ZIP SHA256.
This is RETROSPECTIVE and not an as-of forecast actually issued in 2025.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path

from release_separated_holdout import (
    PROTOCOL as SOURCE_PROTOCOL, probe, OLD_VERSION, NEW_VERSION,
    TRAIN_END, sha,
)
from futures import prepare, fit, matrix_for, MODELS

HERE=Path(__file__).resolve().parent
FUTURES=json.loads((HERE/"futures_protocol.json").read_text(encoding="utf-8"))
ORIGIN=TRAIN_END+2  # 2025; 2024 is an integrated bridge
OUTCOMES=(2024,2025)
EPS=1e-12

def first_passage_bins(initial,matrix):
    """First threshold flip in 2024, 2025, or no flip by 2025."""
    survivors=[float(i==initial) for i in range(4)]
    bins=[]
    for _ in OUTCOMES:
        following=[0.0]*4
        crossed=0.0
        for i,weight in enumerate(survivors):
            for j,p in enumerate(matrix[i]):
                if j%2 != initial%2:
                    crossed+=weight*p
                else:
                    following[j]+=weight*p
        bins.append(crossed)
        survivors=following
    bins.append(sum(survivors))
    if any(not math.isfinite(x) or x<0 or x>1 for x in bins) or abs(sum(bins)-1)>1e-9:
        raise ValueError("First transition probability mass not conserved")
    return bins

def brier(p,idx):
    return sum((v-float(i==idx))**2 for i,v in enumerate(p))

def evaluate_rows(earlier,later):
    """Deterministic, aggregate-only training and scoring, after ZIP verification."""
    if not earlier or not later:
        raise ValueError("Empty source")
    old=prepare(earlier,SOURCE_PROTOCOL)
    if max(year for _,year in old)!=TRAIN_END:
        raise ValueError("Old version must end at training cutoff 2023")
    fitted=fit(old,ORIGIN,FUTURES)
    if fitted["cutoff"]!=TRAIN_END or not fitted["countries"]:
        raise ValueError("Expected nonempty 2023 frozen training cohort")
    # A distinct namespace for labels: never send later vintage to fit().
    future={(int(r["country_id"]),int(r["year"])):int(float(r["sb_total_deaths_best"])>=25)
            for r in later if int(r["year"]) in OUTCOMES}
    comparison={(int(r["country_id"]),int(r["year"])):int(float(r["sb_total_deaths_best"])>=25)
            for r in later if int(r["year"])==TRAIN_END}
    included=0;missing=0;first2024=0;first2025=0;nochange=0
    revisions=0;pairable=0
    accumulator={m:{"sum_brier":0.0,"sum_log_loss_capped":0.0,"zero_outcome_p":0}
                 for m in MODELS}
    # No per-country records are ever returned or logged.
    frozen_signature=hashlib.sha256()
    for c in fitted["countries"]:
        matrices={m:matrix_for(fitted,c,m,FUTURES) for m in MODELS}
        # Matrix snapshot is computed before the outcome lookup.
        frozen_signature.update(json.dumps(
            [c["id"],matrices],sort_keys=True,separators=(",",":")).encode())
        cid=c["id"]
        if (cid,2024) not in future or (cid,2025) not in future:
            missing+=1
            continue
        a,b=future[cid,2024],future[cid,2025]
        original=c["initial"]%2
        idx=0 if a!=original else 1 if b!=original else 2
        included+=1
        if idx==0:first2024+=1
        elif idx==1:first2025+=1
        else:nochange+=1
        now=comparison.get((cid,TRAIN_END))
        if now is not None:
            pairable+=1
            revisions+=int(now!=original)
        for m in MODELS:
            probs=first_passage_bins(c["initial"],matrices[m])
            loss=accumulator[m]
            loss["sum_brier"]+=brier(probs,idx)
            loss["sum_log_loss_capped"]+=-math.log(max(EPS,probs[idx]))
            loss["zero_outcome_p"]+=int(probs[idx]==0)
    if not included:
        raise ValueError("No complete independent outcome 2024-2025 cases")
    return {
        "schema":"psychohistory.futures.release_separated_first_passage.v1",
        "status":"RELEASE_SEPARATED_RETROSPECTIVE_NOT_HISTORICALLY_ISSUED",
        "training_product":"OrganizedViolenceCY 24.1",
        "scoring_product":"OrganizedViolenceCY 26.1",
        "training_cutoff":TRAIN_END,"hypothetical_issue_year":ORIGIN,
        "bridge_year_integrated_not_conditioned":2024,
        "outcome_years":list(OUTCOMES),
        "frozen_training_roster":len(fitted["countries"]),
        "missing_one_or_more_future_labels":missing,
        "n_evaluable":included,
        "event_first_2024":first2024,
        "event_first_2025":first2025,
        "no_event_by_2025":nochange,
        "paired_2023_labels_for_revision_check":pairable,
        "revised_2023_labels_changed":revisions,
        "frozen_parameter_set_sha256":frozen_signature.hexdigest(),
        "models":{m:{
            "mean_first_passage_brier":accumulator[m]["sum_brier"]/included,
            "mean_log_loss_capped":accumulator[m]["sum_log_loss_capped"]/included,
            "actual_zero_probability_cases":accumulator[m]["zero_outcome_p"]}
            for m in MODELS},
        "original_24_1_available_by_2025_issue_independently_attested":False,
        "training_from_later_26_1":False,
        "forecast_issued":False,"prospective_skill_proven":False,
        "independent_temporal_origins":False,
        "warning":"Same-product release-separated descriptive holdout. 24.1 bytes observed today are not an independently timestamped January 2025 forecast. Do not select model winner from one two-year window."}

def run(old_path,new_path,sha24,sha26):
    if sha26!=SOURCE_PROTOCOL["archive_sha256"]:
        raise ValueError("Outcome SHA must match frozen protocol")
    earlier,a=probe(old_path,sha24,OLD_VERSION)
    later,b=probe(new_path,sha26,NEW_VERSION)
    result=evaluate_rows(earlier,later)
    return {**result,"source_hashes":{"train":sha24,"outcome":sha26},
            "source_quality":{"train":a,"outcome":b}}
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--earlier",type=Path,required=True)
    p.add_argument("--later",type=Path,required=True)
    p.add_argument("--sha24",required=True)
    p.add_argument("--sha26",default=SOURCE_PROTOCOL["archive_sha256"])
    a=p.parse_args()
    print(json.dumps(run(a.earlier,a.later,a.sha24,a.sha26),sort_keys=True,indent=2,allow_nan=False))

if __name__=="__main__":main()
