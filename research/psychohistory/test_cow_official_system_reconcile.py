"""Adversarial, wholly invented COW CSV and ZIP fixtures."""
import csv
import hashlib
import io
import unittest
from zipfile import ZipFile, ZIP_DEFLATED
from cow_official_system_reconcile import reconcile


def make_fixture(succession=False):
    # 30 entirely fictional states across 209 years => 6,270 row archive.
    # The parser intentionally requires a non-trivial, real-sized CSV.
    st=io.StringIO(newline="")
    wr=csv.writer(st)
    wr.writerow(["stateabb","ccode","statenme","styear","stmonth","stday",
                 "endyear","endmonth","endday","version"])
    for i in range(30):
        t="A"+chr(65+i//26)+chr(65+i%26)
        if succession and i==0:
            wr.writerow([t,100,"Invented A",1816,1,1,2006,6,3,2024])
            wr.writerow(["ZZZ",100,"Invented Succession",2006,6,3,2024,12,31,2024])
        else:
            wr.writerow([t,100+i,"Invented "+t,1816,1,1,2024,12,31,2024])
    states=st.getvalue().encode()
    cy=io.StringIO(newline="")
    writer=csv.writer(cy)
    writer.writerow(["ccode","stateabb","statenme","year"])
    for year in range(1816,2025):
        for i in range(30):
            tok="A"+chr(65+i//26)+chr(65+i%26)
            if succession and i==0 and year>2006:
                tok="ZZZ"
            writer.writerow([100+i,tok,"Invented "+tok,year])
    official=cy.getvalue().encode()
    return states,official


def zipbytes(csvraw):
    out=io.BytesIO()
    with ZipFile(out,"w",ZIP_DEFLATED) as f:
        f.writestr("System2024/system2024.csv",csvraw)
    return out.getvalue()


def invoke(states,csvraw,years=[2006,2024]):
    zp=zipbytes(csvraw)
    return reconcile(zp,states,hashlib.sha256(zp).hexdigest(),
                     hashlib.sha256(states).hexdigest(),
                     hashlib.sha256(csvraw).hexdigest(),years)


class OfficialReconciliationTests(unittest.TestCase):
    def test_same_code_year_set_and_ambiguous_successor_labels(self):
        states, official=make_fixture(succession=True)
        x=invoke(states,official,[2002,2006,2011,2024])
        self.assertEqual(x["status"],"CODE_YEAR_SETS_MATCHED_NO_ASOF")
        self.assertEqual(x["n_official_code_years"],6270)
        self.assertEqual(x["n_reconstructed_code_years"],6270)
        self.assertEqual(x["n_matching_code_years"],6270)
        self.assertEqual(x["n_official_only_code_years"],0)
        self.assertEqual(x["n_reconstruction_only_code_years"],0)
        self.assertEqual(x["n_reconstructed_code_years_with_multiple_abbreviations"],1)
        self.assertEqual(x["years"][1]["n_multi_abbreviation_codes_in_intervals"],1)
        self.assertEqual(x["n_official_tokens_not_present_in_source_interval_candidates"],0)
        self.assertTrue(x["official_code_year_set_reconciled"])
        for key in ("historical_state_identity_reconciled","source_as_of_verified",
                    "historical_byte_timestamp_verified","country_negative_labels_verified",
                    "backtest_authorized","models_scored","forecast_issued"):
            self.assertFalse(x[key])
        self.assertNotIn("countries",x)

    def test_missing_and_extra_code_years_are_counted_not_approved(self):
        states, official=make_fixture()
        # Replace a single code-year with a non-source code (remaining in valid range).
        new=official.replace(b"100,AAA,Invented AAA,2020",
                             b"999,AAA,Invented AAA,2020",1)
        x=invoke(states,new,[2020])
        self.assertEqual(x["status"],"OFFICIAL_AND_RECONSTRUCTED_CODE_YEAR_DISCORDANCE")
        self.assertEqual(x["n_official_only_code_years"],1)
        self.assertEqual(x["n_reconstruction_only_code_years"],1)
        self.assertFalse(x["official_code_year_set_reconciled"])

    def test_duplicate_official_code_year_is_rejected(self):
        states, official=make_fixture()
        new=official.replace(b"101,AAB,Invented AAB,2020",
                             b"100,AAA,Invented AAA,2020",1)
        with self.assertRaises(ValueError):
            invoke(states,new,[2020])

    def test_sha_mismatch_and_duplicate_year_requests_fail(self):
        states,official=make_fixture()
        zip_raw=zipbytes(official)
        valid=hashlib.sha256(zip_raw).hexdigest()
        others=hashlib.sha256(states).hexdigest()
        csv_sha=hashlib.sha256(official).hexdigest()
        with self.assertRaises(ValueError):
            reconcile(zip_raw,states,"f"*64,others,csv_sha,[2020])
        with self.assertRaises(ValueError):
            reconcile(zip_raw,states,valid,others,"f"*64,[2020])
        for years in ([2020,2020],[2024,2006],[],[2025]):
            with self.subTest(years=years),self.assertRaises(ValueError):
                reconcile(zip_raw,states,valid,others,csv_sha,years)


if __name__=="__main__":
    unittest.main()
