"""Read-only historical UCDP vintage audit: official GED 20.1 + Onset 19.1.

This may inspect event and country-year rows in a disposable Actions runner,
but prints ONLY aggregate counts and current SHA-256. The source catalog,
snapshot bytes and historical publisher announcements are NOT independent
proofs those exact bytes were available before 2020-07-01. Never authorize
training, scoring or a historical forecast based on this audit alone.
"""
from __future__ import annotations

import argparse
from collections import Counter
import csv
from hashlib import sha256
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import zipfile

INDEX = "https://ucdp.uu.se/downloads/olddw.html"
SCHEMA = "psychohistory.ucdp_historical_training_source_audit.v1"
SOURCE_TYPES = {
    "ged20": ("UCDP Georeferenced Event Dataset", "GED 20.1:", "ged"),
    "onset19": ("UCDP Onset Dataset", "version 19.1:", "onset"),
}


class IndexLinks(HTMLParser):
    """Preserve heading/edition context; never infer a URL from a filename."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.section = ""
        self.heading_depth = 0
        self.heading_buffer = ""
        self.edition = ""
        self.in_a = False
        self.a_label = ""
        self.a_href = ""
        self.entries = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ("h1", "h2", "h3"):
            self.heading_depth += 1
            self.heading_buffer = ""
        if tag == "a":
            self.in_a = True
            self.a_label = ""
            self.a_href = next((val for name,val in attrs if name=="href"), "")

    def handle_data(self, data):
        if self.heading_depth:
            self.heading_buffer += data
        if self.in_a:
            self.a_label += data
        # Each edition label appears before its list of CSV / codebook links.
        if "GED 20.1:" in data:
            self.edition = "GED 20.1:"
        elif re.search(r"version\s+19\.1:",data,re.I):
            self.edition = "version 19.1:"
        elif (re.search(r"GED\s+\d{2}\.1:",data)
              or re.search(r"version\s+\d{2}\.1:",data,re.I)):
            self.edition = ""

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("h1", "h2", "h3") and self.heading_depth:
            self.heading_depth -= 1
            if not self.heading_depth:
                self.section = self.heading_buffer.strip()
                self.edition = ""
        if tag == "a" and self.in_a:
            self.entries.append((self.section, self.edition,
                                 self.a_label.strip(), self.a_href))
            self.in_a = False


def official_link_index(raw):
    if not isinstance(raw, bytes) or not 500 <= len(raw) <= 2_000_000:
        raise ValueError("Official index invalid or oversized")
    try:
        page = raw.decode("utf-8-sig")
    except UnicodeError as e:
        raise ValueError("Official index is not UTF-8") from e
    scanner = IndexLinks()
    scanner.feed(page)
    links = {}
    for name,(section,edition,kind) in SOURCE_TYPES.items():
        candidates = []
        for sec,ed,caption,href in scanner.entries:
            if section not in sec or ed != edition or caption.upper() != "CSV":
                continue
            url = urljoin(INDEX, href)
            uri = urlparse(url)
            if (uri.scheme!="https" or uri.hostname!="ucdp.uu.se" or
                uri.username is not None or uri.password is not None or
                uri.port not in (None,443) or uri.query or uri.fragment or
                not uri.path.startswith("/downloads/"+kind+"/")):
                raise ValueError("Unexpected external/replaced official dataset URL")
            candidates.append(url)
        if len(candidates)!=1:
            raise ValueError("Official historical source link missing or ambiguous: "+name)
        links[name] = candidates[0]
    return links


def audit_table(data, kind):
    """Audit a CSV and return only aggregate stats; no row or ID ever leaves."""
    if not isinstance(data,bytes) or len(data)>260_000_000:
        raise ValueError("Unexpected CSV bytes")
    try:
        body=io.StringIO(data.decode("utf-8-sig"), newline="")
    except UnicodeError as e:
        raise ValueError("Non-UTF8 CSV") from e
    reader=csv.DictReader(body)
    fields=reader.fieldnames
    if not fields or len(fields)!=len(set(fields)):
        raise ValueError("Missing/duplicate header columns")
    expected=( {"year","gwno_a","onset1"}
               if kind=="onset19" else {"year","type_of_violence"} )
    if not expected.issubset(fields):
        raise ValueError("Source schema differs from its published documentation")
    years=Counter()
    types=Counter()
    positive=Counter()
    unknown=Counter()
    seen={}
    duplicated_rows=0
    conflicting_keys=set()
    latest=2018 if kind=="onset19" else 2019
    earliest=1946 if kind=="onset19" else 1989
    for row in reader:
        if None in row:
            raise ValueError("Malformed CSV row")
        try:
            year=int(row["year"])
        except (ValueError,TypeError) as e:
            raise ValueError("Missing year") from e
        if year<earliest or year>latest:
            raise ValueError("Unexpected later year in vintage")
        years[year]+=1
        if kind=="onset19":
            ident=row["gwno_a"].strip()
            if not ident.isdigit() or int(ident)<1:
                raise ValueError("Invalid country code")
            key=(ident,year)
            onset=row["onset1"].strip()
            if onset=="1":
                positive[year]+=1
            elif onset in ("", "NA", "NaN"):
                unknown[year]+=1
            elif onset!="0":
                raise ValueError("Invalid binary/unknown onset1")
            if key in seen:
                duplicated_rows+=1
                if seen[key]!=onset: conflicting_keys.add(key)
            else:
                seen[key]=onset
        else:
            value=row["type_of_violence"].strip()
            if value not in ("1","2","3"):
                raise ValueError("Unsupported GED violence classification")
            if year==latest: types[value]+=1
        if sum(years.values())>500_000:
            raise ValueError("Unexpected source count")
    if not years:
        raise ValueError("Historical source empty")
    return {
        "source_rows":sum(years.values()),
        "year_min":min(years), "year_max":max(years),
        "latest_year_rows":years[latest],
        "declared_latest_year_represented":latest in years,
        "historical_coverage_truncated":latest not in years,
        "latest_year_onset1_positives":positive[latest] if kind=="onset19" else None,
        "latest_year_onset1_unknown":unknown[latest] if kind=="onset19" else None,
        "onset19_unique_country_year_keys":len(seen) if kind=="onset19" else None,
        "onset19_duplicate_rows_beyond_first":duplicated_rows if kind=="onset19" else None,
        "onset19_conflicting_country_year_keys":len(conflicting_keys) if kind=="onset19" else None,
        "monadic_country_year_uniqueness_verified":(not duplicated_rows) if kind=="onset19" else None,
        "onset19_usable_without_explicit_duplicate_resolution":(not duplicated_rows) if kind=="onset19" else False,
        "ged_latest_year_intrastate_event_rows": (
            types["1"] if kind=="ged20" else None),
        "historical_labels_version_available_as_candidate_only":kind=="onset19",
        "complete_issue_roster_certified":False,
        "source_bytes_historically_authenticated":False,
        "backtest_authorized":False,
        "forecast_issued":False,
    }


def unpack_csv(data, url):
    if url.endswith(".csv"):
        if len(data)>15_000_000:
            raise ValueError("Unexpected onset CSV size")
        return data
    if not url.lower().endswith(".zip") or len(data)>90_000_000:
        raise ValueError("Unexpected source type/size")
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        files=[x for x in z.infolist() if not x.is_dir()]
        if (len(files)!=1 or not files[0].filename.lower().endswith(".csv") or
            files[0].file_size>260_000_000 or files[0].file_size==0 or
            files[0].flag_bits & 1 or
            any(v in files[0].filename for v in ("/","\\",".."))):
            raise ValueError("Unsafe historical ZIP")
        with z.open(files[0]) as f:
            csv_bytes=f.read(260_000_001)
        if len(csv_bytes)!=files[0].file_size:
            raise ValueError("Incomplete ZIP member")
    return csv_bytes


def fetch_limited(url,limit):
    request=Request(url,headers={"User-Agent":"Psychohistory-Research-SourceAudit/1.0"})
    with urlopen(request,timeout=35) as response:
        actual=urlparse(response.geturl())
        if (actual.scheme!="https" or actual.hostname!="ucdp.uu.se"
            or not actual.path.startswith("/downloads/")):
            raise ValueError("Unexpected redirect from official source")
        parts=[]
        total=0
        while True:
            chunk=response.read(min(1_048_576,limit+1-total))
            if not chunk: break
            total+=len(chunk)
            if total>limit: raise ValueError("Source exceeds maximum permitted size")
            parts.append(chunk)
    return b"".join(parts)


def audit_official(online=True):
    # An observed October-2026 checksum is an *identity*, not a 2020 receipt.
    index=fetch_limited(INDEX,2_000_000)
    sources=official_link_index(index)
    out={"schema":SCHEMA,"today_official_historical_catalog_sha256":sha256(index).hexdigest(),
         "source_results":{},"source_asof_verified":False,
         "historical_training_label_vintage_verified":False,
         "country_frame_asof_verified":False,"backtest_authorized":False,
         "scores_computed":False,"forecast_issued":False}
    for name,url in sources.items():
        try:
            data=fetch_limited(url,90_000_000)
            parsed=unpack_csv(data,url)
            result=audit_table(parsed,name)
            result.update({"status":"OFFICIAL_BYTES_OBSERVED_NOW_NOT_HISTORICAL",
                           "download_url":url,"download_sha256_observed_now":sha256(data).hexdigest(),
                           "csv_sha256_observed_now":sha256(parsed).hexdigest()})
        except (HTTPError,URLError,TimeoutError,OSError) as exc:
            result={"status":"OFFICIAL_LINK_CURRENTLY_UNAVAILABLE_NOT_HISTORICAL_ABSENCE",
                    "error_class":type(exc).__name__,"download_url":url,
                    "source_bytes_historically_authenticated":False,
                    "backtest_authorized":False,"forecast_issued":False}
        out["source_results"][name]=result
    return out


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--offline-index",type=Path)
    args=p.parse_args()
    if args.offline_index:
        data=args.offline_index.read_bytes()
        print(json.dumps({"official_index_links":official_link_index(data),
                          "historical_asof_verified":False},sort_keys=True))
    else:
        print(json.dumps(audit_official(),sort_keys=True))


if __name__=="__main__":
    main()
