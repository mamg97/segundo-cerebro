"""AV-085: archival GED month-resolution feature -> separate annual CY first-change outcomes.

Science-only, after-hoc feasibility experiment. Fits no new prediction model.
Train/evaluation roster and binary annual outcomes are exclusively from pinned
old/revised OrganizedViolenceCY editions. GED 23.1/24.1 supplies PRE-CUTOFF
date-exact state-based lethal event *locations* only; no equivalence of its
geographical identifiers to annual country participation is assumed.

No zeros for violence are inferred from missing GED events or unprecise dates.
Archive release timing at hypothetical issue is NOT externally witnessed.
Data and outputs are aggregate; no country IDs or event texts in logs.
"""
from __future__ import annotations
import argparse
import collections
import csv
from datetime import datetime,date
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile
import historic23_holdout_2024 as cy23
import release_separated_holdout as cy24
from futures import fit,prepare
from release_separated_first_passage import FUTURES

GED_RELEASES={
  2022:{"edition":"GED 23.1","url":"https://ucdp.uu.se/downloads/ged/ged231-csv.zip","sha256":"9aa082f9e1f62da5ea3245c39b1cee45daab6dc8b3a17fb0f0cdae9ba13ce6f7"},
  2023:{"edition":"GED 24.1","url":"https://ucdp.uu.se/downloads/ged/ged241-csv.zip","sha256":"202e84f3bc91f085b2a886959cbbdeed9d381d758ee897b68520f59ea631c760"}
}
MAX_BYTES=90_000_000
MAX_CSV_BYTES=490_000_000
MAX_EVENTS=700_000
BUCKETS=("zero_exact_eligible_records","one","two_to_four","five_or_more")
YEARS={2022:(2023,2024),2023:(2024,2025)}


def sha256(path):
    if not path.is_file() or path.stat().st_size<50 or path.stat().st_size>MAX_BYTES or path.is_symlink():
        raise ValueError("GED archive absent or out of size bounds")
    with path.open("rb") as f:
        return hashlib.file_digest(f,"sha256").hexdigest()


def archive_probe(path):
    """Discovery SHA, not historical authenticity or output eligibility."""
    digest=sha256(path)
    return {"schema":"psychohistory.ged.archive_discovery.v1",
        "zip_sha256_observed_today":digest,"zip_bytes":path.stat().st_size,
        "historically_available_at_issue_verified":False,
        "scientific_backtest_authorized":False}


def parse_day(raw):
    if not isinstance(raw,str) or not raw.strip():
        raise ValueError("Missing event date")
    try:
        parsed=datetime.fromisoformat(raw.strip())
    except ValueError as error:
        raise ValueError("Non-ISO event date") from error
    if parsed.tzinfo is not None or parsed.time()!=datetime.min.time():
        raise ValueError("Ambiguous non-midnight event timestamp")
    return parsed.date()


def ged_features(archive,cutoff,*,expected_sha):
    if cutoff not in GED_RELEASES:
        raise ValueError("Unsupported historical feature cutoff")
    meta=GED_RELEASES[cutoff]
    if not isinstance(expected_sha,str) or not re.fullmatch("[a-f0-9]{64}",expected_sha) or expected_sha!=meta["sha256"]:
        raise ValueError("GED archival bytes must match checked-in pinned digest")
    if sha256(archive)!=expected_sha:
        raise ValueError("GED archive SHA mismatch")
    counts=collections.Counter()
    excluded=collections.Counter()
    seen=set()
    n=0
    with zipfile.ZipFile(archive) as z:
        entries=[x for x in z.infolist() if x.filename.lower().endswith(".csv") and not x.is_dir()]
        if len(entries)!=1 or entries[0].file_size>MAX_CSV_BYTES:
            raise ValueError("GED ZIP must contain exactly one bounded CSV")
        with z.open(entries[0]) as raw,io.TextIOWrapper(raw,encoding="utf-8-sig",newline="") as src:
            reader=csv.DictReader(src)
            required={"id","country_id","year","type_of_violence","best","date_start","date_end","date_prec"}
            if not reader.fieldnames or not required.issubset(reader.fieldnames):
                raise ValueError("GED archive schema lacks exact historical event fields")
            for row in reader:
                n+=1
                if n>MAX_EVENTS:raise ValueError("GED event count out of bounds")
                try:
                    event_id=int(row["id"]);cid=int(row["country_id"])
                    y=int(row["year"]);typ=int(row["type_of_violence"])
                    deaths=int(row["best"]);precision=int(row["date_prec"])
                except (ValueError,TypeError,KeyError) as exc:
                    raise ValueError("Bad GED observation") from exc
                if event_id in seen or event_id<1 or cid<1 or y<1989 or y>cutoff or typ not in (1,2,3) or deaths<0 or precision<1:
                    raise ValueError("Duplicate, future or invalid archived GED record")
                seen.add(event_id)
                if y!=cutoff:continue
                if typ!=1:
                    excluded["non_state_based"]+=1;continue
                if deaths<1:
                    excluded["nonlethal_best"]+=1;continue
                if precision!=1:
                    excluded["imprecise_date"]+=1;continue
                start,end=parse_day(row["date_start"]),parse_day(row["date_end"])
                if start!=end or start.year!=cutoff:
                    excluded["non_exact_day_or_misaligned_year"]+=1;continue
                # State-based lethal GED event at a geographic LOCATION.
                # Not the same target as annual CY participating country.
                counts[cid]+=1
    if n<10000:
        raise ValueError("Inadequate complete historical GED archive")
    return counts,{"edition":meta["edition"],"cutoffYear":cutoff,
        "sourceHash":expected_sha,"nGedSourceRows":n,
        "nCountriesWithExactLethalLocations":len(counts),
        "excludedCutoffYear":dict(excluded),
        "geographicEventLocationsNotAnnualParticipation":True,
        "sourceAsOfHistoricalIssueVerified":False}


