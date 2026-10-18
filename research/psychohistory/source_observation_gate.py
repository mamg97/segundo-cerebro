"""Strict scope-check for a public, dated observation of exact UCDP bytes.

Observing the same hashes on a provider's CI in October 2026 supports
their availability THEN, not their release date in June 2026 or availability
at any historical walk-forward origin. This module never grants forecast
issuance, independent cryptographic timestamping or retrospective as-of.
External GitHub API/log authenticity must be rechecked by a trusted caller;
a local JSON copy alone is NOT third-party timestamp verification.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
SCHEMA = "psychohistory.public_source_byte_observation.v1"
RUN_URL = re.compile(r"^https://github[.]com/mamg97/segundo-cerebro/actions/runs/([1-9][0-9]*)$")
UTC_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")
ALLOWED_STEPS = {
    "downloadedOfficialZipAndCodebook",
    "hashesMatchedPinsAndSourcePanelValidated",
    "benchmarkAuditStrictPassed",
}


def utc(text):
    if not isinstance(text, str) or not UTC_RE.fullmatch(text):
        raise ValueError("Expected an explicit whole-second UTC timestamp")
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Invalid calendar or UTC clock value") from exc


def assess(record, protocol, *, target_year=2027, planned_issue_at=None):
    """Return scoped source observation evidence, never issuance authorization.

    Input CI run metadata must be obtained and independently rechecked
    through the public provider API; offline consistency is not authenticity.
    """
    if not isinstance(record, dict) or not isinstance(protocol, dict):
        raise ValueError("Observation and frozen protocol must be objects")
    if (record.get("schema") != SCHEMA or
            record.get("source") != "UCDP OrganizedViolenceCY" or
            record.get("version") != protocol.get("dataset_version") or
            record.get("archiveUrl") != protocol.get("archive_url") or
            record.get("codebookUrl") != protocol.get("codebook_url") or
            record.get("archiveSha256") != protocol.get("archive_sha256") or
            record.get("codebookSha256") != protocol.get("codebook_sha256") or
            record.get("sourceRows") != protocol.get("expected_raw_rows") or
            record.get("countries") != protocol.get("expected_countries") or
            [record.get("firstYear"), record.get("lastYear")] != protocol.get("raw_years")):
        raise ValueError("Source observation is incompatible with pinned UCDP protocol")
    run = record.get("ciRun")
    if not isinstance(run, dict):
        raise ValueError("Source CI observation missing")
    url = run.get("url")
    match = RUN_URL.fullmatch(url) if isinstance(url, str) else None
    if (not match or run.get("id") != int(match.group(1)) or
            type(run.get("id")) is not int or
            run.get("repository") != "mamg97/segundo-cerebro" or
            run.get("provider") != "GitHub Actions" or
            run.get("event") not in ("pull_request", "workflow_dispatch") or
            run.get("status") != "completed" or run.get("conclusion") != "success" or
            not isinstance(run.get("sourceCommit"), str) or
            not re.fullmatch(r"[a-f0-9]{40}", run["sourceCommit"])):
        raise ValueError("CI evidence identity or outcome mismatched")
    if (not isinstance(run.get("steps"), dict) or
            set(run["steps"]) != ALLOWED_STEPS or
            any(v != "success" for v in run["steps"].values())):
        raise ValueError("Required official-source download and validation steps failed")
    start = utc(run.get("startedAtUtc"))
    observed_by = utc(run.get("endedNoLaterThanUtc"))
    if observed_by < start or observed_by.year < 2026:
        raise ValueError("Invalid source observation interval")
    if type(target_year) is not int or target_year <= protocol["raw_years"][1]:
        raise ValueError("Target must be an unobserved year after input coverage")
    horizon = datetime(target_year, 1, 1, tzinfo=timezone.utc)
    if observed_by >= horizon:
        raise ValueError("The bytes were not observed before the target horizon")
    announcement = record.get("pressAnnouncement")
    if (not isinstance(announcement, dict) or
            announcement.get("url") !=
            "https://www.uu.se/en/press/press-releases/2026/2026-06-09-ucdp-record-number-of-conflicts-between-states" or
            announcement.get("date") != "2026-06-09" or
            announcement.get("exactArchiveBytesDatedByAnnouncement") is not False):
        raise ValueError("Generic press statistics cannot date exact ZIP bytes")
    for flag in (
        "externalCryptographicTimestampOfSourceVerified",
        "sourceByteAvailabilityAtHistoricalBacktestOriginsVerified",
        "sourceAvailableOnJune9ForTheseExactBytesVerified",
        "forecastIssued",
    ):
        if record.get(flag) is not False:
            raise ValueError("Observation overclaims historical release, trust or forecast")
    if planned_issue_at is not None:
        issuance = utc(planned_issue_at)
        if issuance < observed_by or issuance >= horizon:
            raise ValueError("Planned issuance must follow byte observation and precede target")
    else:
        issuance = None
    return {
        "schema": "psychohistory.forward_source_observation_assessment.v1",
        "status": "EXACT_BYTES_OBSERVED_IN_DATED_EXTERNAL_CI_METADATA_ONLY",
        "sourceVersion": protocol["dataset_version"],
        "observedNoLaterThanUtc": run["endedNoLaterThanUtc"],
        "sourceObservedBeforeTargetStart": True,
        "eligibleForHistoricalBacktestAsOf": False,
        "exactJuneReleaseDateVerified": False,
        "githubApiAndLogsMustBeRecheckedExternally": True,
        "independentCryptographicTimeWitnessVerified": False,
        "plannedIssuanceAfterObservation": issuance is not None,
        "sourceAsOfForActualIssuanceCertified": False,
        "forecastIssued": False,
        "prospectiveEligible": False,
        "targetYear": target_year,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--observation", type=Path, default=HERE / "source_observation_20261018.json")
    p.add_argument("--protocol", type=Path, default=HERE / "protocol.json")
    p.add_argument("--target-year", type=int, default=2027)
    p.add_argument("--planned-issue-at")
    args = p.parse_args()
    observation = json.loads(args.observation.read_text(encoding="utf-8"))
    protocol = json.loads(args.protocol.read_text(encoding="utf-8"))
    print(json.dumps(assess(observation, protocol, target_year=args.target_year,
                            planned_issue_at=args.planned_issue_at), sort_keys=True))


if __name__ == "__main__":
    main()
