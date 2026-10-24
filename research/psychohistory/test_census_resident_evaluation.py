"""Synthetic cases only; no official population observations in tests."""
from copy import deepcopy
from decimal import Decimal as D
from io import BytesIO
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys
from zipfile import ZipFile

from census_resident_evaluation import (
    REL, PKG, workbook_cells, projection_values, estimate_values,
    population, evaluate, metrics, run,
)


def projection_cells():
    cells = {"A4": ("Main series. Table 1", "s"),
             "A5": ("(Resident population as of July 1. Numbers in thousands)", "s"),
             "A6": ("Year", "s"), "B6": ("Population", "s")}
    for year, row, value in ((2022, 8, "1.0005"), (2024, 10, "1.10075"), (2025, 11, "1.15025")):
        cells[f"A{row}"] = (str(year), "n")
        cells[f"B{row}"] = (value, "n")
    return cells


def reference_cells(vintage=2025):
    cells = {"A2": (f"Annual Estimates of the Resident Population for the United States, Regions, States, District of Columbia, and Puerto Rico: April 1, 2020 to July 1, {vintage}", "s"),
             "A5": ("United States", "s"), "C3": ("Population Estimate (as of July 1)", "s")}
    for year in range(2020, vintage + 1):
        column = chr(ord("C") + year - 2020)
        cells[column + "4"] = (str(year), "n")
        cells[column + "5"] = (str(1000 + (year - 2020) * 20), "n")
    return cells


