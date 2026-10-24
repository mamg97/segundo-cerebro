"""Offline, fixed-protocol Census resident comparison; never issues forecasts."""

import argparse
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, localcontext
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

PROTOCOL_SHA = "b60d344eaac44df3b0a7020bb238d9189d206c61d3b74e83abb8b2b517840271"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"


def workbook_cells(raw, sheet_name):
    """Resolve the named sheet, preserve raw numeric strings, reject ambiguity."""
    with ZipFile(BytesIO(raw)) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or sum(i.file_size for i in z.infolist()) > 5_000_000:
            raise ValueError("ambiguous or oversized workbook")
        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        sheets = [s for s in workbook.findall("x:sheets/x:sheet", NS)
                  if s.get("name") == sheet_name]
        if len(sheets) != 1:
            raise ValueError("missing or duplicate sheet")
        rid = sheets[0].get("{" + REL + "}id")
        links = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        matches = [r for r in links.findall("{" + PKG + "}Relationship") if r.get("Id") == rid]
        if len(matches) != 1 or matches[0].get("TargetMode", "Internal") != "Internal":
            raise ValueError("invalid sheet relationship")
        link = matches[0]
        if link.get("Type") != REL + "/worksheet":
            raise ValueError("not a worksheet relationship")
        target = link.get("Target", "")
        part = posixpath.normpath(target.lstrip("/") if target.startswith("/") else "xl/" + target)
        if not part.startswith("xl/worksheets/") or ".." in PurePosixPath(part).parts:
            raise ValueError("invalid worksheet path")
        strings = []
        if "xl/sharedStrings.xml" in names:
            shared = ET.fromstring(z.read("xl/sharedStrings.xml"))
            strings = ["".join(t.text or "" for t in si.findall(".//x:t", NS))
                       for si in shared.findall("x:si", NS)]
        sheet = ET.fromstring(z.read(part))
    cells = {}
    for cell in sheet.findall("x:sheetData/x:row/x:c", NS):
        address = cell.get("r")
        if not address or address in cells:
            raise ValueError("missing or duplicate cell address")
        if cell.find("x:f", NS) is not None:
            raise ValueError("unexpected source formula")
        value = cell.find("x:v", NS)
        kind = cell.get("t", "n")
        text = None if value is None else value.text
        if kind == "s" and text is not None:
            index = int(text)
            if not 0 <= index < len(strings):
                raise ValueError("invalid shared string")
            text = strings[index]
        elif kind == "inlineStr":
            text = "".join(t.text or "" for t in cell.findall("x:is//x:t", NS))
        cells[address] = (text, kind)
    return cells


def label(cells, address):
    try:
        value = cells[address][0]
    except KeyError as exc:
        raise ValueError("missing cell: " + address) from exc
    if value is None:
        raise ValueError("blank cell: " + address)
    return value


def population(cells, address, multiplier=1):
    text = label(cells, address)
    if cells[address][1] != "n":
        raise ValueError("population cell must be numeric")
    try:
        value = Decimal(text)
    except InvalidOperation as exc:
        raise ValueError("invalid population") from exc
    if not value.is_finite() or value <= 0:
        raise ValueError("nonpositive or nonfinite population")
    return value * multiplier


def projection_values(cells):
    expected = {"A4": "Main series. Table 1", "A5": "(Resident population as of July 1. Numbers in thousands)",
                "A6": "Year", "B6": "Population"}
    if any(label(cells, a) != v for a, v in expected.items()):
        raise ValueError("unexpected projection metadata/units")
    result = {}
    for year, row in ((2022, 8), (2024, 10), (2025, 11)):
        matches = [a for a, (v, _) in cells.items() if re.fullmatch(r"A[0-9]+", a) and v == str(year)]
        if matches != ["A" + str(row)]:
            raise ValueError("ambiguous projection year")
        result[year] = population(cells, "B" + str(row), 1000)
    return result


def estimate_values(cells, vintage, years):
    title = " ".join(label(cells, "A2").split())
    if not title.startswith("Annual Estimates of the Resident Population for the United States,") or not title.endswith("July 1, " + str(vintage)):
        raise ValueError("unexpected estimate title/vintage")
    if label(cells, "C3") != "Population Estimate (as of July 1)":
        raise ValueError("unexpected estimate date/units")
    geographies = [a for a, (v, _) in cells.items() if re.fullmatch(r"A[0-9]+", a) and v == "United States"]
    if geographies != ["A5"]:
        raise ValueError("ambiguous national aggregate")
    result = {}
    for year in years:
        expected = chr(ord("C") + year - 2020) + "4"
        matches = [a for a, (v, _) in cells.items() if re.fullmatch(r"[A-Z]+4", a) and v == str(year)]
        if matches != [expected]:
            raise ValueError("ambiguous estimate year")
        result[year] = population(cells, expected[:-1] + "5")
        if result[year] != result[year].to_integral_value():
            raise ValueError("estimate must be a person count")
    return result


