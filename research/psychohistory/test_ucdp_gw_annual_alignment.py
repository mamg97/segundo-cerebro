"""Only invented state codes, years and violence flags; no real datasets."""
import csv
import hashlib
import io
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

from ucdp_gw_annual_alignment import reconcile


def _csv(headers, rows, sep=","):
    buf=io.StringIO(newline="")
    writer=csv.writer(buf,delimiter=sep)
    writer.writerow(headers)
    writer.writerows(rows)
    return buf.getvalue().encode()


def fake_sources(*, unknown_code=False, duplicates=False):
    records=[]
    for year in range(1989,2024):
        for code in range(100,140):
            state = (
                (code==100 and year in (2020,2021)) or
                (code==101 and year in (2019,2020))
            )
            records.append((code,year,str(int(state)), "0","0"))
    if unknown_code:
        # Introduce a GW numeric candidate unseen in GW, leaving all annual
        # country-year rows present and without a duplicate key.
        index=40*(2020-1989)
        records[index]=(999,2020,"1","0","0")
    if duplicates:
        records.append(records[0])
    official=_csv(["country_id_cy","year_cy","sb_exist_cy",
                   "ns_exist_cy","os_exist_cy"],records)
    buf=io.BytesIO()
    with ZipFile(buf,"w",ZIP_DEFLATED) as z:
        z.writestr("OrganizedViolenceCY_241.csv",official)
    base=_csv(["statenumber","stateid","countryname","start","end"],
              [(code,"AAA","Imaginary Land","1989-01-01","2020-12-31")
               for code in range(100,139)],"\t")
    micro=_csv(["statenumber","stateid","countryname","start","end"],
               [(139,"BBB","Imaginary Island","1989-01-01","2019-12-31"),
                (140,"CCC","Ancient Island","1970-01-01","1988-12-31")],"\t")
    return buf.getvalue(),base,micro


def run(years,**kwargs):
    u,g,m=fake_sources(**kwargs)
    return reconcile(u,g,m,years,ucdp_sha256=hashlib.sha256(u).hexdigest(),
                     gw_sha256=hashlib.sha256(g).hexdigest(),
                     micro_sha256=hashlib.sha256(m).hexdigest())


class RetrospectiveGWAlignmentTests(unittest.TestCase):
    def test_coded_violence_reappearance_is_not_dyadic_onset(self):
        result=run([1989,2019,2020,2021,2023])
        ros={x["year"]:x for x in result["roster_comparisons"]}
        self.assertEqual(ros[2019]["n_numeric_matches"],40)
        self.assertEqual(ros[2019]["n_gw_members_without_ucdp_row"],0)
        self.assertEqual(ros[2020]["n_numeric_matches"],39)
        self.assertEqual(ros[2020]["n_ucdp_codes_without_gw_member"],1)
        self.assertIsNone(ros[2021]["n_numeric_matches"])
        self.assertEqual(ros[2021]["status"],"NO_EVALUABLE_GW7_EXPIRED_2020")
        trans={x["year"]:x for x in result["country_annual_violence_state_transitions"]}
        self.assertEqual(trans[1989]["n_prior_row_missing_left_censored"],40)
        self.assertEqual(trans[2020]["n_annual_coded_violence_zero_to_one_not_dyadic_onset"],1)
        self.assertEqual(trans[2020]["n_annual_coded_violence_one_to_one_persistence"],1)
        self.assertEqual(trans[2020]["n_annual_coded_violence_zero_to_zero"],38)
        self.assertEqual(trans[2021]["n_annual_coded_violence_one_to_zero"],1)
        self.assertEqual(result["n_official_ucdp_country_year_rows"],1400)
        self.assertFalse(result["retrospective_annual_transitions_are_new_conflicts"])
        for key in ("source_independent_geography_concordance_approved",
                    "feature_bytes_available_asof_verified","backtest_authorized",
                    "brier_computed","forecast_issued"):
            self.assertFalse(result[key])
        self.assertNotIn("countries",result)

    def test_missing_reference_code_is_counted_not_auto_imputed(self):
        result=run([2020],unknown_code=True)
        r=result["roster_comparisons"][0]
        self.assertEqual(r["n_numeric_matches"],38)
        self.assertEqual(r["n_ucdp_codes_without_gw_member"],2)
        self.assertEqual(r["n_gw_members_without_ucdp_row"],1)
        self.assertFalse(r["numeric_identity_approved"])

    def test_duplicate_ucdp_rows_and_hash_tampering_fail_closed(self):
        with self.assertRaises(ValueError):
            run([2020],duplicates=True)
        u,g,m=fake_sources()
        with self.assertRaises(ValueError):
            reconcile(u,g,m,[2020],ucdp_sha256="f"*64,
                      gw_sha256=hashlib.sha256(g).hexdigest(),
                      micro_sha256=hashlib.sha256(m).hexdigest())
        for years in ([2023,2019],[],[2020,2020],[2024],[True]):
            with self.subTest(years=years),self.assertRaises(ValueError):
                run(years)

if __name__=="__main__":
    unittest.main()
