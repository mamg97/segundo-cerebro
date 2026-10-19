"""AV-049: measure UCDP intrastate onset semantic alignment on a FIXED overlap.

Old UCDP onset CSV is advertised as 19.1 but its observed bytes end in
2017, and contain duplicate GW-year observations. Compare binary ANY
projection against official 25.1 country-level AND conflict-level versions.
Matching units remain provisional: differing vintages and retrospective
definitions cannot establish causal reasons for individual disagreements.

Only aggregate counts are printed. No training, countries, scores or forecasts.
"""
from __future__ import annotations
from collections import Counter, defaultdict
import csv
from hashlib import sha256
import io
import json
from urllib.request import Request, urlopen
from urllib.parse import urlparse

SCHEMA="psychohistory.onset_semantic_triangulation.v1"
SOURCES={
  "old":("https://ucdp.uu.se/downloads/onset/onsets_computed.csv",
         "ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8"),
  "country":("https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv",
         "e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe2ea83fe6a"),
  "conflict":("https://ucdp.uu.se/downloads/onset/ucdp-intrastate-conflict-onset-251.csv",
         "a5a64b749693c85fd3b50a1311608a44c0846d528352baeb3767f25e50d52fe1"),
}

def parse(data, kind):
    if kind not in SOURCES or not isinstance(data,bytes) or not 100<=len(data)<=30_000_000:
        raise ValueError("Unknown source or bad size")
    try: rdr=csv.DictReader(io.StringIO(data.decode("utf-8-sig"),newline=""))
    except UnicodeError as e: raise ValueError("Expected UTF8 CSV") from e
    if not rdr.fieldnames or len(rdr.fieldnames)!=len(set(rdr.fieldnames)) or not {"gwno_a","year","onset1"}.issubset(rdr.fieldnames):
        raise ValueError("Invalid CSV header")
    observations=defaultdict(list)
    rows=0; missing=0
    for line in rdr:
        if None in line or any(v is None for v in line.values()):
            raise ValueError("CSV structure mismatch")
        try:
            country=int(line["gwno_a"].strip())
            year=int(line["year"].strip())
        except (ValueError,TypeError) as e: raise ValueError("Malformed country year") from e
        if country<=0 or not 1946<=year<=(2017 if kind=="old" else 2024):
            raise ValueError("Unexpected coverage or country")
        flag=line["onset1"].strip()
        if flag not in ("0","1","","NA","NaN"): raise ValueError("Invalid onset1 label")
        val=int(flag) if flag in ("0","1") else None
        if val is None:missing+=1
        observations[(country,year)].append(val)
        rows+=1
        if rows>20_000:raise ValueError("Unusual row count")
    if not rows:raise ValueError("No country-year rows")
    dup=sum(len(vals)-1 for vals in observations.values())
    if kind=="country" and dup: raise ValueError("Modern country-level country-year duplication")
    # For diagnostic projection only: a known 1 suffices; mixed 0+missing is unknown.
    projected={}
    conflicting=0
    for key,vals in observations.items():
        known={v for v in vals if v is not None}
        if len(known)>1: conflicting+=1
        projected[key]=(1 if 1 in known else None if None in vals else 0)
    return {"values":projected,"rows":rows,"unique":len(observations),
            "duplicates":dup,"conflicting_binary_keys":conflicting,
            "missing_rows":missing,"min_year":min(y for _,y in observations),
            "max_year":max(y for _,y in observations)}

