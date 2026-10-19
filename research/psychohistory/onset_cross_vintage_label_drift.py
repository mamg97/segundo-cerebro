"""Cross-vintage UCDP country-onset1 *disagreement* audit, never a backtest.

Compare current archived CSVs labelled 19.1 (which actually end at 2017
with 61 duplicate country-years) and official country-onset 25.1.
Use anonymous aggregate counters only. Matching numeric GW IDs is a candidate
join, NOT an authenticated country identity bridge. Cross-release differences
may be changed coding/definitions, not forecast errors.
"""
from __future__ import annotations
from collections import Counter
import csv
from hashlib import sha256
import io
import json
from urllib.request import Request, urlopen

URLS={
    "old":"https://ucdp.uu.se/downloads/onset/onsets_computed.csv",
    "new":"https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv",
}
PIN={
    "old":"ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8",
    "new":"e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe2ea83fe6a",
}
SCHEMA="psychohistory.onset_country_cross_vintage_label_drift.v1"


def parse_vintage(data, label):
    if label not in PIN or not isinstance(data,bytes) or len(data)>25_000_000:
        raise ValueError("Unknown or oversized vintage")
    reader=csv.DictReader(io.StringIO(data.decode("utf-8-sig")))
    fields=reader.fieldnames
    if not fields or len(fields)!=len(set(fields)) or not {"gwno_a","year","onset1"}.issubset(fields):
        raise ValueError("Unexpected official country onset schema")
    obs={}
    ambiguous=set()
    duplicates=0
    unknown=0
    low,high=(1946,2017) if label=="old" else (1946,2024)
    for row in reader:
        if None in row: raise ValueError("Malformed onset country-year")
        key_country=row["gwno_a"].strip()
        try: year=int(row["year"])
        except (ValueError,TypeError) as exc: raise ValueError("Invalid year") from exc
        if not key_country.isdigit() or year<low or year>high:
            raise ValueError("Country or vintage year outside scope")
        val=row["onset1"].strip()
        if val not in ("0","1","","NA","NaN"):raise ValueError("Bad onset flag")
        value=None if val not in ("0","1") else int(val)
        if value is None:unknown+=1
        key=(key_country,year)
        if key in obs:
            duplicates+=1
            if label=="new":raise ValueError("Country-level 25.1 must be unique")
            if value!=obs[key]:ambiguous.add(key)
        else:obs[key]=value
        if len(obs)>20000:raise ValueError("Excess vintage records")
    if not obs: raise ValueError("Empty onset vintage")
    return {"values":obs,"ambiguous":ambiguous,
            "duplicate_rows":duplicates,"unknown_rows":unknown,
            "last_year":max(y for _,y in obs)}


def compare(old,new):
    if not isinstance(old,dict) or not isinstance(new,dict):
        raise ValueError("Malformed parsed source inputs")
    left,right=old["values"],new["values"]
    common=set(left)&set(right)
    compared=0;diff=0;both0=0;both1=0;one0new1=0;one1new0=0
    unresolved=0
    by_year=Counter()
    for key in common:
        if key in old["ambiguous"] or key in new["ambiguous"] or left[key] is None or right[key] is None:
            unresolved+=1
            continue
        a,b=left[key],right[key]
        compared+=1;by_year[key[1]]+=1
        if a!=b:
            diff+=1
            if a==0:one0new1+=1
            else:one1new0+=1
        elif a:both1+=1
        else:both0+=1
    if compared+unresolved!=len(common):
        raise ValueError("Unaccounted overlap")
    return {
        "schema":SCHEMA,
        "old_labelled_release_last_year_observed":old["last_year"],
        "old_duplicate_country_year_rows":old["duplicate_rows"],
        "old_conflicting_country_year_keys":len(old["ambiguous"]),
        "new_release_last_year":new["last_year"],
        "old_unique_keys":len(left),"new_unique_keys":len(right),
        "numeric_country_year_key_overlap":len(common),
        "pairwise_comparable":compared,
        "pairwise_unknown_or_ambiguous":unresolved,
        "keys_only_in_older_file":len(set(left)-set(right)),
        "keys_only_in_newer_file":len(set(right)-set(left)),
        "matching_no_onset_both":both0,"matching_onset_both":both1,
        "old0_new1":one0new1,"old1_new0":one1new0,
        "disagreement_count":diff,
        "per_year_matched_observation_counts":dict(sorted(by_year.items())),
        "numeric_codes_identity_independently_certified":False,
        "version_191_label_identity_verified":False,
        "historical_source_bytes_asof_verified":False,
        "historical_training_labels_admissible":False,
        "matched_cohort_issue_roster_verified":False,
        "backtest_authorized":False,"scores_computed":False,"forecast_issued":False,
        "warning":("This counts cross-release label differences, not predictive skill. "
                   "The old current catalog file ends in 2017 despite codebook 19.1 "
                   "covering 2018. Numeric GW matches are provisional."),
    }


def run_official():
    parsed={}
    for key,url in URLS.items():
        with urlopen(Request(url,headers={"User-Agent":"Psychohistory-VintageAudit/1.0"}),timeout=30) as response:
            if response.geturl()!=url:
                raise ValueError("Source redirected or changed")
            data=response.read(25_000_001)
        if sha256(data).hexdigest()!=PIN[key]:
            raise ValueError("Current official vintage bytes differ from observed SHA256; never silently repin")
        parsed[key]=parse_vintage(data,key)
    result=compare(parsed["old"],parsed["new"])
    result["source_bytes_pinned_as_observed_oct2026"]=True
    return result


if __name__=="__main__":
    print(json.dumps(run_official(),sort_keys=True))
