"""Fictitious annual country/conflict onsets; no original UCDP records."""
import csv
import hashlib
import io
import unittest

from ucdp_onset_v251_semantics import read_source, compare

HEADERS=["abc","name","year","gwno_a","newconf","onset1","onset2",
         "onset3","onset5","onset10","onset20","conflict_ids","year_prev"]


def construct(*,conflict=False,duplicate_country=False,
              missing_year=False,invalid=False):
    target=io.StringIO(newline="")
    writer=csv.writer(target)
    headings=list(HEADERS)
    if not conflict:
        headings[11]="              conflict_ids"
    writer.writerow(headings)
    for year in range(1946,2025):
        for code in (100,200):
            if missing_year and year==1950:
                continue
            onset=int(year==2020 and code==100)
            flags=[onset]*7
            if invalid and year==2019 and code==200:
                flags[2]="42"
            writer.writerow(["AAA","Imaginary Nation",year,code]+flags+[
                "9999" if onset else "",
                1815 if year==1946 else year-1])
    if conflict:
        writer.writerow(["AAA","Imaginary Nation",2020,100]+[1]*7+
                        ["8888",2019])
    if duplicate_country:
        writer.writerow(["AAA","Imaginary Nation",2020,100]+[1]*7+
                        ["8888",2019])
    return target.getvalue().encode()


def digest(b):
    return hashlib.sha256(b).hexdigest()


class OnsetDefinitionsTests(unittest.TestCase):
    def test_conflict_can_have_more_than_one_country_year_row(self):
        a,b=construct(conflict=True),construct(conflict=False)
        s=compare(a,b,digest(a),digest(b))
        conflict,country=s["sources"]
        self.assertEqual(conflict["n_rows"],159)
        self.assertEqual(country["n_rows"],158)
        self.assertEqual(conflict["n_duplicate_country_year_rows"],1)
        self.assertEqual(country["n_duplicate_country_year_rows"],0)
        self.assertTrue(country["raw_header_has_leading_whitespace"])
        self.assertEqual(s["comparison"][3]["year"],2020)
        self.assertEqual(s["comparison"][3]["n_conflict_level_onset5"],2)
        self.assertEqual(s["comparison"][3]["n_country_level_onset5"],1)
        self.assertFalse(s["country_level_at_risk_with_ongoing_conflict"])
        for field in ("historical_vintage_byte_timestamps_verified",
                      "backtest_authorized","models_scored","forecast_issued"):
            self.assertFalse(s[field])
        self.assertNotIn("8888",str(s))
        self.assertNotIn("9999",str(s))

    def test_bad_source_fail_closed(self):
        a,b=construct(conflict=True),construct(conflict=False)
        with self.assertRaises(ValueError):
            compare(a,b,"f"*64,digest(b))
        with self.assertRaises(ValueError):
            read_source(construct(missing_year=True),
                        digest(construct(missing_year=True)),"intrastate_country")
        with self.assertRaises(ValueError):
            read_source(construct(invalid=True),
                        digest(construct(invalid=True)),"intrastate_country")
        with self.assertRaises(ValueError):
            read_source(construct(duplicate_country=True),
                        digest(construct(duplicate_country=True)),"intrastate_country")
        with self.assertRaises(ValueError):
            read_source(b,"f"*64,"intrastate_country")


if __name__=="__main__":
    unittest.main()
