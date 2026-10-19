"""AV-052: offline-executable UCDP/PRIO historical conflict lineage for 61 residual flags.

All UCDP files are read in an ephemeral runner. Publish aggregate counts and
observed 2026 SHA256 only. A match on gwno_loc+year and conflict_id is
DESCRIPTIVE and never authenticates a historical source or a dyadic event.
"""
from __future__ import annotations
from collections import Counter, defaultdict
import csv
from hashlib import sha256
from html.parser import HTMLParser
import io
import json
import re
from urllib.parse import urljoin,urlparse
import zipfile
from onset_semantic_triangulation import SOURCES,parse,evaluate
from onset_residual_newconf_audit import read_flags
from onset_four_variant_semantics import fetch

INDEX="https://ucdp.uu.se/downloads/olddw.html"
SCHEMA="psychohistory.prio_conflict_lineage_61.v1"
ACD_OBSERVED_PINS_2026={
    "19.1":("722c58a955cb25a53b126f83f0e4a95e6a3129d9fefda7421f650b5c482fbd91","722c58a955cb25a53b126f83f0e4a95e6a3129d9fefda7421f650b5c482fbd91"),
    "25.1":("b49f7e80510d8a5779a52d872aef5b26456b3f5cbdd3ec32031339488e81813f","a7a2ff6caf6c854f4fafb1b17f616da1ed6bbc00612943ec6e071511ebea7a81"),
}