def metrics(predicted, reference):
    if not all(isinstance(v, Decimal) and v.is_finite() and v > 0 for v in (predicted, reference)):
        raise ValueError("invalid population pair")
    error = predicted - reference
    return {"predicted_persons": predicted, "reference_persons": reference,
            "signed_error_persons": error, "absolute_error_persons": abs(error),
            "signed_percentage_error": 100 * error / reference}


def evaluate(projection, baseline, references, origin="2023-11-09"):
    if set(projection) != {2022, 2024, 2025} or set(baseline) != {2021, 2022} or set(references) != {2024, 2025}:
        raise ValueError("unexpected years/vintages")
    if set(references[2024]) != {2022, 2024} or set(references[2025]) != {2022, 2024, 2025}:
        raise ValueError("unexpected reference years")
    if date.fromisoformat(origin) != date(2023, 11, 9):
        raise ValueError("origin differs from fixed protocol")
    all_values = list(projection.values()) + list(baseline.values()) + [v for r in references.values() for v in r.values()]
    if not all(isinstance(v, Decimal) and v.is_finite() and v > 0 for v in all_values):
        raise ValueError("invalid inputs")
    with localcontext() as context:
        context.prec = 28
        rows = []
        for year, vintage, role in ((2024, 2024, "primary"), (2025, 2025, "primary"), (2024, 2025, "revision_sensitivity")):
            if date(year, 7, 1) <= date.fromisoformat(origin):
                raise ValueError("target not after publication")
            ref = references[vintage]
            predictors = {"census_main": projection[year], "constant": baseline[2022],
                          "linear": baseline[2022] + (year - 2022) * (baseline[2022] - baseline[2021])}
            base = projection[2022] - ref[2022]
            growth = (projection[year] - projection[2022]) - (ref[year] - ref[2022])
            if base + growth != projection[year] - ref[year]:
                raise ValueError("decomposition does not reconcile")
            rows.append({"target_date": f"{year}-07-01", "reference_vintage": vintage, "role": role,
                         "predictors": {name: metrics(value, ref[year]) for name, value in predictors.items()},
                         "projection_decomposition": {"base_difference_persons": base, "growth_difference_persons": growth}})
        means = {name: sum(r["predictors"][name]["absolute_error_persons"] for r in rows if r["role"] == "primary") / 2
                 for name in ("census_main", "constant", "linear")}
    return {"schema": "census-resident-evaluation-v1", "run_type": "retrospective_exploratory",
            "primary_target_count": 2, "independent_origins": 1, "rows": rows,
            "primary_descriptive_mean_absolute_error_persons": means,
            "forecast_issued": False, "confirmatory": False,
            "historical_first_day_bytes_attested": False, "reference_is_independent_truth": False}


def run(protocol_path, source_dir):
    raw = protocol_path.read_bytes()
    if sha256(raw).hexdigest() != PROTOCOL_SHA:
        raise ValueError("protocol differs from published v1")
    protocol = json.loads(raw)
    cells = {}
    for item in protocol["inputs"]:
        name = item["file"]
        data = (source_dir / name).read_bytes()
        if len(data) != item["bytes"] or sha256(data).hexdigest() != item["sha256"]:
            raise ValueError("source hash/size mismatch: " + name)
        cells[name] = workbook_cells(data, protocol["cell_mapping"][name]["sheet"])
    with localcontext() as context:
        context.prec = 28
        projection = projection_values(cells["np2023-t1.xlsx"])
        baseline = estimate_values(cells["NST-EST2022-POP.xlsx"], 2022, (2021, 2022))
        references = {2024: estimate_values(cells["NST-EST2024-POP.xlsx"], 2024, (2022, 2024)),
                      2025: estimate_values(cells["NST-EST2025-POP.xlsx"], 2025, (2022, 2024, 2025))}
        result = evaluate(projection, baseline, references, protocol["origin_publication_date"])
    result.update(protocol_sha256=PROTOCOL_SHA, inputs=protocol["inputs"],
                  normalized_inputs={"projection": projection, "baseline": baseline, "references": references},
                  source_cells={name: {address: {"raw": label(sheet, address), "type": sheet[address][1]}
                                       for year, address in protocol["cell_mapping"][name].items() if year.isdigit()}
                                for name, sheet in cells.items()},
                  generated_at=datetime.now(timezone.utc).isoformat(),
                  code_sha256=sha256(Path(__file__).read_bytes()).hexdigest())
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol", required=True, type=Path)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("output already exists; refusing overwrite")
    result = run(args.protocol, args.source_dir)
    text = json.dumps(result, default=str, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    with args.output.open("x") as output:
        output.write(text)


if __name__ == "__main__":
    main()
