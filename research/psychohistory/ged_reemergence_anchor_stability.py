"""Diagnose whether non-overlapping GED 24m skill survives dropping one target-end date.

This is a *descriptive* retrospective sensitivity. Two validation and three
test dates DO NOT give enough independent blocks for an inferential CI.
No model may be declared a winner based on these diagnostics.
Private input/output only; no real country values in source control.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from ged_monthly_incidence import save_private
from ged_reemergence import MODELS, scores
from ged_reemergence_sensitivity import independent_sensitivity


def _brier_skill(rows, baseline, challenger):
    if not rows:
        raise ValueError("Cannot score empty date group")
    base = scores(rows, baseline)["brier"]
    alt = scores(rows, challenger)["brier"]
    return 1 - alt / base if base > 0 else None


def anchor_stability(original):
    """Compare fixed January target-end months and leave-one-block-out tests.

    All issued target intervals (C+1..T) are disjoint within a partition.
    Countries still share shocks within each anchor, so no p-values, no CI.
    """
    verified = independent_sensitivity(original)
    output = {
        "schema": "psychohistory.ged.reemergence_anchor_stability.v1",
        "status": "RETROSPECTIVE_REVISED_DESCRIPTIVE_ONLY",
        "source_as_of_verified": False,
        "prospective_eligible": False,
        "calendar_independence": "24m target windows do not overlap; countries remain cross-correlated",
        "anchor_semantics": "target_end_not_issue_date",
        "confidence_interval_95": None,
        "significance_test": None,
        "partitions": {},
    }
    for part in ("validation", "test"):
        raw = original["partitions"][part]
        anchors = verified["partitions"][part]["anchors"]
        cohorts = {year: [] for year in anchors}
        for row in raw["cases"]:
            if row["origin_month"] == 1 and row["origin_year"] in cohorts:
                cohorts[row["origin_year"]].append(row)
        if any(not v for v in cohorts.values()):
            raise ValueError("Missing fixed non-overlapping country cohorts")
        grouped = [r for arr in cohorts.values() for r in arr]
        per_anchor = []
        for year, rows in cohorts.items():
            per_anchor.append({
                "year": year,  # Legacy alias for target-end year, NOT actual issuance
                "target_end_month": f"{year}-01",
                "hypothetical_issue_month": f"{year-2}-02",
                "n": len(rows),
                "events": sum(r["outcome"] for r in rows),
                "base_rate": sum(r["outcome"] for r in rows) / len(rows),
                "scores": {
                    model: {
                        "brier": scores(rows, model)["brier"],
                        "brier_skill_vs_global": _brier_skill(
                            rows, "global_reemergence", model),
                    } for model in MODELS
                },
            })
        drop_one = []
        for dropped in anchors:
            remaining = [row for year, rows in cohorts.items() if year != dropped for row in rows]
            drop_one.append({
                "omitted_year": dropped,  # Target-end year
                "hypothetical_issue_month": f"{dropped-2}-02",
                "n": len(remaining),
                "events": sum(r["outcome"] for r in remaining),
                "brier_skill_vs_global": {
                    model: _brier_skill(remaining, "global_reemergence", model)
                    for model in MODELS
                },
            })
        if sum(x["n"] for x in per_anchor) != verified["partitions"][part]["n_evaluated"]:
            raise ValueError("Changes to originally scored non-overlap population")
        if sum(x["events"] for x in per_anchor) != verified["partitions"][part]["positive_outcomes"]:
            raise ValueError("Changes to originally counted positives")
        output["partitions"][part] = {
            "anchors": anchors,  # January target-end years, not issue dates
            "hypothetical_issue_months": [f"{y-2}-02" for y in anchors],
            "n": len(grouped),
            "events": sum(x["outcome"] for x in grouped),
            "calendar_blocks": len(anchors),
            "full_sample_brier_skill_vs_global":
                verified["partitions"][part]["brier_skill_vs_global"],
            "by_anchor": per_anchor,
            "leave_one_anchor_out": drop_one,
            "interpretation": "A change of sign or a large drop-one swing is evidence "
                "of instability. Do not infer independent forecast skill from 2/3 anchor dates.",
        }
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = anchor_stability(json.loads(args.input.read_text()))
    save_private(result, args.out)
    print(json.dumps({
        "schema": result["schema"],
        "test_blocks": result["partitions"]["test"]["calendar_blocks"],
        "test_events": result["partitions"]["test"]["events"],
        "confidence_interval_available": False,
        "prospective_eligible": False,
        "private_report_written": True,
    }))


if __name__ == "__main__":
    main()
