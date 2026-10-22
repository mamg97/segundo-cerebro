"""Audit private USGS OAF snapshots without scoring them as prospective."""

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path


def iso(epoch_ms):
    return datetime.fromtimestamp(epoch_ms / 1000, timezone.utc).isoformat()


def audit(folder):
    manifest = json.loads((folder / "MANIFEST.json").read_text())
    blobs = {}
    for item in manifest["files"]:
        name = item["file"]
        if Path(name).name != name or name in blobs:
            raise ValueError(f"unsafe or duplicate filename: {name}")
        raw = (folder / name).read_bytes()
        if len(raw) != item["bytes"] or sha256(raw).hexdigest() != item["sha256"]:
            raise ValueError(f"integrity failure: {name}")
        blobs[name] = json.loads(raw)

    all_events = blobs["query_september_2026_m5_all.geojson"]["features"]
    oaf_events = blobs["query_september_2026_m5_oaf.geojson"]["features"]
    all_ids = {event["id"] for event in all_events}
    oaf_ids = {event["id"] for event in oaf_events}
    if len(all_ids) != len(all_events) or len(oaf_ids) != len(oaf_events):
        raise ValueError("duplicate event IDs")
    if not oaf_ids <= all_ids:
        raise ValueError("OAF events outside all-event query")

    detail = blobs["us6000tx38_all_products.geojson"]
    products = detail["properties"]["products"]["oaf"]
    versions = sorted(products, key=lambda product: product["updateTime"])
    if len({(p["source"], p["code"], p["updateTime"]) for p in versions}) != len(versions):
        raise ValueError("duplicate OAF version")
    early = []
    for product in versions[:3]:
        stamp = product["updateTime"]
        name = f"us6000tx38_forecast_{stamp}.json"
        if product["contents"]["forecast.json"]["url"] != next(
            item["url"] for item in manifest["files"] if item["file"] == name
        ):
            raise ValueError("forecast product URL mismatch")
        forecast = blobs[name]
        first_day = forecast["forecast"][0]
        bin5 = [row for row in first_day["bins"] if row["magnitude"] == 5.0]
        if len(bin5) != 1:
            raise ValueError("M5 probability missing or duplicated")
        start = first_day["timeStart"]
        early.append({
            "product_update_utc": iso(stamp),
            "forecast_creation_utc": iso(forecast["creationTime"]),
            "first_window_start_utc": iso(start),
            "product_update_after_start_seconds": round((stamp - start) / 1000, 3),
            "first_day_probability_m5_or_more": bin5[0]["probability"],
        })
    return {"all_m5_september_current": len(all_events),
            "with_oaf_product_current": len(oaf_events),
            "oaf_versions_for_us6000tx38": len(versions),
            "first_three_versions": early,
            "historical_capture_at_issue_time_proven": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive_folder", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(args.archive_folder), indent=2))


if __name__ == "__main__":
    main()
