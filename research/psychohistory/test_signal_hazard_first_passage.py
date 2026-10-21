"""AV084 synthetic adversarial signal tests; all reports are aggregate only."""
import copy
import unittest
from test_release_separated_holdout import make_version
from signal_hazard_first_passage import (
  old_lookup,signal,fit_signal_hazard,first_change_with_signal,evaluate,numeric)

class SignalHazardTests(unittest.TestCase):
 def test_signal_is_historical_deaths_not_outcome(self):
    historical={
      (1,2021):{"b":0,"deaths":2.0},(1,2022):{"b":0,"deaths":18.0},
      (2,2021):{"b":1,"deaths":100.0},(2,2022):{"b":1,"deaths":40.0},
      (3,2021):{"b":0,"deaths":4.0},(3,2022):{"b":1,"deaths":27.0}}
    self.assertEqual(signal(historical,1,2022),1)
    self.assertEqual(signal(historical,2,2022),1)
    self.assertEqual(signal(historical,3,2022),0)
    historical[1,2022]["deaths"]=9
    self.assertEqual(signal(historical,1,2022),0)
 def test_two_year_bridge_signal_is_not_conditioned_on_outcome(self):
    history=make_version("24.1",2023)
    old=old_lookup(history,2023)
    trained=fit_signal_hazard(old,2023)
    p=first_change_with_signal(0,2,1,trained)
    h2=trained["duration"]["rates"][0][1]
    self.assertAlmostEqual(p[1],(1-p[0])*h2)
    self.assertAlmostEqual(sum(p),1)
 def test_no_leak_on_2023_revisions_or_2024_changes(self):
    original=make_version("24.1",2023)
    later=make_version("26.1",2025)
    result=evaluate(original,later,2023)
    revised=copy.deepcopy(later)
    for row in revised:
      if int(row["year"])<=2023:row["sb_total_deaths_best"]="999"
    self.assertEqual(result,evaluate(original,revised,2023))
    future=copy.deepcopy(later)
    for row in future:
      if row["year"]=="2024" and row["country_id"]=="2":
        row["sb_total_deaths_best"]="999" if row["sb_total_deaths_best"]=="0" else "0"
    shifted=evaluate(original,future,2023)
    self.assertEqual(result["sourceSignal"]["trainedCellCounts"],shifted["sourceSignal"]["trainedCellCounts"])
    self.assertEqual(result["sourceSignal"]["flagCountsByRegime"],shifted["sourceSignal"]["flagCountsByRegime"])
    self.assertEqual(result["sourceSignal"]["meanPredictedEventRiskByRegimeAndFlag"],shifted["sourceSignal"]["meanPredictedEventRiskByRegimeAndFlag"])
    self.assertNotEqual(result["sourceSignal"]["observedFirstChangeOutcomeByRegimeAndFlag"],shifted["sourceSignal"]["observedFirstChangeOutcomeByRegimeAndFlag"])
    self.assertNotEqual(result["models"],shifted["models"])
    self.assertFalse(result["prospectiveSkillProven"])
    self.assertEqual(result["pairedUncertainty"]["draws"],2000)
    self.assertEqual(result["n"],8)
    self.assertEqual(sum(sum(sum(outcomes) for outcomes in flags) for flags in result["sourceSignal"]["observedFirstChangeOutcomeByRegimeAndFlag"]),8)
    self.assertEqual(sum(sum(row) for row in result["sourceSignal"]["flagCountsByRegime"]),8)
    self.assertNotIn('"country_id"',str(result))
 def test_missing_label_is_not_zero(self):
    original=make_version("24.1",2023)
    later=make_version("26.1",2025)
    cut=[row for row in later if not(row["country_id"]=="1" and row["year"]=="2025")]
    report=evaluate(original,cut,2023)
    self.assertEqual(report["n"],7)
    self.assertEqual(report["excludedMissing"],1)
 def test_duplicate_negative_nan_and_cutoff_refused(self):
    old=make_version("24.1",2023)
    later=make_version("26.1",2025)
    with self.assertRaises(ValueError):evaluate(old,later,2022)
    with self.assertRaises(ValueError):old_lookup(old+[old[0]],2023)
    for token in (-1,"nan","inf","",None):
      with self.assertRaises(ValueError):numeric(token)
    old[0]["sb_total_deaths_best"]="-2"
    with self.assertRaises(ValueError):evaluate(old,later,2023)

if __name__=="__main__":unittest.main()
