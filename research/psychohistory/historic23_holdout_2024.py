"""Frozen archival UCDP 23.1 XLSX -> 25.1 CSV 2024 holdout, not prospective.

Inputs must match pins. No 25.1 data may affect fitting or features. Output
contains only aggregate metrics; no country or prediction-level rows in logs.
"""
import argparse
import hashlib
import io
import json
import math
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from collections import Counter

from benchmark import audit,panel,predict_origin,metrics
from release_separated_holdout import bounded_zip
from historic23_xlsx_probe import column_num,NS

HERE=Path(__file__).resolve().parent
CORE=json.loads((HERE/"protocol.json").read_text(encoding="utf-8"))
PIN_231="6c7dc09cc3173b21568a88d70862bee6a9199b2c6b217719698d9298ca8ecaff"
PIN_251="564ce9a33652a5d7adef30f00ce6ac86411dedbcc10ef60ca9bdfbfeb9fea917" # Observed in no-score CI #39455838398
YEAR=2024
TRAIN_END=2022
OLD_VERSION="23.1"
NEW_VERSION="25.1"
FEATURES=("country_id","country","year","region","sb_total_deaths_best",
          "sb_total_deaths_low","sb_total_deaths_high","ns_total_deaths_best",
          "os_total_deaths_best")
MAX_BYTES=12_000_000
MAX_MEMBER=70_000_000

def digest(b):return hashlib.sha256(b).hexdigest()

def rows_23_xlsx(path, pinned):
    if pinned!=PIN_231:raise ValueError("Historic 23.1 hash not preregistered")
    if path.stat().st_size>MAX_BYTES:raise ValueError("Historic XLSX too large")
    payload=path.read_bytes()
    if digest(payload)!=pinned:raise ValueError("Historic 23.1 XLSX bytes changed")
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        files=set(z.namelist())
        for needed in ("xl/workbook.xml","xl/worksheets/sheet1.xml"):
            if needed not in files or z.getinfo(needed).file_size>MAX_MEMBER:
                raise ValueError("Expected bounded official first worksheet")
        if "xl/sharedStrings.xml" in files and z.getinfo("xl/sharedStrings.xml").file_size>MAX_MEMBER:
            raise ValueError("Unexpected huge shared string table")
        strings=[]
        if "xl/sharedStrings.xml" in files:
            text=ET.fromstring(z.read("xl/sharedStrings.xml"))
            strings=["".join(x.itertext()) for x in text.findall("m:si",NS)]
        tree=ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    def text_value(c):
        typ=c.attrib.get("t")
        v=c.find("m:v",NS)
        if typ=="s":
            if v is None or v.text is None:raise ValueError("Shared string missing index")
            pos=int(v.text)
            if pos<0 or pos>=len(strings):raise ValueError("Bad shared string index")
            return strings[pos].strip()
        if typ=="inlineStr":
            v2=c.find("m:is",NS)
            return "".join(v2.itertext()).strip() if v2 is not None else ""
        if typ in ("b","e"):raise ValueError("Boolean/error source feature prohibited")
        if c.find("m:f",NS) is not None:raise ValueError("Formula cell not acceptable")
        return v.text.strip() if v is not None and v.text else ""
    def extract(row):
        result={}
        for cell in row.findall("m:c",NS):
            col=column_num(cell.attrib.get("r",""))
            if col is None or col<0 or col>140 or col in result:raise ValueError("Invalid/duplicate worksheet column")
            result[col]=text_value(cell)
        return result
    sheet=tree.find(".//m:sheetData",NS)
    if sheet is None:raise ValueError("No XLSX sheetData")
    source_rows=sheet.findall("m:row",NS)
    if len(source_rows)<2:raise ValueError("Need header and data")
    header=extract(source_rows[0])
    positions={}
    for f in FEATURES:
        col=f+"_cy"
        found=[idx for idx,v in header.items() if v==col]
        if len(found)!=1 or f in header.values():raise ValueError("Missing or ambiguous 23.1 feature "+f)
        positions[f]=found[0]
    rows=[]
    for row in source_rows[1:]:
        data=extract(row)
        if not any(data.get(i) for i in positions.values()):continue
        selected={f:data.get(i,"") for f,i in positions.items()}
        if any(not v for v in selected.values()):
            raise ValueError("Incomplete archival country-year row; do not impute")
        selected["Version"]=OLD_VERSION
        rows.append(selected)
    if not rows:raise ValueError("No archival country-year observations")
    protocol={**CORE,"dataset_version":OLD_VERSION}
    source_audit=audit(rows,protocol,strict=False)
    if source_audit["years"] != [1989,TRAIN_END]:
        raise ValueError("Historic source must end in 2022")
    return rows,{"archive_sha256":pinned,"rows":source_audit["rows"],"countries":source_audit["countries"],
                 "years":source_audit["years"],"sheet_rows_nonempty":len(rows)}

