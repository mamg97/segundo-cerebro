"""Full-population Candidate source coverage, NOT a vintage-correct backtest.

All country-origins (including eventual negatives) need source coverage. An
operator-entered release date and geography are not independently verified.
This audit NEVER computes a model score or certifies historical availability.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import date
import json
import os
from pathlib import Path
from ged_asof_provenance import month, verify_vintage_manifest

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = "psychohistory.candidate_country_origin_roster.v1"
PRESENT = "PINNED_DECLARED_PREISSUE_SOURCE_REBUILD_REQUIRED"
MISSING = "NO_PREISSUE_PINNED_IN_SCOPE_SOURCE"


def parse_roster(doc):
    if not isinstance(doc, dict) or set(doc) != {"schema", "origins"} or doc["schema"] != SCHEMA:
        raise ValueError("Only the outcome-blind roster schema is permitted")
    raw = doc["origins"]
    if not isinstance(raw, list) or not 1 <= len(raw) <= 240:
        raise ValueError("Invalid origin list")
    origins = []
    for row in raw:
        if not isinstance(row, dict) or set(row) != {"issue_month", "cutoff_month", "country_ids"}:
            raise ValueError("Only issue, cutoff and population allowed: no outcomes")
        issue, cutoff = month(row["issue_month"]), month(row["cutoff_month"])
        if cutoff != issue - 1:
            raise ValueError("Cutoff must precede issue by one full month")
        countries = row["country_ids"]
        if (not isinstance(countries, list) or not 1 <= len(countries) <= 500 or
                any(type(c) is not int or c < 1 for c in countries) or
                len(set(countries)) != len(countries)):
            raise ValueError("Duplicate, missing or invalid country")
        origins.append((issue, sorted(countries)))
    if [x[0] for x in origins] != sorted(set(x[0] for x in origins)):
        raise ValueError("Origin months must be strictly increasing and unique")
    return origins


def audit(roster, snapshots):
    origins = parse_roster(roster)
    if not isinstance(snapshots, list):
        raise ValueError("Verified local snapshot manifest required")
    for s in snapshots:
        if not isinstance(s, dict) or not (
            isinstance(s.get("release_date"), date) and
            isinstance(s.get("country_ids"), set) and
            isinstance(s.get("edition"), str) and
            isinstance(s.get("sha256"), str)
        ):
            raise ValueError("Snapshot was not admitted by the manifest verifier")
    cases, summaries, totals = [], [], Counter()
    for issue, countries in origins:
        first_day = date(issue // 12, issue % 12 + 1, 1)
        n_pinned = 0
        for country in countries:
            matches = [s for s in snapshots if s["release_date"] < first_day
                       and country in s["country_ids"]]
            if matches:
                latest_date = max(s["release_date"] for s in matches)
                newest = [s for s in matches if s["release_date"] == latest_date]
                if len(newest) != 1:
                    raise ValueError("Ambiguous source releases on the same date")
                selected = newest[0]
                status = PRESENT
                n_pinned += 1
            else:
                selected, status = None, MISSING
            totals[status] += 1
            cases.append({
                "issue_month": first_day.strftime("%Y-%m"),
                "country_id": country, "status": status,
                "candidate_edition": selected["edition"] if selected else None,
                "candidate_sha256": selected["sha256"] if selected else None,
                "declared_release_date": selected["release_date"].isoformat() if selected else None,
            })
        summaries.append({"issue_month": first_day.strftime("%Y-%m"),
                          "n_countries": len(countries),
                          "n_pinned_declared_scope": n_pinned,
                          "complete_declared_coverage": n_pinned == len(countries)})
    summary = {
        "n_origins": len(origins),
        "n_country_origins": len(cases),
        "n_pinned_declared_scope": totals[PRESENT],
        "n_missing": totals[MISSING],
        "n_fully_covered_origins": sum(x["complete_declared_coverage"] for x in summaries),
    }
    return {
        "schema": "psychohistory.candidate_asof_coverage.v1",
        "status": "COVERAGE_INVENTORIED_REPLAY_NOT_AUTHORIZED" if totals[PRESENT] else "NO_EVALUABLE",
        "summary": summary, "by_origin": summaries, "country_origins": cases,
        "source_release_dates_independently_authenticated": False,
        "snapshot_contents_target_rebuilt": False,
        "training_labels_asof_verified": False,
        "source_as_of_verified": False,
        "vintage_correct_backtest": False,
        "scores_computed": False,
        "forecast_issued": False,
        "prospective_skill_demonstrated": False,
        "warning": ("Operator-declared publication date and geographic scope do not prove "
                    "historical availability. Missing cells are UNKNOWN, never negatives. "
                    "Rebuild Candidate features and outcomes before any scoring."),
    }


def save_private(doc, destination):
    path = destination.resolve()
    if path == ROOT or path.is_relative_to(ROOT):
        raise ValueError("Country-level audits cannot be saved to public repository")
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        json.dump(doc, stream, sort_keys=True, indent=2)
        stream.write("\n")


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--manifest", required=True, type=Path)
    cli.add_argument("--archive-dir", required=True, type=Path)
    cli.add_argument("--roster", required=True, type=Path)
    cli.add_argument("--output", required=True, type=Path)
    args = cli.parse_args()
    snaps = verify_vintage_manifest(
        json.loads(args.manifest.read_text(encoding="utf-8")), args.archive_dir)
    result = audit(json.loads(args.roster.read_text(encoding="utf-8")), snaps)
    save_private(result, args.output)
    print(json.dumps({"status": result["status"], "summary": result["summary"],
                      "source_as_of_verified": False,
                      "scores_computed": False, "forecast_issued": False}, sort_keys=True))


if __name__ == "__main__":
    main()