def evaluate(old,country,conflict):
    if not all(isinstance(x,dict) for x in (old,country,conflict)):
        raise ValueError("Parsed dictionaries required")
    keys=set(old["values"]) & set(country["values"]) & set(conflict["values"])
    if not keys: raise ValueError("No matched population")
    # The earlier pairwise comparison was 10,130. Never shrink the denominator
    # to improve agreement without a new protocol/PR.
    if len(keys) != len(set(old["values"]) & set(country["values"])):
        raise ValueError("Conflict variant lacks one of the fixed old-country pairwise keys")
    classes=Counter()
    year_groups=defaultdict(Counter)
    n_valid=0
    for key in keys:
        a,b,c=(v["values"][key] for v in (old,country,conflict))
        if None in (a,b,c):
            classes["unresolved"]+=1
            continue
        classes[f"o{a}_country{b}_conflict{c}"]+=1
        year_groups["1946-1988" if key[1]<=1988 else "1989-2017"][f"{a}{b}{c}"]+=1
        n_valid+=1
    old_country=sum(v for k,v in classes.items() if k.startswith("o1_country0_") or k.startswith("o0_country1_"))
    old_conflict=sum(v for k,v in classes.items() if k in ("o1_country0_conflict0","o1_country1_conflict0","o0_country0_conflict1","o0_country1_conflict1"))
    cflag=sum(v for k,v in classes.items() if k.startswith("o1_country0_conflict1"))
    old1country0=sum(v for k,v in classes.items() if k.startswith("o1_country0_"))
    if sum(classes.values())!=len(keys) or old_country!=old1country0+sum(v for k,v in classes.items() if k.startswith("o0_country1_")):
        raise ValueError("Counter accounting mismatch")
    return {
      "schema":SCHEMA,
      "fixed_common_country_year_keys":len(keys),
      "joint_binary_evaluable_keys":n_valid,
      "joint_unresolved":classes["unresolved"],
      "old_country_disagreements":old_country,
      "old_conflict_disagreements":old_conflict,
      "old_positive_country_negative_total":old1country0,
      "old_positive_country_negative_conflict_positive":cflag,
      "old_positive_country_negative_conflict_negative":classes["o1_country0_conflict0"],
      "three_way_label_signatures":{k:classes.get(k,0) for k in
           ("o0_country0_conflict0","o0_country0_conflict1",
            "o0_country1_conflict0","o0_country1_conflict1",
            "o1_country0_conflict0","o1_country0_conflict1",
            "o1_country1_conflict0","o1_country1_conflict1")},
      "strata_counts":{y:dict(sorted(c.items())) for y,c in sorted(year_groups.items())},
      "old_duplicate_rows":old["duplicates"],
      "modern_conflict_duplicate_rows":conflict["duplicates"],
      "old_unique_keys":old["unique"],
      "modern_conflict_unique_keys":conflict["unique"],
      "modern_country_unique_keys":country["unique"],
      "historic_semantic_identity_verified":False,
      "apparent_country_vs_conflict_alignment_proves_cause":False,
      "independent_2020_byte_clock_verified":False,
      "country_ids_in_output":False,
      "historical_training_authorized":False,
      "backtest_authorized":False,"scores_computed":False,"forecast_issued":False,
      "caveat":"All three archives observed in 2026. Conflict-level OR-projection is descriptive, not a country-onset risk model. No temporal witness or territorial concordance proved.",
    }

def audit_official():
    parsed={}
    for kind,(url,pinned) in SOURCES.items():
        if urlparse(url).hostname!="ucdp.uu.se" or not url.endswith(".csv"):
            raise ValueError("Expected official archive URL")
        request=Request(url,headers={"User-Agent":"Psychohistory-Academic-VintageCompare/1.0"})
        with urlopen(request,timeout=35) as resp:
            if resp.geturl()!=url:raise ValueError("Redirect to unpinned URL")
            body=resp.read(30_000_001)
        if sha256(body).hexdigest()!=pinned:
            raise ValueError("Official source differs from observed 2026 pin; no silent repin")
        parsed[kind]=parse(body,kind)
    out=evaluate(parsed["old"],parsed["country"],parsed["conflict"])
    out["all_three_observed_2026_hashes_match_pins"]=True
    return out

if __name__=="__main__":
    print(json.dumps(audit_official(),sort_keys=True))