def workbook(xml, target="worksheets/custom.xml", mode="Internal", name="Synthetic"):
    out = BytesIO()
    with ZipFile(out, "w") as z:
        z.writestr("xl/workbook.xml", f'<workbook xmlns="{REL.replace("officeDocument/2006/relationships", "spreadsheetml/2006/main")}" xmlns:r="{REL}"><sheets><sheet name="{name}" sheetId="1" r:id="rId2"/></sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", f'<Relationships xmlns="{PKG}"><Relationship Id="rId2" Type="{REL}/worksheet" Target="{target}" TargetMode="{mode}"/></Relationships>')
        z.writestr("xl/worksheets/custom.xml", f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">{xml}</row></sheetData></worksheet>')
    return out.getvalue()


class CensusEvaluationTests(unittest.TestCase):
    def test_decimal_thousand_conversion_preserves_stored_precision(self):
        result = projection_values(projection_cells())
        self.assertEqual(result, {2022: D("1000.5"), 2024: D("1100.75"), 2025: D("1150.25")})

    def test_projection_units_year_uniqueness_and_required_cells(self):
        for address, value in [("A5", ("Persons", "s")), ("A99", ("2024", "n")), ("A10", ("2023", "n"))]:
            cells = projection_cells(); cells[address] = value
            with self.subTest(address=address), self.assertRaises(ValueError):
                projection_values(cells)
        cells = projection_cells(); del cells["B10"]
        with self.assertRaises(ValueError):
            projection_values(cells)

    def test_reject_invalid_population_cells(self):
        for value, kind in [("NaN", "n"), ("Infinity", "n"), ("0", "n"), ("-1", "n"), ("123", "s"), ("1", "b"), ("bad", "n")]:
            with self.subTest(value=value, kind=kind), self.assertRaises(ValueError):
                population({"B1": (value, kind)}, "B1")

    def test_estimates_resolve_national_july_not_base_or_region(self):
        cells = reference_cells()
        cells["B5"] = ("999999", "n")
        cells["G6"] = ("888888", "n")
        self.assertEqual(estimate_values(cells, 2025, (2022, 2024, 2025)), {2022: D(1040), 2024: D(1080), 2025: D(1100)})
        for address, value in [("A6", ("United States", "s")), ("I4", ("2024", "n")), ("G5", ("1080.5", "n")), ("C3", ("April 1", "s"))]:
            changed = deepcopy(cells); changed[address] = value
            with self.subTest(address=address), self.assertRaises(ValueError):
                estimate_values(changed, 2025, (2024,))
        with self.assertRaises(ValueError):
            estimate_values(cells, 2024, (2024,))

    def test_named_sheet_relationship_not_sheet1_assumption(self):
        raw = workbook('<c r="B1"><v>12.345</v></c><c r="A1" t="inlineStr"><is><t>Label</t></is></c>')
        self.assertEqual(workbook_cells(raw, "Synthetic")["B1"], ("12.345", "n"))
        self.assertEqual(workbook_cells(raw, "Synthetic")["A1"], ("Label", "inlineStr"))
        with self.assertRaises(ValueError):
            workbook_cells(raw, "Wrong")

    def test_bad_relationship_duplicate_cells_and_formula_rejected(self):
        for raw in [workbook('<c r="B1"><v>1</v></c>', mode="External"),
                    workbook('<c r="B1"><v>1</v></c>', target="../../outside.xml"),
                    workbook('<c r="B1"><v>1</v></c><c r="B1"><v>2</v></c>'),
                    workbook('<c r="B1"><f>1+1</f><v>2</v></c>')]:
            with self.assertRaises(ValueError):
                workbook_cells(raw, "Synthetic")

    def test_analytic_metrics_baselines_and_decomposition(self):
        projection = {2022: D(1000), 2024: D(1100), 2025: D(1150)}
        baseline = {2021: D(950), 2022: D(1000)}
        references = {2024: {2022: D(1020), 2024: D(1120)}, 2025: {2022: D(1030), 2024: D(1140), 2025: D(1200)}}
        report = evaluate(projection, baseline, references)
        self.assertEqual(report["primary_descriptive_mean_absolute_error_persons"], {"census_main": D(35), "constant": D(160), "linear": D(35)})
        self.assertEqual(report["rows"][0]["projection_decomposition"], {"base_difference_persons": D(-20), "growth_difference_persons": D(0)})
        self.assertEqual(report["rows"][1]["projection_decomposition"], {"base_difference_persons": D(-30), "growth_difference_persons": D(-20)})
        self.assertEqual(report["rows"][2]["predictors"]["census_main"]["signed_error_persons"], D(-40))
        self.assertEqual(report["rows"][2]["role"], "revision_sensitivity")
        self.assertEqual(metrics(D(110), D(100))["signed_percentage_error"], D(10))
        self.assertFalse(report["forecast_issued"])
        self.assertFalse(report["reference_is_independent_truth"])

    def test_reject_changed_origin_unexpected_years_or_invalid_reference(self):
        p = {2022: D(1000), 2024: D(1100), 2025: D(1150)}
        b = {2021: D(950), 2022: D(1000)}
        r = {2024: {2022: D(1020), 2024: D(1120)}, 2025: {2022: D(1030), 2024: D(1140), 2025: D(1200)}}
        with self.assertRaises(ValueError): evaluate(p, b, r, "2025-01-01")
        with self.assertRaises(ValueError): evaluate({**p, 2023: D(1050)}, b, r)
        bad = deepcopy(r); bad[2024][2024] = D(0)
        with self.assertRaises(ValueError): evaluate(p, b, bad)
        with self.assertRaises(ValueError): evaluate(p, {2022: D(1000), 2023: D(1050)}, r)

    def test_protocol_hash_rejected_before_source_read(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "protocol.json"; path.write_text('{}')
            with self.assertRaisesRegex(ValueError, "protocol differs"):
                run(path, Path(folder) / "missing")

    def test_changed_source_rejected_before_workbook_parse(self):
        protocol = Path(__file__).with_name("census_resident_protocol_v1.json")
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / "np2023-t1.xlsx").write_bytes(b"synthetic changed source")
            with self.assertRaisesRegex(ValueError, "source hash/size mismatch"):
                run(protocol, Path(folder))

    def test_cli_does_not_overwrite_existing_report(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "report.json"; output.write_text('preserve')
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("census_resident_evaluation.py")),
                                     "--protocol", "missing", "--source-dir", "missing", "--output", str(output)],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("refusing overwrite", result.stderr)
            self.assertEqual(output.read_text(), 'preserve')


if __name__ == "__main__":
    unittest.main()
