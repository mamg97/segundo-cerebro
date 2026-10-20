"""Synthetic, offline, adversarial uncertainty checks; never write case-level outputs."""
import copy
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from test_release_separated_holdout import make_version,zipped
from release_separated_holdout import PROTOCOL
from release_separated_first_passage import evaluate_rows
from release_first_passage_uncertainty import paired_country_losses,uncertainty_summary,run

class AV081ReleaseHoldoutUncertainty(unittest.TestCase):
 def setUp(self):
    self.temp=tempfile.TemporaryDirectory(prefix="SYNTHETIC_AV081_")
    self.addCleanup(self.temp.cleanup)
    self.old=Path(self.temp.name)/"old.zip"
    self.new=Path(self.temp.name)/"new.zip"
    self.v24=make_version("24.1",2023)
    self.v26=make_version("26.1",2025)
    self.s24=zipped(self.old,self.v24)
    self.s26=zipped(self.new,self.v26)
 def report(self):
    with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
        return run(self.old,self.new,self.s24,self.s26,repetitions=200,seed=123)
 def test_paired_brier_matches_av080_and_is_repeatable(self):
    summary=self.report()
    self.assertEqual(summary,self.report())
    scores=paired_country_losses(self.v24,self.v26)
    av080=evaluate_rows(self.v24,self.v26)
    self.assertEqual(summary["nCountries"],av080["n_evaluable"])
    for model in av080["models"]:
        ours=sum(x["losses"][model] for x in scores)/len(scores)
        self.assertAlmostEqual(ours,av080["models"][model]["mean_first_passage_brier"])
    self.assertEqual(summary["nInitialLow"]+summary["nInitialHigh"],len(scores))
    self.assertEqual(summary["eventRate"]["observedFirstChange"]+summary["eventRate"]["nNoChange"],len(scores))
    self.assertFalse(summary["prospectiveSkillProven"])
    self.assertFalse(summary["prespecifiedConfirmatoryTest"])
    self.assertNotIn("SYNTHETIC_1",str(summary))
    self.assertNotIn('"country":',str(summary))
 def test_revised_2023_rows_cannot_change_scores_or_uncertainty(self):
    baseline=self.report()
    modified=copy.deepcopy(self.v26)
    for row in modified:
        if int(row["year"])<=2023:
            row["sb_total_deaths_best"]="999"
    self.s26=zipped(self.new,modified)
    self.assertEqual(self.report()["comparisonsVsPersistence"],baseline["comparisonsVsPersistence"])
    self.assertEqual(self.report()["eventRate"],baseline["eventRate"])
 def test_changed_2024_outcomes_change_only_scoring_not_fit(self):
    original=self.report()
    changed=copy.deepcopy(self.v26)
    for row in changed:
        if row["year"]=="2024" and row["country_id"]=="2":
            row["sb_total_deaths_best"]="999" if row["sb_total_deaths_best"]=="0" else "0"
    self.s26=zipped(self.new,changed)
    after=self.report()
    self.assertNotEqual(after["eventRate"],original["eventRate"])
    self.assertNotEqual(after["comparisonsVsPersistence"],original["comparisonsVsPersistence"])
 def test_missing_labels_not_imputed_and_hash_guard_remains_strict(self):
    with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
        with self.assertRaises(ValueError):
            run(self.old,self.new,"0"*64,self.s26,200,123)
    incomplete=[r for r in self.v26 if not (r["year"]=="2024" and r["country_id"]=="1")]
    cases=paired_country_losses(self.v24,incomplete)
    self.assertEqual(len(cases),7)
    with self.assertRaisesRegex(ValueError,"Invalid"):
        uncertainty_summary(cases,12,123)
    with self.assertRaisesRegex(ValueError,"Invalid"):
        uncertainty_summary(cases,200,-1)
 def test_duplicate_countries_rejected_and_zero_crossing_flags_consistent(self):
    cases=paired_country_losses(self.v24,self.v26)
    with self.assertRaisesRegex(ValueError,"duplicate"):
        uncertainty_summary(cases+[cases[0]],200,123)
    summary=uncertainty_summary(cases,200,123)
    for row in summary["comparisonsVsPersistence"].values():
        lo,hi=row["descriptivePairedBootstrap95"]
        self.assertEqual(row["bootstrapIntervalContainsZero"],lo<=0<=hi)

if __name__=="__main__": unittest.main()
