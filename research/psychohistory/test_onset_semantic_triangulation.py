"""Fictional country IDs and values: semantic projection does not issue forecasts."""
import unittest
from onset_semantic_triangulation import parse,evaluate


def csvrows(*rows):
    return ("gwno_a,year,onset1\n"+"\n".join(rows)+"\n").encode()


class SemanticTriangulationTests(unittest.TestCase):
    def test_fixed_joint_population_and_stratified_causal_candidates(self):
        old=parse(csvrows("900,2017,1","901,2017,1","902,2017,0",
                          "903,2017,0","904,2017,1"),"old")
        country=parse(csvrows("900,2017,0","901,2017,0","902,2017,1",
                              "903,2017,0","904,2017,1"),"country")
        conflict=parse(csvrows("900,2017,1","901,2017,0","902,2017,1",
                               "903,2017,0","904,2017,1"),"conflict")
        v=evaluate(old,country,conflict)
        self.assertEqual(v["old_country_disagreements"],3)
        self.assertEqual(v["old_conflict_disagreements"],1)
        self.assertEqual(v["old_positive_country_negative_conflict_positive"],1)
        self.assertEqual(v["old_positive_country_negative_conflict_negative"],1)
        self.assertFalse(v["apparent_country_vs_conflict_alignment_proves_cause"])
        self.assertFalse(v["historical_training_authorized"])
        self.assertFalse(v["backtest_authorized"])
        self.assertNotIn("900",repr(v))

    def test_old_duplicate_projection_counts_all_and_conflict_rows(self):
        old=parse(csvrows("900,2017,1","900,2017,1","901,2017,0"),"old")
        country=parse(csvrows("900,2017,0","901,2017,0"),"country")
        conflict=parse(csvrows("900,2017,1","900,2017,1","901,2017,0"),"conflict")
        v=evaluate(old,country,conflict)
        self.assertEqual(v["old_duplicate_rows"],1)
        self.assertEqual(v["modern_conflict_duplicate_rows"],1)
        self.assertFalse(v["historic_semantic_identity_verified"])

    def test_unknown_is_not_implicitly_no_conflict(self):
        old=parse(csvrows("900,2017,","901,2017,0"),"old")
        country=parse(csvrows("900,2017,0","901,2017,0"),"country")
        conflict=parse(csvrows("900,2017,0","901,2017,0"),"conflict")
        v=evaluate(old,country,conflict)
        self.assertEqual(v["joint_unresolved"],1)
        self.assertEqual(v["joint_binary_evaluable_keys"],1)

    def test_conflicting_duplicate_is_counted_not_claimed_authenticated(self):
        old=parse(csvrows("900,2017,0","900,2017,1"),"old")
        self.assertEqual(old["conflicting_binary_keys"],1)
        country=parse(csvrows("900,2017,0"),"country")
        conflict=parse(csvrows("900,2017,1"),"conflict")
        r=evaluate(old,country,conflict)
        self.assertFalse(r["historical_training_authorized"])

    def test_modern_country_must_be_monadic(self):
        with self.assertRaises(ValueError):
            parse(csvrows("900,2017,0","900,2017,0"),"country")

    def test_missing_conflict_year_must_not_shrink_denominator(self):
        old=parse(csvrows("900,2017,0","901,2017,1"),"old")
        country=parse(csvrows("900,2017,0","901,2017,0"),"country")
        conflict=parse(csvrows("900,2017,0"),"conflict")
        with self.assertRaises(ValueError):evaluate(old,country,conflict)

    def test_horizon_and_bad_labels_rejected(self):
        for kind,rows in (
            ("old",("900,2018,1",)),
            ("country",("900,2025,1",)),
            ("conflict",("900,2017,maybe",)),
            ("old",("0,2017,1",)),
            ("old",("none,2017,0",)),
        ):
            with self.subTest(kind=kind,rows=rows),self.assertRaises(ValueError):
                parse(csvrows(*rows),kind)

if __name__=="__main__":
    unittest.main()
