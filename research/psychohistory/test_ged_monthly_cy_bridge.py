"""AV085 synthetic cross-product controls, no real countries or incidents."""
import copy,csv,hashlib,io,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
from test_release_separated_holdout import make_version
from ged_monthly_cy_bridge import ged_features,summary,bucket,archive_probe

def create(path,events):
    fields=["id","country_id","year","type_of_violence","best","date_start","date_end","date_prec"]
    buf=io.StringIO();wr=csv.DictWriter(buf,fieldnames=fields)
    wr.writeheader();wr.writerows(events)
    with zipfile.ZipFile(path,"w") as z:z.writestr("ged.csv",buf.getvalue())
    return hashlib.sha256(path.read_bytes()).hexdigest()

def event(ident,country,when,kind=1,best=4,prec=1,end=None):
    return {"id":ident,"country_id":country,"year":int(when[:4]),"type_of_violence":kind,
    "best":best,"date_start":when,"date_end":end or when,"date_prec":prec}

class BridgeTests(unittest.TestCase):
 def test_bucket_boundaries_and_train_only_annual_roster(self):
    self.assertEqual([bucket(v) for v in (0,1,2,4,5,100)],[0,1,2,2,3,3])
    old=make_version("24.1",2023);new=make_version("26.1",2025)
    r=summary(old,new,{1:5,2:1,500:100},2023,{1:2})
    self.assertEqual(r["nCountries"],8)
    self.assertEqual(sum(x["n"] for x in r["cells"]),8)
    self.assertEqual(sum(x["n"] for x in r["lastQuarterOctoberToDecember"]),8)
    self.assertEqual(sum(x["n"] for x in r["lastQuarterOctoberToDecember"] if x["exactLethalEventRecordedInLast3Months"]),1)
    self.assertFalse(r["realTimeIssueAvailabilityVerified"])
    self.assertFalse(r["crossProductTargetIdentical"])
    self.assertNotIn('"country_id"',str(r))
    self.assertNotIn("FICTIONAL",str(r))
 def test_future_edits_change_only_outcome_counts_not_feature_coverage(self):
    old=make_version("24.1",2023);later=make_version("26.1",2025)
    original=summary(old,later,{1:5,2:1},2023,{1:2})
    revised=copy.deepcopy(later)
    for r in revised:
        if int(r["year"])<=2023:r["sb_total_deaths_best"]="999"
    self.assertEqual(original,summary(old,revised,{1:5,2:1},2023,{1:2}))
    changed=copy.deepcopy(later)
    for r in changed:
        if r["year"]=="2024" and r["country_id"]=="2":r["sb_total_deaths_best"]="999"
    out=summary(old,changed,{1:5,2:1},2023,{1:2})
    self.assertEqual(out["countriesWithPositiveExactGEDLocations"],original["countriesWithPositiveExactGEDLocations"])
    self.assertNotEqual(out["cells"],original["cells"])
 def test_unobserved_future_not_imputed_to_zero(self):
    old=make_version("24.1",2023);later=make_version("26.1",2025)
    later=[x for x in later if not (x["year"]=="2024" and x["country_id"]=="1")]
    a=summary(old,later,{},2023,{})
    self.assertEqual(a["missingOutcomeCountries"],1);self.assertEqual(a["nCountries"],7)
 def test_strict_ged_digest_and_date_type_scope(self):
    with tempfile.TemporaryDirectory() as folder:
        path=Path(folder)/"old.zip"
        sha=create(path,[event(1,1,"2022-12-01"),event(2,1,"2022-12-03",prec=3),
           event(3,2,"2022-10-04",kind=2),event(4,3,"2022-11-12",best=0),
           event(5,4,"2022-01-01",end="2022-01-10"),event(6,5,"2021-12-30")])
        import ged_monthly_cy_bridge as mod
        with patch.dict(mod.GED_RELEASES[2022],{"sha256":sha}):
            with self.assertRaisesRegex(ValueError,"Inadequate"):
                ged_features(path,2022,expected_sha=sha)
            # In TEST only, lower row-completeness guard; production CLI remains 10k.
            with patch.object(mod,"MIN_EXPECTED_ROWS",1):
                counts,recent,quality=ged_features(path,2022,expected_sha=sha)
            self.assertEqual(counts[1],1)
            self.assertEqual(recent[1],1)
            self.assertEqual(sum(counts.values()),1)
            self.assertEqual(quality["excludedCutoffYear"]["imprecise_date"],1)
            self.assertEqual(quality["excludedCutoffYear"]["non_state_based"],1)
            self.assertEqual(quality["excludedCutoffYear"]["nonlethal_best"],1)
            self.assertEqual(quality["excludedCutoffYear"]["non_exact_day_or_misaligned_year"],1)
        with self.assertRaisesRegex(ValueError,"pinned"):
            ged_features(path,2022,expected_sha="f"*64)
        self.assertEqual(archive_probe(path)["zip_sha256_observed_today"],sha)
 def test_no_future_ged_rows_admitted_and_bad_annual_cutoff(self):
    old=make_version("24.1",2023);later=make_version("26.1",2025)
    with self.assertRaisesRegex(ValueError,"cutoff"):
        summary(old,later,{},2022,{})
    with self.assertRaises(ValueError):
        bucket(-1)
    with self.assertRaisesRegex(ValueError,"Quarter evidence"):
        summary(old,later,{1:1},2023,{1:2})

if __name__=="__main__":unittest.main()
