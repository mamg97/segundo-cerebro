"""AV-046: a genuinely separate July-origin experiment with a next-year target.

The output of this module is a scientific *design audit*, not a backtest.
A dated publisher release announcement establishes a possible chronology;
it does NOT attest the exact dataset bytes, the country frame, the labels
available for fitting in 2020, or an actual forecast issued in 2020.
No country IDs or probabilities are accepted, returned or published.

The estimand is UNCONDITIONAL incidence of the official country-onset1 flag
within a country frame frozen on the 2020 issue date. It is NOT the
conditional onset-risk estimand of AV-042. Explicitly non-resolvable future
country memberships cannot be turned into negative labels.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re

SCHEMA = "psychohistory.july_nextyear_onset_protocol.v1"
TARGET = "ucdp25.1_intrastate_country_onset1_unconditional_issue_roster"
SOURCE_VERSION = "20.1"
ISSUE = "2020-07-01T00:00:00Z"
RELEASE = "2020-06-16"
ANNOUNCEMENT = "https://www.uu.se/en/department/peace-and-conflict-research/news/archive/2020-06-16-major-data-releases-from-ucdp"
SOURCE_LAST = "2019-12-31"
TARGET_FIRST = "2021-01-01"
TARGET_LAST = "2021-12-31"
REQUIRED = {
    "schema", "issue_utc", "population_frame_asof_utc", "covariate_observation_cutoff",
    "declared_source_release_day", "declared_source_release_evidence_url",
    "source_edition", "target_id", "target_first_day", "target_last_day",
    "evaluation_population_policy", "training_label_policy",
    "resolution_label_edition", "independent_source_bytes_witness_utc",
    "source_bytes_sha256", "roster_bytes_sha256", "training_labels_bytes_sha256",
}
HEX64 = re.compile(r"[0-9a-f]{64}\Z")


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Canonical YYYY-MM-DD required")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Impossible calendar day") from exc
    if parsed.isoformat() != value:
        raise ValueError("Noncanonical date")
    return parsed


def instant(value):
    if not isinstance(value, str) or not re.fullmatch(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value):
        raise ValueError("Exact UTC clock with Z required")
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise ValueError("Impossible issue instant") from exc
    return parsed.replace(tzinfo=timezone.utc)


def analyze(manifest):
    """A fixed historical scenario that cannot bootstrap its own as-of evidence."""
    if not isinstance(manifest, dict) or set(manifest) != REQUIRED:
        raise ValueError("Exactly the preregistered proposal fields are required")
    expected = {
        "schema": SCHEMA,
        "issue_utc": ISSUE,
        "population_frame_asof_utc": ISSUE,
        "covariate_observation_cutoff": SOURCE_LAST,
        "declared_source_release_day": RELEASE,
        "declared_source_release_evidence_url": ANNOUNCEMENT,
        "source_edition": SOURCE_VERSION,
        "target_id": TARGET,
        "target_first_day": TARGET_FIRST,
        "target_last_day": TARGET_LAST,
        "evaluation_population_policy": "ALL_COUNTRIES_IN_PREISSUE_FROZEN_FRAME_WITH_UNRESOLVABLE_TRACKED",
        "training_label_policy": "MUST_BE_PUBLISHED_AND_VINTAGE_VERIFIED_BEFORE_ISSUE",
        "resolution_label_edition": "25.1",
    }
    for key, value in expected.items():
        if manifest[key] != value or type(manifest[key]) is not str:
            raise ValueError("Proposed target/origin/source contract cannot be changed silently")
    origin = instant(manifest["issue_utc"])
    frame_time = instant(manifest["population_frame_asof_utc"])
    cutoff = day(manifest["covariate_observation_cutoff"])
    release = day(manifest["declared_source_release_day"])
    outcome_start = day(manifest["target_first_day"])
    outcome_end = day(manifest["target_last_day"])
    if (frame_time != origin or
            not cutoff < release < origin.date() or
            not origin.date() < outcome_start <= outcome_end or
            outcome_start != date(2021, 1, 1) or outcome_end != date(2021, 12, 31)):
        raise ValueError("Cannot shift the origin/feature cutoff/horizon")
    # The absence of a hash must not be filled with a retrospectively
    # observed current hash and labeled as historical availability.
    for key in ("source_bytes_sha256", "roster_bytes_sha256",
                "training_labels_bytes_sha256"):
        val = manifest[key]
        if val is not None and (type(val) is not str or not HEX64.fullmatch(val)):
            raise ValueError("Hashes must be SHA-256 or UNKNOWN; no fabricated receipts")
    witness = manifest["independent_source_bytes_witness_utc"]
    if witness is not None:
        parsed_witness = instant(witness)
        if parsed_witness >= origin:
            raise ValueError("Post-issue witness cannot justify a 2020 emission")
    # Even a syntactically valid claimed witness is not independently
    # authenticated by this program. No authorization bit is writable.
    return {
        "schema": SCHEMA,
        "target": TARGET,
        "estimand": "UNCONDITIONAL_COUNTRY_INCIDENCE_NOT_CONDITIONAL_AT_RISK_ONSET",
        "hypothetical_origin_utc": ISSUE,
        "forecast_window": [TARGET_FIRST, TARGET_LAST],
        "feature_observation_cutoff": SOURCE_LAST,
        "source_release_day_publisher_claim": RELEASE,
        "feature_full_year_not_same_as_target_year": True,
        "publisher_announcement_before_origin": True,
        "date_geometry_is_chronologically_possible": True,
        "hypothetical_issue_to_target_lead_months": 6,
        "outcome_version_is_retrospective_resolution_only": True,
        "country_frame_verified_asof": False,
        "missing_outcome_countries_must_remain_unresolvable": True,
        "historical_byte_witness_independently_authenticated": False,
        "historical_training_labels_verified": False,
        "revised_outcome_may_be_used_as_historical_train_labels": False,
        "vintage_correct_model_fit_authorized": False,
        "backtest_authorized": False,
        "scores_computed": False,
        "forecast_issued": False,
        "blocking_reasons": [
            "EXACT_SOURCE_BYTES_AND_PREISSUE_RECEIPT_NOT_VERIFIED",
            "PREISSUE_COUNTRY_FRAME_INCLUDING_NO_EVENT_COUNTRIES_NOT_PINNED",
            "HISTORICAL_TRAINING_LABEL_VINTAGES_NOT_VERIFIED",
            "TERRITORIAL_CROSSWALK_AND_FUTURE_UNRESOLVABLE_POLICY_NOT_AUDITED",
            "NO_FORECAST_OR_MODEL_FROZEN_AT_ORIGIN",
        ],
        "warning": (
            "A publisher announcement allows a JULY issue design but not "
            "historically authenticated feature bytes. All-country target "
            "is different from the AV-042 eligible risk-set conditional target."
        ),
    }


def proposal():
    """No witness, hash, roster or data is invented."""
    return {
        "schema":SCHEMA, "issue_utc":ISSUE,"population_frame_asof_utc":ISSUE,
        "covariate_observation_cutoff":SOURCE_LAST,
        "declared_source_release_day":RELEASE,
        "declared_source_release_evidence_url":ANNOUNCEMENT,
        "source_edition":SOURCE_VERSION, "target_id":TARGET,
        "target_first_day":TARGET_FIRST,"target_last_day":TARGET_LAST,
        "evaluation_population_policy":"ALL_COUNTRIES_IN_PREISSUE_FROZEN_FRAME_WITH_UNRESOLVABLE_TRACKED",
        "training_label_policy":"MUST_BE_PUBLISHED_AND_VINTAGE_VERIFIED_BEFORE_ISSUE",
        "resolution_label_edition":"25.1",
        "independent_source_bytes_witness_utc":None,
        "source_bytes_sha256":None,
        "roster_bytes_sha256":None,
        "training_labels_bytes_sha256":None,
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest",type=Path)
    a=p.parse_args()
    manifest=(json.loads(a.manifest.read_text(encoding="utf-8"))
              if a.manifest else proposal())
    print(json.dumps(analyze(manifest),sort_keys=True))


if __name__ == "__main__":
    main()
