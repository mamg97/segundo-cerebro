"""All country codes synthetic; tests use no official country-year observations."""
import unittest
from hashlib import sha256
from unittest.mock import patch

from onset_provenance_types_av054 import audit_old_schema,typed_acd,compare

def onset(*rows):
    return ("gwno_a,year,onset1,newconf,onset5\n"+"\n".join(rows)+"\n").encode()

def acd(*rows):
    return ("year,conflict_id,type_of_conflict,gwno_loc\n"+"\n".join(rows)+"\n").encode()


class ProvenanceAndTypeTests(unittest.TestCase):
    def dataset(self):
        older=onset("900,2017,1,1,1","901,2017,1,1,1",
                    "902,2017,1,1,1","903,2017,1,1,1",
                    "904,2017,0,0,0")
        modern=onset("900,2017,0,0,0","901,2017,0,0,0",
                     "902,2017,0,0,0","903,2017,0,0,0",
                     "904,2017,0,0,0")
        a19=typed_acd(acd("2017,10,2,900","2017,11,1,901",
                          "2017,12,3,902","2017,13,4,902"),"19.1")
        a25=typed_acd(acd("2017,10,2,900","2017,12,3,902",
                          "2017,15,1,903"),"25.1")
        return older,modern,a19,a25

    def test_noninternal_types_explain_only_a_class_not_causes(self):
        old,modern,a,b=self.dataset()
        r=compare(old,modern,modern,a,b,strict=False)
        self.assertEqual(r["fixed_country_years"],5)
        self.assertEqual(r["old_newconf1_residual_cohort"],4)
        self.assertEqual(r["no_intrastate_acd_either_edition"],3)
        self.assertEqual(r["old_acd_type_membership_counts"]["noninternal_only"],2)
        self.assertEqual(r["new_acd_type_membership_counts"]["noninternal_only"],2)
        self.assertEqual(r["cross_vintage_type_classifications"]["internal_only:internal_only"],1)
        self.assertEqual(r["nonintrastate_type_occurrences_within_no_internal_subgroup"]["acd191:interstate"],1)
        self.assertEqual(r["nonintrastate_type_occurrences_within_no_internal_subgroup"]["acd191:extrasystemic"],1)
        self.assertFalse(r["zero_matching_rows_means_zero_conflict_in_reality"])
        for field in ("same_edited_onset_target_as_modern_verified","asof_source_bytes_pre2020_verified",
                      "country_frame_asof_verified","model_training_authorised",
                      "backtest_authorised","forecast_issued"):
            self.assertFalse(r[field])
        self.assertNotIn("900",str(r))

    def test_noninternal_mixed_with_internal_is_not_sole_category(self):
        raw=acd('2017,5,2,"900,901"',"2017,6,3,900")
        v=typed_acd(raw,"19.1")
        self.assertEqual(v["types"][(900,2017)],{2,3})
        self.assertEqual(v["types"][(901,2017)],{2})

    def test_missing_location_is_unresolved_not_peace(self):
        v=typed_acd(acd("2017,5,1,","2017,6,3,900"),"19.1")
        self.assertEqual(v["unresolved_global_location_rows"],1)
        self.assertEqual(v["types"][(900,2017)],{3})

    def test_old_codebook_2018_gap_and_duplicated_keys_cannot_be_admitted(self):
        raw=onset("900,2017,1,1,1","900,2017,1,1,1","901,2017,0,0,0")
        with patch("onset_provenance_types_av054.EXPECTED_OLD_SHA",sha256(raw).hexdigest()):
            x=audit_old_schema(raw)
        self.assertEqual(x["old_actual_rows"],3)
        self.assertEqual(x["old_actual_unique_country_year_keys"],2)
        self.assertEqual(x["old_extra_rows_beyond_unique_country_year"],1)
        self.assertEqual(x["old_actual_year_max"],2017)
        self.assertFalse(x["old_has_any_2018_rows"])
        self.assertFalse(x["old_monadic_granularity_as_documented_verified"])
        self.assertFalse(x["old_is_complete_codebook19_1_vintage_verified"])

    def test_checksum_mismatch_blocks_relabel(self):
        with self.assertRaises(ValueError):
            audit_old_schema(onset("900,2017,1,1,1"))

    def test_outside_period_or_bad_codes_rejected(self):
        for data in (acd("2019,8,1,900"),acd("2017,8,5,900"),
                     acd("2017,0,3,900"),acd("2017,a,1,900"),
                     b"conflict_id,year,type_of_conflict\n8,2017,1\n"):
            with self.subTest(data=data),self.assertRaises(ValueError):
                typed_acd(data,"19.1")

    def test_synthetic_records_never_pass_real_fixed_cohort(self):
        old,modern,a,b=self.dataset()
        with self.assertRaises(ValueError):
            compare(old,modern,modern,a,b,strict=True)


if __name__=="__main__":
    unittest.main()
