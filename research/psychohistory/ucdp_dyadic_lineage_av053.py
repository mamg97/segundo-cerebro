"""AV-053: UCDP dyadic histories for fixed 61 historic onset/newconf disagreements.

No case-level IDs or country names are emitted. Actual 19.1/25.1 Dyadic
bytes are read only in an ephemeral CI job and reported as aggregate
conflict/dyad presence. Cross-version identity and as-of proof remain FALSE.
"""
from __future__ import annotations
from collections import Counter,defaultdict
import csv
from hashlib import sha256
import io
import json
import re
from urllib.parse import urljoin,urlparse

from onset_semantic_triangulation import SOURCES,parse,evaluate
from onset_residual_newconf_audit import read_flags
from onset_four_variant_semantics import fetch
from ucdp_prio_conflict_lineage_av052 import INDEX,Index,safe_csv,acd_years,official_acd_links,ACD_OBSERVED_PINS_2026

SCHEMA="psychohistory.dyadic_lineage_61.v1"
DYAD_OBSERVED_PINS_2026={
    "19.1":("b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6","b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6"),
    "25.1":("e34d26c39d23739ab65bc52fd42747aa88e7ecdf84d16c7bacafd590ed767330","e5bf6e3779a903f3df3ec476592332ce51ccf3798174b3db4c1b06dd1dd5a7ba"),
}

DYAD_OBSERVED_PINS_2026={
    "19.1":("b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6","b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6"),
    "25.1":("e34d26c39d23739ab65bc52fd42747aa88e7ecdf84d16c7bacafd590ed767330","e5bf6e3779a903f3df3ec476592332ce51ccf3798174b3db4c1b06dd1dd5a7ba"),
}


class DyadIndex(Index):
    def handle_endtag(self,tag):
        if tag=="h2":
            self.section=self.title.strip()=="UCDP Dyadic Dataset"
            self.heading=False;self.version=None
        else:
            super().handle_endtag(tag)

def dyadic_urls(raw):
    if not isinstance(raw,bytes) or not 100<=len(raw)<=2_000_000:
        raise ValueError("Invalid catalog bytes")
    parser=DyadIndex();parser.feed(raw.decode("utf-8-sig"))
    links={}
    for v in ("19.1","25.1"):
        if len(parser.links[v])!=1:raise ValueError("Missing/ambiguous official dyad edition")
        url=urljoin(INDEX,parser.links[v][0]);u=urlparse(url)
        if (u.scheme!="https" or u.netloc!="ucdp.uu.se"
            or not u.path.startswith("/downloads/dyadic/")
            or not (u.path.endswith(".csv") or u.path.endswith("-csv.zip"))
            or u.query or u.fragment):
            raise ValueError("Untrusted dyad catalog URL")
        links[v]=url
    if links["19.1"]==links["25.1"]:raise ValueError("Identical vintages")
    return links

def read_dyads(data,v):
    if v not in ("19.1","25.1") or not isinstance(data,bytes) or not data:
        raise ValueError("Invalid dyadic edition")
    rd=csv.DictReader(io.StringIO(data.decode("utf-8-sig"),newline=""))
    if not rd.fieldnames:raise ValueError("Dyadic CSV lacks header")
    headers=[h.strip() for h in rd.fieldnames]
    if len(headers)!=len(set(headers)) or not {"dyad_id","conflict_id","year","type_of_conflict","gwno_loc"}.issubset(headers):
        raise ValueError("Unexpected dyadic schema")
    rd.fieldnames=headers
    records=defaultdict(set);rows=0;no_gw=0
    for item in rd:
        if None in item or any(x is None for x in item.values()):
            raise ValueError("Malformed dyad CSV row")
        try:
            dyad=int(item["dyad_id"]); conflict=int(item["conflict_id"])
            year=int(item["year"]);typ=int(item["type_of_conflict"])
        except (TypeError,ValueError) as exc:
            raise ValueError("Unparseable historical dyad identifiers") from exc
        if (dyad<1 or conflict<1 or not 1946<=year<=(2018 if v=="19.1" else 2024)
            or typ not in (1,2,3,4)):
            raise ValueError("Unexpected historical version dyad")
        rows+=1
        if typ not in (3,4):continue
        loc=item["gwno_loc"].strip()
        if not re.fullmatch(r"\d+(?:\s*,\s*\d+)*",loc):
            no_gw+=1;continue
        for cc in loc.split(","):
            val=int(cc.strip())
            if val<1:raise ValueError("Nonpositive state code")
            records[(val,year)].add((dyad,conflict))
        if rows>40_000:raise ValueError("Oversized dyadic dataset")
    if not records:raise ValueError("No country-year dyadic record")
    return {"keys":records,"rows":rows,"gwno_unresolved_rows":no_gw,
            "max_year":max(y for _,y in records)}

