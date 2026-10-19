"""AV-051: anonymous cross-vintage diagnostics of 85 residual UCDP onset1 labels.

Only the same 10,130 pre-2018 country-year keys from AV-049 are
compared. newconf and onset5 are supplementary indicators, not ground
truth: these official 2026 observations do not authenticate 2020 availability.
"""
from __future__ import annotations
from collections import Counter,defaultdict
import csv
from hashlib import sha256
import io
import json
from onset_semantic_triangulation import SOURCES,parse,evaluate
from onset_four_variant_semantics import fetch

SCHEMA="psychohistory.ucdp_onset_residual_newconf.v1"
FIELDS=("onset1","newconf","onset5")
ERAS=((1946,1969),(1970,1988),(1989,1999),(2000,2017))


def _aggregate(flags):
    if 1 in flags:return 1
    if None in flags:return None
    return 0


def read_flags(raw,source):
    if source not in SOURCES or not isinstance(raw,bytes) or not 20<=len(raw)<=25_000_000:
        raise ValueError("Unapproved UCDP source")
    reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig"),newline=""))
    if (not reader.fieldnames or len(reader.fieldnames)!=len(set(reader.fieldnames))
            or not {"gwno_a","year",*FIELDS}.issubset(reader.fieldnames)):
        raise ValueError("Source does not provide required newconf/onset5 columns")
    raw_flags=defaultdict(lambda:defaultdict(list))
    rows=0
    for row in reader:
        if None in row or any(val is None for val in row.values()):
            raise ValueError("Malformed UCDP CSV")
        try:
            c=int(row["gwno_a"]);y=int(row["year"])
        except (ValueError,TypeError) as exc:
            raise ValueError("Malformed country-year") from exc
        if c<=0 or not 1946<=y<=(2017 if source=="old" else 2024):
            raise ValueError("Country-year beyond pinned edition")
        for f in FIELDS:
            val=row[f].strip()
            if val not in ("0","1","","NA","NaN"):
                raise ValueError("Unexpected UCDP binary label")
            raw_flags[(c,y)][f].append(int(val) if val in ("0","1") else None)
        rows+=1
        if rows>20_000:raise ValueError("Excess onset records")
    if not rows:raise ValueError("No historical rows")
    return {k:{f:_aggregate(v[f]) for f in FIELDS} for k,v in raw_flags.items()}


def audit(old_raw,country_raw,conflict_raw,strict=True):
    bodies={"old":old_raw,"country":country_raw,"conflict":conflict_raw}
    projects={k:parse(v,k) for k,v in bodies.items()}
    additions={k:read_flags(v,k) for k,v in bodies.items()}
    base=evaluate(projects["old"],projects["country"],projects["conflict"])
    keys=set(projects["old"]["values"])&set(projects["country"]["values"])&set(projects["conflict"]["values"])
    if len(keys)!=base["fixed_common_country_year_keys"]:
        raise ValueError("Inconsistent historical cohort")
    for version in bodies:
        if set(projects[version]["values"])!=set(additions[version]):
            raise ValueError("Country-year key mismatch")
        for k,v in projects[version]["values"].items():
            if v!=additions[version][k]["onset1"]:
                raise ValueError("Unexpected different onset1 projection")
    era=Counter();annual=Counter();subset=Counter()
    old_new=Counter();country_new=Counter();conflict_new=Counter()
    old_onset5=Counter();country_onset5=Counter()
    for k in keys:
        a,b,c=(additions[x][k] for x in ("old","country","conflict"))
        t=(a["onset1"],b["onset1"],c["onset1"])
        if None in t:raise ValueError("Cannot shrink matched cohort")
        if t==(1,0,0):category="residual85"
        elif t==(1,0,1):category="conflict127"
        elif t==(0,1,1):category="inverse6"
        else:continue
        subset[category]+=1
        if category=="residual85":
            annual[k[1]]+=1
            for lo,hi in ERAS:
                if lo<=k[1]<=hi:
                    era[f"{lo}-{hi}"]+=1
                    break
            else:raise ValueError("Year outside register")
        def label(prefix,val):
            return prefix+("unknown" if val is None else str(val))
        old_new[(category,label("newconf_",a["newconf"]))]+=1
        country_new[(category,label("newconf_",b["newconf"]))]+=1
        conflict_new[(category,label("newconf_",c["newconf"]))]+=1
        old_onset5[(category,label("onset5_",a["onset5"]))]+=1
        country_onset5[(category,label("onset5_",b["onset5"]))]+=1
    if strict and (len(keys)!=10130 or base["old_country_disagreements"]!=218
                   or base["old_conflict_disagreements"]!=96
                   or subset!=Counter({"residual85":85,"conflict127":127,"inverse6":6})):
        raise ValueError("Not the pinned October-2026 UCDP comparison population")
    if sum(era.values())!=subset["residual85"]:
        raise ValueError("Unaccounted residuals")
    def clean(counter):
        return {":".join(map(str,k)) if isinstance(k,tuple) else str(k):v
                for k,v in sorted(counter.items())}
    return {
      "schema":SCHEMA,
      "fixed_pairwise_keys":len(keys),
      "principal_residuals":subset["residual85"],
      "old_positive_country_negative_conflict_positive":subset["conflict127"],
      "old_negative_both_modern_positive":subset["inverse6"],
      "residual_by_era":clean(era),
      "residual_by_year_aggregate":clean(annual),
      "old_newconf_by_subgroup":clean(old_new),
      "modern_country_newconf_by_subgroup":clean(country_new),
      "modern_conflict_newconf_by_subgroup":clean(conflict_new),
      "old_onset5_by_subgroup":clean(old_onset5),
      "modern_country_onset5_by_subgroup":clean(country_onset5),
      "same_historical_target_verified":False,
      "residual_causes_adjudicated":False,
      "preorigin_source_bytes_authenticated":False,
      "country_frame_asof_verified":False,
      "historical_training_authorized":False,
      "backtest_authorized":False,"models_scored":False,"forecast_issued":False,
      "warning":"Newconf/onset5 comparisons are descriptive between editions; no issue-time evidence or predictive scores.",
    }


def run_official():
    raw={}
    for source,(url,pin) in SOURCES.items():
        body=fetch(url,25_000_000)
        if sha256(body).hexdigest()!=pin:
            raise ValueError("Official CSV digest changed from October-2026 observed pin")
        raw[source]=body
    report=audit(raw["old"],raw["country"],raw["conflict"])
    report["observed_2026_digests_reverified"]=True
    return report


if __name__=="__main__":
    print(json.dumps(run_official(),sort_keys=True))
