"""Psychohistory v0.1: transparent experimental engines (Python stdlib only).

Retrospective backtests must NEVER be marketed as prospective forecasts.
No external data, payments, credentials or user records are included here.
"""
from __future__ import annotations
import argparse
import csv
import datetime as dt
import json
import math
import random
import statistics
from pathlib import Path


def date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def load_panel(path: Path, features: list[str]) -> list[dict]:
    required = {"country", "issued_at", "resolved_at", "feature_as_of", "target", *features}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError("Missing columns: " + ", ".join(sorted(required - set(reader.fieldnames or []))))
        rows, seen = [], set()
        for raw in reader:
            issued, resolved, available = (date(raw[field]) for field in
                                          ("issued_at", "resolved_at", "feature_as_of"))
            if not available <= issued < resolved:
                raise ValueError("Temporal leakage or invalid forecasting horizon")
            key = (raw["country"], issued)
            if key in seen:
                raise ValueError("Repeated unit and issue date; define the horizon uniquely")
            seen.add(key)
            if raw["target"] not in ("0", "1"):
                raise ValueError("Target must be binary and observed")
            values = [float(raw[f]) for f in features]
            if any(not math.isfinite(v) for v in values):
                raise ValueError("Nonfinite feature")
            rows.append({"country": raw["country"], "issued_at": issued,
                         "resolved_at": resolved, "feature_as_of": available,
                         "target": int(raw["target"]), "x": values})
    return sorted(rows, key=lambda r: (r["issued_at"], r["country"]))


def standardizer(rows: list[dict]):
    dims = len(rows[0]["x"])
    means = [statistics.fmean(r["x"][i] for r in rows) for i in range(dims)]
    stdevs = [max(1e-9, statistics.pstdev(r["x"][i] for r in rows)) for i in range(dims)]
    return means, stdevs


def scaled(row, means, stdevs):
    return [(v - mu) / sigma for v, mu, sigma in zip(row["x"], means, stdevs)]


def sigmoid(z):
    z = min(35, max(-35, z))
    return 1 / (1 + math.exp(-z))


def train_logit(x: list[list[float]], y: list[int], iterations=250, rate=0.05, ridge=0.025):
    dims = len(x[0])
    weights = [0.0] * (dims + 1)
    n = len(y)
    for _ in range(iterations):
        grad = [0.0] * (dims + 1)
        for xi, yi in zip(x, y):
            error = sigmoid(weights[0] + sum(a*b for a,b in zip(weights[1:],xi))) - yi
            grad[0] += error
            for j,value in enumerate(xi):
                grad[j+1] += error*value
        weights[0] -= rate * grad[0]/n
        for j in range(1, len(weights)):
            weights[j] -= rate * (grad[j]/n + ridge*weights[j])
    return weights


def estimate(weights, x):
    return sigmoid(weights[0] + sum(a*b for a,b in zip(weights[1:], x)))


def brier(rows: list[dict], key: str) -> float | None:
    return statistics.fmean((r[key] - r["target"])**2 for r in rows) if rows else None


def scored(rows: list[dict], key: str, baseline: str = "baseline") -> dict:
    score, base = brier(rows, key), brier(rows, baseline)
    return {"n": len(rows), "brier": score, "baseline_brier": base,
            "brier_skill": 1-score/base if base is not None and base > 0 else None}


def rolling_backtest(rows: list[dict], start: dt.date, weights: list[float] | None = None, minimum=20):
    """At each issuance, train only on labels resolved strictly before that issuance."""
    if not rows:
        raise ValueError("Empty panel")
    dims = len(rows[0]["x"])
    if weights is None:
        weights = [1/dims]*dims
    if len(weights) != dims or not all(math.isfinite(v) for v in weights):
        raise ValueError("Invalid V1 theory coefficients")
    report=[]
    # Pool rows by issue date; train each test date from the same info set.
    for issue in sorted({r["issued_at"] for r in rows if r["issued_at"] >= start}):
        train=[r for r in rows if r["issued_at"] < issue and r["resolved_at"] < issue]
        group=[r for r in rows if r["issued_at"] == issue]
        if len(train) < minimum:
            continue
        means, stdevs = standardizer(train)
        x=[scaled(r,means,stdevs) for r in train]
        y=[r["target"] for r in train]
        # V1: a preregistered, interpretable weighted structural index.
        ix=[sum(w*v for w,v in zip(weights,xi)) for xi in x]
        theory=train_logit([[v] for v in ix], y)
        # V2: ML baseline comparator (regularized logistic regression).
        logistic=train_logit(x, y)
        # Shared rolling baseline, fitted only to resolved historical outcomes.
        base=(sum(y)+1)/(len(y)+2)
        for row in group:
            features=scaled(row,means,stdevs)
            index=sum(w*v for w,v in zip(weights,features))
            report.append({"country":row["country"],"issued_at":row["issued_at"].isoformat(),
                           "resolved_at":row["resolved_at"].isoformat(),"target":row["target"],
                           "baseline":base,"v1_structural":estimate(theory,[index]),
                           "v2_logistic":estimate(logistic,features),
                           "training_n":len(train)})
    return report


