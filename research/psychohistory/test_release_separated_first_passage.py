"""AV-080 synthetic adversarial source separation tests; no external bytes."""
import copy
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from release_separated_holdout import PROTOCOL, bounded_zip
from test_release_separated_holdout import make_version, zipped
from release_separated_first_passage import evaluate_rows,run,first_passage_bins

class ReleaseSeparatedFirstPassageTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory(prefix="SYNTHETIC_VINTAGE_")
        self.addCleanup(self.folder.cleanup)
        self.old=Path(self.folder.name)/"old.zip"
        self.new=Path(self.folder.name)/"new.zip"
        self.v24=make_version("24.1",2023)
        self.v26=make_version("26.1",2025)
        self.s24=zipped(self.old,self.v24)
        self.s26=zipped(self.new,self.v26)
    def report(self):
        with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
            return run(self.old,self.new,self.s24,self.s26)
    def test_first_passage_conserves_mass_and_does_not_reenter(self):
        matrix=[[.8,.2,0,0],[0,0,.4,.6],[.7,.3,0,0],[0,0,.3,.7]]
        p=first_passage_bins(3,matrix)
        self.assertAlmostEqual(p[0],.3)
        self.assertAlmostEqual(p[1],.7*.3)
        self.assertAlmostEqual(p[2],.7*.7)
        self.assertAlmostEqual(sum(p),1)
    def test_v24_only_fits_v26_only_scores_two_year_first_event(self):
        x=self.report()
        self.assertEqual(x["training_cutoff"],2023)
        self.assertEqual(x["bridge_year_integrated_not_conditioned"],2024)
        self.assertEqual(x["hypothetical_issue_year"],2025)
        self.assertEqual(x["n_evaluable"],8)
        self.assertEqual(sum(x[k] for k in
            ("event_first_2024","event_first_2025","no_event_by_2025")),8)
        self.assertTrue(all(x["models"][m]["mean_first_passage_brier"]>=0
            for m in ["markov","persistence","memory2","country_shrinkage","frequency"]))
        self.assertFalse(x["forecast_issued"])
        self.assertFalse(x["original_24_1_available_by_2025_issue_independently_attested"])
    def test_v26_revised_2023_cannot_change_training_or_scores(self):
        before=self.report()
        revised=copy.deepcopy(self.v26)
        for row in revised:
            if int(row["year"])<=2023:
                row["sb_total_deaths_best"]="999"
        self.s26=zipped(self.new,revised)
        after=self.report()
        self.assertEqual(before["frozen_parameter_set_sha256"],after["frozen_parameter_set_sha256"])
        self.assertEqual(before["models"],after["models"])
        self.assertNotEqual(before["revised_2023_labels_changed"],after["revised_2023_labels_changed"])
    def test_future_outcome_changes_score_not_frozen_fit(self):
        before=self.report()
        edited=copy.deepcopy(self.v26)
        for row in edited:
            if int(row["year"])==2024 and row["country_id"]=="2":
                row["sb_total_deaths_best"]="999" if row["sb_total_deaths_best"]=="0" else "0"
        self.s26=zipped(self.new,edited)
        after=self.report()
        self.assertEqual(before["frozen_parameter_set_sha256"],after["frozen_parameter_set_sha256"])
        self.assertNotEqual(before["models"],after["models"])
    def test_missing_2024_never_becomes_zero_or_no_event(self):
        rows=[r for r in self.v26 if not(r["year"]=="2024" and r["country_id"]=="1")]
        self.s26=zipped(self.new,rows)
        # Strict official intake correctly rejects gaps. Test missing-label
        # scoring separately without weakening archive integrity.
        data=evaluate_rows(self.v24,rows)
        self.assertEqual(data["n_evaluable"],7)
        self.assertEqual(data["missing_one_or_more_future_labels"],1)
        self.assertEqual(sum(data[k] for k in
            ("event_first_2024","event_first_2025","no_event_by_2025")),7)
    def test_wrong_zip_hash_rejected_and_no_rows_exposed(self):
        with self.assertRaisesRegex(ValueError,"Archive bytes changed|SHA256 mismatch"):
            with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
                run(self.old,self.new,"0"*64,self.s26)
        s=self.report()
        self.assertFalse(any("country_id" in k for k in s))
        self.assertNotIn("SYNTHETIC_1",str(s))

if __name__=="__main__":unittest.main()
