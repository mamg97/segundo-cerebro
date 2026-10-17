"""UCDP 25.1 country-level *conflict onset* baseline, separate from fatality thresholds.

This is retrospective exploratory analysis: the source release was published in
2025 and cannot substantiate a prediction issued in 2016/2020. Source bytes
are supplied privately, SHA-256-pinned by the operator, never fetched or
checked into the public repository. No unsupported geopolitical narratives.
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import io
import json
import math
import re
from pathlib import Path

SOURCE_EDITION = "25.1"
SOURCE_URLS = {
    "intrastate_country": "https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv",
    "interstate_country": "https://ucdp.uu.se/downloads/onset/ucdp-interstate-country-onset-251.csv",
}
ONSET_COLUMNS = ("onset1", "onset2", "onset3", "onset5", "onset10", "onset20")
MIN_HISTORY = 5
INFORMATION_LAG = 2
COUNTRY_PRIOR_WEIGHT = 20
VALIDATION = (2010, 2015)
TEST = (2016, 2024)
REPOSITORY = Path(__file__).resolve().parents[2]


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def load_onsets(content: bytes, *, kind: str, expected_sha256: str):
    """Strict country-year country-level onset CSV. Missing countries are NOT zeros."""
    if kind not in SOURCE_URLS:
        raise ValueError("Unsupported country-level onset type")
    if not re.fullmatch(r"[a-f0-9]{64}", expected_sha256):
        raise ValueError("A pre-pinned SHA256 of the exact source CSV is required")
    actual = hashlib.sha256(content).hexdigest()
    if actual != expected_sha256:
        raise ValueError("Source checksum mismatch")
    if len(content) > 35_000_000:
        raise ValueError("Source file unexpectedly large")
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    required = {"name", "year", "gwno_a", *ONSET_COLUMNS}
    if reader.fieldnames is None or not required.issubset(reader.fieldnames):
        raise ValueError("Incorrect UCDP country-onset schema")
    if "conflict_id" in reader.fieldnames:
        raise ValueError("Conflict-level file cannot be treated as country-year")
    lookup = {}
    for raw in reader:
        try:
            cid = int(raw["gwno_a"])
            year = int(raw["year"])
            name = raw["name"].strip()
            labels = {}
            for key in ONSET_COLUMNS:
                text = (raw.get(key) or "").strip()
                if text not in ("0", "1"):
                    raise ValueError(f"Invalid or missing onset outcome: {key}")
                labels[key] = int(text)
        except (TypeError, AttributeError, ValueError) as exc:
            raise ValueError("Invalid country-year data or onset labels") from exc
        if cid < 1 or not (1946 <= year <= 2024) or not name:
            raise ValueError("Impossible country-year entry")
        key = (cid, year)
        if key in lookup:
            raise ValueError("Duplicate country-year; probable conflict-level source")
        lookup[key] = {"country_id": cid, "name": name, "year": year, **labels}
    if not lookup:
        raise ValueError("Empty official onset input")
    # Do not fill absent country-year combinations: Gleditsch-Ward membership evolves.
    years = sorted({year for _, year in lookup})
    return {"kind": kind, "edition": SOURCE_EDITION, "sha256": actual,
            "source_url": SOURCE_URLS[kind], "min_year": years[0], "max_year": years[-1],
            "n_rows": len(lookup), "n_countries": len({c for c, _ in lookup}),
            "lookup": lookup, "vintage_verified": False}


def smoothed_rate(outcomes, *, positives_prior=1.0, negatives_prior=1.0):
    if positives_prior <= 0 or negatives_prior <= 0:
        raise ValueError("Beta pseudo-counts must be strictly positive")
    values = list(outcomes)
    if any(value not in (0, 1) or isinstance(value, bool) for value in values):
        raise ValueError("Binary 0/1 outcomes only")
    return (sum(values) + positives_prior) / (len(values) + positives_prior + negatives_prior)


def forecast_origin(source, *, year: int, label: str = "onset1"):
    """Issue at Jan 1 of year; only observations at or before year-2 enter."""
    if label not in ONSET_COLUMNS:
        raise ValueError("Unknown, non-registered onset definition")
    if not isinstance(year, int) or isinstance(year, bool) or not 1948 <= year <= 2024:
        raise ValueError("Invalid retrospective target year")
    lookup = source["lookup"]
    cutoff = year - INFORMATION_LAG
    population = [v[label] for (cid, y), v in lookup.items() if y <= cutoff]
    if len(population) < 2:
        raise ValueError("Not enough historical observations before issue")
    pooled = smoothed_rate(population)
    predicted, excluded = [], collections.Counter()
    target_rows = sorted(((cid, v) for (cid,y),v in lookup.items() if y == year), key=lambda x:x[0])
    for cid, target in target_rows:
        past = [lookup.get((cid, t)) for t in range(cutoff-MIN_HISTORY+1, cutoff+1)]
        if any(row is None for row in past):
            excluded["insufficient_consecutive_history"] += 1
            continue
        last = [row[label] for row in past]
        country_p = (sum(last)+ COUNTRY_PRIOR_WEIGHT * pooled) / (len(last) + COUNTRY_PRIOR_WEIGHT)
        predicted.append({
            "country_id":cid, "name":target["name"], "origin_year":year,
            "cutoff_year":cutoff, "event":label, "outcome":target[label],
            "probabilities":{"global_frequency":pooled, "country_shrinkage":country_p},
        })
    return {"year":year, "cutoff":cutoff, "kind":source["kind"], "target":label,
            "n_total_country_years":len(target_rows), "n_evaluated":len(predicted),
            "excluded":dict(excluded), "cases":predicted}


def evaluate_cases(rows, model):
    if model not in ("global_frequency", "country_shrinkage"):
        raise ValueError("Unregistered model")
    if not rows:
        return None
    loss, log_loss = [], []
    for row in rows:
        y=row["outcome"]
        p=row["probabilities"][model]
        if y not in (0,1) or not math.isfinite(p) or not 0 < p < 1:
            raise ValueError("Invalid probability or observed label")
        loss.append((p-y)**2)
        log_loss.append(-(y*math.log(p)+(1-y)*math.log1p(-p)))
    return {
        "n":len(rows),
        "events":sum(r["outcome"] for r in rows),
        "base_rate":sum(r["outcome"] for r in rows)/len(rows),
        "mean_probability":sum(r["probabilities"][model] for r in rows)/len(rows),
        "brier":math.fsum(loss)/len(loss),
        "log_loss":math.fsum(log_loss)/len(log_loss),
    }


def average_precision_ties(rows, model):
    """Tie-aware AP for rare binary events. Undefined when no positives exist.

    Grouping exact equal probability scores avoids rank/order artefacts from
    arbitrarily sorting countries that all receive the global baseline rate.
    """
    if not rows:
        return None
    positive = sum(r["outcome"] for r in rows)
    if not positive:
        return None
    groups = collections.defaultdict(lambda: [0, 0])
    for row in rows:
        p = row["probabilities"][model]
        if not math.isfinite(p) or not 0 < p < 1 or row["outcome"] not in (0, 1):
            raise ValueError("Invalid scores or target values")
        groups[p][0] += 1
        groups[p][1] += row["outcome"]
    seen = hits = 0
    area = 0.0
    for score in sorted(groups, reverse=True):
        count, events = groups[score]
        seen += count
        hits += events
        area += events / positive * hits / seen
    return area


def top_decile_coverage(rows, model):
    """Risk concentration at the highest 10%, fractionally allocating ties.

    This *diagnostic* never thresholds/calibrates a model and should not be
    confused with causal prediction or a prospective warning system.
    """
    if not rows:
        return None
    positive = sum(r["outcome"] for r in rows)
    if not positive:
        return {"n":len(rows),"events":0,"recall":None,"risk_lift":None,"selected_expected":len(rows)/10}
    selected = len(rows)/10
    groups = collections.defaultdict(lambda: [0, 0])
    for row in rows:
        groups[row["probabilities"][model]][0] += 1
        groups[row["probabilities"][model]][1] += row["outcome"]
    expected_events = 0.0
    remaining = selected
    for score in sorted(groups, reverse=True):
        if remaining <= 0:
            break
        count, events = groups[score]
        fraction = min(1.0, remaining/count)
        expected_events += fraction * events
        remaining -= fraction*count
    share = expected_events/positive
    return {"n":len(rows),"events":positive,"recall":share,
            "risk_lift": (expected_events/selected)/(positive/len(rows)),
            "selected_expected": selected, "tie_handling":"fractional_expected"}


def calibration_five_bins(rows, model):
    """Equal-width reliability; denominators reported, no invented coverage."""
    buckets = [[0,0,0.0] for _ in range(5)]
    for row in rows:
        p = row["probabilities"][model]
        if not math.isfinite(p) or p < 0 or p > 1 or row["outcome"] not in (0,1):
            raise ValueError("Invalid calibration observation")
        group = min(4,int(p*5))
        buckets[group][0] += 1
        buckets[group][1] += row["outcome"]
        buckets[group][2] += p
    return [{"from":k/5,"to":(k+1)/5,
             "count":n,"observed_events":events,
             "mean_predicted":prob_sum/n if n else None,
             "actual_frequency":events/n if n else None}
            for k,(n,events,prob_sum) in enumerate(buckets)]


def diagnostic_summary(rows):
    """Common-cohort scores, ranking checks and annual rare-event diagnostics.

    Baselines stay fixed in advance. Ties and zero-event years remain explicit.
    """
    if not rows:
        return None
    comparator = ("global_frequency","country_shrinkage")
    loss = {m:evaluate_cases(rows,m) for m in comparator}
    base = loss["global_frequency"]["brier"]
    by_year = collections.defaultdict(list)
    for row in rows:
        by_year[row["origin_year"]].append(row)
    return {
      "n":len(rows),"events":sum(r["outcome"] for r in rows),
      "positive_base_rate": sum(r["outcome"] for r in rows)/len(rows),
      "comparison":"country_shrinkage_vs_predeclared_global_frequency_same_cohort",
      "country_shrinkage_brier_skill":(1-loss["country_shrinkage"]["brier"]/base) if base>0 else None,
      "models":{model:{
         "average_precision":average_precision_ties(rows,model),
         "top_10_percent":top_decile_coverage(rows,model),
         "calibration_bins":calibration_five_bins(rows,model),
         "yearly":[{"year":year,"n":len(group),
                    "events":sum(r["outcome"] for r in group),
                    "brier":evaluate_cases(group,model)["brier"],
                    "average_precision":average_precision_ties(group,model)}
              for year,group in sorted(by_year.items())],
      } for model in comparator},
      "caveat":"Retrospective revised 25.1; global AP pools country-years and cannot establish prospective skill. Zero-event years have undefined AP."
    }


def retrospective_report(source, *, label="onset1"):
    """Common denominators; no tuning, test-selected champion or as-of claim."""
    out={"schema":"psychohistory.conflict_onset_backtest.v1",
         "source":{"url":source["source_url"], "edition":source["edition"],
                   "csv_sha256":source["sha256"], "unit":"country-year",
                   "kind":source["kind"]},
         "target":label, "lag_years":INFORMATION_LAG,
         "comparators":["global_frequency","country_shrinkage"],
         "run_type":"retrospective_revised_release",
         "vintage_verified":False,"prospective_eligible":False,
         "evaluation":"annual country-level onset; not an invasion, coup, or incident forecast",
         "partitions":{}}
    for name,(start,end) in (("validation",VALIDATION),("test",TEST)):
        records=[forecast_origin(source,year=year,label=label) for year in range(start,end+1)]
        cases=[case for run in records for case in run["cases"]]
        global_m=evaluate_cases(cases,"global_frequency")
        country_m=evaluate_cases(cases,"country_shrinkage")
        out["partitions"][name]={
            "year_range":[start,end], "n_country_years":sum(r["n_total_country_years"] for r in records),
            "n_scored":len(cases),"n_excluded":sum(r["n_total_country_years"]-r["n_evaluated"] for r in records),
            "n_event":sum(r["outcome"] for r in cases),
            "cohort_sha256":hashlib.sha256(canonical([[c["country_id"],c["origin_year"]] for c in cases])).hexdigest(),
            "models":{"global_frequency":global_m,"country_shrinkage":country_m},
            "rare_event_diagnostics":diagnostic_summary(cases),
            "cases":cases,
        }
    return out


def save_private(report, output_path):
    if output_path.resolve().is_relative_to(REPOSITORY):
        raise ValueError("No operational scores in public Git")
    output_path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    with output_path.open("xb") as out:
        out.write(canonical(report)+b"\n")
    output_path.chmod(0o600)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--csv",type=Path,required=True)
    p.add_argument("--kind",choices=sorted(SOURCE_URLS),required=True)
    p.add_argument("--expected-sha256",required=True)
    p.add_argument("--target",choices=ONSET_COLUMNS,default="onset1")
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    source=load_onsets(args.csv.read_bytes(),kind=args.kind,expected_sha256=args.expected_sha256)
    if source["max_year"]<TEST[1] or source["min_year"]>VALIDATION[0]-INFORMATION_LAG-MIN_HISTORY+1:
        raise ValueError("Source not sufficient for declared retrospective test horizon")
    report=retrospective_report(source,label=args.target)
    save_private(report,args.output)
    print(json.dumps({"status":"PRIVATE_RETROSPECTIVE_REPORT_CREATED","target":args.target,
                      "n_test":report["partitions"]["test"]["n_scored"],
                      "n_event":report["partitions"]["test"]["n_event"],
                      "vintage_verified":False,"prospective_eligible":False}))


if __name__=="__main__":
    main()