def bucket(value):
    if not isinstance(value,int) or value<0:raise ValueError("Invalid observed GED count")
    return 0 if value==0 else 1 if value==1 else 2 if value<=4 else 3


def summary(earlier,later,ged,cutoff):
    if cutoff not in YEARS or not earlier or not later or not isinstance(ged,dict):
        raise ValueError("Bad source-separated window")
    lookup=prepare(earlier,{"threshold_deaths":25})
    if not lookup or max(y for _,y in lookup)!=cutoff:
        raise ValueError("Annual training source not frozen at cutoff")
    fitted=fit(lookup,cutoff+2,FUTURES)
    outcomes={}
    for r in later:
        year=int(r["year"])
        if year not in YEARS[cutoff]:continue
        k=(int(r["country_id"]),year)
        if k in outcomes:raise ValueError("Duplicated annual outcome")
        outcomes[k]=int(float(r["sb_total_deaths_best"])>=25)
    cells=[[[0,0,0] for _ in range(4)] for __ in range(2)]
    missing=0
    present=0
    for c in fitted["countries"]:
        cid=c["id"]
        if any((cid,y) not in outcomes for y in YEARS[cutoff]):
            missing+=1;continue
        base=c["initial"]%2
        labels=[outcomes[cid,y] for y in YEARS[cutoff]]
        first=next((i for i,t in enumerate(labels) if t!=base),2)
        feature=bucket(ged.get(cid,0))
        if feature:present+=1
        cells[base][feature][first]+=1
    n=sum(sum(sum(v) for v in group) for group in cells)
    if n<1 or n+missing!=len(fitted["countries"]):
        raise ValueError("No scored country or missing country accounting")
    bands=[]
    for status in (0,1):
        for group,b in enumerate(BUCKETS):
            first,second,stable=cells[status][group]
            count=first+second+stable
            bands.append({"initialRegime":"below25" if status==0 else "atleast25",
                "recordedExactDayEventsAtCutoff":b,"n":count,
                "firstChangeBridge":first,"firstChangeTarget":second,
                "noFirstChange":stable,
                "observedFirstChangeRateDescriptive":(first+second)/count if count else None})
    return {"schema":"psychohistory.futures.ged_monthly_feature_to_cy_bridge.v1",
        "status":"RETROSPECTIVE_FEATURE_FEASIBILITY_NOT_OUT_OF_SAMPLE_SKILL",
        "cutoff":cutoff,"hypotheticalIssue":cutoff+2,
        "observedYears":list(YEARS[cutoff]),
        "nCountries":n,"oldAnnualRoster":len(fitted["countries"]),
        "missingOutcomeCountries":missing,"countriesWithPositiveExactGEDLocations":present,
        "cells":bands,
        "gedZeroMeaning":"NO_RECORDED_EXACT_DAY_STATE_BASED_LETHAL_GED_EVENT_IN_CUTOFF_YEAR_NOT_ZERO_VIOLENCE",
        "countryIdJoin":"GED_EVENT_LOCATION_VS_CY_COUNTRY_LEVEL_PARTICIPATION_NOT_EQUIVALENT",
        "crossProductTargetIdentical":False,"modelRefit":False,
        "realTimeIssueAvailabilityVerified":False,"forecastIssued":False,
        "prospectiveSkillDemonstrated":False,"confirmatory":False,
        "caveat":"Country cohort fixed by prior OrganizedViolenceCY; GED only prior-year exact-date location evidence. Both editions observed later; events may be missed or have imprecise dates. Post-hoc overlapping windows do not validate forecast skill."}


def run(ged_zip,cy_old,cy_new,cutoff):
    feature,provenance=ged_features(ged_zip,cutoff,expected_sha=GED_RELEASES[cutoff]["sha256"])
    if cutoff==2022:
        old,_=cy23.rows_23_xlsx(cy_old,cy23.PIN_231)
        later,_=cy23.bounded_zip(cy_new,cy23.PIN_251,cy23.NEW_VERSION)
    else:
        old,_=cy24.probe(cy_old,"00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260",cy24.OLD_VERSION)
        later,_=cy24.probe(cy_new,cy24.PROTOCOL["archive_sha256"],cy24.NEW_VERSION)
    return {**summary(old,later,feature,cutoff),"gedSource":provenance}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--ged",required=True,type=Path)
    p.add_argument("--cy-old",type=Path)
    p.add_argument("--cy-new",type=Path)
    p.add_argument("--cutoff",type=int,choices=[2022,2023])
    p.add_argument("--discover",action="store_true")
    a=p.parse_args()
    if a.discover:
        print(json.dumps(archive_probe(a.ged),sort_keys=True,indent=2))
    else:
        if not (a.cy_old and a.cy_new and a.cutoff):
            p.error("Source-separated annual files and cutoff are required")
        print(json.dumps(run(a.ged,a.cy_old,a.cy_new,a.cutoff),sort_keys=True,indent=2,allow_nan=False))
if __name__=="__main__":main()
