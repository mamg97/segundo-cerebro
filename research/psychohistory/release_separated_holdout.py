"""Release-separated, one-year *retrospective* holdout for UCDP CY (2025).

Training and all predictors come solely from official v24.1 (through 2023);
2025 labels come solely from later v26.1. Never score on the source used for
training, and never call this a real forecast issued in 2024. Standard library.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
import math
import sys
import zipfile
from pathlib import Path

from benchmark import audit, panel, predict_origin, metrics
from vintage_audit import load_csv_vintage

HERE=Path(__file__).resolve().parent
PROTOCOL=json.loads((HERE/"protocol.json").read_text(encoding="utf-8"))
MODELS=tuple(PROTOCOL["models"])
OLD_VERSION="24.1"
NEW_VERSION="26.1"
TARGET_YEAR=2025
TRAIN_END=2023
MAX_BYTES=20_000_000
MAX_MEMBER=20_000_000

def sha(data: bytes)->str:
    return hashlib.sha256(data).hexdigest()

def bounded_zip(path: Path, expected_hash: str, source_version: str):
    if not isinstance(expected_hash,str) or len(expected_hash)!=64 or any(c not in "0123456789abcdef" for c in expected_hash):
        raise ValueError("Pinned lower-case SHA256 required")
    if path.stat().st_size>MAX_BYTES:
        raise ValueError("ZIP exceeds bounded input")
    raw=path.read_bytes()
    if sha(raw)!=expected_hash:
        raise ValueError("ZIP SHA256 mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        entries=[v for v in z.infolist() if v.filename.lower().endswith(".csv") and not v.is_dir()]
        if len(entries)!=1 or entries[0].file_size>MAX_MEMBER:
            raise ValueError("Exactly one bounded CSV required")
        data=z.read(entries[0])
    reader=csv.DictReader(io.StringIO(data.decode("utf-8-sig")))
    if not reader.fieldnames:
        raise ValueError("CSV header absent")
    expected={"country_id","year","Version","region","sb_total_deaths_best",
              "ns_total_deaths_best","os_total_deaths_best","country",
              "sb_total_deaths_low","sb_total_deaths_high"}
    # Old official editions use suffix _cy for some columns. Accept exact,
    # unambiguous aliases only; NEVER fill a genuinely missing feature.
    fields={}
    for name in expected:
        aliases=[x for x in (name,name+"_cy") if x in reader.fieldnames]
        if len(aliases)!=1:
            raise ValueError("Official model field absent/ambiguous: "+name)
        fields[name]=aliases[0]
    rows=[{name:r[key] for name,key in fields.items()} for r in reader]
    for r in rows:
        # Normalize only an explicit v-prefix, preserving the original source bytes.
        if r["Version"].strip().lstrip("v")!=source_version:
            raise ValueError("Version contradicts official historical edition")
        r["Version"]=source_version
    return rows,sha(data)

def probe(path:Path,expected: str,version: str):
    old=load_csv_vintage(path,version,expected)
    rows,member_hash=bounded_zip(path,expected,version)
    protocol={**PROTOCOL,"dataset_version":version}
    quality=audit(rows,protocol,strict=False)
    if version==OLD_VERSION and quality["years"][1]!=TRAIN_END:
        raise ValueError("Unexpected training cutoff")
    if version==NEW_VERSION and quality["years"][1]!=TARGET_YEAR:
        raise ValueError("Unexpected outcome cutoff")
    if old["year_to"]!=quality["years"][1] or old["countries"]!=quality["countries"]:
        raise ValueError("Independent source loaders disagree")
    return rows,{"archive_sha256":expected,"member_sha256":member_hash,
                 "years":quality["years"],"n_country_years":quality["rows"],
                 "n_countries":quality["countries"]}

def run(earlier:Path,later:Path,pinned_earlier:str,pinned_later:str):
    if pinned_later!=PROTOCOL["archive_sha256"]:
        raise ValueError("Later release digest must match frozen core protocol")
    old,old_quality=probe(earlier,pinned_earlier,OLD_VERSION)
    new,new_quality=probe(later,pinned_later,NEW_VERSION)
    train_protocol={**PROTOCOL,"dataset_version":OLD_VERSION}
    # No new-version row, revision or outcome may enter training/feature generation.
    historical,ignored=panel(old,train_protocol,target="presence",estimate_kind="best")
    lookup={(int(r["country_id"]),int(r["year"])):r for r in old}
    reference={(int(r["country_id"]),int(r["year"])):r for r in new}
    cohort=[];no_history=0;unresolved=0;revision_changes=0;pairable=0
    countries=sorted(cid for cid,year in lookup if year==TRAIN_END)
    for country in countries:
        needed=[(country,y) for y in range(TRAIN_END-4,TRAIN_END+1)]
        if any(k not in lookup for k in needed):
            no_history+=1;continue
        # All five features have exactly the definitions in the main benchmark.
        # Construct 2025 test rows without touching later-version outcomes.
        rows=[lookup[country,y] for y in range(TRAIN_END-4,TRAIN_END+1)]
        last=rows[-1]
        active=[int(float(r["sb_total_deaths_best"])>=25) for r in rows]
        mean=sum(active)/len(active)
        cohort.append({"country":country,"year":TARGET_YEAR,"target":None,
                       "region":last["region"],"feature_year":TRAIN_END,
                       "last_target":active[-1],
                       "x":[float(active[-1]),mean,
                            math.log1p(float(last["sb_total_deaths_best"])),
                            math.log1p(float(last["ns_total_deaths_best"])),
                            math.log1p(float(last["os_total_deaths_best"]))]})
    if not cohort:
        raise ValueError("No historical cohort")
    predicted=predict_origin(historical+cohort,TARGET_YEAR,train_protocol)
    if len(predicted)!=len(cohort) or any(x["training_last_year"]!=TRAIN_END or
         x["feature_year"]!=TRAIN_END for x in predicted):
        raise ValueError("Leakage / mismatched training window")
    scored=[]
    for p in predicted:
        cid=p["country"]
        outcome=reference.get((cid,TARGET_YEAR))
        if outcome is None:
            unresolved+=1;continue # Missing is NOT zero.
        label=int(float(outcome["sb_total_deaths_best"])>=25)
        scored.append({**p,"target":label})
        earlier_state=lookup.get((cid,TRAIN_END))
        later_state=reference.get((cid,TRAIN_END))
        if earlier_state and later_state:
            pairable+=1
            revision_changes+=int((float(earlier_state["sb_total_deaths_best"])>=25)!=
                                  (float(later_state["sb_total_deaths_best"])>=25))
    if not scored or len(scored)!=len(predicted)-unresolved:
        raise ValueError("No admissible outcome coverage")
    m={name:metrics(scored,name,PROTOCOL["calibration_bins"]) for name in MODELS}
    baseline=m["frequency"]["brier"]
    summary={}
    for model in MODELS:
        v=m[model]
        summary[model]={"brier":round(v["brier"],8),
            "brier_skill_vs_frequency":round(1-v["brier"]/baseline,6) if baseline>0 else None,
            "log_loss":round(v["log_loss"],6),
            "average_precision":round(v["average_precision"],6) if v["average_precision"] is not None else None}
    return {"schema":"psychohistory.release_separated_holdout_2025.v1",
       "status":"RETROSPECTIVE_SINGLE_TARGET_YEAR_NOT_CONFIRMATORY",
       "training_dataset":"OrganizedViolenceCY 24.1",
       "outcome_dataset":"OrganizedViolenceCY 26.1",
       "target_year":TARGET_YEAR,"feature_cutoff_year":TRAIN_END,
       "train_labels_max_year":TRAIN_END,
       "archive_hashes":{"train":pinned_earlier,"outcome":pinned_later},
       "source_audit":{"train":old_quality,"outcome":new_quality},
       "train_eligible_rows":len(historical),
       "training_panel_exclusions":ignored,
       "frozen_2023_roster":len(countries),
       "cohort_with_five_years":len(cohort),
       "excluded_for_missing_history":no_history,
       "not_evaluable_no_later_outcome":unresolved,
       "scored_identical_cohort":len(scored),
       "positive_outcomes":sum(p["target"] for p in scored),
       "earlier_label_revisions_among_scored":revision_changes,
       "earlier_labels_in_both_vintages":pairable,
       "models":summary,
       "independent_preissue_byte_witness":False,
       "forecast_issued":False,
       "prospective_skill_demonstrated":False,
       "trading_authorized":False,
       "caveat":"One target year only; vintage 24.1 bytes observed now, not independently authenticated as of 2024. Scores are descriptive and cannot establish stable skill."}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--earlier",type=Path,required=True)
    ap.add_argument("--later",type=Path,required=True)
    ap.add_argument("--sha24",required=True)
    ap.add_argument("--sha26",default=PROTOCOL["archive_sha256"])
    args=ap.parse_args()
    out=run(args.earlier,args.later,args.sha24,args.sha26)
    # Only population-level metrics to CI; not country rows, weights or prices.
    print(json.dumps(out,sort_keys=True,indent=2,allow_nan=False))
if __name__=="__main__":
    main()
