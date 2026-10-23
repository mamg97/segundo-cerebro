"""Frozen exploratory UNRATE experiment; private outputs, no live emissions."""

import argparse
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
import math
from pathlib import Path
import statistics
from zoneinfo import ZoneInfo

import alfred_asof_audit
import alfred_initial_release_audit
from benchmark import fit_logit, sigmoid

HERE = Path(__file__).resolve().parent


def shift_month(month, distance):
    d = date.fromisoformat(month)
    year, zero_month = divmod(d.year * 12 + d.month - 1 + distance, 12)
    return date(year, zero_month + 1, 1).isoformat()


def make_case(report, initials, origin, protocol):
    issue = date.fromisoformat(origin)
    cut = issue.replace(day=protocol["vintage_day"]).isoformat()
    if cut >= origin:
        raise ValueError("vintage must precede issue day")
    values = {r["reference_month"]: r for r in alfred_asof_audit.select(report, cut)}
    row = {"origin": origin, "issue_timestamp": datetime(issue.year, issue.month, issue.day,
           tzinfo=ZoneInfo(protocol["issue_timezone"])).isoformat(), "vintage_date": cut}
    available = [m for m, r in values.items() if r["status"] == "AVAILABLE"]
    if not available:
        return {**row, "status": "NO_BASE"}
    base_month = max(available)
    base = Decimal(values[base_month]["rate_percent"])
    row.update(base_month=base_month, base_rate=str(base), target_month=shift_month(base_month, protocol["horizon_months_from_base"]))
    changes = []
    for lag in (1, 3, 6):
        old = values.get(shift_month(base_month, -lag))
        if old is None or old["status"] != "AVAILABLE":
            return {**row, "status": "MISSING_FEATURE", "missing_lag": lag}
        changes.append(float(base - Decimal(old["rate_percent"])))
    row["x"] = [float(base)] + changes
    target = initials.get(row["target_month"])
    if target is not None and target["alfred_realtime_start_date"] <= cut:
        return {**row, "status": "TARGET_ALREADY_KNOWN"}
    row["status"] = "ELIGIBLE"
    if target is None:
        row["label_status"] = "OUTSIDE_ARCHIVE"
    elif target["rate_percent"] is None:
        row["label_status"] = "MISSING"
    else:
        row.update(label_status="AVAILABLE", label_available_on=target["alfred_realtime_start_date"],
                   y=int(Decimal(target["rate_percent"]) - base >= Decimal(protocol["event_threshold_pp"])))
    return row


def training_at(cases, case):
    return [r for r in cases if r["status"] == "ELIGIBLE" and r["origin"] < case["origin"]
            and r["label_status"] == "AVAILABLE" and r["label_available_on"] <= case["vintage_date"]]


def probabilities(train, x, protocol):
    y = [row["y"] for row in train]
    baseline = (sum(y) + 1) / (len(y) + 2)
    if len(set(y)) == 1:
        return baseline, baseline, "SINGLE_CLASS_BASELINE"
    means = [statistics.fmean(row["x"][i] for row in train) for i in range(4)]
    scales = [max(1e-9, statistics.pstdev(row["x"][i] for row in train)) for i in range(4)]
    normalized = [[(value - mean) / scale for value, mean, scale in zip(row["x"], means, scales)] for row in train]
    weights = fit_logit(normalized, y, iterations=protocol["max_fit_iterations"], ridge=protocol["ridge_mean_loss"])
    vector = [1.0] + [(value - mean) / scale for value, mean, scale in zip(x, means, scales)]
    probability = sigmoid(sum(a * b for a, b in zip(weights, vector)))
    if not math.isfinite(probability) or not 0 <= probability <= 1:
        raise ValueError("invalid probability")
    return probability, baseline, "LOGISTIC_FITTED"


def metrics(scored):
    if not scored:
        return {"n": 0, "events": 0, "brier_model": None, "brier_baseline": None, "brier_skill": None}
    model = statistics.fmean((r["probability"] - r["y"]) ** 2 for r in scored)
    baseline = statistics.fmean((r["baseline_probability"] - r["y"]) ** 2 for r in scored)
    return {"n": len(scored), "events": sum(r["y"] for r in scored), "brier_model": model,
            "brier_baseline": baseline, "brier_skill": 1 - model / baseline if baseline > 0 else None,
            "mean_probability": statistics.fmean(r["probability"] for r in scored),
            "mean_baseline_probability": statistics.fmean(r["baseline_probability"] for r in scored)}


def run_cases(cases, protocol):
    outputs = []
    for case in cases:
        if case["origin"] < protocol["test_origin_start"]:
            continue
        result = {**case}
        if case["status"] != "ELIGIBLE":
            outputs.append(result)
            continue
        train = training_at(cases, case)
        result["training_n"] = len(train)
        if len(train) < protocol["minimum_training_cases"]:
            result["status"] = "INSUFFICIENT_TRAINING"
        else:
            # Test outcomes never enter fitting, scaling or baseline selection.
            p, b, method = probabilities(train, case["x"], protocol)
            result.update(probability=p, baseline_probability=b, fit_method=method,
                          training_origins=[r["origin"] for r in train],
                          latest_training_label_date=max(r["label_available_on"] for r in train))
        outputs.append(result)
    scored = [r for r in outputs if "probability" in r and r["label_status"] == "AVAILABLE"]
    return {"schema": "macro-retrospective-v1", "run_type": "retrospective_exploratory",
            "forecast_issued": False, "confirmatory": False, "predictive_skill_demonstrated": False,
            "metrics": metrics(scored),
            "annual": {y: metrics([r for r in scored if r["origin"][:4] == y]) for y in sorted({r["origin"][:4] for r in scored})},
            "test_cases": outputs, "all_origin_count": len(cases)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--protocol-sha256", required=True)
    parser.add_argument("--realtime", type=Path, required=True)
    parser.add_argument("--initial", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    raw = args.protocol.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.protocol_sha256 or raw != (HERE / "macro_protocol_v1.json").read_bytes():
        raise ValueError("protocol must match the frozen version and hash")
    protocol = json.loads(raw)
    periods = alfred_asof_audit.audit(args.realtime.read_bytes(), protocol["realtime_sha256"], protocol["source_start"], protocol["source_end"])
    initial = alfred_initial_release_audit.audit(args.initial.read_bytes(), protocol["initial_sha256"], protocol["source_start"], protocol["source_end"])
    initials = {r["reference_month"]: r for r in initial["observations"]}
    cases = []
    for year in range(protocol["origin_year_start"], protocol["origin_year_end"] + 1):
        for month in protocol["origin_months"]:
            origin = date(year, month, protocol["issue_day"]).isoformat()
            if origin <= protocol["last_origin"]:
                cases.append(make_case(periods, initials, origin, protocol))
    report = run_cases(cases, protocol)
    report["cases"] = cases
    report["protocol_sha256"] = args.protocol_sha256
    report["source_sha256"] = {"realtime": protocol["realtime_sha256"], "initial": protocol["initial_sha256"]}
    report["code_sha256"] = {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in
                             ["macro_retrospective.py", "alfred_asof_audit.py", "alfred_initial_release_audit.py", "benchmark.py", "engines.py"]}
    with args.output.open("x") as handle:
        json.dump(report, handle, indent=2, allow_nan=False)
        handle.write("\n")
    print(json.dumps({"metrics": report["metrics"], "all_origin_count": len(cases), "test_origin_count": len(report["test_cases"]), "forecast_issued": False}))


if __name__ == "__main__":
    main()
