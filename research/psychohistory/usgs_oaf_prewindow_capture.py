"""Archive a public OAF product only when its full first-day window is future.

This is a manual capture aid, not a predictor or proof of a third-party
publication timestamp. The local persistence check fails closed.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import time
from urllib.request import Request, urlopen


HOST = "https://earthquake.usgs.gov"
SAFE_ID = re.compile(r"[a-z0-9]{3,32}\Z")
SAFE_SOURCE = re.compile(r"[a-z0-9]{1,32}\Z")
MAX_BYTES = 5_000_000


def _iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, timezone.utc).isoformat()


def _fetch(url: str) -> tuple[bytes, dict[str, str]]:
    with urlopen(Request(url, headers={"User-Agent": "PsicoHistoriaSourceAudit/1.0"}), timeout=20) as response:
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("official response exceeds capture limit")
        return raw, {key: response.headers.get(key, "") for key in
                     ("Date", "Last-Modified", "ETag", "Content-Type")}


def capture(event_id: str, output_dir: Path, *, fetch=_fetch,
            clock=lambda: int(time.time() * 1000)) -> dict:
    if not SAFE_ID.fullmatch(event_id):
        raise ValueError("unsafe event ID")
    detail_url = (f"{HOST}/fdsnws/event/1/query?eventid={event_id}"
                  "&format=geojson&includesuperseded=true")
    detail_raw, detail_headers = fetch(detail_url)
    detail_received = clock()
    detail = json.loads(detail_raw)
    if detail.get("id") != event_id:
        raise ValueError("event ID mismatch")
    products = detail.get("properties", {}).get("products", {}).get("oaf", [])
    versions = [p for p in products if p.get("status") == "UPDATE"]
    if not versions:
        return {"status": "NO_OAF", "event_id": event_id}
    product = max(versions, key=lambda p: p["updateTime"])
    source, code, stamp = product["source"], product["code"], product["updateTime"]
    if not SAFE_SOURCE.fullmatch(source) or code != event_id or not isinstance(stamp, int):
        raise ValueError("unsafe product identity")
    forecast_url = f"{HOST}/product/oaf/{code}/{source}/{stamp}/forecast.json"
    if product["contents"]["forecast.json"]["url"] != forecast_url:
        raise ValueError("forecast URL does not match official product identity")
    forecast_raw, forecast_headers = fetch(forecast_url)
    forecast_received = clock()
    forecast = json.loads(forecast_raw)
    first_days = [window for window in forecast["forecast"] if window["label"] == "1 Day"]
    if len(first_days) != 1:
        raise ValueError("missing or ambiguous first-day window")
    window = first_days[0]
    start, end = window["timeStart"], window["timeEnd"]
    if not all(isinstance(value, int) for value in (start, end)) or end - start != 86_400_000:
        raise ValueError("invalid first-day window")
    if stamp >= start or forecast_received >= start:
        return {"status": "REJECTED_WINDOW_STARTED", "event_id": event_id,
                "product_update_utc": _iso(stamp), "first_window_start_utc": _iso(start),
                "forecast_received_utc": _iso(forecast_received)}

    technical_url = f"{HOST}/product/oaf/{code}/{source}/{stamp}/forecast_data.json"
    if product["contents"]["forecast_data.json"]["url"] != technical_url:
        raise ValueError("technical URL does not match official product identity")
    technical_raw, technical_headers = fetch(technical_url)
    technical_received = clock()
    technical = json.loads(technical_raw)
    if technical.get("pdl_event_id") != event_id:
        raise ValueError("technical event ID mismatch")
    results = technical.get("results", {})
    selected = [key[:-4] for key, value in results.items()
                if key.endswith("_pdl") and value is True]
    if len(selected) != 1 or results.get(selected[0] + "_json") != forecast:
        raise ValueError("missing, ambiguous, unsupported or mismatched published model")
    if technical_received >= start:
        return {"status": "REJECTED_TECHNICAL_RECEIVED_LATE", "event_id": event_id,
                "first_window_start_utc": _iso(start),
                "technical_received_utc": _iso(technical_received)}

    folder = output_dir / f"{event_id}-{stamp}"
    folder.mkdir(parents=True, exist_ok=False)
    files = []
    for name, url, raw, headers, received in (
        ("detail.geojson", detail_url, detail_raw, detail_headers, detail_received),
        ("forecast.json", forecast_url, forecast_raw, forecast_headers, forecast_received),
        ("forecast_data.json", technical_url, technical_raw, technical_headers, technical_received),
    ):
        with (folder / name).open("xb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        files.append({"file": name, "url": url, "bytes": len(raw),
                      "sha256": sha256(raw).hexdigest(), "received_utc": _iso(received),
                      "headers": headers})
    persisted = clock()
    admitted = persisted < start
    manifest = {"schema": "psychohistory.usgs_oaf_prewindow_capture.v2",
                "event_id": event_id, "product_update_utc": _iso(stamp),
                "selected_published_model": selected[0],
                "technical_forecast_pair_verified": True,
                "first_window_start_utc": _iso(start), "first_window_end_utc": _iso(end),
                "raw_payloads_persisted_utc": _iso(persisted),
                "capture_before_window": admitted,
                "availability_at_product_update_proven": False,
                "local_clock_independently_attested": False,
                "forecast_issued_by_psicohistoria": False, "files": files}
    with (folder / "MANIFEST.json").open("x") as stream:
        json.dump(manifest, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    return {"status": "CAPTURED_PREWINDOW" if admitted else "REJECTED_PERSISTED_LATE",
            "folder": str(folder), "event_id": event_id,
            "first_window_start_utc": _iso(start)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event-id", required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    result = capture(args.event_id, args.output_dir)
    print(json.dumps(result, sort_keys=True))
    if result["status"] != "CAPTURED_PREWINDOW":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
