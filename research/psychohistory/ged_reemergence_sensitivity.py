"""Predeclared non-overlapping-forecast-window sensitivity for GED re-emergence.

Each selected issue is on January 1, separated by exactly 24 months: validation
2016/2018 and test 2020/2022/2024. Outcomes use GED windows from the unknown
information cutoff C=T-24 up to T, so these 24-month target windows never
overlap across *issue dates*. Countries remain correlated cross-sectionally,
and 2/3 calendar anchors are insufficient for a robust confidence interval.
No cherry-picked months, post-test thresholds or prospective-skill claims.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path

from ged_monthly_incidence import save_private
from ged_reemergence import SCHEMA, MODELS, scores, month_index, TARGET

ANCHOR_MONTH = 1
STEP_YEARS = 2
MIN_BLOCKS_FOR_INTERVAL = 10


def independent_sensitivity(report):
    if (report.get("schema") != SCHEMA or report.get("target") != TARGET or
        report.get("source_as_of_verified") is not False or
        report.get("prospective_eligible") is not False or
        report.get("status") != "RETROSPECTIVE_SOURCE_REVISED_EXPLORATORY" or
        report.get("outcome_horizon_months") != 24):
        raise ValueError("Input is not the approved non-prospective 24m re-emergence report")
    output={"schema":"psychohistory.ged.reemergence_nonoverlap_sensitivity.v1",
            "status":"POSTHOC_SENSITIVITY_RETROSPECTIVE_REVISED",
            "source_as_of_verified":False,"prospective_eligible":False,
            "selection":"Jan issues every 24 months, fixed at first year of each partition",
            "anchor_month":1,"step_months":24,
            "no_independent_prospective_skill_claim":True,"partitions":{}}
    for part,start,end in (("validation",2016,2019),("test",2020,2024)):
        data=report["partitions"].get(part,{})
        if data.get("years")!=[start,end] or not isinstance(data.get("cases"),list):
            raise ValueError("Missing or altered temporal partition")
        selected=[case for case in data["cases"]
                  if case["origin_month"]==ANCHOR_MONTH
                  and (case["origin_year"]-start)%STEP_YEARS==0]
        anchors=list(range(start,end+1,STEP_YEARS))
        if not selected or set(case["origin_year"] for case in selected)!=set(anchors):
            raise ValueError("One or more predeclared nonoverlapping issue anchors have no cases")
        keys=set()
        for c in selected:
            country,year=c["country_id"],c["origin_year"]
            if ((country,year) in keys or not isinstance(country,int) or isinstance(country,bool) or country<1 or
                c["origin_month"]!=1 or c["outcome"] not in (0,1) or isinstance(c["outcome"],bool)):
                raise ValueError("Invalid/duplicated private issue-cohort record")
            keys.add((country,year))
            for model in MODELS:
                p=c["probabilities"][model]
                if not isinstance(p,(int,float)) or not math.isfinite(p) or not 0<p<1:
                    raise ValueError("Invalid model probability in sensitivity sample")
        computed={m:scores(selected,m) for m in MODELS}
        base=computed["global_reemergence"]["brier"]
        output["partitions"][part]={
            "anchors":anchors,"n_calendar_blocks":len(anchors),
            "n_evaluated":len(selected),"positive_outcomes":sum(c["outcome"] for c in selected),
            "brier_skill_vs_global":{m:(1-v["brier"]/base if base>0 else None)
                                    for m,v in computed.items()},
            "models":computed,
            "confidence_interval_95":None,
            "significance_test":None,
            "limitations":"Only %d independent 24-month calendar anchor dates; countries within a block are correlated. No valid CI or significance estimate."%len(anchors),
        }
    return output


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--input",type=Path,required=True)
    cli.add_argument("--out",type=Path,required=True)
    args=cli.parse_args()
    result=independent_sensitivity(json.loads(args.input.read_text()))
    save_private(result,args.out)
    print(json.dumps({
      "schema":result["schema"],
      "test_n":result["partitions"]["test"]["n_evaluated"],
      "test_events":result["partitions"]["test"]["positive_outcomes"],
      "test_calendar_blocks":result["partitions"]["test"]["n_calendar_blocks"],
      "confidence_interval_available":False,
      "prospective_eligible":False
    }))


if __name__=="__main__":
    main()
