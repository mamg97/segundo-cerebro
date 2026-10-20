"""AV-082: first passage 2023/24 from genuine UCDP CY 23.1 XLSX training.

Outcomes ONLY from the later CY 25.1 ZIP. No earlier/later backfill;
source integrity is checked before the two-vintage evaluation. Retrospective
single-origin research, never a historical forecast actually issued in 2024.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import historic23_holdout_2024 as historic
from futures import prepare,fit,matrix_for,MODELS
from release_separated_first_passage import first_passage_bins,brier,FUTURES,EPS

ORIGIN=2024
CUTOFF=2022
YEARS=(2023,2024)

def evaluate(earlier,later):
    if not earlier or not later:raise ValueError("Both datasets required")
    old=prepare(earlier,historic.CORE)
    if not old or max(y for _,y in old)!=CUTOFF:
        raise ValueError("Historical XLSX must end at 2022")
    trained=fit(old,ORIGIN,FUTURES)
    if trained["cutoff"]!=CUTOFF or not trained["countries"]:
        raise ValueError("No frozen countries in historical fit")
    # Outcome lookup never passes into prepare(), fit() or matrix_for().
    future={(int(r["country_id"]),int(r["year"])):int(float(r["sb_total_deaths_best"])>=25)
            for r in later if int(r["year"]) in YEARS}
    revised={(int(r["country_id"]),int(r["year"])):int(float(r["sb_total_deaths_best"])>=25)
            for r in later if int(r["year"])==CUTOFF}
    totals={m:{"brier":0.0,"logLossCapped":0.0,"zeroActualProbability":0}
            for m in MODELS}
    trainedSignature=hashlib.sha256()
    first2023=first2024=noChange=missing=revised2022=compared=0
    startLow=startHigh=0
    for country in trained["countries"]:
        matrices={m:matrix_for(trained,country,m,FUTURES) for m in MODELS}
        trainedSignature.update(json.dumps(
            [country["id"],matrices],sort_keys=True,separators=(",",":")).encode())
        cid=country["id"]
        if any((cid,year) not in future for year in YEARS):
            missing+=1
            continue
        init=country["initial"]%2
        if init:startHigh+=1
        else:startLow+=1
        outcome=next((i for i,year in enumerate(YEARS) if future[cid,year]!=init),2)
        first2023+=int(outcome==0)
        first2024+=int(outcome==1)
        noChange+=int(outcome==2)
        if (cid,CUTOFF) in revised:
            compared+=1
            revised2022+=int(revised[cid,CUTOFF]!=init)
        for m in MODELS:
            probabilities=first_passage_bins(country["initial"],matrices[m])
            if len(probabilities)!=3:
                raise ValueError("Wrong two-year event distribution")
            entry=totals[m]
            entry["brier"]+=brier(probabilities,outcome)
            entry["logLossCapped"]+=-math.log(max(EPS,probabilities[outcome]))
            entry["zeroActualProbability"]+=int(probabilities[outcome]==0)
    n=first2023+first2024+noChange
    if n<1 or n+missing!=len(trained["countries"]):
        raise ValueError("Inconsistent cohort: no silent missing outcomes")
    return {
        "schema":"psychohistory.futures.historic23_first_passage_2024.v1",
        "status":"SEPARATED_RELEASE_RETROSPECTIVE_23_1_TO_25_1_NOT_ISSUED",
        "trainingEdition":"OrganizedViolenceCY 23.1 XLSX",
        "outcomeEdition":"OrganizedViolenceCY 25.1 CSV",
        "hypotheticalOrigin":ORIGIN,"trainingCutoff":CUTOFF,
        "bridgeYearIntegratedNotObserved":2023,"outcomeYears":list(YEARS),
        "frozenCohort":len(trained["countries"]),"evaluable":n,"missingOutcome":missing,
        "initialLow":startLow,"initialHigh":startHigh,
        "firstChange2023":first2023,"firstChange2024":first2024,
        "noChangeBy2024":noChange,
        "comparable2022RevisedLabels":compared,"revised2022ThresholdChanges":revised2022,
        "trainedParameterSetSha256":trainedSignature.hexdigest(),
        "models":{m:{
           "brierFirstEvent":totals[m]["brier"]/n,
           "logLossClipped":totals[m]["logLossCapped"]/n,
           "impossibleObservedEvents":totals[m]["zeroActualProbability"]}
           for m in MODELS},
        "previousAV0802024LabelYearOverlaps":True,
        "independentHistoricalAsOfSourceWitness":False,
        "historicalForecastIssued":False,"prospectiveSkillProven":False,
        "modelsRecalibratedWithLaterRelease":False,
        "warning":"Overlapping year 2024 with AV080. Only a retrospective source-separated sensitivity check, not an independent prospective validation."}
def run(old_xlsx,new_zip):
    prior,a=historic.rows_23_xlsx(old_xlsx,historic.PIN_231)
    later,member=historic.bounded_zip(new_zip,historic.PIN_251,historic.NEW_VERSION)
    result=historic.audit(later,{**historic.CORE,"dataset_version":historic.NEW_VERSION},strict=False)
    if result["years"]!=[1989,2024]:
        raise ValueError("25.1 official outcome horizon differs")
    return {**evaluate(prior,later),
       "pinnedSourceHashes":{"training":historic.PIN_231,"outcome":historic.PIN_251},
       "officialSourceAudit":{"old":a,"new":{"years":result["years"],"n":result["rows"],"memberSha256":member}}}
def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--23-xlsx",type=Path,required=True)
    cli.add_argument("--25-zip",type=Path,required=True)
    args=cli.parse_args()
    print(json.dumps(run(getattr(args,"23_xlsx"),getattr(args,"25_zip")),sort_keys=True,indent=2,allow_nan=False))
if __name__=="__main__":main()
