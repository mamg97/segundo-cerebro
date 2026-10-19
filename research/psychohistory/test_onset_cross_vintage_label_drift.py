"""Synthetic GW ids intentionally fictitious; no official country rows in tests."""
import unittest
from onset_cross_vintage_label_drift import parse_vintage,compare


def raw(rows):
    return ("gwno_a,year,onset1\n"+"\n".join(rows)+"\n").encode()


class CrossVintageDriftTests(unittest.TestCase):
    def test_disagreement_not_skill_and_no_country_ids(self):
        old=parse_vintage(raw(["900,2017,0","901,2017,1","902,2017,1"]),"old")
        new=parse_vintage(raw(["900,2017,1","901,2017,0","902,2017,1","903,2018,0"]),"new")
        x=compare(old,new)
        self.assertEqual(x["pairwise_comparable"],3)
        self.assertEqual(x["disagreement_count"],2)
        self.assertEqual(x["old0_new1"],1)
        self.assertEqual(x["old1_new0"],1)
        self.assertEqual(x["keys_only_in_newer_file"],1)
        self.assertEqual(x["matching_onset_both"],1)
        for field in ("backtest_authorized","scores_computed","forecast_issued",
                      "historical_training_labels_admissible"):
            self.assertFalse(x[field])
        self.assertNotIn("900",repr(x))

    def test_old_duplicate_equal_not_silent_training_approval(self):
        old=parse_vintage(raw(["900,2017,0","900,2017,0"]),"old")
        new=parse_vintage(raw(["900,2017,0"]),"new")
        x=compare(old,new)
        self.assertEqual(x["old_duplicate_country_year_rows"],1)
        self.assertEqual(x["old_conflicting_country_year_keys"],0)
        self.assertFalse(x["historical_training_labels_admissible"])

    def test_old_conflict_excluded_from_comparison(self):
        old=parse_vintage(raw(["900,2017,0","900,2017,1"]),"old")
        new=parse_vintage(raw(["900,2017,0"]),"new")
        x=compare(old,new)
        self.assertEqual(x["pairwise_unknown_or_ambiguous"],1)
        self.assertEqual(x["pairwise_comparable"],0)
        self.assertEqual(x["disagreement_count"],0)

    def test_missing_not_zero(self):
        old=parse_vintage(raw(["900,2017,","901,2017,0"]),"old")
        new=parse_vintage(raw(["900,2017,0","901,2017,0"]),"new")
        x=compare(old,new)
        self.assertEqual(x["pairwise_unknown_or_ambiguous"],1)
        self.assertEqual(x["matching_no_onset_both"],1)

    def test_future_training_row_rejected(self):
        with self.assertRaises(ValueError):
            parse_vintage(raw(["901,2021,1"]),"old")
        with self.assertRaises(ValueError):
            parse_vintage(raw(["901,2025,1"]),"new")
        with self.assertRaises(ValueError):
            parse_vintage(raw(["901,2017,wrong"]),"old")

    def test_modern_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            parse_vintage(raw(["901,2017,1","901,2017,1"]),"new")

    def test_schema_not_secretly_changed(self):
        with self.assertRaises(ValueError):
            parse_vintage(b"country,year,onset1\n901,2017,0\n","old")
        with self.assertRaises(ValueError):
            parse_vintage(raw(["bad,2017,1"]),"old")


if __name__=="__main__":
    unittest.main()
