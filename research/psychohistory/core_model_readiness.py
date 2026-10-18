"""PSICOHISTORIA scientific readiness gate on a frozen, revised-release benchmark.

Intended to expose weak 'new onset' performance even if presence forecasting
looks strong. Never alters forecasts, trains a new model, certifies vintage
availability, issues a prediction, or declares a trading signal.

A retrospective gate passed after inspecting existing reports is only a
RESEARCH CANDIDATE: thresholds cannot confer confirmatory status retroactively.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent

def _num(x, *, allow_none=False):
    if x is None and allow_none:
        return None
    if type(x) not in (int, float) or not math.isfinite(x):
        raise ValueError("Missing or nonfinite benchmark statistic")
    return float(x)


def _metric(metrics, name, task):
    try:
        m = metrics[name]
        n = m["n"]
        events = m["events"]
        brier = _num(m["brier"])
        if (type(n) is not int or type(events) is not int or
                not 0 <= events <= n or n < 1 or not 0 <= brier <= 1):
            raise ValueError("Inconsistent benchmark n/events/Brier")
        return m
    except (KeyError, TypeError) as exc:
        raise ValueError(f"Incomplete {task} model metrics") from exc


def _check_retrospective(report):
    if (not isinstance(report, dict) or
            report.get("run_type") != "retrospective_revised_release" or
            report.get("prospective_eligible") is not False or
            report.get("as_of_verified") is not False or
            report.get("tasks") is None):
        raise ValueError("Only unissued, retrospective revised-release reports accepted")


def grade(report, policy):
    """Compute conservative research flags on exact paired test folds.

    This is a *screen* (not a hypothesis test) because the current benchmark
    model and thresholds were examined after seeing historical results.
    """
    _check_retrospective(report)
    if not isinstance(policy, dict) or policy.get("schema") != "psychohistory.core_model_readiness.v1":
        raise ValueError("Unknown scientific acceptance policy")
    models = policy.get("models")
    if (not isinstance(models, list) or len(models) != 2 or
            set(models) != {"v2_logistic", "frequency"} or
            type(policy.get("minimum_positive_events")) is not int or
            policy["minimum_positive_events"] < 1 or
            policy.get("require_positive_brier_skill_ci_lower") is not True or
            policy.get("require_positive_skill_each_fixed_half") is not True or
            policy.get("minimum_distinct_test_years") != 8):
        raise ValueError("Acceptance policy changed without a new version")

    out = {}
    for target in ("presence", "onset"):
        try:
            suite = report["tasks"][target]["test"]
            metrics = suite["metrics"]
        except (KeyError, TypeError) as exc:
            raise ValueError("Missing fixed annual benchmark tasks") from exc
        challenger = _metric(metrics, "v2_logistic", target)
        baseline = _metric(metrics, "frequency", target)
        n = challenger["n"]
        if baseline["n"] != n or baseline["events"] != challenger["events"] or suite["rows"] != n:
            raise ValueError("Brier models must evaluate identical labelled population")
        years = challenger.get("by_year")
        base_years = baseline.get("by_year")
        if not isinstance(years, list) or not isinstance(base_years, list) or not years:
            raise ValueError("Per-year test decomposition required")
        model_by_year = {x["year"]: x for x in years}
        base_by_year = {x["year"]: x for x in base_years}
        if (len(model_by_year) != len(years) or len(base_by_year) != len(base_years)
                or set(model_by_year) != set(base_by_year)
                or set(model_by_year) != set(range(2016, 2026))):
            raise ValueError("Expected all ten fixed test years without duplicates")
        sum_n = sum(_metric({str(y): m}, str(y), target)["n"] for y, m in model_by_year.items())
        sum_events = sum(m["events"] for m in model_by_year.values())
        if sum_n != n or sum_events != challenger["events"]:
            raise ValueError("Yearly test denominators or events don't reconcile")
        for y, m in model_by_year.items():
            b = base_by_year[y]
            _metric({str(y): b}, str(y), target)
            if b["n"] != m["n"] or b["events"] != m["events"]:
                raise ValueError("Mismatched paired year populations")
        weighted_model = sum(m["n"] * _num(m["brier"]) for m in years) / n
        weighted_base = sum(base_by_year[m["year"]]["n"] *
                            _num(base_by_year[m["year"]]["brier"]) for m in years) / n
        if abs(weighted_model - _num(challenger["brier"])) > 1e-9 or abs(weighted_base - _num(baseline["brier"])) > 1e-9:
            raise ValueError("Yearly Brier aggregates are inconsistent")
        if baseline["brier"] <= 0:
            observed_skill = None
        else:
            observed_skill = 1 - challenger["brier"] / baseline["brier"]
        comparisons = challenger.get("comparisons")
        comparison = comparisons.get("frequency") if isinstance(comparisons, dict) else None
        if not isinstance(comparison, dict):
            raise ValueError("Paired uncertainty comparison required")
        supplied_skill = _num(comparison.get("brier_skill"), allow_none=True)
        if observed_skill is None or supplied_skill is None or abs(observed_skill - supplied_skill) > 1e-9:
            raise ValueError("Brier skill is missing or misreported")
        interval = comparison.get("brier_skill_95")
        delta = comparison.get("brier_difference_95")
        if (not isinstance(interval, list) or len(interval) != 2 or
                not isinstance(delta, list) or len(delta) != 2 or
                _num(interval[0]) > _num(interval[1]) or
                _num(delta[0]) > _num(delta[1])):
            raise ValueError("Invalid paired bootstrap interval")
        ranges = ((2016, 2020), (2021, 2025))
        halves = []
        for lo, hi in ranges:
            a = [model_by_year[y] for y in range(lo, hi + 1)]
            b = [base_by_year[y] for y in range(lo, hi + 1)]
            size = sum(row["n"] for row in a)
            if size == 0:
                raise ValueError("Empty temporal half")
            aa = sum(row["n"] * row["brier"] for row in a) / size
            bb = sum(row["n"] * row["brier"] for row in b) / size
            halves.append({
                "from": lo, "to": hi, "n": size,
                "events": sum(row["events"] for row in a),
                "brier_skill_vs_frequency": 1 - aa / bb if bb > 0 else None,
            })
        years_count = len(years)
        checks = {
            "enough_test_years": years_count >= policy["minimum_distinct_test_years"],
            "enough_events": challenger["events"] >= policy["minimum_positive_events"],
            "positive_point_skill": observed_skill > 0,
            "positive_lower_paired_block_skill_95": interval[0] > 0,
            "both_fixed_time_halves_improve": all(
                x["brier_skill_vs_frequency"] is not None and x["brier_skill_vs_frequency"] > 0
                for x in halves),
            "historical_asof_verified": False,
            "prospective_outcomes_verified": False,
        }
        signal = all(checks[k] for k in (
            "enough_test_years", "enough_events", "positive_point_skill",
            "positive_lower_paired_block_skill_95",
            "both_fixed_time_halves_improve",
        ))
        out[target] = {
            "n": n, "events": challenger["events"], "test_years": years_count,
            "brier_challenger": challenger["brier"],
            "brier_baseline": baseline["brier"],
            "skill_vs_frequency": observed_skill,
            "paired_block_skill_interval_95": interval,
            "halves": halves,
            "checks": checks,
            "retrospective_screen": "RESEARCH_CANDIDATE_NOT_CONFIRMATORY" if signal else "NOT_DEMONSTRATED",
            "operational_use_approved": False,
        }
    return {
        "schema": "psychohistory.core_model_readiness_report.v1",
        "retrospective_screen": out,
        "vintage_correct_validation": False,
        "prospective_skill_demonstrated": False,
        "operational_model_approved": False,
        "stock_market_module_unblocked": False,
        "warnings": [
            "Retrospective revised-release data, not a real-time replay.",
            "The historical model and gate are post-hoc exploratory, not confirmatory.",
            "Paired-block bootstrap is conditional on frozen predictions and few years.",
            "Never promote a passing retrospective screen to issuance, trading or proof of foresight.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--policy", type=Path, default=HERE / "core_readiness_policy.json")
    args = parser.parse_args()
    root = HERE.parents[1]
    p = args.report.resolve()
    if not p.is_file() or p.is_relative_to(root):
        raise ValueError("Real reports must remain in private storage outside Git")
    policy = json.loads(args.policy.read_text(encoding="utf-8"))
    report = json.loads(p.read_text(encoding="utf-8"))
    result = grade(report, policy)
    # Expose only coarse acceptance flags and counts, not the input/private paths.
    public = {t: {
        "retrospective_screen": r["retrospective_screen"],
        "n": r["n"], "events": r["events"],
        "positive_lower_paired_block_skill_95": r["checks"]["positive_lower_paired_block_skill_95"],
        "both_fixed_time_halves_improve": r["checks"]["both_fixed_time_halves_improve"],
    } for t, r in result["retrospective_screen"].items()}
    print(json.dumps({
        "schema": result["schema"],
        "retrospective_screens": public,
        "operational_model_approved": False,
        "stock_market_module_unblocked": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
