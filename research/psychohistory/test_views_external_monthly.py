"""Synthetic only: strict VIEWS version/horizon/privacy regression tests."""
import csv
from pathlib import Path
import hashlib
import tempfile
import unittest

from views_external_monthly import load, month_offset, summarize_months, write_private_csv, FIELDS


def fake_rows():
    r=[]
    for cid,gw,name,iso in [(41,230,"IMAGINARY ISLAND A","AAA"),(42,240,"IMAGINARY ISLAND B","BBB")]:
        for lead in range(1,37):
            y,m=month_offset(2026,8,lead)
            r.append({
                "country_id":cid, "month_id":560+lead, "name":name,
                "gwcode":gw,"isoab":iso,"year":y,"month":m,
                "main_mean":0.4 if cid==41 else 1.2,
                "main_dich":0.04 if cid==41 else 0.12,
                "main_mean_ln":0.15,
            })
    return r


class VIEWSExternalMonthlyTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix="SYNTHETIC_VIEWS_")
        self.addCleanup(self.temp.cleanup)
        self.path=Path(self.temp.name)/"synthetic_cm.csv"
        self.data=fake_rows()
        self._write()

    def _write(self):
        with self.path.open("w",newline="",encoding="utf-8") as f:
            w=csv.DictWriter(f,fieldnames=list(self.data[0]))
            w.writeheader()
            w.writerows(self.data)

    def _load(self):
        return load(self.path,"fatalities003_2026_08_t01",
                    expected_sha256=hashlib.sha256(self.path.read_bytes()).hexdigest())

    def test_monthly_three_months_not_thirty_day_probability(self):
        data=self._load()
        self.assertEqual(len(data),72)
        months,ranked=summarize_months(data,"fatalities003_2026_08_t01",
                                       asof_month="2026-10")
        self.assertEqual(len(months),6)
        self.assertEqual({r["forecast_month"] for r in months},
                         {"2026-11","2026-12","2027-01"})
        self.assertEqual([r["lead_months"] for r in months if r["gwcode"]==230],
                         [3,4,5])
        self.assertEqual(ranked[0]["expected_fatalities_sum"],3.5999999999999996)
        self.assertIsNone(ranked[0]["probability_any_conflict_in_window"])
        self.assertFalse(ranked[0]["forecastIssuedByPsychohistory"])
        self.assertTrue(all(x["model_origin"]=="EXTERNAL_VIEWS_FATALITIES003" for x in months))

    def test_reject_duplicate_missing_forecasts_and_negative_probabilities(self):
        for issue in ("duplicate","missing","bad_probability","bad_mean","bad_month","bad_country"):
            with self.subTest(issue=issue):
                self.data=fake_rows()
                if issue=="duplicate":self.data.append(dict(self.data[0]))
                elif issue=="missing":self.data.pop()
                elif issue=="bad_probability":self.data[0]["main_dich"]=1.1
                elif issue=="bad_mean":self.data[0]["main_mean"]=-2
                elif issue=="bad_month":self.data[0]["month"]=20
                elif issue=="bad_country":self.data[0]["gwcode"]=999
                self._write()
                with self.assertRaises(ValueError):
                    self._load()

    def test_reject_unpinned_sha_and_unsupported_release(self):
        with self.assertRaisesRegex(ValueError,"pinned SHA256"):
            load(self.path,"fatalities003_2026_08_t01",expected_sha256="0"*64)
        with self.assertRaisesRegex(ValueError,"Pin an explicit"):
            load(self.path,"latest",expected_sha256="0"*64)

    def test_reject_asof_outside_release_window_or_wrong_format(self):
        data=self._load()
        for month in ("2026-07","2029-09","2026-13","today"):
            with self.subTest(month=month),self.assertRaises(ValueError):
                summarize_months(data,"fatalities003_2026_08_t01",asof_month=month)

    def test_create_only_private_outputs_and_no_issuance_claim(self):
        data=self._load()
        months,_=summarize_months(data,"fatalities003_2026_08_t01",
                                 asof_month="2026-10")
        target=Path(self.temp.name)/"out.csv"
        write_private_csv(months,target,FIELDS)
        with target.open(encoding="utf-8-sig",newline="") as f:
            rows=list(csv.DictReader(f))
        self.assertEqual(len(rows),6)
        self.assertEqual(rows[0]["scientific_status"],
                         "PUBLISHED_EXTERNAL_FORECAST_NOT_OURS")
        with self.assertRaisesRegex(ValueError,"Create-only"):
            write_private_csv(months,target,FIELDS)


if __name__=="__main__":
    unittest.main()
