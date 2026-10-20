"""AV-054: test Onset-19.1 provenance and non-intrastate contamination hypotheses.

Compare the same 61 preregistered old-newconf residual country-years with
*all four* UCDP/PRIO conflict types. Type 1 is extrasystemic, 2 interstate,
3 internal, and 4 internationalized internal. Record all type classes without
conflating a missing matched key with no violence. Only aggregate counters
leave the ephemeral Actions runner. Never authorize backtests or as-of claims.

The modern country-onset 25.1 is not a label historically available in 2020.
"""
from __future__ import annotations
from collections import Counter,defaultdict
import csv
from hashlib import sha256
import io
import json
import re

from onset_semantic_triangulation import SOURCES,parse,evaluate
from onset_residual_newconf_audit import read_flags
from onset_four_variant_semantics import fetch
from ucdp_prio_conflict_lineage_av052 import (
    INDEX,ACD_OBSERVED_PINS_2026,official_acd_links,safe_csv,
)

SCHEMA="psychohistory.onset191_provenance_acd_types.v1"
LABELS={1:"extrasystemic",2:"interstate",3:"internal",4:"internationalized_internal"}
EXPECTED_OLD_SHA=SOURCES["old"][1]


def audit_old_schema(raw):
    if not isinstance(raw,bytes) or sha256(raw).hexdigest()!=EXPECTED_OLD_SHA:
        raise ValueError("Old onset bytes differ from observed 2026 SHA")
    rd=csv.DictReader(io.StringIO(raw.decode("utf-8-sig"),newline=""))
    if not rd.fieldnames or len(rd.fieldnames)!=len(set(rd.fieldnames)):
        raise ValueError("Invalid old onset header")
    required={"gwno_a","year","onset1","newconf","onset5"}
    if not required.issubset(rd.fieldnames):
        raise ValueError("Old vintage no longer matches expected documented columns")
    keys=Counter();years=Counter();rows=0
    label_conflicts=set()
    values={}
    for rec in rd:
        if None in rec or any(v is None for v in rec.values()):
            raise ValueError("Malformed old onset row")
        try:
            gw=int(rec["gwno_a"]);year=int(rec["year"])
        except (TypeError,ValueError) as e:
            raise ValueError("Bad numeric identifier or year") from e
        if gw<=0 or year<1946 or year>2018:raise ValueError("Out of documented vintage")
        x=rec["onset1"].strip()
        if x not in ("0","1","","NA","NaN"):raise ValueError("Unsupported old onset flag")
        k=(gw,year)
        if k in values and values[k]!=x:label_conflicts.add(k)
        values[k]=x
        keys[k]+=1;years[year]+=1;rows+=1
        if rows>20000:raise ValueError("Excessive onset rows")
    if not rows:raise ValueError("Empty vintage")
    maxyear=max(years)
    return {
        "old_file_sha256_observed_2026":EXPECTED_OLD_SHA,
        "old_actual_year_min":min(years),
        "old_actual_year_max":maxyear,
        "old_codebook_declared_max_year":2018,
        "old_actual_rows":rows,
        "old_actual_unique_country_year_keys":len(keys),
        "old_extra_rows_beyond_unique_country_year":sum(n-1 for n in keys.values()),
        "old_conflicting_onset1_duplicate_keys":len(label_conflicts),
        "old_has_any_2018_rows":2018 in years,
        "old_is_complete_codebook19_1_vintage_verified":False,
        "old_monadic_granularity_as_documented_verified":False,
        "old_available_before_2020_07_01_independently_verified":False,
    }


def typed_acd(raw,edition):
    if edition not in ("19.1","25.1") or not isinstance(raw,bytes):
        raise ValueError("ACD vintage missing or not authorised")
    rd=csv.DictReader(io.StringIO(raw.decode("utf-8-sig"),newline=""))
    if not rd.fieldnames or len(rd.fieldnames)!=len(set(rd.fieldnames)):
        raise ValueError("Missing/duplicate ACD columns")
    if not {"gwno_loc","type_of_conflict","year","conflict_id"}.issubset(rd.fieldnames):
        raise ValueError("ACD historical columns missing")
    keys=defaultdict(set);rows=0;unresolved=0
    for rec in rd:
        if None in rec or any(v is None for v in rec.values()):
            raise ValueError("Malformed ACD conflict-year")
        try:
            y=int(rec["year"]); typ=int(rec["type_of_conflict"]); conflict=int(rec["conflict_id"])
        except (ValueError,TypeError) as e:
            raise ValueError("Invalid year/type/conflict ID") from e
        if not 1946<=y<=(2018 if edition=="19.1" else 2024) or typ not in LABELS or conflict<=0:
            raise ValueError("Out-of-edition conflict-year")
        rows+=1
        loc=rec["gwno_loc"].strip()
        if not re.fullmatch(r"\d+(?:\s*,\s*\d+)*",loc):
            unresolved+=1
            continue
        for gw in loc.split(","):
            code=int(gw.strip())
            if code<=0:raise ValueError("Invalid GW code")
            keys[(code,y)].add(typ)
        if rows>30000:raise ValueError("Excess ACD rows")
    if not rows:raise ValueError("Empty ACD dataset")
    return {"types":keys,"rows":rows,"unresolved_global_location_rows":unresolved}


