"""Triage of historical UCDP source vintages; NEVER an as-of admission.

A historical-looking version in today's official index does not prove that
identical bytes existed before a forecast origin. No country-level rows,
scores, probabilities or actual forecasts are constructed or exposed.
"""
from __future__ import annotations

import argparse
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urljoin

from onset_issue_contract import parse_day, TARGET

SCHEMA = "psychohistory.intrastate_vintage_discovery.v1"
INDEX_URL = "https://ucdp.uu.se/downloads/olddw.html"
SOURCES = (
    {
        "source_id": "ucdp_ged_19_1",
        "edition": "19.1",
        "official_url": "https://ucdp.uu.se/downloads/ged/ged191-csv.zip",
        "released_in_year_claim": 2019,
        "observation_through": "2018-12-31",
        "scope": "global_dataset_with_known_historical_coverage_caveats",
        "can_directly_resolve_country_onset1": False,
    },
    {
        "source_id": "ucdp_candidate_20_0_10",
        "edition": "20.0.10",
        "official_url": "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v20_0_10.csv",
        "released_in_year_claim": 2020,
        "observation_through": None,
        "scope": "global_declared_from_october_2020_not_negative_country_roster",
        "can_directly_resolve_country_onset1": False,
    },
)


class _Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = set()

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        for key, value in attrs:
            if key.lower() == "href" and value:
                self.links.add(urljoin(INDEX_URL, value))


def source_index_presence(raw):
    """Presence in a CURRENT HTML index, not a historical byte timestamp."""
    if not isinstance(raw, bytes) or not 100 <= len(raw) <= 1_000_000:
        raise ValueError("Official catalog HTML missing or oversized")
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeError as exc:
        raise ValueError("Expected UTF-8 catalog") from exc
    links = _Links()
    links.feed(content)
    return {src["source_id"]: src["official_url"] in links.links for src in SOURCES}


def review_source(source, issue_date):
    origin = parse_day(issue_date)
    if origin != date(origin.year, 1, 1):
        raise ValueError("Existing onset1 contract requires January 1 origin")
    keys = {"source_id", "edition", "official_url", "released_in_year_claim",
            "observation_through", "scope", "can_directly_resolve_country_onset1"}
    if not isinstance(source, dict) or set(source) != keys:
        raise ValueError("Unexpected registry fields")
    known = next((s for s in SOURCES if s["source_id"] == source["source_id"]), None)
    if known is None or known != source:
        raise ValueError("Source must match immutable official candidate metadata")
    observed = parse_day(source["observation_through"]) if source["observation_through"] else None
    release_year_early = source["released_in_year_claim"] < origin.year
    end_early = observed is not None and observed < origin
    full_prior_observed = observed is not None and observed >= date(origin.year - 1, 12, 31)
    reasons = []
    if not release_year_early:
        reasons.append("RELEASE_YEAR_NOT_BEFORE_ORIGIN")
    if observed is None:
        reasons.append("SOURCE_OBSERVATION_END_UNKNOWN")
    elif not end_early:
        reasons.append("SOURCE_OBSERVATIONS_NOT_BEFORE_ORIGIN")
    if not full_prior_observed:
        reasons.append("PREVIOUS_YEAR_INTRASTATE_ACTIVITY_UNRESOLVED")
    reasons.extend((
        "HISTORICAL_BYTE_WITNESS_NOT_AUTHENTICATED",
        "COUNTRIES_WITH_ZERO_EVENTS_NOT_ATTESTED_AT_ORIGIN",
        "TERRITORIAL_IDENTITY_AND_INTRASTATE_ACTIVE_STATE_NOT_CERTIFIED",
        "OUTCOME_ONSET1_RISK_SET_NOT_CERTIFIED",
    ))
    return {
        "source_id": source["source_id"],
        "origin": origin.isoformat(),
        "last_observation_day_declared": source["observation_through"],
        "release_year_earlier_than_origin": release_year_early,
        "data_end_earlier_than_origin": end_early,
        "prior_year_full_activity_observed": full_prior_observed,
        "chronology_candidate_only": release_year_early and end_early,
        "blocking_reasons": reasons,
        "independent_historical_byte_witness_verified": False,
        "asof_intrastate_activity_verified": False,
        "complete_country_risk_set_verified": False,
        "backtest_authorized": False,
        "models_scored": False,
        "forecast_issued": False,
    }


def audit(issue_dates, current_index_html=None):
    if (not isinstance(issue_dates, tuple) or not 1 <= len(issue_dates) <= 12 or
            any(not isinstance(y, str) for y in issue_dates)):
        raise ValueError("Expected 1–12 hypothetical origins")
    parsed = [parse_day(day) for day in issue_dates]
    if parsed != sorted(set(parsed)):
        raise ValueError("Origins must be ordered unique")
    present = (source_index_presence(current_index_html)
               if current_index_html is not None else None)
    return {
        "schema": SCHEMA,
        "target": TARGET,
        "current_index_checked": present is not None,
        "current_index_present": present,
        "source_vintage_reviews": [review_source(src, issue.isoformat())
                                   for issue in parsed for src in SOURCES],
        "independent_historical_byte_witness_verified": False,
        "full_risk_set_at_issue_verified": False,
        "backtest_authorized": False,
        "models_scored": False,
        "forecast_issued": False,
        "warning": "Old versions linked today are NOT independent timestamped historical bytes. Missing event countries are NOT zeros.",
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--issue-date", action="append", required=True)
    p.add_argument("--index-html", type=Path)
    p.add_argument("--require-index-links", action="store_true")
    args = p.parse_args()
    raw = args.index_html.read_bytes() if args.index_html else None
    result = audit(tuple(args.issue_date), raw)
    if args.require_index_links and (
            not result["current_index_checked"] or
            not all(result["current_index_present"].values())):
        raise ValueError("Expected official hyperlinks absent from current catalog")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
