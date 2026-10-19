"""Read exact official UCDP Onset v24.1 source URLs and CSV *metadata*.

Uses historical download index, not guessed filenames or third-party rewrites.
Country-level and conflict-level *intrastate* onset are distinct targets.
No rows, conflict IDs, country IDs or probabilities are output; source
files live only in GitHub Actions' temporary directory.

This probe is descriptive only; a retrospective 2024 outcome vintage is
NOT a predictor available in historical issuance periods.
"""
from __future__ import annotations

import argparse
import csv
from html.parser import HTMLParser
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit

CATALOG = "https://ucdp.uu.se/downloads/olddw.html"
VERSION = "24.1"
MAX_HTML = 3_000_000
MAX_CSV = 20_000_000


class CatalogParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_heading = False
        self.heading = []
        self.section = ""
        self.version = ""
        self.link_href = None
        self.link_text = []
        self.entries = []

    def handle_starttag(self, tag, attrs):
        if tag == "h2":
            self.in_heading = True
            self.heading = []
            self.section = ""     # do not carry prior sections forward
            self.version = ""
        elif tag == "a":
            self.link_href = dict(attrs).get("href", "")
            self.link_text = []

    def handle_data(self, data):
        if self.in_heading:
            self.heading.append(data)
        if self.link_href is not None:
            self.link_text.append(data)
        elif self.section == "UCDP Onset Dataset":
            m = re.search(r"\bversion\s+(\d{2}\.\d)\b", data, re.I)
            if m:
                self.version = m.group(1)

    def handle_endtag(self, tag):
        if tag == "h2":
            self.section = " ".join(" ".join(self.heading).split())
            self.in_heading = False
        elif tag == "a" and self.link_href is not None:
            label = " ".join(" ".join(self.link_text).split())
            if self.section == "UCDP Onset Dataset" and self.version == VERSION:
                self.entries.append((label,self.link_href))
            self.link_href = None
            self.link_text = []


def parse_catalog(page):
    if not isinstance(page,bytes) or not 1000 <= len(page) <= MAX_HTML:
        raise ValueError("Missing or unexpectedly sized UCDP archive index")
    try:
        parser = CatalogParser()
        parser.feed(page.decode("utf-8-sig"))
    except (UnicodeError,ValueError) as exc:
        raise ValueError("Unreadable UCDP archive index") from exc

    matches = {}
    for label,href in parser.entries:
        labels = {
            "Intrastate Conflict Level Onset CSV":"intrastate_conflict",
            "Intrastate Country Level Onset CSV":"intrastate_country",
            "Codebook":"codebook",
        }
        key=labels.get(label)
        if key is None:
            continue
        url=urljoin(CATALOG,href)
        parts=urlsplit(url)
        if (parts.scheme != "https" or parts.hostname != "ucdp.uu.se"
            or not parts.path.startswith("/downloads/")
            or parts.username or parts.password or parts.query
            or parts.fragment or key in matches):
            raise ValueError("Unsafe, ambiguous or duplicated official onset URL")
        if key=="codebook" and not parts.path.endswith(".pdf"):
            raise ValueError("Expected official PDF documentation")
        if key!="codebook" and not parts.path.endswith(".csv"):
            raise ValueError("Expected official CSV file")
        matches[key]=url
    if set(matches)!={"intrastate_conflict","intrastate_country","codebook"}:
        raise ValueError("Official 24.1 intrastate onset links missing from catalogue")
    return {
        "schema":"psychohistory.ucdp_onset_catalog_v241.v1",
        "index_observed_sha256_now":hashlib.sha256(page).hexdigest(),
        "version":VERSION,
        "source_urls":matches,
        "files_historically_available_before_issue_verified":False,
        "asof_backtest_authorized":False,
        "forecast_issued":False,
    }


def summarize_csv(raw,kind, expected_sha=None):
    if kind not in ("intrastate_conflict","intrastate_country"):
        raise ValueError("Unknown onset source type")
    if not isinstance(raw,bytes) or not 20<len(raw)<=MAX_CSV:
        raise ValueError("Empty or oversized onset CSV")
    digest=hashlib.sha256(raw).hexdigest()
    if expected_sha is not None and (
        not isinstance(expected_sha,str)
        or not re.fullmatch("[0-9a-f]{64}",expected_sha)
        or expected_sha!=digest
    ):
        raise ValueError("Observed onset source hash mismatch")
    try:
        reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig"),newline=""))
        names=reader.fieldnames
        if not names or len(set(names))!=len(names) or "year" not in names:
            raise ValueError("Missing year or ambiguous CSV columns")
        tally=0
        years=set()
        for row in reader:
            if None in row or row["year"] is None or not row["year"].isdecimal():
                raise ValueError("Malformed onset row/year")
            y=int(row["year"])
            if y<1946 or y>2023:
                raise ValueError("Outside official 24.1 1946-2023 coverage")
            years.add(y)
            tally+=1
            if tally>100000:
                raise ValueError("Unexpectedly many onset records")
        if not tally:
            raise ValueError("Missing onset records")
    except (UnicodeError,csv.Error,TypeError) as e:
        raise ValueError("Cannot parse official onset CSV") from e

    return {
        "kind":kind,
        "sha256_observed_now":digest,
        "columns":names,
        "n_rows":tally,
        "min_observed_year":min(years),
        "max_observed_year":max(years),
        "n_distinct_observed_years":len(years),
        "has_unambiguous_source_level_onset_target":False,
        "onset_country_and_conflict_are_interchangeable":False,
        "source_asof_verified":False,
        "forecast_issued":False,
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--catalog",type=Path,required=True)
    p.add_argument("--intrastate-conflict",type=Path)
    p.add_argument("--intrastate-country",type=Path)
    a=p.parse_args()
    report=parse_catalog(a.catalog.read_bytes())
    if a.intrastate_conflict or a.intrastate_country:
        if not (a.intrastate_conflict and a.intrastate_country):
            raise ValueError("Both official onset levels required")
        report["files"]=[
            summarize_csv(a.intrastate_conflict.read_bytes(),"intrastate_conflict"),
            summarize_csv(a.intrastate_country.read_bytes(),"intrastate_country"),
        ]
    print(json.dumps(report,sort_keys=True))


if __name__=="__main__":
    main()
