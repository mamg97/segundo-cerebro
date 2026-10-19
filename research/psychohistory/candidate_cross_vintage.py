"""Compare publicly archived consecutive UCDP Candidate monthly EVENT vintages.

Reads both sources only in an ephemeral runner or private workspace. Reports
aggregate identity/precision transitions; does not log event/country/actor IDs,
store records, infer absent countries as conflict-free, authenticate historical
availability, reconstruct models or issue forecasts.

Crucial: release inclusion is by date_start OR date_end in the month. Presence
in either archive, or a matching UCDP id across releases, does not prove the
same event was publicly known at the hypothetical historical issue date.
"""
from __future__ import annotations

import argparse
from collections import Counter
import csv
from datetime import date
import hashlib
import io
import json
import re

from candidate_source_probe import _parse_event_date

VERSIONS = {
    "24.0.12": ("2024-12", "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_0_12.csv"),
    "25.0.1": ("2025-01", "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v25_0_1.csv"),
}
FIELDS = ("id", "country_id", "type_of_violence", "date_start", "date_end", "date_prec")
MAX_SOURCE_BYTES = 80_000_000
MAX_EVENTS = 500_000
HASH = re.compile(r"[0-9a-f]{64}\Z")


def read_month(raw, version, expected_sha256=None):
    if version not in VERSIONS or not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_SOURCE_BYTES:
        raise ValueError("Unexpected vintage or invalid source bytes")
    digest = hashlib.sha256(raw).hexdigest()
    if expected_sha256 is not None:
        if not isinstance(expected_sha256, str) or not HASH.fullmatch(expected_sha256):
            raise ValueError("Invalid expected SHA-256")
        if digest != expected_sha256:
            raise ValueError("Pinned archive changed: cannot compare")
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
        if reader.fieldnames is None or len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError("Duplicate or absent CSV header")
        if not set(FIELDS).issubset(reader.fieldnames):
            raise ValueError("Expected Candidate schema columns absent")
        month_str = VERSIONS[version][0]
        year, m = map(int, month_str.split("-"))
        month_start = date(year, m, 1)
        month_end = date(year + (m == 12), m % 12 + 1, 1)
        observations = {}
        precision = Counter()
        n_wrong_window = 0
        for n, row in enumerate(reader, start=1):
            if n > MAX_EVENTS:
                raise ValueError("Excess event count")
            ident = row["id"]
            if not isinstance(ident, str) or not ident.isdecimal() or int(ident) <= 0:
                raise ValueError("Invalid event identifier")
            if ident in observations:
                raise ValueError("Repeated id in a Candidate edition")
            cid = int(row["country_id"])
            kind = int(row["type_of_violence"])
            if cid <= 0 or kind not in (1, 2, 3):
                raise ValueError("Invalid country/violence kind")
            start = _parse_event_date(row["date_start"])
            end = _parse_event_date(row["date_end"])
            if not (date(1989, 1, 1) <= start <= end):
                raise ValueError("Invalid temporal event interval")
            prec = str(row["date_prec"]).strip()
            if not prec:
                prec = "MISSING"
            # The monthly export contract uses EITHER endpoint, not span intersection alone.
            if not (month_start <= start < month_end or month_start <= end < month_end):
                n_wrong_window += 1
            precision[prec] += 1
            observations[ident] = (cid, kind, start, end, prec)
    except (UnicodeError, csv.Error, KeyError, TypeError, OverflowError) as exc:
        raise ValueError("Unparseable Candidate vintage") from exc
    if not observations:
        raise ValueError("Empty Candidate archive")
    return {
        "version": version, "observed_sha256": digest, "n_events": len(observations),
        "counts_date_prec": dict(sorted(precision.items())),
        "n_not_matching_month_endpoint_rule": n_wrong_window,
        "rows": observations,
        "previously_pinned_hash_match": expected_sha256 is not None,
    }


def zero_date_geometry(vintage):
    """Count relative dates for zero-precision events, never reveal record IDs."""
    year, m = map(int, VERSIONS[vintage["version"]][0].split("-"))
    month_start = date(year, m, 1)
    month_end = date(year + (m == 12), m % 12 + 1, 1)
    rows = [row for row in vintage["rows"].values() if row[4] == "0"]
    return {
        "n": len(rows),
        "n_started_in_nominal_month": sum(month_start <= row[2] < month_end for row in rows),
        "n_end_after_nominal_month": sum(row[3] >= month_end for row in rows),
        "n_end_in_nominal_month": sum(month_start <= row[3] < month_end for row in rows),
        "n_same_day_interval": sum(row[2] == row[3] for row in rows),
    }


