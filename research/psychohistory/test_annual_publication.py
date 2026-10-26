"""Synthetic registration fixtures; no external writes or real forecasts."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import annual_publication as annual
from cohort_2027_precommit import prepare
from test_issue_2027_preflight import imaginary_report


def snapshot(rows, capacity=1500):
    return {'structuredContent': {'spreadsheetId': 'SYNTHETIC-SHEET', 'sheets': [{
        'properties': {'title': annual.TAB, 'gridProperties': {'rowCount': capacity, 'columnCount': 13}},
        'data': [{'rowData': [{'values': [({'userEnteredValue': {
            'numberValue' if type(v) in (int,float) else 'stringValue': v}} if v != '' else {})
            for v in row]} for row in rows]}]}]}}


class AnnualPublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='SYNTHETIC_ANNUAL_')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.candidate = self.root/'candidate.json'
        self.candidate.write_bytes(annual.canonical(imaginary_report(canonical=True)))
        self.bundle = self.root/'bundle'
        prepare(self.candidate, self.bundle)
        self.plan = annual.make_plan(self.candidate, self.bundle, spreadsheet_id='SYNTHETIC-SHEET',
                                     issue_date='2026-10-26', source_observed_at='2026-10-26T01:00:00Z')
        self.old = ['SYNTHETIC-EXISTING','V2','SYNTHETIC','SYNTHETIC','SYNTHETIC',
                    '2026-10-01','',.25,'','EMITIDA_EXPERIMENTAL','SYNTHETIC','',.2]
        self.before = snapshot([annual.HEADER,self.old],300)
        self.after = snapshot([annual.HEADER,self.old]+self.plan['rows'])

    def test_plan_contains_all_models_stable_ids_baselines_and_unknown_release(self):
        other = annual.make_plan(self.candidate,self.bundle, spreadsheet_id='SYNTHETIC-SHEET',
                                  issue_date='2026-10-26', source_observed_at='2026-10-26T01:00:00Z')
        self.assertEqual(self.plan,other)
        self.assertEqual(len(self.plan['rows']),1176)
        self.assertEqual(len({r[0] for r in self.plan['rows']}),1176)
        self.assertTrue(all(r[6]==r[8]=='' and r[12]==.05 for r in self.plan['rows']))
        self.assertFalse(self.plan['forecastIssued'])
        self.assertFalse(self.plan['resolutionDateKnown'])

    def test_canonical_original_drift_rejected(self):
        payload=json.loads(self.candidate.read_text());payload['candidates'][0]['probabilities']['frequency']=.99
        self.candidate.write_bytes(annual.canonical(payload))
        with self.assertRaises(ValueError):
            annual.make_plan(self.candidate,self.bundle,spreadsheet_id='SYNTHETIC-SHEET',
                             issue_date='2026-10-26',source_observed_at='2026-10-26T01:00:00Z')

    def test_complete_append_preserves_existing_prediction(self):
        result=annual.check_append(self.plan,self.before,self.after)
        self.assertEqual(result,dict(firstRow=3,lastRow=1178,rowsAppended=1176,existingRowsPreserved=1))

    def test_missing_duplicate_altered_probability_and_old_row_rejected(self):
        rows=[annual.HEADER,self.old]+self.plan['rows']
        for kind in ('missing','duplicate','probability','previous','outcome'):
            changed=copy.deepcopy(rows)
            if kind=='missing':changed.pop()
            if kind=='duplicate':changed.append(changed[-1])
            if kind=='probability':changed[-1][7]+=.001
            if kind=='previous':changed[1][7]+=.001
            if kind=='outcome':changed[-1][8]=0
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                annual.check_append(self.plan,self.before,snapshot(changed))

    def test_replay_must_recover_original_evidence(self):
        with self.assertRaisesRegex(ValueError,'Already present'):
            annual.check_append(self.plan,self.after,self.after)

    def test_partial_read_wrong_sheet_formula_gap_capacity_rejected(self):
        for kind in ('offset','split','sheet','formula','gap','capacity','columns'):
            changed=copy.deepcopy(self.after)
            sheet=changed['structuredContent']['sheets'][0];chunk=sheet['data'][0]
            if kind=='offset':chunk['startRow']=1
            if kind=='split':sheet['data'].append(copy.deepcopy(chunk))
            if kind=='sheet':changed['structuredContent']['spreadsheetId']='SYNTHETIC-OTHER'
            if kind=='formula':chunk['rowData'][1]['values'][7]={'userEnteredValue':{'formulaValue':'=1/4'}}
            if kind=='gap':chunk['rowData'][1]={'values':[]}
            if kind=='capacity':sheet['properties']['gridProperties']['rowCount']=300
            if kind=='columns':sheet['properties']['gridProperties']['columnCount']=14
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                annual.check_append(self.plan,self.before,changed)

    def test_trailing_omitted_cells_rows_are_google_empty_not_missing_predictions(self):
        snap=copy.deepcopy(self.before)
        snap['structuredContent']['sheets'][0]['data'][0]['rowData'] += [{'values':[]}]*3
        rows,capacity=annual.table_snapshot(snap,'SYNTHETIC-SHEET')
        self.assertEqual(rows,[annual.HEADER,self.old]);self.assertEqual(capacity,300)

    def timing(self,**changes):
        params=dict(source_times=['2026-10-26T01:01:00Z','2026-10-26T01:02:00Z'],
                    cohort_time='2026-10-26T01:03:00Z',lower='2026-10-26T01:04:00Z',
                    upper='2026-10-26T01:05:00Z',observed_now='2026-10-26T01:06:00Z')
        params.update(changes);return annual.check_interval(self.plan,**params)

    def test_signed_bounds_not_planned_date_determine_admission(self):
        self.assertEqual(len(self.timing()),2)
        cases=[dict(source_times=['2026-10-26T01:01:00Z']),
               dict(source_times=['2026-10-26T01:01:00Z','2026-10-26T02:00:00Z']),
               dict(cohort_time='2026-10-26T01:05:00Z'),
               dict(upper='2026-10-27T01:05:00Z',observed_now='2026-10-27T02:00:00Z'),
               dict(upper='2027-01-01T00:00:00Z',observed_now='2027-01-01T02:00:00Z'),
               dict(observed_now='2026-10-26T01:04:00Z')]
        for params in cases:
            with self.subTest(params=params),self.assertRaises(ValueError):self.timing(**params)

    def test_source_claim_after_seal_and_horizon_rejected(self):
        self.plan['sourceObservedAtLocalClaim']='2026-10-26T01:02:00Z'
        with self.assertRaises(ValueError):self.timing()
        with self.assertRaises(ValueError):
            annual.make_plan(self.candidate,self.bundle,spreadsheet_id='SYNTHETIC-SHEET',
                             issue_date='2027-01-01',source_observed_at='2026-10-26T01:00:00Z')

    def test_composed_audit_calls_crypto_and_never_authenticates_json_origin(self):
        # Crypto itself is covered by test_independent_timestamp (real OpenSSL).
        # Here only the adapter is substituted, so bindings and composition run.
        planfile=self.root/'plan.json';planfile.write_bytes(annual.canonical(self.plan))
        obsfile=self.root/'observation.json'
        obsfile.write_bytes(annual.canonical(dict(schema='psychohistory.annual_connector_observation.v1',
                    planSha256=annual.sha(planfile.read_bytes()),before=self.before,after=self.after)))
        sources=self.root/'source';sources.mkdir()
        for n in ('ucdp.zip','codebook.pdf'):(sources/n).write_bytes(b'SYNTHETIC SOURCE')
        stamps={n:dict(request=self.root/f'{n}.tsq',receipt=self.root/f'{n}.tsr',chain=self.root/'chain.pem')
                for n in ('source_zip','source_codebook','cohort','intent','observation')}
        stamps['cohort']['request']=self.bundle/'request.tsq'
        args=dict(candidate_path=self.candidate,bundle=self.bundle,plan_path=planfile,
                  observation_path=obsfile,source_dir=sources,stamps=stamps,
                  trust=dict(trust_root=self.root/'root.pem',crls=[self.root/'crl.pem'],independent_catalog=self.root/'catalog'))
        def fake_verify(**kw):
            self.assertEqual(set(kw),{'content','request','receipt','chain','trust_root','crls','independent_catalog'})
            minute={'source_zip':1,'source_codebook':2,'cohort':3,'intent':4,'observation':5}[kw['receipt'].stem]
            return dict(timestamp=f'2026-10-26T01:0{minute}:00Z',inputSha256={'content':annual.sha(kw['content'].read_bytes())})
        with patch('source_release_intake.inspect',return_value={'synthetic':True}),patch.object(annual,'verify_detached',side_effect=fake_verify) as verify:
            result=annual.audit_evidence(**args)
            self.assertEqual(verify.call_count,5)
            self.assertFalse(result['forecastIssued']);self.assertFalse(result['authenticatedConnectorOriginVerified'])
            self.assertFalse(result['officialRetrievalOriginVerified']);self.assertFalse(result['evaluationEligible'])
            stamps['cohort']['request']=self.root/'replacement.tsq'
            with self.assertRaisesRegex(ValueError,'original frozen'):annual.audit_evidence(**args)

    def test_saved_success_flags_cannot_replace_receipts(self):
        with self.assertRaises(TypeError):annual.audit_evidence(approved=True,forecastIssued=True)


if __name__=='__main__':unittest.main()
