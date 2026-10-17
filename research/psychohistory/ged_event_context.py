"""Offline UCDP GED 25.1 event *context* for private Onset 25.1 country-year cases.

Matches GED country_id/year = event LOCATION to Onset country_id/year =
country PARTICIPATION. These are not identical units; even matching IDs do NOT
prove the GED incident triggered the official onset. This is retrospective
context, never fitted features and never a pre-onset prediction.

The 25.1 GED archive is public but the derived Onset casebook and this output
are operationally private. No network; original data must be staged outside Git.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import datetime as dt
import hashlib
import io
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path

SOURCE_URL = "https://ucdp.uu.se/downloads/ged/ged251-csv.zip"
CODEBOOK_URL = "https://ucdp.uu.se/downloads/ged/ged251.pdf"
REPO = Path(__file__).resolve().parents[2]
MAX_ARCHIVE = 80_000_000
MAX_MEMBER = 400_000_000
MAX_ROWS = 650_000
MAX_CASES = 500
MAX_EXAMPLES = 3
FIELDS = {
    "id", "year", "country_id", "type_of_violence", "date_start", "date_end",
    "date_prec", "where_prec", "where_coordinates", "dyad_name",
    "conflict_name", "best", "low", "high", "latitude", "longitude",
}


def _sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _read_source(path: Path, expected_sha256: str):
    if not isinstance(expected_sha256,str) or not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
        raise ValueError("Official ZIP digest must be independently supplied")
    if path.stat().st_size > MAX_ARCHIVE:
        raise ValueError("Oversized GED archive")
    with path.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    if digest != expected_sha256:
        raise ValueError("GED archive digest mismatch")
    z = zipfile.ZipFile(path)
    entries = [x for x in z.infolist() if not x.is_dir() and x.filename.lower().endswith(".csv")]
    if (len(entries) != 1 or entries[0].file_size > MAX_MEMBER or
        entries[0].compress_size > MAX_ARCHIVE or entries[0].file_size < 30):
        z.close()
        raise ValueError("GED archive member count or decompression size invalid")
    return z, entries[0]


def _cases(casebook: dict):
    if (casebook.get("schema") != "psychohistory.onset.casebook.v1" or
        casebook.get("datasetVersion") != "25.1" or
        casebook.get("target") != "onset1" or
        casebook.get("sourceAsOfVerified") is not False or
        casebook.get("prospectiveEligible") is not False):
        raise ValueError("Onset casebook is not an authorized retrospective source")
    rows = casebook.get("cases")
    if not isinstance(rows,list) or not 1 <= len(rows) <= MAX_CASES:
        raise ValueError("No bounded historical positive cases")
    seen = set()
    for case in rows:
        kind, cid, year = case.get("kind"), case.get("countryId"), case.get("year")
        if (kind not in ("intrastate_country","interstate_country") or
            not isinstance(cid,int) or isinstance(cid,bool) or cid < 1 or
            not isinstance(year,int) or isinstance(year,bool) or year < 1989 or year > 2024 or
            case.get("onset") != 1 or case.get("cutoffYear") != year - 2 or
            (kind,cid,year) in seen):
            raise ValueError("Bad or duplicated Onset case identity")
        seen.add((kind,cid,year))
    return rows


def _event(row):
    # Only report state-based lethal GED incidents; no invented narratives.
    try:
        eid=int(row["id"])
        year=int(row["year"])
        cid=int(row["country_id"])
        violence=int(row["type_of_violence"])
        best=int(row["best"])
        low=int(row["low"])
        high=int(row["high"])
        dp=int(row["date_prec"])
        wp=int(row["where_prec"])
        lat=float(row["latitude"])
        lon=float(row["longitude"])
        d0=row["date_start"]
        d1=row["date_end"]
    except (TypeError, ValueError, KeyError) as error:
        raise ValueError("Invalid GED numeric/date source fields") from error
    if (eid<1 or cid<1 or not 1989<=year<=2024 or violence not in (1,2,3)
        or best<0 or low<0 or high<0 or dp<1 or wp<1 or
        not -90<=lat<=90 or not -180<=lon<=180 or
        not isinstance(d0,str) or not isinstance(d1,str) or
        len(d0)>32 or len(d1)>32):
        raise ValueError("Invalid GED event")
    try:
        from_date = dt.datetime.fromisoformat(d0).date()
        to_date = dt.datetime.fromisoformat(d1).date()
    except ValueError as error:
        raise ValueError("Invalid GED calendar date") from error
    if from_date > to_date or to_date.year != year:
        raise ValueError("GED year and event period differ")
    return {
        "gedEventId":eid, "countryId":cid, "year":year, "violenceType":violence,
        "dateStart":from_date.isoformat(), "dateEnd":to_date.isoformat(), "datePrecision":dp,
        "locationPrecision":wp,
        "location":str(row["where_coordinates"])[:180],
        "dyad":str(row["dyad_name"])[:260],
        "conflict":str(row["conflict_name"])[:260],
        "bestDeaths":best, "lowDeaths":low, "highDeaths":high,
        "latitude":lat, "longitude":lon,
    }


def build_event_context(archive: Path, expected_sha256: str, casebook: dict):
    cases=_cases(casebook)
    locations={(c["countryId"],c["year"]) for c in cases}
    example_counts=defaultdict(int)
    samples=defaultdict(list)
    matched_ids=set()
    z, member=_read_source(archive,expected_sha256)
    try:
        with z.open(member) as binary, io.TextIOWrapper(binary,encoding="utf-8-sig",newline="") as text:
            reader=csv.DictReader(text)
            if not reader.fieldnames or not FIELDS.issubset(reader.fieldnames):
                raise ValueError("Official GED 25.1 schema mismatch")
            count=0
            for raw in reader:
                count+=1
                if count>MAX_ROWS: raise ValueError("GED archive unexpected coverage")
                try:
                    cid=int(raw["country_id"])
                    year=int(raw["year"])
                    typ=int(raw["type_of_violence"])
                except (ValueError, TypeError) as error:
                    raise ValueError("Invalid GED index") from error
                if typ != 1 or (cid,year) not in locations:
                    continue
                event=_event(raw)
                if event["gedEventId"] in matched_ids:
                    raise ValueError("Duplicate GED event ID in selected country-years")
                matched_ids.add(event["gedEventId"])
                key=(cid,year)
                example_counts[key]+=1
                samples[key].append(event)
                samples[key].sort(key=lambda e:(-e["bestDeaths"],e["dateStart"],e["gedEventId"]))
                if len(samples[key])>MAX_EXAMPLES:
                    samples[key].pop()
            if count<1: raise ValueError("GED archive has no events")
    finally:
        z.close()
    output=[]
    for c in cases:
        key=(c["countryId"],c["year"])
        output.append({
            "kind":c["kind"], "countryId":c["countryId"], "country":c.get("country"),
            "year":c["year"], "onset":1, "stateBasedEventsWithinBorders":example_counts[key],
            "examples":samples[key],
            "matchingRelation":"same_country_id_and_calendar_year_only",
            "eventSelection":"top_3_by_best_reported_deaths_not_onset_attribution",
        })
    return {
        "schema":"psychohistory.onset.ged_context.v1",
        "gedEdition":"25.1", "gedZipSha256":expected_sha256, "gedSource":SOURCE_URL,
        "onsetEdition":"25.1", "asOfVerified":False, "prospectiveEligible":False,
        "notAnOnsetEventLink":True,
        "note":"GED incident locations may differ from states participating in onset, especially interstate cases. Co-occurrence is not causal linkage.",
        "cases":output,
    }


def save_private(result: dict, output: Path):
    if output.resolve().is_relative_to(REPO):
        raise ValueError("Cannot publish private country-year interpretations in Git")
    output.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    with output.open("xb") as f:
        f.write(json.dumps(result,ensure_ascii=False,sort_keys=True,allow_nan=False).encode()+b"\n")
    output.chmod(0o600)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--ged-zip",type=Path,required=True)
    p.add_argument("--expected-sha256",required=True)
    p.add_argument("--casebook-json",type=Path,required=True)
    p.add_argument("--output-json",type=Path,required=True)
    args=p.parse_args()
    casebook=json.loads(args.casebook_json.read_text())
    result=build_event_context(args.ged_zip,args.expected_sha256,casebook)
    save_private(result,args.output_json)
    print(json.dumps({"status":"PRIVATE_RETROSPECTIVE_CONTEXT_READY",
      "cases":len(result["cases"]),
      "with_ged_events":sum(x["stateBasedEventsWithinBorders"]>0 for x in result["cases"]),
      "linked_to_onset_causally":False,"prospective_eligible":False}))


if __name__ == "__main__":
    main()
