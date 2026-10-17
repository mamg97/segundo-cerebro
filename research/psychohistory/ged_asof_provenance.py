"""GED v0.6.9: audit provenance, never certify a retrospectively issued forecast.

Inspects private GED casebook v0.6.8. An article's source_date is NOT the
timestamp at which the UCDP coded record became available. Archived monthly
Candidate vintages are a different, preliminary dataset and need rebuilt
targets and models; this script never copies GED 25.1 probabilities to them.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from datetime import date
import hashlib
import json
from pathlib import Path
import re

CASEBOOK_SCHEMA = "psychohistory.ged.incident_casebook.v1"
OUTPUT_SCHEMA = "psychohistory.ged.asof_provenance_audit.v1"
VINTAGE_SCHEMA = "psychohistory.ged.vintage_manifest.v1"
REQUIRED_FLAGS = ("prospective_eligible", "information_available_at_historical_issue_verified",
                  "event_is_not_specific_forecast")
SHA = re.compile(r"^[a-f0-9]{64}$")
VERSION = re.compile(r"^[0-9]{2}\.(?:0\.[0-9]{1,2}|[0-9]{2}\.[0-9]{2}\.[0-9]{2})$")


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Invalid ISO day")
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError("Noncanonical ISO day")
    return parsed


def month(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
        raise ValueError("Invalid ISO month")
    return int(value[:4]) * 12 + int(value[5:]) - 1


def source_publications(raw):
    """Publication dates are descriptive only, not UCDP ingestion metadata."""
    if not isinstance(raw, str):
        raise ValueError("Source date field missing")
    if not raw.strip():
        return {"status": "NOT_RECORDED", "dates": []}
    parts = [p.strip() for p in raw.split(";")]
    if any(not p for p in parts):
        return {"status": "PARTLY_UNPARSEABLE", "dates": []}
    try:
        dates = [day(p).isoformat() for p in parts]
    except ValueError:
        return {"status": "PARTLY_UNPARSEABLE", "dates": []}
    return {"status": "PARSED_SOURCE_PUBLICATION_ONLY", "dates": sorted(set(dates))}


def validate_casebook(d):
    if d.get("schema") != CASEBOOK_SCHEMA or d.get("ged_version") != "25.1":
        raise ValueError("Wrong GED casebook schema/edition")
    if d.get("prospective_eligible") is not False or d.get(
            "information_available_at_historical_issue_verified") is not False or d.get(
            "event_is_not_specific_forecast") is not True or d.get(
            "source_article_dates_are_not_ucdp_availability") is not True:
        raise ValueError("Casebook claims unsupported prospective provenance")
    if not SHA.fullmatch(d.get("ged_zip_sha256", "")) or not SHA.fullmatch(
            d.get("recency_report_sha256", "")):
        raise ValueError("Input hashes absent")
    events = d.get("events_by_id")
    parts = d.get("partitions")
    if not isinstance(events, dict) or not events or not isinstance(parts, dict) or set(parts) != {"validation", "test"}:
        raise ValueError("Missing casebook catalog/partitions")
    for key, ev in events.items():
        if not str(key).isdigit() or int(key) <= 0 or not isinstance(ev, dict) or ev.get("ged_id") != int(key):
            raise ValueError("Unreliable GED event identity")
        day(ev["date"])
        source_publications(ev["source_article_publication_dates_raw"])
    if len(events) != d.get("distinct_ged_events_first_in_any_horizon"):
        raise ValueError("GED event total changed")
    return events, parts


def verify_vintage_manifest(manifest, archive_dir):
    if manifest is None:
        return []
    if manifest.get("schema") != VINTAGE_SCHEMA or not isinstance(manifest.get("snapshots"), list):
        raise ValueError("Unrecognised vintage manifest")
    if archive_dir is None:
        raise ValueError("Local private vintage archive directory required")
    root = archive_dir.resolve()
    seen = set()
    out = []
    for item in manifest["snapshots"]:
        if not isinstance(item, dict) or item.get("source_type") != "UCDP_CANDIDATE":
            raise ValueError("Final GED and Candidate are not interchangeable")
        name = item.get("archive_file")
        edition = item.get("edition")
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,150}", name):
            raise ValueError("Invalid archive name")
        if not isinstance(edition, str) or not VERSION.fullmatch(edition):
            raise ValueError("Unexpected Candidate edition")
        if edition in seen:
            raise ValueError("Duplicate vintage edition")
        seen.add(edition)
        digest = item.get("sha256")
        if not isinstance(digest, str) or not SHA.fullmatch(digest):
            raise ValueError("Unpinned source archive")
        published = day(item.get("release_date"))
        # This URL is a citation, not a self-authenticating timestamp attestation.
        evidence = item.get("release_date_evidence_url")
        if not isinstance(evidence, str) or not (
            evidence.startswith("https://ucdp.uu.se/") or
            evidence.startswith("https://www.uu.se/") or
            evidence.startswith("https://web.archive.org/")):
            raise ValueError("Release dating must cite UCDP or independent archived evidence")
        if item.get("source_scope_verified") is not True or item.get(
                "target_comparability_verified") is not False:
            raise ValueError("Candidate scope must be reviewed; target NOT equivalent to GED final")
        countries = item.get("country_ids_in_verified_scope")
        if not isinstance(countries, list) or not countries or any(
                type(c) is not int or c <= 0 for c in countries) or len(set(countries)) != len(countries):
            raise ValueError("Unverified geographical scope")
        path = (root / name).resolve()
        if path.parent != root or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("Vintage archive missing or digest changed")
        out.append({"edition": edition, "release_date": published, "country_ids": set(countries),
                    "sha256": digest, "release_date_evidence_url": evidence})
    return out


def audit(casebook, casebook_sha256, verified_vintages=()):
    events, parts = validate_casebook(casebook)
    links = []
    source_status = Counter()
    article_before_incident = 0
    no_published_sources = 0
    events_with_post_incident_sources = 0
    event_rows = {}
    for key, event in events.items():
        pub = source_publications(event["source_article_publication_dates_raw"])
        source_status[pub["status"]] += 1
        observed = day(event["date"])
        dates = [day(x) for x in pub["dates"]]
        article_before_incident += int(any(x < observed for x in dates))
        events_with_post_incident_sources += int(any(x > observed for x in dates))
        no_published_sources += int(not dates)
        event_rows[key] = {"publication_date_parse_status": pub["status"],
                           "first_source_article_date": dates[0].isoformat() if dates else None,
                           "last_source_article_date": dates[-1].isoformat() if dates else None,
                           "ucdp_record_first_available": None,
                           "ucdp_availability_verified": False}
    counts = Counter()
    statuses = Counter()
    linked_ids = set()
    for partition in ("validation", "test"):
        part = parts[partition]
        rows = part.get("links")
        if not isinstance(rows, list) or len(rows) != part.get("linked_positive_horizons") or len(rows) != part.get("positive_horizons"):
            raise ValueError("Inconsistent horizon totals")
        identity = set()
        for row in rows:
            cid = row["country_id"]
            ev_id = row["earliest_event_ged_id"]
            if type(cid) is not int or cid <= 0 or str(ev_id) not in events:
                raise ValueError("Unknown event/country")
            if row.get("event_target_binary") != 1 or row.get("horizon_months") != 24:
                raise ValueError("Changed casebook event target")
            target = month(row["target_end_month"])
            issue = month(row["hypothetical_issue_month"])
            cutoff = month(row["cutoff_month"])
            if target - issue != 23 or cutoff != issue - 1:
                raise ValueError("Issue date mislabelled as target end")
            occurred = month(events[str(ev_id)]["date"][:7])
            if occurred < issue or occurred > target:
                raise ValueError("Linked incident outside target horizon")
            key = (cid, target)
            if key in identity:
                raise ValueError("Duplicate country-target window")
            identity.add(key)
            linked_ids.add(str(ev_id))
            issue_day = date(issue // 12, issue % 12 + 1, 1)
            # Only evidence dated BEFORE first day is permitted. Even a
            # snapshot present then is not proof of any emission.
            prior = [x for x in verified_vintages if x["release_date"] < issue_day and cid in x["country_ids"]]
            snapshot = max(prior, key=lambda x: x["release_date"]) if prior else None
            status = "SNAPSHOT_PRESENT_REBUILD_TARGET_REQUIRED" if snapshot else "NO_PINNED_IN_SCOPE_VINTAGE"
            statuses[status] += 1
            counts[partition] += 1
            links.append({
                "partition": partition, "country_id": cid,
                "hypothetical_issue_month": row["hypothetical_issue_month"],
                "target_end_month": row["target_end_month"],
                "first_observed_event_ged_id": ev_id,
                "snapshot_status": status,
                "candidate_edition": snapshot["edition"] if snapshot else None,
                "candidate_release_date": snapshot["release_date"].isoformat() if snapshot else None,
                "forecast_issued_in_real_time_verified": False,
                "input_reconstructed_from_asof_snapshot": False,
                "target_equivalence_verified": False,
            })
    if len(linked_ids) != len(events) or len(links) != casebook.get("total_positive_horizon_links"):
        raise ValueError("Lost or orphaned GED events/links")
    return {
        "schema": OUTPUT_SCHEMA, "status": "SOURCE_PROVENANCE_AUDIT_NOT_A_FORECAST",
        "casebook_sha256": casebook_sha256, "ged_zip_sha256": casebook["ged_zip_sha256"],
        "source_as_of_verified": False, "prospective_eligible": False,
        "casebook_events": len(events), "country_horizon_links": len(links),
        "partition_links": dict(counts), "source_date_parse_status": dict(source_status),
        "events_with_publication_before_incident": article_before_incident,
        "events_with_publication_after_incident": events_with_post_incident_sources,
        "events_without_parseable_publication": no_published_sources,
        "snapshot_status_counts": dict(statuses),
        "verified_archive_entries_supplied": len(verified_vintages),
        "model_scores_computed": False, "vintage_target_rebuilt": False,
        "warning": "Article publication != GED record availability; Candidate != final GED. "
                   "This audit neither certifies a vintage-correct backtest nor proves real-time issue.",
        "events": event_rows, "links": links,
    }


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--casebook", type=Path, required=True)
    cli.add_argument("--casebook-sha256", required=True)
    cli.add_argument("--vintage-manifest", type=Path)
    cli.add_argument("--vintage-archive-dir", type=Path)
    cli.add_argument("--out", type=Path, required=True)
    args = cli.parse_args()
    root = Path(__file__).resolve().parents[2]
    if args.out.resolve().is_relative_to(root):
        raise ValueError("Private GED audit output cannot be written into Git")
    raw = args.casebook.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != args.casebook_sha256 or not SHA.fullmatch(digest):
        raise ValueError("Private casebook SHA256 mismatch")
    manifest = json.loads(args.vintage_manifest.read_text()) if args.vintage_manifest else None
    snapshots = verify_vintage_manifest(manifest, args.vintage_archive_dir)
    result = audit(json.loads(raw), digest, snapshots)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("x", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, sort_keys=True, indent=2)
        f.write("\n")
    print(json.dumps({k: result[k] for k in (
        "casebook_events", "country_horizon_links", "source_as_of_verified",
        "snapshot_status_counts", "model_scores_computed")}, sort_keys=True))


if __name__ == "__main__":
    main()