def compare(december, january):
    if december.get("version") != "24.0.12" or january.get("version") != "25.0.1":
        raise ValueError("Require December 2024 -> January 2025 sequence")
    d, j = december["rows"], january["rows"]
    common = d.keys() & j.keys()
    valid = {eid for eid in common if d[eid][:2] == j[eid][:2]}
    bad_identity = common - valid
    d_zero = {eid for eid, row in d.items() if row[4] == "0"}
    j_zero = {eid for eid, row in j.items() if row[4] == "0"}
    z_overlap = d_zero & valid
    d_cross_year = {eid for eid, row in d.items()
                    if row[2].year == 2024 and row[3].year > 2024}
    # Never emit a row-level transition, country ID or individual event ID.
    return {
        "schema": "psychohistory.ucdp_candidate_cross_vintage_observation.v1",
        "source_editions": ["24.0.12", "25.0.1"],
        "source_urls": [VERSIONS["24.0.12"][1], VERSIONS["25.0.1"][1]],
        "source_sha256_observed_now": {
            "december": december["observed_sha256"],
            "january": january["observed_sha256"],
        },
        "december_pinned_from_prior_2026_observation": december["previously_pinned_hash_match"],
        "january_pinned_from_prior_observation": january["previously_pinned_hash_match"],
        "event_counts": {"december": len(d), "january": len(j)},
        "date_precision_counts": {
            "december": december["counts_date_prec"],
            "january": january["counts_date_prec"],
        },
        "monthly_window_mismatch_counts": {
            "december": december["n_not_matching_month_endpoint_rule"],
            "january": january["n_not_matching_month_endpoint_rule"],
        },
        "n_matched_identifiers": len(common),
        "n_identity_conflicts_country_or_type": len(bad_identity),
        "n_comparable_matched_identifiers": len(valid),
        "n_comparable_changed_date_bounds": sum(d[eid][2:4] != j[eid][2:4] for eid in valid),
        "n_comparable_changed_date_prec": sum(d[eid][4] != j[eid][4] for eid in valid),
        "december_code_zero": {
            "n": len(d_zero),
            "n_with_end_in_2025": len(d_zero & d_cross_year),
            "n_same_identity_observed_in_january": len(z_overlap),
            "n_not_observed_with_same_identity_in_january": len(d_zero) - len(z_overlap),
            "n_transitioned_to_documented_1_to_5": sum(
                j[eid][4] in ("1", "2", "3", "4", "5") for eid in z_overlap),
            "n_retaining_code_zero": sum(j[eid][4] == "0" for eid in z_overlap),
            "n_changed_date_interval": sum(
                d[eid][2:4] != j[eid][2:4] for eid in z_overlap),
        },
        "january_code_zero_count": len(j_zero),
        "code_zero_date_geometry_by_edition": {
            "december": zero_date_geometry(december),
            "january": zero_date_geometry(january),
        },
        "status": "CROSS_VINTAGE_DESCRIPTIVE_ONLY_NOT_ASOF",
        "event_identity_stable_across_editions_verified": False,
        "historical_publication_dates_independently_verified": False,
        "historical_source_bytes_available_asof_verified": False,
        "country_zero_event_roster_verified": False,
        "source_as_of_verified": False,
        "models_scored": False,
        "forecast_issued": False,
        "prospective_skill_demonstrated": False,
        "warning": (
            "Matching event ids and dates across monthly editions is descriptive. "
            "A missing id in January is not proof of retraction or that a December "
            "event was never known; an id match is not independent identity proof. "
            "Archive availability now does not certify historical issue-time availability. "
            "No inference about date_prec=0 without codebook/provider confirmation."
        ),
    }


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--december", required=True, type=__import__("pathlib").Path)
    cli.add_argument("--january", required=True, type=__import__("pathlib").Path)
    cli.add_argument("--december-sha256", required=True)
    cli.add_argument("--january-sha256")
    args = cli.parse_args()
    d = read_month(args.december.read_bytes(), "24.0.12", args.december_sha256)
    j = read_month(args.january.read_bytes(), "25.0.1", args.january_sha256)
    print(json.dumps(compare(d, j), sort_keys=True))


if __name__ == "__main__":
    main()
