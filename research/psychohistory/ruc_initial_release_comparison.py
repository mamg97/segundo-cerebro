"""Compare first RUC appearances with audited ALFRED initial releases; no scores."""

import argparse
from decimal import Decimal
import json
from pathlib import Path
import zipfile

from alfred_initial_release_audit import audit as audit_alfred
from ruc_vintage_audit import audit as audit_ruc, _cells


def compare(cells, vintage_count, month_count, observations):
    by_month = {row["reference_month"][:7]: row for row in observations}
    if len(by_month) != len(observations):
        raise ValueError("duplicate ALFRED month")
    compared, missing, seen = [], [], set()
    for row in range(2, month_count + 2):
        month = cells[1, row].replace(":", "-")
        if month not in by_month:
            continue
        seen.add(month)
        columns = [col for col in range(2, vintage_count + 2) if isinstance(cells.get((col, row)), float)]
        initial = by_month[month]["rate_percent"]
        if initial is None:
            if columns:
                raise ValueError("RUC value exists for an ALFRED-missing month")
            missing.append(month)
            continue
        if not columns:
            raise ValueError("no RUC appearance for available initial observation")
        column = columns[0]
        delta = Decimal(str(cells[column, row])) - Decimal(initial)
        compared.append({"reference_month": month, "first_ruc_vintage": cells[column, 1], "difference_pp": str(delta)})
    deltas = [Decimal(row["difference_pp"]) for row in compared]
    if not compared:
        raise ValueError("no comparable observations")
    return {"schema": "ruc-initial-comparison-v1", "compared_count": len(compared),
            "different_count": sum(delta != 0 for delta in deltas),
            "max_absolute_difference_pp": str(max(abs(delta) for delta in deltas)),
            "missing_in_both": missing, "outside_ruc_observation_range": sorted(set(by_month) - seen),
            "comparisons": compared, "exact_historical_availability_verified": False,
            "forecast_issued": False, "predictive_skill_demonstrated": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ruc", type=Path, required=True)
    parser.add_argument("--ruc-sha256", required=True)
    parser.add_argument("--alfred", type=Path, required=True)
    parser.add_argument("--alfred-sha256", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    ruc = audit_ruc(args.ruc, args.ruc_sha256)
    alfred = audit_alfred(args.alfred.read_bytes(), args.alfred_sha256, args.start, args.end)
    with zipfile.ZipFile(args.ruc) as book:
        result = compare(_cells(book), ruc["vintage_count"], ruc["observation_month_count"], alfred["observations"])
    result["source_sha256"] = {"ruc": args.ruc_sha256, "alfred": args.alfred_sha256}
    with args.output.open("x") as handle:
        json.dump(result, handle, indent=2)
        handle.write("\n")
    print(json.dumps({key: value for key, value in result.items() if key != "comparisons"}))


if __name__ == "__main__":
    main()
