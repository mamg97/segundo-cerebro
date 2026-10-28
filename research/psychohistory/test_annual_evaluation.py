"""Invented country forecasts/source bytes only; no real outcomes or emissions."""
import contextlib
import copy
from fractions import Fraction
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import annual_evaluation as evaluation
from annual_publication import make_plan
from cohort_2027_precommit import prepare
from test_issue_2027_preflight import imaginary_report

NOW = '2028-08-01T00:00:00Z'
POLICY = json.loads((evaluation.HERE/'policy_2027.json').read_text())


class AnnualEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='SYNTHETIC_ANNUAL_EVALUATION_')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.candidate = self.root/'candidate.json'
        self.candidate.write_bytes(evaluation.canonical(imaginary_report(canonical=True)))
        self.bundle = self.root/'bundle'
        prepare(self.candidate, self.bundle)
        self.plan = make_plan(self.candidate, self.bundle, spreadsheet_id='SYNTHETIC-SHEET',
                             issue_date='2026-10-27', source_observed_at='2026-10-26T01:00:00Z')
        self.rows = evaluation.frozen_rows(self.plan, POLICY)

    def source(self, records=None, header='country_id,year,Version,sb_total_deaths_best', version='28.1'):
        if records is None:
            records = ['10000,2027,28.1,24', '10001,2027,28.1,25', '10002,2027,28.1,',
                       '10003,2026,28.1,100', '9999,2027,28.1,0']
        with zipfile.ZipFile(self.root/'ucdp.zip', 'w') as archive:
            archive.writestr('SYNTHETIC.csv', header+'\n'+'\n'.join(records)+'\n')
        (self.root/'codebook.pdf').write_bytes(b'%PDF-SYNTHETIC-NOT-A-REAL-CODEBOOK')
        return dict(schema='psychohistory.annual_outcome_source_pin.v1', version=version,
                    archiveSha256=evaluation.sha((self.root/'ucdp.zip').read_bytes()),
                    codebookSha256=evaluation.sha((self.root/'codebook.pdf').read_bytes()),
                    capturedAtUtc='2028-07-01T00:00:00Z')

    def test_threshold_absence_and_extra_entity_do_not_impute_or_expand_roster(self):
        y, missing, proof = evaluation.load_outcomes(self.root, self.source(), observed_now=NOW)
        self.assertEqual(y, {10000:0, 10001:1, 9999:0})
        self.assertEqual(missing, {10002})
        report = evaluation.compare(self.rows, y, missing)
        coverage = report['coverage']
        self.assertEqual(coverage['resolvedCountries'], 2)
        self.assertEqual(coverage['missingValueCountryIds'], [10002])
        self.assertEqual(len(coverage['absentCountryIds']), 193)
        self.assertEqual(coverage['extraSourceCountryIds'], [9999])
        self.assertEqual(coverage['imputedOutcomes'], 0)
        self.assertTrue(all(m['n']==2 for m in report['models'].values()))
        self.assertFalse(proof['officialOriginVerified'])
        self.assertFalse(proof['firstReleaseVerified'])

    def test_paired_scores_match_exact_fraction_arithmetic_and_not_sixfold_n(self):
        countries = {i:{m:float(Fraction((i+j)%9+1,10)) for j,m in enumerate(evaluation.MODELS)}
                     for i in range(1,11)}
        y = {i:int(i%3==0) for i in countries}
        report = evaluation.compare(countries, y, set())
        for model in evaluation.MODELS:
            exact = sum((Fraction(str(countries[i][model]))-y[i])**2 for i in countries)/10
            self.assertAlmostEqual(report['models'][model]['brier'], float(exact), places=14)
            self.assertEqual(report['models'][model]['n'], 10)
        primary = report['primary']
        a,b = (report['models'][m]['brier'] for m in ('v2_logistic','frequency'))
        self.assertAlmostEqual(primary['brierDifference'],a-b)
        self.assertAlmostEqual(primary['brierSkill'],1-a/b)
        self.assertEqual(primary['countryBootstrapSensitivity']['n_countries'],10)
        self.assertEqual(report,evaluation.compare(dict(reversed(list(countries.items()))),y,set()))

    def test_zero_baseline_and_zero_resolved_have_undefined_skill_not_infinity(self):
        rows={i:{m:0.0 for m in evaluation.MODELS} for i in range(1,4)}
        report=evaluation.compare(rows,{1:0,2:0,3:0},set())
        self.assertIsNone(report['primary']['brierSkill'])
        self.assertIsNone(report['models']['frequency']['average_precision'])
        empty=evaluation.compare(rows,{}, {1,2,3})
        self.assertIsNone(empty['primary'])
        self.assertTrue(all(m['n']==0 and m['brier'] is None for m in empty['models'].values()))

    def test_frozen_roster_model_and_probability_corruption_rejected(self):
        for kind in ('missing','duplicate','model','baseline','nan','bool','outcome','policy'):
            plan=copy.deepcopy(self.plan)
            if kind=='missing':plan['rows'].pop()
            if kind=='duplicate':plan['rows'][-1]=plan['rows'][0]
            if kind=='model':plan['rows'][0][10]='ucdp261-2027-tuned'
            if kind=='baseline':plan['rows'][0][12]=.9
            if kind=='nan':plan['rows'][0][7]=float('nan')
            if kind=='bool':plan['rows'][0][7]=True
            if kind=='outcome':plan['rows'][0][8]=0
            if kind=='policy':plan['policySha256']='0'*64
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                evaluation.frozen_rows(plan,POLICY)

    def test_invalid_count_duplicate_identity_version_and_csv_rejected(self):
        for records in (['1,2027,28.1,-1'], ['1,2027,28.1,NaN'], ['1,2027,28.1,2.5'],
                        ['1,2027,28.1,inf'], ['1,2027,28.1,banana'], ['1,2027,29.1,25'],
                        ['1,2027,28.1,25']*2, ['1.0,2027,28.1,25'], ['1,2027.0,28.1,25'],
                        ['1,2027,28.1,25,extra'], ['1,2027,28.1'], ['1,2026,28.1,25']):
            with self.subTest(records=records),self.assertRaises(ValueError):
                evaluation.load_outcomes(self.root,self.source(records),observed_now=NOW)
        with self.assertRaises(ValueError):
            evaluation.load_outcomes(self.root,self.source(header='country_id,year,year,sb_total_deaths_best'),observed_now=NOW)

    def test_source_hash_capture_and_caller_approval_flags_cannot_bypass_gates(self):
        pin=self.source()
        for changes in ({'archiveSha256':'0'*64},{'codebookSha256':'0'*64},
                        {'capturedAtUtc':'2027-12-31T23:59:59Z'},
                        {'capturedAtUtc':'2028-08-02T00:00:00Z'}, {'firstReleaseVerified':True}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):
                evaluation.load_outcomes(self.root,{**pin,**changes},observed_now=NOW)
        # The production clock now is 2026: a locally invented 2028 capture fails.
        with self.assertRaises(ValueError):
            evaluation.load_outcomes(self.root,pin,observed_now='2026-10-28T00:00:00Z')

    def test_archive_ambiguity_and_codebook_nonpdf_fail(self):
        pin=self.source()
        with zipfile.ZipFile(self.root/'ucdp.zip','a') as archive:
            archive.writestr('other.csv','SYNTHETIC')
        pin['archiveSha256']=evaluation.sha((self.root/'ucdp.zip').read_bytes())
        with self.assertRaises(ValueError):evaluation.load_outcomes(self.root,pin,observed_now=NOW)
        pin=self.source();(self.root/'codebook.pdf').write_bytes(b'not PDF')
        pin['codebookSha256']=evaluation.sha((self.root/'codebook.pdf').read_bytes())
        with self.assertRaises(ValueError):evaluation.load_outcomes(self.root,pin,observed_now=NOW)

    def test_cli_composed_rehearsal_preserves_originals_and_cannot_admit(self):
        plan_path=self.root/'plan.json';plan_path.write_bytes(evaluation.canonical(self.plan))
        pin_path=self.root/'pin.json';pin_path.write_bytes(evaluation.canonical(self.source()))
        config=dict(candidate_path=str(self.candidate),bundle=str(self.bundle),plan_path=str(plan_path),
                    source_dir=str(self.root),pin_path=str(pin_path))
        config_path=self.root/'config.json';config_path.write_text(json.dumps(config))
        out=self.root/'report.json'
        original={p:p.read_bytes() for p in (self.candidate,plan_path,pin_path)}
        with patch.object(sys,'argv',['annual_evaluation','--config',str(config_path),'--out',str(out)]), \
                patch.object(evaluation,'datetime') as clock, contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(io.StringIO()):
            clock.now.return_value=evaluation.utc(NOW)
            evaluation.main()
            report=json.loads(out.read_text())
            for key in ('forecastIssued','canonicalRowsResolved','evaluationEligible','predictiveSkillDemonstrated'):
                self.assertIs(report[key],False)
            self.assertEqual(report['status'],'OFFLINE_CANDIDATE_NOT_ADMITTED')
            self.assertEqual(out.stat().st_mode & 0o777,0o600)
            with self.assertRaises(SystemExit):evaluation.main()  # Never overwrite.
        self.assertEqual(original,{p:p.read_bytes() for p in original})
        changed=copy.deepcopy(self.plan);changed['rows'][0][7]=.99
        plan_path.write_bytes(evaluation.canonical(changed))
        with self.assertRaisesRegex(ValueError,'Plan differs'):evaluation.run(**config)


if __name__=='__main__':unittest.main()