def agent_simulation(n=180, steps=30, seed=11, initial_share=0.12, threshold=0.25):
    """V3: illustrative threshold contagion, not a causal or validated social model."""
    if n < 8 or steps < 1 or not 0 <= initial_share <= 1 or not 0 <= threshold <= 1:
        raise ValueError("Invalid agent parameters")
    rng = random.Random(seed)
    adjacency=[]
    for i in range(n):
        peers={(i-2)%n,(i-1)%n,(i+1)%n,(i+2)%n}
        peers.add(rng.randrange(n))
        peers.discard(i)
        adjacency.append(peers)
    active={i for i in range(n) if rng.random() < initial_share}
    trace=[len(active)/n]
    for _ in range(steps):
        nxt=set(active)
        for i in range(n):
            if i not in active and len(active.intersection(adjacency[i]))/len(adjacency[i]) >= threshold:
                nxt.add(i)
        active=nxt
        trace.append(len(active)/n)
    return {"seed":seed,"n":n,"steps":steps,"threshold":threshold,
            "initial_share_observed":trace[0],"final_share":trace[-1],"trace":trace,
            "evidence_type":"synthetic_simulation_only"}


def synthetic_fixture():
    """Deterministic synthetic test data; NEVER a source of scientific evidence."""
    rng=random.Random(31)
    rows=[]
    for year in range(2019,2027):
        for month in range(1,13):
            issued=dt.date(year,month,1)
            resolved=issued+dt.timedelta(days=180)
            for region in range(5):
                a=rng.random()*2-1
                b=rng.random()*2-1
                prob=sigmoid(-0.6+1.2*a+0.9*b)
                rows.append({"country":"SYNTHETIC_"+str(region),
                             "issued_at":issued,"resolved_at":resolved,
                             "feature_as_of":issued,"target":int(rng.random()<prob),
                             "x":[a,b]})
    return rows


def run(rows, test_from, weights):
    predictions=rolling_backtest(rows,test_from,weights)
    return {"run_type":"retrospective_backtest","n_predictions":len(predictions),
            "v1":scored(predictions,"v1_structural"),
            "v2":scored(predictions,"v2_logistic"),
            "baseline":brier(predictions,"baseline"),
            "v3_simulation":agent_simulation(),
            "sample_prediction_rows":predictions[:3]}


def main():
    ap=argparse.ArgumentParser(description="Scientific plumbing prototype; not a validated forecasting system")
    ap.add_argument("--csv",type=Path)
    ap.add_argument("--features",default="strain,polarization")
    ap.add_argument("--test-from",default="2025-01-01")
    ap.add_argument("--synthetic-demo",action="store_true")
    ap.add_argument("--output",type=Path)
    args=ap.parse_args()
    if bool(args.csv) == bool(args.synthetic_demo):
        ap.error("Specify exactly one of --csv or --synthetic-demo")
    names=[v.strip() for v in args.features.split(",") if v.strip()]
    if not names:
        ap.error("At least one feature required")
    if args.synthetic_demo and len(names)!=2:
        ap.error("Synthetic demo uses exactly two features")
    rows=synthetic_fixture() if args.synthetic_demo else load_panel(args.csv,names)
    result=run(rows,date(args.test_from),[1/len(names)]*len(names))
    result["data_kind"]="SYNTHETIC - INVALID FOR SCIENTIFIC CLAIMS" if args.synthetic_demo else "USER-SUPPLIED HISTORICAL PANEL - AUDIT REQUIRED"
    result["warning"]="Backtest is not a prospective forecast; do not send its scores to the prospectively resolved prediction registry."
    data=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:
        args.output.write_text(data+"\n",encoding="utf-8")
    else:
        print(data)


if __name__ == "__main__":
    main()
