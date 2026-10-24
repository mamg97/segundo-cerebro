"""Synthetic demographic identities, without real population observations."""
from copy import deepcopy
from decimal import Decimal as D
import unittest

from census_component_diagnostic import national_row, count, estimated_components, projected_components, decompose
from test_census_resident_evaluation import projection_cells


def reference():
    row = {"SUMLEV": "010", "STATE": "00", "NAME": "United States", "POPESTIMATE2022": "1010"}
    for year, total in ((2023, 1070), (2024, 1130)):
        row["POPESTIMATE" + str(year)] = str(total)
        for prefix, value in (("BIRTHS", 50), ("DEATHS", 20), ("NATURALCHG", 30), ("INTERNATIONALMIG", 20),
                              ("DOMESTICMIG", 5), ("NETMIG", 25), ("RESIDUAL", 5), ("NPOPCHG_", 60)):
            row[prefix + str(year)] = str(value)
    return row


class ComponentDiagnosticTests(unittest.TestCase):
    def test_national_row_uniqueness_not_region_or_state(self):
        text = "SUMLEV,STATE,NAME\n020,00,Northeast\n010,00,United States\n040,01,Alabama\n"
        self.assertEqual(national_row(text)["NAME"], "United States")
        for bad in (text + "010,00,United States\n", "SUMLEV,STATE,NAME\n010,72,United States\n",
                    "SUMLEV,STATE,NAME\n020,00,Northeast\n"):
            with self.assertRaises(ValueError): national_row(bad)

    def test_csv_headers_and_malformed_records(self):
        for text in ("SUMLEV,STATE,NAME,NAME\n010,00,United States,x\n",
                     "SUMLEV,STATE,NAME\n010,00,United States,extra\n",
                     "SUMLEV,STATE,NAME\n010,00\n"):
            with self.assertRaises(ValueError): national_row(text)

    def test_integer_missing_and_not_applicable_are_not_zero(self):
        for value in ("", "X", "1.5", "NaN", "Infinity"):
            with self.assertRaises(ValueError): count({"f": value}, "f")
        self.assertEqual(count({"f": "-5"}, "f"), D(-5))

    def test_estimate_identities_detect_wrong_sign_missing_residual_or_shift(self):
        self.assertEqual(estimated_components(reference(), 2023)["change"], D(60))
        for key in ("NATURALCHG2023", "NETMIG2023", "RESIDUAL2023", "POPESTIMATE2023", "NPOPCHG_2023"):
            r = reference(); r[key] = str(int(r[key]) + 1)
            with self.subTest(key=key), self.assertRaises(ValueError): estimated_components(r, 2023)

    def test_rounding_residual_and_signed_death_contribution_retained(self):
        components = {y: {"births": D(50), "deaths": D(20), "international": D(25)} for y in (2023, 2024)}
        report = decompose({2022: D(1000), 2024: D(1100)}, components, reference(), 2024)
        self.assertEqual(report["growth_difference_persons"], D(-20))
        self.assertEqual(report["contribution_terms_persons"], {"births": D(0), "deaths_signed": D(0),
            "international": D(10), "domestic_signed": D(-10), "estimated_residual_signed": D(-10),
            "projected_rounding_or_unallocated_residual": D(-10)})
        components[2023]["deaths"] = D(25)
        report = decompose({2022: D(1000), 2024: D(1100)}, components, reference(), 2024)
        self.assertEqual(report["contribution_terms_persons"]["deaths_signed"], D(-5))
        self.assertEqual(report["contribution_terms_persons"]["projected_rounding_or_unallocated_residual"], D(-5))
        self.assertFalse(report["causal_attribution"])

    def test_component_years_must_match_requested_window(self):
        components = {y: {"births": D(50), "deaths": D(20), "international": D(25)} for y in (2023, 2024)}
        for changed in ({2024: components[2024]}, {**components, 2025: components[2024]}):
            with self.assertRaises(ValueError): decompose({2022: D(1000), 2024: D(1100)}, changed, reference(), 2024)

    def test_projection_metadata_and_units(self):
        cells = projection_cells()
        cells.update({"E7": ("Births", "s"), "F7": ("Deaths", "s"), "C6": ("Numeric change since prior year", "s"),
                      "H6": ("Net international\nmigration1", "s"), "A90": ("Events between July 1 of the preceding year and June 30 of the indicated year", "s"), "A9": ("2023", "n")})
        for row in (9, 10, 11):
            for col in ("E", "F", "H"): cells[f"{col}{row}"] = ("1.25", "n")
        self.assertEqual(projected_components(cells)[2023]["births"], D(1250))
        for address, value in (("A90", "calendar year"), ("A5", "persons"), ("E7", "Deaths")):
            bad = deepcopy(cells); bad[address] = (value, "s")
            with self.assertRaises(ValueError): projected_components(bad)


if __name__ == "__main__": unittest.main()
