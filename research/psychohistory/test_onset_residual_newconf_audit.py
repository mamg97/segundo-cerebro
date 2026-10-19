"""Completely fictional 4-country data; never use model scores or real IDs."""
import unittest
from onset_residual_newconf_audit import audit,read_flags

def source(*lines):
    return ("gwno_a,year,onset1,newconf,onset5\n"+"\n".join(lines)+"\n").encode()


class NewconfResidualTests(unittest.TestCase):
    def inputs(self):
        old=source("900,2017,1,1,1","901,2017,1,0,0",
                   "902,2017,0,0,0","903,2017,0,0,0")
        country=source("900,2017,0,0,0","901,2017,0,0,0",
                       "902,2017,1,1,1","903,2017,0,0,0")
        conflict=source("900,2017,0,0,0","901,2017,1,1,1",
                        "902,2017,1,1,1","903,2017,0,0,0")
        return old,country,conflict

    def test_residual_newconf_is_descriptive_not_causal(self):
        r=audit(*self.inputs(),strict=False)
        self.assertEqual(r["fixed_pairwise_keys"],4)
        self.assertEqual(r["principal_residuals"],1)
        self.assertEqual(r["old_positive_country_negative_conflict_positive"],1)
        self.assertEqual(r["old_negative_both_modern_positive"],1)
        self.assertEqual(r["old_newconf_by_subgroup"]["residual85:newconf_1"],1)
        self.assertEqual(r["modern_country_newconf_by_subgroup"]["residual85:newconf_0"],1)
        self.assertEqual(r["residual_by_era"]["2000-2017"],1)
        self.assertEqual(r["residual_by_year_aggregate"]["2017"],1)
        for key in ("residual_causes_adjudicated","same_historical_target_verified",
                    "historical_training_authorized","backtest_authorized",
                    "models_scored","forecast_issued"):
            self.assertFalse(r[key])
        self.assertNotIn("900",str(r))

    def test_strict_sample_cannot_claim_real_10130_cohort(self):
        with self.assertRaises(ValueError):
            audit(*self.inputs())

    def test_duplicate_country_projection_counts_any_but_does_not_train(self):
        old,country,conflict=self.inputs()
        old=old+b"900,2017,0,0,0\n"
        r=audit(old,country,conflict,strict=False)
        self.assertEqual(r["principal_residuals"],1)
        self.assertFalse(r["same_historical_target_verified"])

    def test_unknown_newconf_is_preserved(self):
        old,country,conflict=self.inputs()
        old=old.replace(b"900,2017,1,1,1",b"900,2017,1,,1")
        r=audit(old,country,conflict,strict=False)
        self.assertEqual(r["old_newconf_by_subgroup"]["residual85:newconf_unknown"],1)

    def test_invalid_revisions_rejected(self):
        old,_,_=self.inputs()
        for corrupt in (old.replace(b"1,1,1",b"1,2,1"),
                        old.replace(b"onset5",b"something"),
                        old.replace(b"900,2017",b"900,2018"),
                        old.replace(b"900,2017",b"0,2017"),
                        b"not csv"):
            with self.subTest(raw=corrupt),self.assertRaises(ValueError):
                read_flags(corrupt,"old")

    def test_label_shift_never_silently_changes_era(self):
        old,country,conflict=self.inputs()
        conflict=conflict.replace(b"903,2017",b"903,2016")
        with self.assertRaises(ValueError):
            audit(old,country,conflict)

if __name__=="__main__":
    unittest.main()