class Index(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.section=False;self.heading=False;self.title="";self.version=None
        self.anchor=False;self.caption="";self.href="";self.links=defaultdict(list)
    def handle_starttag(self,tag,attrs):
        if tag=="h2":self.heading=True;self.title=""
        if tag=="a":
            self.anchor=True;self.caption=""
            self.href=next((v for k,v in attrs if k=="href"),"")
    def handle_data(self,text):
        if self.heading:self.title+=text
        if self.section:
            m=re.search(r"version\s+(19\.1|25\.1)\s*:",text,re.I)
            if m:self.version=m.group(1)
            elif re.search(r"version\s+\d+[.]\d\s*:",text,re.I):self.version=None
        if self.anchor:self.caption+=text
    def handle_endtag(self,tag):
        if tag=="h2":
            self.section=self.title.strip()=="UCDP/PRIO Armed Conflict Dataset"
            self.heading=False;self.version=None
        if tag=="a" and self.anchor:
            if self.section and self.version and self.caption.strip().upper()=="CSV":
                self.links[self.version].append(self.href)
            self.anchor=False

def official_acd_links(raw):
    if not isinstance(raw,bytes) or not 100<=len(raw)<=2_000_000:
        raise ValueError("Invalid official catalog")
    parser=Index();parser.feed(raw.decode("utf-8-sig"))
    found={}
    for version in ("19.1","25.1"):
        if len(parser.links[version])!=1:
            raise ValueError("Missing/ambiguous original version link")
        url=urljoin(INDEX,parser.links[version][0]);uri=urlparse(url)
        if (uri.scheme!="https" or uri.netloc!="ucdp.uu.se"
            or not uri.path.startswith("/downloads/ucdpprio/")
            or not (uri.path.endswith("-csv.zip") or uri.path.endswith(".csv")) or uri.query or uri.fragment):
            raise ValueError("Untrusted official data URL")
        found[version]=url
    if found["19.1"]==found["25.1"]:raise ValueError("Same bytes twice")
    return found

def safe_csv(raw):
    if not isinstance(raw,bytes) or not 100<=len(raw)<=20_000_000:
        raise ValueError("Unbounded ZIP")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        files=[x for x in archive.infolist() if not x.is_dir()
               and x.filename.lower().endswith(".csv")]
        if len(files)!=1:raise ValueError("Exactly one data CSV required")
        f=files[0]
        if (f.flag_bits&1 or f.file_size<1 or f.file_size>35_000_000
            or f.filename.startswith("/") or ".." in f.filename.split("/")
            or len(archive.infolist())>20):
            raise ValueError("Unsafe source ZIP")
        with archive.open(f) as stream:data=stream.read(35_000_001)
    if len(data)!=f.file_size:raise ValueError("Incomplete archived dataset")
    return data

def acd_years(data,version):
    if version not in ("19.1","25.1"):raise ValueError("Unexpected edition")
    rdr=csv.DictReader(io.StringIO(data.decode("utf-8-sig"),newline=""))
    if not rdr.fieldnames:raise ValueError("Missing ACD headers")
    fields=[x.strip() for x in rdr.fieldnames]
    if len(fields)!=len(set(fields)) or not {"conflict_id","gwno_loc","year","type_of_conflict"}.issubset(fields):
        raise ValueError("ACD conflict-year columns not supported")
    rdr.fieldnames=fields
    lookup=defaultdict(set);rows=0;unresolved=0
    for rec in rdr:
        if None in rec or any(v is None for v in rec.values()):raise ValueError("Malformed CSV")
        try:
            cid=int(rec["conflict_id"]);y=int(rec["year"]);t=int(rec["type_of_conflict"])
        except (ValueError,TypeError) as e:raise ValueError("Invalid conflict/year/type") from e
        if cid<1 or not 1946<=y<=(2018 if version=="19.1" else 2024) or t not in (1,2,3,4):
            raise ValueError("Out-of-period conflict record")
        rows+=1
        if t not in (3,4):continue
        loc=rec["gwno_loc"].strip()
        if not re.fullmatch(r"\d+(?:\s*,\s*\d+)*",loc):
            unresolved+=1;continue
        for part in loc.split(","):
            cc=int(part.strip())
            if cc<=0:raise ValueError("Invalid GW code")
            lookup[(cc,y)].add(cid)
        if rows>30000:raise ValueError("Excess ACD observations")
    if not lookup:raise ValueError("No internal conflict-year data")
    return {"keys":lookup,"rows":rows,"unresolved":unresolved,
            "latest_internal_year":max(year for _,year in lookup)}

def reconcile(old,country,conflict,v19,v25,strict=True):
    src={"old":old,"country":country,"conflict":conflict}
    initial={name:parse(data,name) for name,data in src.items()}
    additions={name:read_flags(data,name) for name,data in src.items()}
    fixed=set.intersection(*(set(obj["values"]) for obj in initial.values()))
    base=evaluate(initial["old"],initial["country"],initial["conflict"])
    cohort=[];residual=0
    for key in fixed:
        a,b,c=(additions[name][key] for name in ("old","country","conflict"))
        if (a["onset1"],b["onset1"],c["onset1"])==(1,0,0):
            residual+=1
            if a["newconf"]==1:cohort.append(key)
    if strict and (len(fixed)!=10130 or residual!=85 or len(cohort)!=61
                   or base["old_country_disagreements"]!=218
                   or base["old_conflict_disagreements"]!=96):
        raise ValueError("Preregistered residual count or denominator changed")
    ct=Counter();era=Counter();matching=0;notmatching=0
    for key in cohort:
        before=v19["keys"].get(key,set());after=v25["keys"].get(key,set())
        if before and after:
            label="both_vintages"
            matching+=bool(before&after)
            notmatching+=not bool(before&after)
        elif before:label="only_acd191"
        elif after:label="only_acd251"
        else:label="neither_acd"
        ct[label]+=1
        era[("pre1989" if key[1]<1989 else "1989_2017")+":"+label]+=1
    if sum(ct.values())!=len(cohort):raise ValueError("Conservation violation")
    return {"schema":SCHEMA,"fixed_country_years":len(fixed),
            "original_residuals":residual,"old_newconf_positive_residuals":len(cohort),
            "acd_conflict_type_internal":[3,4],
            "country_location_key_field":"gwno_loc",
            "acd_coverage_status":dict(sorted(ct.items())),
            "acd_status_by_period":dict(sorted(era.items())),
            "both_active_shared_numeric_conflict_id":matching,
            "both_active_without_shared_numeric_id":notmatching,
            "acd191_rows":v19["rows"],"acd251_rows":v25["rows"],
            "acd191_max_internal_year":v19["latest_internal_year"],
            "acd251_max_internal_year":v25["latest_internal_year"],
            "acd191_unresolved_location_rows":v19["unresolved"],
            "acd251_unresolved_location_rows":v25["unresolved"],
            "numeric_conflict_id_equivalence_independently_verified":False,
            "dyad_lineage_reconciled":False,
            "changes_in_newconf_causes_proven":False,
            "preorigin_exact_bytes_available_verified":False,
            "risk_set_roster_verified":False,"backtest_authorized":False,
            "models_scored":False,"forecast_issued":False,
            "warning":"Conflict-year inventory is descriptive, not a dyad match or an explanation of revised UCDP onset flags."}

def main():
    versions=official_acd_links(fetch(INDEX,2_000_000))
    parsed={};inventory={}
    for edition,url in versions.items():
        blob=fetch(url,20_000_000 if url.endswith(".zip") else 35_000_000)
        csv_blob=safe_csv(blob) if url.endswith(".zip") else blob
        expected_download,expected_csv=ACD_OBSERVED_PINS_2026[edition]
        if sha256(blob).hexdigest()!=expected_download or sha256(csv_blob).hexdigest()!=expected_csv:
            raise ValueError("ACD official bytes changed from October-2026 observed pins; do not silently repin")
        parsed[edition]=acd_years(csv_blob,edition)
        inventory[edition]={"url":url,"download_sha256_observed_now":sha256(blob).hexdigest(),
                            "download_format":"ZIP" if url.endswith(".zip") else "CSV",
                            "csv_sha256_observed_now":sha256(csv_blob).hexdigest()}
    data={}
    for name,(url,pin) in SOURCES.items():
        raw=fetch(url)
        if sha256(raw).hexdigest()!=pin:raise ValueError("Pinned UCDP Onset source changed")
        data[name]=raw
    result=reconcile(data["old"],data["country"],data["conflict"],
                     parsed["19.1"],parsed["25.1"])
    result["observed_2026_acd_source_inventory"]=inventory
    print(json.dumps(result,sort_keys=True))

if __name__=="__main__":
    main()
