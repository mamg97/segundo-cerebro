"""AV-050: compare *four* UCDP onset definitions on the exact AV-049 panel.

Read the official Onset historical index for the third 25.1 variant (country
multiple-onset), never invent its filename. Old/conflict/country CSV checksums
stay fixed to October-2026 verified readings from AV-049. The newly observed
multiple-onset checksum is printed as a 2026 inventory hash, NEVER an
independent 2020 publication witness. Nothing here estimates forecasts.
"""
from __future__ import annotations
from collections import Counter
import csv
from hashlib import sha256
from html.parser import HTMLParser
import json
from urllib.parse import urljoin,urlparse
from urllib.request import Request,urlopen

from onset_semantic_triangulation import SOURCES, parse, evaluate
INDEX="https://ucdp.uu.se/downloads/olddw.html"
SCHEMA="psychohistory.four_onset_semantics.v1"
LINK_TEXT="Intrastate Country Level Multiple Onset CSV"

class OnsetLinks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.section=False; self.in_heading=False; self.heading=""
        self.target_version=False;self.in_anchor=False
        self.anchor_text="";self.href="";self.matches=[]
    def handle_starttag(self,tag,attrs):
        tag=tag.lower()
        if tag=="h2":self.in_heading=True;self.heading=""
        if tag=="a":
            self.in_anchor=True;self.anchor_text=""
            self.href=next((v for k,v in attrs if k.lower()=="href"),"")
    def handle_data(self,data):
        if self.in_heading:self.heading+=data
        if self.section and "version 25.1:" in data:self.target_version=True
        if self.section and ("version 24.1:" in data or "version 23.1:" in data or "version 19.1:" in data):
            self.target_version=False
        if self.in_anchor:self.anchor_text+=data
    def handle_endtag(self,tag):
        tag=tag.lower()
        if tag=="h2":
            self.in_heading=False
            self.section=self.heading.strip()=="UCDP Onset Dataset"
            self.target_version=False
        if tag=="a" and self.in_anchor:
            if self.section and self.target_version and self.anchor_text.strip()==LINK_TEXT:
                self.matches.append(self.href)
            self.in_anchor=False

def resolve_index(raw):
    if not isinstance(raw,bytes) or not 100<=len(raw)<=2_000_000:
        raise ValueError("Bad official index bytes")
    try:
        p=OnsetLinks();p.feed(raw.decode("utf-8-sig"))
    except UnicodeError as e:
        raise ValueError("Non-UTF8 official index") from e
    if len(p.matches)!=1:raise ValueError("Missing/ambiguous version 25.1 third-variant link")
    url=urljoin(INDEX,p.matches[0]); u=urlparse(url)
    if (u.scheme!="https" or u.netloc!="ucdp.uu.se" or
        not u.path.startswith("/downloads/onset/") or not u.path.endswith(".csv")
        or u.query or u.fragment):
        raise ValueError("Untrusted third variant URL")
    return url

def four_way(old,country,conflict,multiple):
    # evaluate() checks the AV-049 population and excludes nonbinary values.
    base=evaluate(old,country,conflict)
    overlap=set(old["values"]) & set(country["values"]) & set(conflict["values"])
    if overlap!=overlap & set(multiple["values"]):
        raise ValueError("Third modern variant is missing keys in fixed AV-049 panel")
    binary=Counter(); group=Counter(); unmatched=0
    for key in overlap:
        v=[x["values"][key] for x in (old,country,conflict,multiple)]
        if None in v:
            unmatched+=1
            continue
        binary["".join(str(x) for x in v)]+=1
        group["1946-1988" if key[1]<=1988 else "1989-2017"]+=1
    if unmatched or sum(binary.values())!=base["joint_binary_evaluable_keys"]:
        raise ValueError("No missing labels can silently alter comparison cohort")
    odd=sum(n for signature,n in binary.items() if signature[0]!=signature[3])
    countrydiff=sum(n for signature,n in binary.items() if signature[0]!=signature[1])
    conflictdiff=sum(n for signature,n in binary.items() if signature[0]!=signature[2])
    if countrydiff!=base["old_country_disagreements"] or conflictdiff!=base["old_conflict_disagreements"]:
        raise ValueError("Inconsistent older three-way comparison")
    return {
      "schema":SCHEMA,"fixed_common_keys":len(overlap),
      "old_vs_country_disagreements":countrydiff,
      "old_vs_conflict_any_disagreements":conflictdiff,
      "old_vs_country_multiple_disagreements":odd,
      "four_flag_patterns":{f"{i:04b}":binary.get(f"{i:04b}",0) for i in range(16)},
      "period_denominators":dict(sorted(group.items())),
      "old_one_country_zero_conflict_one_multiple_one":binary["1011"],
      "old_one_country_zero_conflict_zero_multiple_one":binary["1001"],
      "old_one_country_zero_conflict_zero_multiple_zero":binary["1000"],
      "variant_catalog_is_current_not_historical":True,
      "historical_target_identity_established":False,
      "historical_training_labels_admissible":False,
      "historical_source_clocks_authenticated":False,
      "backtest_authorized":False,"models_scored":False,"forecast_issued":False,
      "warning":"Only retrospective label-definition alignment, not explanation of individual conflicts or predictive performance.",
    }

def fetch(url, limit=25_000_000):
    with urlopen(Request(url,headers={"User-Agent":"Psychohistory-UCDP-Semantics/1.0"}),timeout=35) as r:
        if r.geturl()!=url:raise ValueError("Unexpected HTTP redirect")
        raw=r.read(limit+1)
    if len(raw)>limit:raise ValueError("Dataset too large")
    return raw

def run():
    url=resolve_index(fetch(INDEX,2_000_000))
    parsed={}
    for key,(source,sha) in SOURCES.items():
        raw=fetch(source)
        if sha256(raw).hexdigest()!=sha:
            raise ValueError("Pinned existing UCDP checksum changed")
        parsed[key]=parse(raw,key)
    latest=fetch(url)
    multi=parse(latest,"country")
    report=four_way(parsed["old"],parsed["country"],parsed["conflict"],multi)
    report["new_variant_official_link"]=url
    report["new_variant_sha256_observed_oct2026"]=sha256(latest).hexdigest()
    report["new_variant_rows"]=multi["rows"]
    report["new_variant_country_year_uniqueness_verified"]=multi["duplicates"]==0
    return report

if __name__=="__main__":
    print(json.dumps(run(),sort_keys=True))
