"""AV-082 synthetic separation of 23.1 (train) and 25.1 (labels)."""
import copy,hashlib,tempfile,unittest
from unittest import mock
from pathlib import Path
import historic23_holdout_2024 as base
from test_historic23_holdout_2024 import xlsx_blob,outcome_zip
from historic23_first_passage_2024 import evaluate,run

class Historic23FirstPassageTests(unittest.TestCase):
 def setUp(self):
    self.tmp=tempfile.TemporaryDirectory(prefix="SYNTHETIC_AV082_")
    self.addCleanup(self.tmp.cleanup)
    self.old=Path(self.tmp.name)/"old.xlsx"
    self.new=Path(self.tmp.name)/"new.zip"
    self.old.write_bytes(xlsx_blob())
    self.new.write_bytes(outcome_zip())
    self.pinold=hashlib.sha256(self.old.read_bytes()).hexdigest()
    self.pinnew=hashlib.sha256(self.new.read_bytes()).hexdigest()
 def report(self):
    with mock.patch.object(base,"PIN_231",self.pinold),mock.patch.object(base,"PIN_251",self.pinnew):
        return run(self.old,self.new)
 def test_2023_bridge_2024_endpoint_and_no_25_1_fit(self):
    r=self.report()
    self.assertEqual(r["trainingCutoff"],2022)
    self.assertEqual(r["bridgeYearIntegratedNotObserved"],2023)
    self.assertEqual(r["evaluable"],7)
    self.assertEqual(r["firstChange2023"]+r["firstChange2024"]+r["noChangeBy2024"],7)
    self.assertEqual(r["initialLow"]+r["initialHigh"],7)
    uncertainty=r["descriptivePairedUncertainty"]
    self.assertEqual(uncertainty["origin"],2024)
    self.assertEqual(uncertainty["nCountries"],7)
    self.assertEqual(uncertainty["last_training_year"],2022)
    self.assertFalse(uncertainty["prospectiveSkillProven"])
    self.assertAlmostEqual(uncertainty["comparisonsVsPersistence"]["country_shrinkage"]["meanDeltaBrier"],r["models"]["country_shrinkage"]["brierFirstEvent"]-r["models"]["persistence"]["brierFirstEvent"])
    self.assertEqual(r["modelsRecalibratedWithLaterRelease"],False)
    self.assertEqual(r["prospectiveSkillProven"],False)
    self.assertNotIn("SYNTHETIC_1",str(r))
 def test_outcome_2022_revisions_change_drift_not_probabilities(self):
    before=self.report()
    self.new.write_bytes(outcome_zip(change_hist=True))
    self.pinnew=hashlib.sha256(self.new.read_bytes()).hexdigest()
    after=self.report()
    self.assertEqual(before["trainedParameterSetSha256"],after["trainedParameterSetSha256"])
    self.assertEqual(before["models"],after["models"])
    self.assertNotEqual(before["revised2022ThresholdChanges"],after["revised2022ThresholdChanges"])
 def test_outcome_2024_change_does_not_change_fitted_parameters(self):
    before=self.report()
    self.new.write_bytes(outcome_zip(change_future=True))
    self.pinnew=hashlib.sha256(self.new.read_bytes()).hexdigest()
    after=self.report()
    self.assertEqual(before["trainedParameterSetSha256"],after["trainedParameterSetSha256"])
    self.assertNotEqual(before["models"],after["models"])
 def test_missing_2024_excluded_from_private_scoring_without_imputation(self):
    with mock.patch.object(base,"PIN_231",self.pinold):
        old,_=base.rows_23_xlsx(self.old,self.pinold)
    rows,_=base.bounded_zip(self.new,self.pinnew,base.NEW_VERSION)
    rows=[r for r in rows if not(r["year"]=="2024" and r["country_id"]=="3")]
    scored=evaluate(old,rows)
    self.assertEqual(scored["evaluable"],6)
    self.assertEqual(scored["missingOutcome"],1)
    self.assertEqual(scored["firstChange2023"]+scored["firstChange2024"]+scored["noChangeBy2024"],6)
 def test_wrong_source_hash_refused(self):
    with self.assertRaisesRegex(ValueError,"Historic 23.1 XLSX bytes changed|not preregistered"):
        run(self.old,self.new)
    with mock.patch.object(base,"PIN_231",self.pinold),mock.patch.object(base,"PIN_251","0"*64):
        with self.assertRaisesRegex(ValueError,"SHA256 mismatch"):
            run(self.old,self.new)

if __name__=="__main__":unittest.main()