def eval_2024(historic_xlsx, later_csv_zip):
    if not PIN_251 or len(PIN_251)!=64:raise ValueError("25.1 outcome hash not yet pinned")
    old,qa=rows_23_xlsx(historic_xlsx,PIN_231)
    newer,member_hash=bounded_zip(later_csv_zip,PIN_251,NEW_VERSION)
    protocol_new={**CORE,"dataset_version":NEW_VERSION}
    quality=audit(newer,protocol_new,strict=False)
    if quality["years"] != [1989,2024]:raise ValueError("Future outcome source wrong terminal year")
    prior={**CORE,"dataset_version":OLD_VERSION}
    train,excluded=panel(old,prior,target="presence",estimate_kind="best")
    old_lookup={(int(r["country_id"]),int(r["year"])):r for r in old}
    resolution={(int(r["country_id"]),int(r["year"])):r for r in newer}
    eligible=[];nohistory=0;unresolved=0;revisions=0;comparable=0
    countries=sorted(cid for cid,yr in old_lookup if yr==TRAIN_END)
    for cid in countries:
        ks=[(cid,y) for y in range(TRAIN_END-4,TRAIN_END+1)]
        if any(k not in old_lookup for k in ks):
            nohistory+=1;continue
        history=[old_lookup[k] for k in ks]
        active=[int(float(r["sb_total_deaths_best"])>=25) for r in history]
        last=history[-1]
        eligible.append({"country":cid,"year":YEAR,"target":None,
                         "region":last["region"],"feature_year":TRAIN_END,
                         "last_target":active[-1],
                         "x":[float(active[-1]),sum(active)/5,
                           math.log1p(float(last["sb_total_deaths_best"])),
                           math.log1p(float(last["ns_total_deaths_best"])),
                           math.log1p(float(last["os_total_deaths_best"]))]})
    if not eligible:raise ValueError("No complete risk cohort")
    predictions=predict_origin(train+eligible,YEAR,prior)
    if len(predictions)!=len(eligible) or any(
       p["training_last_year"]!=TRAIN_END or p["feature_year"]!=TRAIN_END for p in predictions):
        raise ValueError("Model cutoff or fold changed")
    scored=[]
    for p in predictions:
        cid=p["country"]
        later=resolution.get((cid,YEAR))
        if later is None:
            unresolved+=1
            continue
        truth=int(float(later["sb_total_deaths_best"])>=25)
        scored.append({**p,"target":truth})
        early2022=old_lookup.get((cid,TRAIN_END))
        later2022=resolution.get((cid,TRAIN_END))
        if early2022 and later2022:
            comparable+=1
            revisions+=int((float(early2022["sb_total_deaths_best"])>=25)!=(float(later2022["sb_total_deaths_best"])>=25))
    if not scored:raise ValueError("No scored outcomes")
    measured={model:metrics(scored,model,CORE["calibration_bins"]) for model in CORE["models"]}
    all_scores={}
    for model,m in measured.items():
        reference=measured["frequency"]["brier"]
        all_scores[model]={
           "brier":round(m["brier"],8),
           "log_loss":round(m["log_loss"],6),
           "average_precision":round(m["average_precision"],6) if m["average_precision"] is not None else None,
           "brier_skill_vs_frequency":round(1-m["brier"]/reference,6) if reference>0 else None
        }
    return {"schema":"psychohistory.release_separated_holdout_2024.v1",
            "run_type":"RETROSPECTIVE_ONE_YEAR_RELEASE_SEPARATED_NOT_CONFIRMATORY",
            "target":"2024_state_based_violence_within_borders_ge25",
            "train_archive_edition":OLD_VERSION,"outcome_archive_edition":NEW_VERSION,
            "train_labels_last_year":TRAIN_END,"features_last_year":TRAIN_END,
            "target_year":YEAR,"frozen_2022_roster":len(countries),
            "eligible_2024_cohort":len(eligible),
            "missing_eligible_history":nohistory,"unresolved_outcome":unresolved,
            "scored_identical_countries":len(scored),
            "n_positive":sum(p["target"] for p in scored),
            "training_rows":len(train),"train_panel_exclusions":excluded,
            "historic_2022_threshold_revisions":revisions,
            "historic_2022_cross_edition_comparable":comparable,
            "frozen_input_sha256":{"train":PIN_231,"outcomes":PIN_251},
            "source_train_audit":qa,
            "source_outcome_audit":{"rows":quality["rows"],"countries":quality["countries"],
                                    "years":quality["years"],"member_sha256":member_hash},
            "models":all_scores,
            "as_of_historical_bytes_verified":False,"forecast_issued":False,
            "prospective_skill_demonstrated":False,"trading_authorized":False,
            "caveat":"Scoring decided after inspecting 2025. Two release-separated evaluations cannot establish out-of-sample temporal skill; 23.1 bytes not witnessed as of 2023."}
def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--23-xlsx",type=Path,required=True)
    cli.add_argument("--25-zip",type=Path,required=True)
    args=cli.parse_args()
    print(json.dumps(eval_2024(getattr(args,"23_xlsx"),getattr(args,"25_zip")),sort_keys=True,allow_nan=False,indent=2))
if __name__=="__main__":main()