def compare_dyads(old,country,conflict,dyad19,dyad25,acd19,acd25,strict=True):
    datasets={"old":old,"country":country,"conflict":conflict}
    parsed={n:parse(b,n) for n,b in datasets.items()}
    augmented={n:read_flags(b,n) for n,b in datasets.items()}
    base=evaluate(parsed["old"],parsed["country"],parsed["conflict"])
    keys=set.intersection(*(set(x["values"]) for x in parsed.values()))
    cohort=[];residual=0
    for k in keys:
        a,b,c=(augmented[n][k] for n in ("old","country","conflict"))
        if (a["onset1"],b["onset1"],c["onset1"])==(1,0,0):
            residual+=1
            if a["newconf"]==1:cohort.append(k)
    if strict and (len(keys)!=10130 or residual!=85 or len(cohort)!=61
                   or base["old_country_disagreements"]!=218):
        raise ValueError("AV-051 cohort not reproducible")
    status=Counter();orphan=Counter();shared_dyad=0;shared_conflict=0
    period=Counter()
    for key in cohort:
        a=dyad19["keys"].get(key,set());b=dyad25["keys"].get(key,set())
        if a and b:
            kind="both";shared_dyad+=bool({x[0] for x in a}&{x[0] for x in b})
            shared_conflict+=bool({x[1] for x in a}&{x[1] for x in b})
        elif a:kind="only_19"
        elif b:kind="only_25"
        else:kind="neither"
        status[kind]+=1
        period[("pre_1989" if key[1]<1989 else "1989_2017")+":"+kind]+=1
        if a and not {x[1] for x in a}.issubset(acd19["keys"].get(key,set())):
            orphan["dyad19_conflict_id_without_acd19_match"]+=1
        if b and not {x[1] for x in b}.issubset(acd25["keys"].get(key,set())):
            orphan["dyad25_conflict_id_without_acd25_match"]+=1
    if sum(status.values())!=len(cohort):raise ValueError("Unaccounted dyads")
    return {"schema":SCHEMA,"fixed_gw_country_years":len(keys),
            "residual_old_newconf_positive":len(cohort),
            "dyad_activity_status":dict(sorted(status.items())),
            "dyad_activity_by_period":dict(sorted(period.items())),
            "both_vintages_shared_dyad_id":shared_dyad,
            "both_vintages_shared_conflict_id":shared_conflict,
            "dyad_acd_join_mismatches":dict(sorted(orphan.items())),
            "dyadic_191_rows":dyad19["rows"],"dyadic_251_rows":dyad25["rows"],
            "dyadic_191_max_year":dyad19["max_year"],"dyadic_251_max_year":dyad25["max_year"],
            "dyadic_191_unresolved_gwno":dyad19["gwno_unresolved_rows"],
            "dyadic_251_unresolved_gwno":dyad25["gwno_unresolved_rows"],
            "direct_dyad_id_cross_vintage_identity_certified":False,
            "revision_cause_adjudicated":False,"preissue_byte_receipt_verified":False,
            "roster_asof_verified":False,"backtest_authorized":False,
            "models_scored":False,"forecast_issued":False,
            "warning":"Dyad-year presence from archived versions is not evidence of an issue-time training label, cause of revision or individual conflict event."}

def source_data(url):
    body=fetch(url,20_000_000 if url.endswith(".zip") else 35_000_000)
    unpacked=safe_csv(body) if url.endswith(".zip") else body
    return body,unpacked

def main():
    catalog=fetch(INDEX,2_000_000)
    dyad_urls=dyadic_urls(catalog)
    acd_urls=official_acd_links(catalog)
    acds={};dyads={};inventory={}
    for v in ("19.1","25.1"):
        blob,csv=source_data(acd_urls[v])
        pzip,pcsv=ACD_OBSERVED_PINS_2026[v]
        if sha256(blob).hexdigest()!=pzip or sha256(csv).hexdigest()!=pcsv:
            raise ValueError("ACD historical current hash changed")
        acds[v]=acd_years(csv,v)
        dyad_blob,dyad_csv=source_data(dyad_urls[v])
        expected_zip,expected_csv=DYAD_OBSERVED_PINS_2026[v]
        if sha256(dyad_blob).hexdigest()!=expected_zip or sha256(dyad_csv).hexdigest()!=expected_csv:
            raise ValueError("Dyadic edition bytes changed from October-2026 observed SHA pins")
        pinned_download,pinned_csv=DYAD_OBSERVED_PINS_2026[v]
        if sha256(dyad_blob).hexdigest()!=pinned_download or sha256(dyad_csv).hexdigest()!=pinned_csv:
            raise ValueError("Dyadic source changed from October-2026 observed pin; no silent replacement")
                dyads[v]=read_dyads(dyad_csv,v)
        inventory[v]={"official_url":dyad_urls[v],
                      "download_sha256_observed_now":sha256(dyad_blob).hexdigest(),
                      "csv_sha256_observed_now":sha256(dyad_csv).hexdigest()}
    o={}
    for n,(url,expected) in SOURCES.items():
        body=fetch(url)
        if sha256(body).hexdigest()!=expected:raise ValueError("Onset input vintage changed")
        o[n]=body
    report=compare_dyads(o["old"],o["country"],o["conflict"],
                         dyads["19.1"],dyads["25.1"],acds["19.1"],acds["25.1"])
    report["observed_2026_dyadic_sources"]=inventory
    print(json.dumps(report,sort_keys=True))

if __name__=="__main__":
    main()
