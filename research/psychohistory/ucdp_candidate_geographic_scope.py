"""Fail-closed geographical scope audit for UCDP Candidate monthly vintages.

UCDP's OFFICIAL historical downloads page explicitly documents changing
regional coverage through September 2020 and global coverage thereafter.
The old catalogue says April 2020 = Africa + Middle East, whereas UCDP
Candidate codebook v1.2 states 20.0.4 was Africa-only. That contradiction
is an explicit block: NEVER classify April 2020 from one source as proven.

Global scope is only dataset-level metadata, NOT a certified country
denominator or observation of zeros. Historical byte availability remains
unproven. Event data are read only ephemerally, only aggregate counts print.
"""
from __future__ import annotations
import argparse
from collections import Counter
import csv
from datetime import date
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re

ARCHIVE_URL = "https://ucdp.uu.se/downloads/olddw.html"
VERSIONS = {
    "20.0.9": "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v20_0_9.csv",
    "20.0.10": "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v20_0_10.csv",
}
VERSION = re.compile(r"^(18|19|20|21|22|23|24|25|26)\.0\.([1-9]|1[0-2])$")
MAX_HTML_BYTES = 3_000_000
MAX_CSV_BYTES = 65_000_000
MAX_EVENTS = 250_000
OBSERVED_HASH = re.compile(r"^[0-9a-f]{64}$")


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.fragments = []
    def handle_data(self, data):
        self.fragments.append(data)


def validate_official_page(raw):
    if not isinstance(raw,bytes) or not 1000 <= len(raw) <= MAX_HTML_BYTES:
        raise ValueError("Missing/oversized official UCDP archive page")
    try:
        parser = Text()
        parser.feed(raw.decode("utf-8-sig"))
        flat = re.sub(r"\s+", " ", " ".join(parser.fragments)).casefold()
    except (UnicodeError, ValueError) as exc:
        raise ValueError("Invalid UTF8 UCDP archive page") from exc
    # Fail if the provider changes archive or scope wording; never fall back
    # to guessing global availability from a version string.
    phrases = (
        "version 18.0.x (covers africa)",
        "version 19.0.x (covers africa)",
        "version 20.0.x",
        "august-september covers africa, asia, europe and middle east",
        "october-december global",
        "version 21.0.x (global)",
        "version 24.0.x (global)",
        "20.0.9 csv",
        "20.0.10 csv",
    )
    if any(x not in flat for x in phrases):
        raise ValueError("Official UCDP geographical-scope declarations changed")
    return {
        "archive_page_sha256_observed_now": hashlib.sha256(raw).hexdigest(),
        "official_scope_phrases_confirmed_now": True,
        "archive_page_immutable_asof_proven": False,
    }


def policy(version):
    match = VERSION.fullmatch(version) if isinstance(version,str) else None
    if not match:
        raise ValueError("Require a strictly monthly UCDP Candidate edition")
    yr,mo = map(int,match.groups())
    if not 1 <= mo <= 12 or (yr == 26 and mo > 8):
        raise ValueError("Unknown or not archived monthly edition")
    if yr < 20:
        scope="AFRICA_ONLY"
    elif yr == 20:
        if mo <= 3:
            scope="AFRICA_ONLY"
        elif mo == 4:
            # Official archive parenthetical and codebook v1.2 disagree.
            scope="APRIL_2020_CONFLICTING_SCOPE_DESCRIPTIONS"
        elif mo <= 7:
            scope="AFRICA_AND_MIDDLE_EAST"
        elif mo <= 9:
            scope="AFRICA_ASIA_EUROPE_MIDDLE_EAST_NOT_GLOBAL"
        else:
            scope="GLOBAL_DECLARED"
    else:
        scope="GLOBAL_DECLARED"
    global_declared=(scope=="GLOBAL_DECLARED")
    return {
        "version": version,
        "nominal_month":f"20{yr-0:02d}-{mo:02d}",
        "scope_status":scope,
        "globally_covered_by_provider_claim":global_declared,
        "global_negative_countries_eligible":False,
        "coverage_of_event_free_countries_verified":False,
        "historically_published_file_bytes_verified":False,
        "valid_replay_asof":False,
    }


def event_summary(raw, version, expected_sha256=None):
    if version not in VERSIONS or not isinstance(raw,bytes) or not 0<len(raw)<=MAX_CSV_BYTES:
        raise ValueError("Unsupported / oversized historical Candidate archive")
    sha=hashlib.sha256(raw).hexdigest()
    if expected_sha256 is not None:
        if not isinstance(expected_sha256,str) or not OBSERVED_HASH.fullmatch(expected_sha256) or expected_sha256!=sha:
            raise ValueError("Observed SHA-256 of Candidate monthly file changed")
    try:
        data = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
        if data.fieldnames is None or len(data.fieldnames)!=len(set(data.fieldnames)) or not {"id","country_id"}.issubset(data.fieldnames):
            raise ValueError("Unexpected Candidate event table headers")
        codes = set()
        events=0
        ids=set()
        for row in data:
            events+=1
            if events>MAX_EVENTS:
                raise ValueError("Event table beyond safe limit")
            ident,country=row.get("id"),row.get("country_id")
            if not ident or not ident.isdecimal() or ident in ids:
                raise ValueError("Invalid/duplicate Candidate event id")
            if not country or not country.isdecimal() or not 0<int(country)<1000:
                raise ValueError("Invalid UCDP country_id")
            ids.add(ident)
            codes.add(int(country))
    except (UnicodeError,csv.Error,KeyError,TypeError) as exc:
        raise ValueError("Corrupt historical Candidate CSV") from exc
    if not events:
        raise ValueError("Missing Candidate events")
    return {
        "version":version,
        "observed_sha256_now":sha,
        "n_events":events,
        "n_countries_with_at_least_one_candidate_event":len(codes),
        "total_countries_in_geographic_scope":None,
        "n_confirmed_zero_event_countries":None,
        "nominal_month_not_proof_of_release_date":True,
        "zero_event_country_coverage_verified":False,
    }


def report(page, raw_september, raw_october, september_sha=None, october_sha=None):
    src=validate_official_page(page)
    sep=event_summary(raw_september,"20.0.9",september_sha)
    octo=event_summary(raw_october,"20.0.10",october_sha)
    return {
        "schema":"psychohistory.ucdp_candidate_geographic_scope_gate.v1",
        "source":ARCHIVE_URL,
        **src,
        "scope_transition": [
            policy(v) for v in ("19.0.12","20.0.3","20.0.4","20.0.5",
                                "20.0.8","20.0.9","20.0.10","20.0.12",
                                "21.0.1","24.0.12")],
        "observed_file_stats":[sep,octo],
        "global_scope_certified_asof":False,
        "country_denominator_eligible_from_candidate_events_only":False,
        "absence_of_country_events_proves_zero":False,
        "source_as_of_verified":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
        "warning":(
            "Regional scope shifts in 2018-20. The April 2020 coverage "
            "statement conflicts across provider resources: block it. "
            "Monthly event-only rows do not define country universe or "
            "prove absence of events; global scope is NOT a negative "
            "label certificate. Observed 2026 hashes have no 2020 timestamp."
        ),
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--official-page",type=Path,required=True)
    p.add_argument("--september",type=Path,required=True)
    p.add_argument("--october",type=Path,required=True)
    p.add_argument("--september-sha256")
    p.add_argument("--october-sha256")
    a=p.parse_args()
    print(json.dumps(report(a.official_page.read_bytes(),
                            a.september.read_bytes(),a.october.read_bytes(),
                            a.september_sha256,a.october_sha256),sort_keys=True))


if __name__=="__main__":
    main()
