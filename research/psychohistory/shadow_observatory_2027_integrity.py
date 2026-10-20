"""Fail-closed offline audit for the PRIVATE 2027 shadow HTML observatory.

Never prints country IDs, names or probabilities. Audit passes mean only
the 196-country presentation is internally coherent; not that an actual
forecast was issued, calibrated or independently time-stamped.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import re

SCHEMA="psychohistory.2027_shadow_view_integrity.v1"
FIELDS=("p","baseline","interaction","memory","markov","persistence")


def inspect(html, n=196):
    if not isinstance(html,str) or not 100<=len(html)<=2_000_000:
        raise ValueError("Missing or oversized private HTML")
    needle="const dataset="
    if html.count(needle)!=1 or "<script" not in html:
        raise ValueError("Expected one embedded JSON object")
    raw=html.split(needle,1)[1].lstrip()
    try:
        d,end=json.JSONDecoder(parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x))).raw_decode(raw)
    except (ValueError,TypeError) as e:
        raise ValueError("Embedded payload is not strict JSON") from e
    if not raw[end:].lstrip().startswith(";"):
        raise ValueError("Invalid script declaration boundary")
    if not isinstance(d,dict) or not isinstance(d.get("meta"),dict) or not isinstance(d.get("rows"),list):
        raise ValueError("Invalid observatory envelope")
    m,rows=d["meta"],d["rows"]
    if (m.get("target")!=2027 or m.get("n")!=n or m.get("models")!=6
        or m.get("sourceVersion")!="26.1" or m.get("issued") is not False
        or len(rows)!=n or not re.fullmatch(r"[a-f0-9]{64}",str(m.get("candidateSha256","")))):
        raise ValueError("Unrecognized or wrongly issued 2027 cohort")
    if not all(t in html for t in ("SHADOW","NO EMITIDO","No usar para decisiones de seguridad")):
        raise ValueError("Missing research and safety labels")
    ids=set();names=set();prior=float("inf");high=0;disag=0
    for i,r in enumerate(rows):
        if not isinstance(r,dict) or not {"id","name","rank","difference","disagreement",*FIELDS}.issubset(r):
            raise ValueError("Missing country/model fields")
        if (not isinstance(r["id"],int) or isinstance(r["id"],bool)
            or not isinstance(r["name"],str) or not 1<=len(r["name"])<=160
            or r["id"] in ids or r["name"].casefold() in names
            or not isinstance(r["rank"],int) or r["rank"]!=i+1):
            raise ValueError("Duplicate/invalid identity or rank")
        ids.add(r["id"]);names.add(r["name"].casefold())
        for k in (*FIELDS,"difference","disagreement"):
            v=r[k]
            if not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v):
                raise ValueError("Non-finite numeric field")
            if k in FIELDS and not 0<=v<=1:
                raise ValueError("Probability outside [0,1]")
        if (abs(r["difference"]-100*(r["p"]-r["baseline"]))>.006 or
            abs(r["disagreement"]-100*abs(r["p"]-r["interaction"]))>.006):
            raise ValueError("Inconsistent percentage point calculations")
        if r["p"]>prior+1e-10:
            raise ValueError("Misleading or unsorted ranking")
        prior=r["p"]
        high+=int(r["p"]>=.5)
        disag+=int(r["disagreement"]>=20)
    return {"schema":SCHEMA,"state":"PRIVATE_SHADOW_VIEW_VALID_NOT_ISSUED",
            "year":2027,"countries":len(rows),"models":6,
            "experimental_probability_values":len(rows)*6,
            "v2_at_least_50pct_countries":high,
            "model_disagreement_ge_20pp_countries":disag,
            "country_values_or_ids_disclosed":False,
            "html_content_integrity_verified":True,
            "candidate_json_independently_authenticated":False,
            "historical_asof_verified":False,
            "independent_timestamp_receipt_verified":False,
            "model_prospective_skill_verified":False,
            "forecast_issued":False,"brier_2027_now_available":False}


def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument("--private-html",type=Path,required=True)
    a.add_argument("--expected-count",type=int,default=196)
    args=a.parse_args()
    if not 1<=args.expected_count<=500:raise ValueError("Invalid roster")
    p=args.private_html
    if p.stat().st_size>2_000_000:raise ValueError("HTML too large")
    print(json.dumps(inspect(p.read_text(encoding="utf-8-sig"),args.expected_count),sort_keys=True))


if __name__=="__main__":
    main()
