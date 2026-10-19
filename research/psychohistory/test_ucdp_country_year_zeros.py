"""Synthetic fabricated GW-state identifiers and annual existence flags only."""
import csv
import hashlib
import io
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

from ucdp_country_year_zeros import audit


def build(*, missing=None, duplicate=False, illegal_flag=False):
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["country_id_cy","year_cy","sb_exist_cy","ns_exist_cy","os_exist_cy"])
    for y in range(1989,2024):
        for code in range(100,140):
            if (code,y)==missing:
                continue
            x = int(code==100 and y==2020)
            writer.writerow([code,y,"no" if illegal_flag and code==101 and y==2000 else x,0,0])
    if duplicate:
        writer.writerow([100,2020,1,0,0])
    raw=stream.getvalue().encode()
    out=io.BytesIO()
    with ZipFile(out,"w",ZIP_DEFLATED) as z:
        z.writestr("UCDP_OrganizedViolenceCY_241.csv", raw)
    return out.getvalue()


class CountryYearZeroTests(unittest.TestCase):
    def test_explicit_zero_does_not_authorize_candidate_negative(self):
        raw=build()
        result=audit(raw,[2019,2020,2023],hashlib.sha256(raw).hexdigest())
        self.assertEqual(result["n_all_country_year_rows"],1400)
        self.assertEqual(result["n_all_country_years_with_any_flag_one"],1)
        self.assertEqual(result["n_all_country_years_with_all_flags_zero"],1399)
        self.assertEqual(result["sample_years"][1]["n_explicit_country_year_rows"],40)
        self.assertEqual(result["sample_years"][1]["n_any_three_violence_flags_one"],1)
        self.assertEqual(result["sample_years"][1]["n_all_three_flags_explicit_zero"],39)
        self.assertTrue(result["source_explicitly_has_three_type_zero_indicators"])
        self.assertTrue(result["country_year_presence_is_not_onset_target"])
        self.assertTrue(result["not_recorded_in_ged_does_not_prove_no_actual_violence"])
        for flag in ("covered_gw_states_verified_against_independent_vintage",
                    "latest_monthly_candidate_equivalence_verified",
                    "historically_available_before_issuance_verified",
                    "source_as_of_verified","backtest_authorized","models_scored",
                    "forecast_issued"):
            self.assertFalse(result[flag])
        self.assertNotIn("countries",result)

    def test_duplicate_missing_year_bad_boolean_and_wrong_hash_rejected(self):
        for blob in [build(duplicate=True),build(illegal_flag=True)]:
            with self.assertRaises(ValueError):
                audit(blob,[2020])
        # Drop every row of year 1989: panel years must be complete.
        raw=build()
        with self.assertRaises(ValueError):
            audit(raw,[2020],"f"*64)
        with self.assertRaises(ValueError):
            audit(raw,[2020,2020])
        with self.assertRaises(ValueError):
            audit(raw,[2024])
        with self.assertRaises(ValueError):
            audit(raw,[2020,2019])

    def test_corrupted_archive_and_missing_csv_rejected(self):
        with self.assertRaises(ValueError):
            audit(b"bad zip with enough bytes"*100,[2010])
        out=io.BytesIO()
        with ZipFile(out,"w",ZIP_DEFLATED) as z:
            z.writestr("../evil.csv",b"anything")
        with self.assertRaises(ValueError):
            audit(out.getvalue()+b"0"*250,[2010])


if __name__=="__main__":
    unittest.main()
