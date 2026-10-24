"""Exploratory accounting diagnostic after v1 results; no causal attribution."""
import argparse
import csv
from decimal import Decimal as D
from hashlib import sha256
from io import StringIO
import json
from pathlib import Path
import re

from census_resident_evaluation import workbook_cells, label, population

HASHES = {
    "np2023-t1.xlsx": "244345cf31944b1b7a7faf7dc0af171a245cf3e8cf03475ef6fd086ed31c4d4e",
    "NST-EST2024-ALLDATA.csv": "b8b50bd345d8a5f33d5c8a28c95aeaa0a50971356f000d9b48276a65fd9022a7",
    "NST-EST2025-ALLDATA.csv": "92188e29cb0a67dcf95afa7d6c47359409782f086478b70ea4128eb70e223ca9",
    "resident_evaluation_v1.json": "ac60b0afc5edd725e66d587a4064330d01f78342e6b4659070ca8ca90fba6dc1",
}


def national_row(text):
    reader = csv.DictReader(StringIO(text))
    if not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames)):
        raise ValueError("missing or duplicate CSV headers")
    if not {"SUMLEV", "STATE", "NAME"}.issubset(reader.fieldnames):
        raise ValueError("missing geography headers")
    rows = list(reader)
    if any(None in row or None in row.values() for row in rows):
        raise ValueError("malformed CSV row")
    selected = [row for row in rows if row["SUMLEV"] == "010"]
    if len(selected) != 1 or selected[0]["STATE"] != "00" or selected[0]["NAME"] != "United States":
        raise ValueError("ambiguous or invalid nation")
    return selected[0]


def count(row, key):
    value = row.get(key, "")
    if not re.fullmatch(r"-?[0-9]+", value):
        raise ValueError("invalid integer field: " + key)
    return D(value)


def estimated_components(row, year):
    result = {name: count(row, prefix + str(year)) for name, prefix in
              [("births", "BIRTHS"), ("deaths", "DEATHS"), ("international", "INTERNATIONALMIG"),
               ("domestic", "DOMESTICMIG"), ("residual", "RESIDUAL"), ("natural", "NATURALCHG"),
               ("net_migration", "NETMIG"), ("change", "NPOPCHG_")]}
    if result["births"] < 0 or result["deaths"] < 0:
        raise ValueError("negative vital count")
    previous = count(row, "POPESTIMATE" + str(year - 1))
    current = count(row, "POPESTIMATE" + str(year))
    if previous <= 0 or current <= 0:
        raise ValueError("nonpositive population")
    if result["natural"] != result["births"] - result["deaths"]:
        raise ValueError("natural change identity failed")
    if result["net_migration"] != result["international"] + result["domestic"]:
        raise ValueError("migration identity failed")
    if result["change"] != current - previous or result["change"] != result["natural"] + result["net_migration"] + result["residual"]:
        raise ValueError("population change identity failed")
    return result


def projected_components(cells):
    expected = {"E7": "Births", "F7": "Deaths", "C6": "Numeric change since prior year",
                "H6": "Net international\nmigration1"}
    if any(label(cells, a) != v for a, v in expected.items()):
        raise ValueError("unexpected component headers")
    note = label(cells, "A90")
    if "between July 1 of the preceding year and June 30 of the indicated year" not in note:
        raise ValueError("component window not verified")
    if label(cells, "A5") != "(Resident population as of July 1. Numbers in thousands)":
        raise ValueError("unexpected projection units")
    result = {}
    for year, row in ((2023, 9), (2024, 10), (2025, 11)):
        if [a for a, (v, _) in cells.items() if re.fullmatch(r"A[0-9]+", a) and v == str(year)] != [f"A{row}"]:
            raise ValueError("ambiguous component year")
        result[year] = {name: population(cells, f"{col}{row}", 1000)
                        for name, col in (("births", "E"), ("deaths", "F"), ("international", "H"))}
    return result


def decompose(projection_stocks, components, reference, target):
    if target not in (2024, 2025):
        raise ValueError("target outside diagnostic")
    expected_years = set(range(2023, target + 1))
    if set(components) != expected_years:
        raise ValueError("missing or extra component years")
    needed = (2022, target)
    if any(year not in projection_stocks for year in needed):
        raise ValueError("missing projected stock")
    totals = {k: D(0) for k in ("births", "deaths_signed", "international", "domestic_signed", "estimated_residual_signed")}
    projected_sum = D(0)
    annual = []
    for year in sorted(expected_years):
        p = components[year]
        if set(p) != {"births", "deaths", "international"} or not all(isinstance(v, D) and v.is_finite() for v in p.values()):
            raise ValueError("invalid projection components")
        e = estimated_components(reference, year)
        terms = {"births": p["births"] - e["births"], "deaths_signed": e["deaths"] - p["deaths"],
                 "international": p["international"] - e["international"], "domestic_signed": -e["domestic"],
                 "estimated_residual_signed": -e["residual"]}
        for key in totals: totals[key] += terms[key]
        projected_sum += p["births"] - p["deaths"] + p["international"]
        annual.append({"year": year, "projected": p, "estimated": e, "difference_terms": terms})
    growth_p = projection_stocks[target] - projection_stocks[2022]
    growth_e = count(reference, f"POPESTIMATE{target}") - count(reference, "POPESTIMATE2022")
    totals["projected_rounding_or_unallocated_residual"] = growth_p - projected_sum
    if sum(totals.values()) != growth_p - growth_e:
        raise ValueError("component decomposition failed")
    return {"target_year": target, "annual": annual, "growth_difference_persons": growth_p - growth_e,
            "contribution_terms_persons": totals, "causal_attribution": False}


def run(source_dir, component_dir):
    raw = {}
    for name, expected in HASHES.items():
        path = (component_dir if name.endswith(".csv") else source_dir) / name
        raw[name] = path.read_bytes()
        if sha256(raw[name]).hexdigest() != expected:
            raise ValueError("changed source: " + name)
    prior = json.loads(raw["resident_evaluation_v1.json"])
    stocks = {int(k): D(v) for k, v in prior["normalized_inputs"]["projection"].items()}
    components = projected_components(workbook_cells(raw["np2023-t1.xlsx"], "Main series"))
    rows = []
    for target, vintage in ((2024, 2024), (2025, 2025), (2024, 2025)):
        reference = national_row(raw[f"NST-EST{vintage}-ALLDATA.csv"].decode("utf-8-sig"))
        for year, value in prior["normalized_inputs"]["references"][str(vintage)].items():
            if count(reference, "POPESTIMATE" + year) != D(value):
                raise ValueError("CSV and fixed v1 XLSX totals differ")
        report = decompose(stocks, {y: components[y] for y in range(2023, target + 1)}, reference, target)
        previous = [r for r in prior["rows"] if r["target_date"] == f"{target}-07-01" and r["reference_vintage"] == vintage]
        if len(previous) != 1 or D(previous[0]["projection_decomposition"]["growth_difference_persons"]) != report["growth_difference_persons"]:
            raise ValueError("growth differs from fixed v1 report")
        report.update(reference_vintage=vintage, role=previous[0]["role"])
        rows.append(report)
    return {"schema": "census-component-diagnostic-v1", "design": "exploratory_after_v1_results", "source_hashes": HASHES,
            "code_sha256": sha256(Path(__file__).read_bytes()).hexdigest(), "rows": rows,
            "causal_attribution": False, "forecast_issued": False, "v1_scores_changed": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--component-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists(): parser.error("refusing overwrite")
    report = run(args.source_dir, args.component_dir)
    with args.output.open("x") as output:
        output.write(json.dumps(report, default=str, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
