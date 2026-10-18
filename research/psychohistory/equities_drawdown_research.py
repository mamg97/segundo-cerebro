"""PSICOHISTORIA / EQUITIES v0.1 — strict, read-only 20-session drawdown research.

Research target: at any of the NEXT 20 market closes, will an adjusted-close
proxy be 5% below the adjusted close at the forecast origin? This is not a
forecast of tomorrow's return, execution price, portfolio P/L or an order.

Sources MUST be time-dated and point-in-time defensible independently.
Historical adjusted prices alone cannot prove point-in-time data provenance.
Only generic code and SYNTHETIC tests belong in public GitHub.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import re
import statistics

from benchmark import estimate, fit_logit

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]

HORIZON = 20
DRAWDOWN = .05
LOOKBACK = 60
MIN_TRAIN = 252
TEST_STRIDE = 20
RIDGE = .1
ITERATIONS = 50
COLUMNS = ("date", "asset_id", "adjusted_close")
OUTPUT = ("origin_date", "asset_id", "target", "horizon_sessions",
          "model_status", "probability_5pct_drop_20_sessions",
          "baseline_event_frequency", "observed_outcome",
          "label_end_date", "training_last_known_label_date",
          "training_rows", "source_sha256")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SHA = re.compile(r"^[0-9a-f]{64}$")


def private_path(path, *, create=False):
    p = Path(path).absolute()
    if p.is_symlink() or p.resolve().is_relative_to(REPO) or p.parent.is_symlink() or not p.parent.is_dir():
        raise ValueError("Private input/output must be outside the public repository")
    if create:
        if p.exists():
            raise ValueError("Outputs must be create-only")
    elif not p.is_file() or p.stat().st_size > 20_000_000:
        raise ValueError("Existing regular CSV (up to 20MB) required")
    return p


def read_prices(path, expected_sha256, source_asof):
    """Require exact vendor-provided adjusted_close CSV, without gap filling.

    SHA pin confirms that file bytes match an expected file; it does NOT
    establish publication date, provider licensing or corporate-action vintage.
    """
    if not isinstance(expected_sha256, str) or not SHA.fullmatch(expected_sha256):
        raise ValueError("Explicit SHA256 pin is required")
    if not isinstance(source_asof, str) or not DATE.fullmatch(source_asof):
        raise ValueError("Source-asof must be a calendar date")
    try:
        cutoff = date.fromisoformat(source_asof)
    except ValueError as exc:
        raise ValueError("Invalid source-asof date") from exc
    p = private_path(path)
    content = p.read_bytes()
    if hashlib.sha256(content).hexdigest() != expected_sha256:
        raise ValueError("Source bytes differ from pinned SHA256")
    result, asset, prior = [], None, None
    with p.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != list(COLUMNS):
            raise ValueError("Require date,asset_id,adjusted_close in exactly that order")
        for row in reader:
            when = row["date"]
            if not isinstance(when, str) or not DATE.fullmatch(when):
                raise ValueError("Invalid trading-date format")
            try:
                day = date.fromisoformat(when)
                price = float(row["adjusted_close"])
            except (ValueError, TypeError) as exc:
                raise ValueError("Non-ISO date or invalid adjusted close") from exc
            symbol = row["asset_id"]
            if (not isinstance(symbol, str) or
                    not re.fullmatch(r"[A-Za-z0-9._-]{1,32}", symbol)):
                raise ValueError("Unsafe/missing asset identifier")
            if (asset is not None and symbol != asset) or (prior is not None and day <= prior):
                raise ValueError("Only one asset and strictly increasing unique trading dates")
            if day > cutoff or not math.isfinite(price) or price <= 0:
                raise ValueError("Future date beyond declared snapshot or non-positive/nonfinite price")
            asset, prior = symbol, day
            result.append((day, price))
    if len(result) < LOOKBACK + MIN_TRAIN + HORIZON + 1:
        raise ValueError("Insufficient sessions for horizon, lookback and meaningful training")
    return asset, result, expected_sha256


def features(prices, i):
    if not LOOKBACK <= i < len(prices):
        raise ValueError("Insufficient trailing history")
    values = [p for _, p in prices]
    p = values[i]
    log_rets = [math.log(values[j] / values[j - 1]) for j in range(i - 19, i + 1)]
    return [
        math.log(p / values[i - 5]),
        math.log(p / values[i - 20]),
        statistics.pstdev(log_rets) * math.sqrt(HORIZON),
        p / max(values[i - 59:i + 1]) - 1.0,
    ]


def label(prices, i):
    """Strictly historical only if prices[i+HORIZON] is already observable."""
    if i < 0 or i + HORIZON >= len(prices):
        raise ValueError("Outcome horizon is not resolved")
    anchor = prices[i][1]
    minimum = min(price for _, price in prices[i + 1:i + HORIZON + 1])
    return int(minimum <= anchor * (1 - DRAWDOWN))


def training_window(prices, origin):
    """Only fully resolved label intervals ending at/before the issue close."""
    if not LOOKBACK <= origin < len(prices):
        raise ValueError("Invalid origin")
    last_training_origin = origin - HORIZON
    eligible = list(range(LOOKBACK, last_training_origin + 1))
    if len(eligible) < MIN_TRAIN:
        raise ValueError("Not enough matured training events")
    assert all(j + HORIZON <= origin for j in eligible)
    return eligible


def predict_at(prices, origin):
    """All features + fitted parameters are derived solely from <= origin."""
    eligible = training_window(prices, origin)
    xx = [features(prices, i) for i in eligible]
    yy = [label(prices, i) for i in eligible]
    xnow = features(prices, origin)
    n = len(yy)
    baseline = (sum(yy) + 1) / (n + 2)
    result = {
        "status": "BASELINE_ONLY_INSUFFICIENT_CLASSES",
        "probability": None,
        "baseline": baseline,
        "n": n,
        "last_resolved": prices[eligible[-1] + HORIZON][0].isoformat(),
    }
    # Failure of the fitting algorithm must NOT silently be called a success.
    # One-class training is explicitly baseline-only; do not force coefficients.
    if not 0 < sum(yy) < n:
        return result
    means = [statistics.fmean(row[k] for row in xx) for k in range(4)]
    scales = [max(1e-9, statistics.pstdev(row[k] for row in xx)) for k in range(4)]
    transformed = [[(v - means[k]) / scales[k] for k, v in enumerate(row)] for row in xx]
    current = [(v - means[k]) / scales[k] for k, v in enumerate(xnow)]
    fitted = fit_logit(transformed, yy, iterations=ITERATIONS, ridge=RIDGE)
    result["probability"] = estimate(fitted, current)
    result["status"] = "EXPLORATORY_PROBABILITY_NOT_CALIBRATED"
    return result


def evaluate(prices, asset, source_sha256):
    """Walk-forward on disjoint 20-session outcome windows; no issued signals.

    Test origins are 20 sessions apart; training origin j requires
    j + HORIZON <= test origin. No random split, leakage or fee-free P/L.
    """
    if len(prices) < LOOKBACK + MIN_TRAIN + HORIZON * 2 + 1:
        raise ValueError("Not enough data for at least one completed walk-forward test")
    start = LOOKBACK + MIN_TRAIN + HORIZON
    completed = []
    for i in range(start, len(prices) - HORIZON, TEST_STRIDE):
        guess = predict_at(prices, i)
        truth = label(prices, i)
        completed.append({
            "origin_date": prices[i][0].isoformat(),
            "asset_id": asset,
            "target": "ANY_ADJUSTED_CLOSE_DROP_5PCT_WITHIN_20_SESSIONS",
            "horizon_sessions": HORIZON,
            "model_status": guess["status"],
            "probability_5pct_drop_20_sessions": guess["probability"],
            "baseline_event_frequency": guess["baseline"],
            "observed_outcome": truth,
            "label_end_date": prices[i + HORIZON][0].isoformat(),
            "training_last_known_label_date": guess["last_resolved"],
            "training_rows": guess["n"],
            "source_sha256": source_sha256,
        })
    eligible = [r for r in completed if r["probability_5pct_drop_20_sessions"] is not None]
    def brier(rows, key):
        return sum((r[key] - r["observed_outcome"]) ** 2 for r in rows) / len(rows) if rows else None
    base = brier(eligible, "baseline_event_frequency")
    model = brier(eligible, "probability_5pct_drop_20_sessions")
    skill = (1 - model / base) if base is not None and base > 0 else None
    return completed, {
        "schema": "psychohistory.equities_20session_drawdown_research.v1",
        "asset_count": 1,
        "walk_forward_test_origins": len(completed),
        "fully_resolved_test_rows": len(eligible),
        "horizon_sessions": HORIZON,
        "target_drawdown_fraction": DRAWDOWN,
        "test_stride_sessions": TEST_STRIDE,
        "brier_baseline_on_model_eligible_cases": base,
        "brier_logistic_on_eligible_cases": model,
        "brier_skill_vs_baseline": skill,
        "one_class_fallback_cases": len(completed) - len(eligible),
        "historical_vendor_asof_independently_verified": False,
        "trading_costs_or_realized_pnl_modeled": False,
        "cross_asset_generalization_verified": False,
        "calibration_verified": False,
        "model_selected_after_tests": False,
        "forecast_issued": False,
        "live_trading_authorized": False,
        "assessment": "HYPOTHETICAL_RESEARCH_ONLY",
    }



def latest_shadow(prices, asset, source_sha256):
    """Most-recent exploratory probability, outcome always UNKNOWN.

    Never backdate this as a forecast issued on the most recent bar: the
    source's actual download time, vendor vintage and exchange close time
    are not independently attested by this code.
    """
    origin = len(prices) - 1
    guess = predict_at(prices, origin)
    return {
        "schema": "psychohistory.equities_20session_shadow_latest.v1",
        "asset_id": asset,
        "origin_close_date": prices[origin][0].isoformat(),
        "horizon_sessions": HORIZON,
        "target": "ANY_ADJUSTED_CLOSE_DROP_5PCT_WITHIN_20_SESSIONS",
        "status": "SHADOW_NOT_ISSUED",
        "model_status": guess["status"],
        "probability": guess["probability"],
        "baseline_probability": guess["baseline"],
        "train_n": guess["n"],
        "last_resolved_training_label_date": guess["last_resolved"],
        "outcome": None,
        "input_sha256": source_sha256,
        "independent_input_vintage_verified": False,
        "forecast_issue_timestamp_verified": False,
        "trade_signal_validated": False,
        "realized_pnl": None,
    }


def write_private_json(payload, path):
    p = private_path(path, create=True)
    with p.open("x", encoding="utf-8") as f:
        json.dump(payload, f, sort_keys=True, allow_nan=False, indent=2)
        f.write("\n")
    p.chmod(0o600)


def write_private_csv(rows, path):
    p = private_path(path, create=True)
    with p.open("x", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT)
        writer.writeheader()
        writer.writerows(rows)
    p.chmod(0o600)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input-csv", type=Path, required=True)
    ap.add_argument("--source-sha256", required=True)
    ap.add_argument("--source-asof", required=True, help="Vendor snapshot date, not independently verified")
    ap.add_argument("--output-csv", type=Path, required=True)
    ap.add_argument("--latest-shadow-json", type=Path,
                    help="Optional private research snapshot, NEVER an issued forecast")
    args = ap.parse_args()
    asset, prices, digest = read_prices(args.input_csv, args.source_sha256, args.source_asof)
    rows, report = evaluate(prices, asset, digest)
    write_private_csv(rows, args.output_csv)
    if args.latest_shadow_json is not None:
        write_private_json(latest_shadow(prices, asset, digest), args.latest_shadow_json)
    # Do not log real prices, securities, paths, or provenance hashes.
    print(json.dumps(report, sort_keys=True, allow_nan=False))


if __name__ == "__main__":
    main()