def _classify(types):
    if any(t not in LABELS for t in types):raise ValueError("Unknown type")
    intra=bool(types & {3,4})
    other=bool(types & {1,2})
    if intra and other:return "mixed_internal_noninternal"
    if intra:return "internal_only"
    if other:return "noninternal_only"
    return "no_matched_acd_key"


def compare(old_raw,country_raw,conflict_raw,old_acd,new_acd,strict=True):
    bodies={"old":old_raw,"country":country_raw,"conflict":conflict_raw}
    p={n:parse(data,n) for n,data in bodies.items()}
    f={n:read_flags(data,n) for n,data in bodies.items()}
    overlap=set.intersection(*(set(v["values"]) for v in p.values()))
    original=evaluate(p["old"],p["country"],p["conflict"])
    if len(overlap)!=original["fixed_common_country_year_keys"]:
        raise ValueError("Original cohort count mismatch")
    cohort=[];residual=0
    for k in overlap:
        a,b,c=(f[n][k] for n in ("old","country","conflict"))
        if (a["onset1"],b["onset1"],c["onset1"])==(1,0,0):
            residual+=1
            if a["newconf"]==1:cohort.append(k)
    if strict and (len(overlap)!=10130 or original["old_country_disagreements"]!=218
                   or original["old_conflict_disagreements"]!=96
                   or residual!=85 or len(cohort)!=61):
        raise ValueError("Changed preregistered population or outcome flags")
    c_old=Counter();c_new=Counter();cross=Counter();by_period=Counter()
    no_internal=Counter();type_flags=Counter()
    for k in cohort:
        t1=old_acd["types"].get(k,set())
        t2=new_acd["types"].get(k,set())
        a,b=_classify(t1),_classify(t2)
        c_old[a]+=1;c_new[b]+=1;cross[(a,b)]+=1
        by_period[(("pre1989" if k[1]<1989 else "1989_2017"),a,b)]+=1
        if not (t1 & {3,4}) and not (t2 & {3,4}):
            no_internal[(a,b)]+=1
            for version,types in (("acd191",t1),("acd251",t2)):
                for kind in sorted(types):
                    type_flags[(version,LABELS[kind])]+=1
    if sum(c_old.values())!=len(cohort) or sum(cross.values())!=len(cohort):
        raise ValueError("Loss in fixed cohort")
    if strict and (sum(no_internal.values())!=51 or
                   sum(n for (a,b),n in cross.items()
                       if a in ("internal_only","mixed_internal_noninternal")
                       and b in ("internal_only","mixed_internal_noninternal"))!=10):
        raise ValueError("Cannot silently revise AV-052 10/51 ACD classification")
    def flatten(c):
        return {":".join(k) if isinstance(k,tuple) else k:v
                for k,v in sorted(c.items())}
    return {
        "schema":SCHEMA,
        "fixed_country_years":len(overlap),
        "residual_old_onset1_1_modern_both0":residual,
        "old_newconf1_residual_cohort":len(cohort),
        "old_acd_type_membership_counts":flatten(c_old),
        "new_acd_type_membership_counts":flatten(c_new),
        "cross_vintage_type_classifications":flatten(cross),
        "cross_type_by_period":flatten(by_period),
        "no_intrastate_acd_either_edition":sum(no_internal.values()),
        "no_intrastate_subgroup_type_breakdown":flatten(no_internal),
        "nonintrastate_type_occurrences_within_no_internal_subgroup":flatten(type_flags),
        "old_acd_unlocated_rows_global":old_acd["unresolved_global_location_rows"],
        "new_acd_unlocated_rows_global":new_acd["unresolved_global_location_rows"],
        "type_gwno_loc_is_government_incompatibility_not_event_location":True,
        "zero_matching_rows_means_zero_conflict_in_reality":False,
        "same_edited_onset_target_as_modern_verified":False,
        "asof_source_bytes_pre2020_verified":False,
        "country_frame_asof_verified":False,
        "model_training_authorised":False,
        "backtest_authorised":False,"scores_computed":False,"forecast_issued":False,
        "warning":"Counts are retrospective matches of GW-location conflict types; not proof of absence, revisions, model performance, or 2020 publication.",
    }


def run_official():
    index=fetch(INDEX,2_000_000)
    urls=official_acd_links(index)
    acd={}
    for version,url in urls.items():
        raw=fetch(url,20_000_000 if url.endswith(".zip") else 35_000_000)
        plain=safe_csv(raw) if url.endswith(".zip") else raw
        h0,h1=ACD_OBSERVED_PINS_2026[version]
        if sha256(raw).hexdigest()!=h0 or sha256(plain).hexdigest()!=h1:
            raise ValueError("ACD bytes not identical to pinned October-2026 observed edition")
        acd[version]=typed_acd(plain,version)
    onset={}
    for edition,(url,pin) in SOURCES.items():
        body=fetch(url)
        if sha256(body).hexdigest()!=pin:
            raise ValueError("Onset historical bytes changed since observed pin")
        onset[edition]=body
    report=compare(onset["old"],onset["country"],onset["conflict"],acd["19.1"],acd["25.1"])
    report.update(audit_old_schema(onset["old"]))
    report["all_five_public_sources_match_2026_observed_digests"]=True
    return report


if __name__=="__main__":
    print(json.dumps(run_official(),sort_keys=True))
