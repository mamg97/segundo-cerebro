"""Offline preparation for a *future* UCDP country-year forecast cohort.

Output is private and UNSEALED by construction. Training source data must end
exactly at target_year-2; the intervening year remains unknown. Models come from
the existing audited Futures Engine, never from fabricated features.

A local machine's clock, checksums, or Git commit cannot prove independent issue
time. This script cannot issue an approved forecast or declare skill.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path

from benchmark import audit, load_official, canonical, digest
from futures import MODELS, fit, forecast, prepare

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]


def utc_date(value):
    if not isinstance(value, dt.datetime) or value.tzinfo is None:
        raise ValueError("An aware UTC preparation datetime is required")
    return value.astimezone(dt.timezone.utc)


def make_rehearsal(raw, source_protocol, future_protocol, target_year, source_sha256,
                   prepared_at, horizons=(1, 3, 5, 10)):
    """Pure computation; deliberately does not contact a TSA or see future labels."""
    date = utc_date(prepared_at)
    if not isinstance(target_year, int) or isinstance(target_year, bool) or target_year < 1991:
        raise ValueError("Invalid target origin")
    issue_boundary = dt.datetime(target_year, 1, 1, tzinfo=dt.timezone.utc)
    if not date < issue_boundary:
        raise ValueError("Forecast origin already started; no retrospective issuance")
    if not isinstance(source_sha256, str) or len(source_sha256) != 64 or any(c not in "0123456789abcdef" for c in source_sha256):
        raise ValueError("Source archive digest required")
    if not horizons or any(not isinstance(h, int) or isinstance(h, bool) or h < 1 or h > 10 for h in horizons) or len(horizons) != len(set(horizons)):
        raise ValueError("Invalid horizons")
    if any(h not in future_protocol["horizons"] for h in horizons):
        raise ValueError("Horizons not declared in model protocol")
    quality = audit(raw, source_protocol, strict=False)
    cutoff = target_year - future_protocol["information_lag_years"]
    if future_protocol["information_lag_years"] != 2:
        raise ValueError("Existing model requires exactly one unobserved bridge year")
    if quality["years"][1] != cutoff:
        raise ValueError("Input must stop at exactly target_year-2; no future observations allowed")
    release_year = 2000 + int(source_protocol["dataset_version"].split(".")[0])
    if date.year < release_year:
        raise ValueError("Source edition had not nominally been published by preparation year")
    lookup = prepare(raw, source_protocol)
    fitted = fit(lookup, target_year, future_protocol)
    if not fitted["countries"]:
        raise ValueError("No eligible countries with the required consecutive history")
    predictions = []
    for country in fitted["countries"]:
        for horizon in horizons:
            for model in MODELS:
                dist, risk, matrix = forecast(fitted, country, model, horizon, future_protocol)
                if len(dist) != 4 or any(not math.isfinite(p) or not 0 <= p <= 1 for p in dist) or abs(math.fsum(dist) - 1) > 1e-10:
                    raise ValueError("Forecast does not conserve probability")
                if any(not 0 <= rate <= 1 or not math.isfinite(rate) for rate in (risk,)):
                    raise ValueError("Invalid cumulative event probability")
                if any(abs(math.fsum(row) - 1) > 1e-10 for row in matrix):
                    raise ValueError("Invalid transition matrix")
                predictions.append({
                    "country_id": country["id"], "country": country["name"], "region": country["region"],
                    "initial_observed_state": country["initial"], "model": model,
                    "horizon": horizon, "terminal_year": target_year + horizon - 1,
                    "state_probabilities": dist, "any_episode_probability": risk
                })
    code_paths = [HERE / name for name in ("futures.py", "benchmark.py", "prospective_rehearsal.py")]
    report = {
        "schema": "psychohistory.prospective_rehearsal.v1",
        "status": "UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE",
        "target_year": target_year, "information_cutoff_year": cutoff,
        "unknown_bridge_year": target_year - 1, "prepared_at_local_utc": date.isoformat(),
        "source": {"dataset": "UCDP OrganizedViolenceCY", "version": source_protocol["dataset_version"],
                   "archive_sha256": source_sha256, "codebook_sha256": source_protocol["codebook_sha256"],
                   "as_of_availability_independently_verified": False},
        "model_protocol_sha256": digest(canonical(future_protocol)),
        "source_protocol_sha256": digest(canonical(source_protocol)),
        "code_sha256": digest(b"".join(p.read_bytes() for p in code_paths)),
        "eligible_countries": len(fitted["countries"]),
        "country_horizon_model_predictions": len(predictions),
        "horizons": list(horizons), "models": MODELS,
        "external_timestamp_receipt_verified": False,
        "eligible_for_prospective_scoring": False,
        "outcomes_included": False,
        "caveat": "Only a preparatory candidate. Requires independent as-of source evidence, cryptographic third-party timestamp, frozen evaluation protocol and later observed outcomes.",
        "predictions": predictions,
    }
    return report


def write_private(report, output_dir: Path):
    dest = output_dir.resolve()
    if dest.is_relative_to(REPO):
        raise ValueError("Never write real forecasts inside the public source repository")
    if dest.exists():
        raise FileExistsError("Refusing to overwrite a prior forecast candidate")
    dest.mkdir(mode=0o700, parents=True, exist_ok=False)
    body = canonical(report) + b"\n"
    path = dest / "forecast-candidate.json"
    with path.open("xb") as out:
        out.write(body)
    path.chmod(0o600)
    manifest = {
        "status": "UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE",
        "candidate_sha256": hashlib.sha256(body).hexdigest(),
        "schema": report["schema"],
        "target_year": report["target_year"],
        "source_sha256": report["source"]["archive_sha256"],
        "model_protocol_sha256": report["model_protocol_sha256"],
        "independent_timestamp_receipt": None,
        "vintage_verified": False,
        "prospective_eligible": False,
    }
    path = dest / "manifest.json"
    with path.open("xb") as out:
        out.write(canonical(manifest) + b"\n")
    path.chmod(0o600)
    return manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--target-year", type=int, required=True)
    parser.add_argument("--horizons", type=int, nargs="+", default=[1,3,5,10])
    args=parser.parse_args()
    source_protocol=json.loads((HERE/"protocol.json").read_text())
    future_protocol=json.loads((HERE/"futures_protocol.json").read_text())
    raw, provenance=load_official(args.data_dir, source_protocol)
    audit(raw, source_protocol, strict=True)
    report=make_rehearsal(raw,source_protocol,future_protocol,args.target_year,
                          provenance["archive_sha256"],dt.datetime.now(dt.timezone.utc),
                          horizons=tuple(args.horizons))
    written=write_private(report,args.output_dir)
    print(json.dumps({"prepared": True, "countries":report["eligible_countries"],
                      "models":len(report["models"]),"horizons":len(report["horizons"]),
                      "candidate_sha256": written["candidate_sha256"],
                      "independent_seal_verified":False,"prospective_eligible":False}))


if __name__=="__main__":
    main()
