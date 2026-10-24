"""Synthetic boundary/orchestration tests; these do not simulate actual issuance."""
import unittest
import datetime as dt
import hashlib
import json
from pathlib import Path
import tempfile
from unittest.mock import patch
import monthly_issue_preflight as gate
from macro_retrospective import shift_month
from monthly_issue_preflight import check_timing, window


class MonthlyTimingTests(unittest.TestCase):
    def payload(self):
        return dict(asOf='2026-10-25T23:59:59Z', issuedAt='2026-10-26T12:00:00Z',
                    resolutionAt='2026-12-04T13:30:00Z')

    def check(self, **changes):
        args=dict(target='2026-11-01', payload=self.payload(),
                  source_timestamp='2026-10-24T15:00:00Z',
                  forecast_timestamp='2026-10-26T01:00:00Z',
                  observed_at='2026-10-26T01:00:03Z')
        args.update(changes)
        return check_timing(**args)

    def test_correct_order_and_deadline_is_not_actual_time(self):
        result=self.check()
        self.assertEqual(result['deadline'],'2026-10-26T12:00:00+00:00')
        self.assertNotIn('issuedAt',result)

    def test_source_after_cut_or_too_old_rejected(self):
        for stamp in ('2026-10-26T00:00:00Z','2026-10-18T23:59:59Z'):
            with self.subTest(stamp=stamp), self.assertRaises(ValueError):
                self.check(source_timestamp=stamp)

    def test_premature_late_or_future_forecast_rejected(self):
        for stamp,now in [('2026-10-25T23:59:59Z','2026-10-26T01:00:03Z'),
                          ('2026-10-26T12:00:01Z','2026-10-26T12:00:02Z'),
                          ('2026-10-26T01:00:00Z','2026-10-26T00:59:59Z'),
                          ('2026-10-26T01:00:00Z','2026-10-26T12:00:01Z')]:
            with self.subTest(stamp=stamp,now=now), self.assertRaises(ValueError):
                self.check(forecast_timestamp=stamp,observed_at=now)

    def test_wrong_declared_clock_or_early_resolution_rejected(self):
        for key,value in [('asOf','2026-10-24T23:59:59Z'),('issuedAt','2026-10-26T13:00:00Z'),
                          ('resolutionAt','2026-11-30T23:59:59Z')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.check(payload=dict(self.payload(),**{key:value}))

    def test_cohort_and_year_rollover(self):
        self.assertEqual(window('2027-01-01')['start'].isoformat(),'2026-12-26T00:00:00+00:00')
        for target in ('2026-10-01','2027-11-01','2026-11-02'):
            with self.subTest(target=target), self.assertRaises(ValueError):
                window(target)


class MonthlyBindingTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='SYNTHETIC_MONTHLY_PREFLIGHT_')
        self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name)
        (self.base/'source').write_bytes(b'SYNTHETIC SOURCE')
        (self.base/'protocol').write_bytes(gate.PROTOCOL_FILE.read_bytes())
        self.payload=dict(asOf='2026-10-25T23:59:59Z',issuedAt='2026-10-26T12:00:00Z',
                          resolutionAt='2026-12-04T13:30:00Z',targetMonth='2026-11-01',
                          modelVersion='macro-monthly-frequency-prospective-v1',
                          probability=1/62,baselineProbability=0,baseMonth='2026-09-01',baseRate='10')
        self.save()
        digest=hashlib.sha256((self.base/'source').read_bytes()).hexdigest()
        self.forecast=dict(artifactSha256={'dataSha256':digest},rfc3161Timestamp='2026-10-26T01:00:00Z',
                           receiptSha256='a'*64,entrySha256='b'*64,
                           independentTimestamp={'checkedAtUtc':'2026-10-26T01:01:00Z','tokenSha256':'c'*64})
        self.source=dict(inputSha256={'content':digest,'receipt':'d'*64},timestamp='2026-10-24T15:00:00Z')
        self.args=dict(target='2026-11-01',source_request=None,source_receipt=None,source_chain=None,
                       crls=[],independent_catalog=None,model_protocol=self.base/'protocol',
                       resolution_protocol=self.base/'protocol',data_archive=self.base/'source',
                       prepared_dir=self.base,trust_root=None)
        self.patches=[patch.object(gate,'verify_independent_precommitment',return_value=self.forecast),
                      patch.object(gate,'verify_detached',return_value=self.source),
                      patch.object(gate.asof,'audit',return_value={'exported_on':'2026-10-24'}),
                      patch.object(gate.asof,'select',return_value=[{'reference_month':shift_month('2026-09-01',i),'rate_percent':'10','status':'AVAILABLE'} for i in range(-61,1)]),
                      patch.object(gate,'datetime')]
        self.mocks=[p.start() for p in self.patches]
        for p in self.patches:self.addCleanup(p.stop)
        self.mocks[-1].now.return_value=dt.datetime(2026,10,26,1,1,tzinfo=dt.timezone.utc)

    def save(self):
        (self.base/'payload.json').write_text(json.dumps(self.payload))

    def test_composition_recalculates_but_does_not_issue(self):
        newer=json.loads(json.dumps(self.forecast))
        newer['independentTimestamp']['checkedAtUtc']='2026-10-26T01:01:01Z'
        self.mocks[0].side_effect=[self.forecast,newer]
        result=gate.verify_monthly_preflight(**self.args)
        self.assertTrue(result['referenceRecalculated'])
        self.assertTrue(result['sourceBytesExistenceBeforeCutVerified'])
        for field in ('sourceOriginIndependentlyVerified','canonicalRegistrationVerified',
                      'prospectiveEligible','evaluationEligible'):
            self.assertFalse(result[field])

    def test_mismatched_signed_source_rejected(self):
        self.source['inputSha256']['content']='0'*64
        with self.assertRaisesRegex(ValueError,'different data'):
            gate.verify_monthly_preflight(**self.args)

    def test_wrong_probability_base_and_target_rejected(self):
        for key,value in [('probability',.9),('baselineProbability',.1),('baseRate','9'),
                          ('targetMonth','2026-12-01')]:
            original=self.payload[key];self.payload[key]=value;self.save()
            with self.subTest(key=key), self.assertRaises(ValueError):
                gate.verify_monthly_preflight(**self.args)
            self.payload[key]=original

    def test_changed_signed_identity_rejected(self):
        changed=json.loads(json.dumps(self.forecast));changed['independentTimestamp']['tokenSha256']='e'*64
        self.mocks[0].side_effect=[self.forecast,changed]
        with self.assertRaisesRegex(ValueError,'changed during'):
            gate.verify_monthly_preflight(**self.args)

    def test_closed_window_stops_before_crypto(self):
        self.mocks[-1].now.return_value=dt.datetime(2026,10,24,tzinfo=dt.timezone.utc)
        with self.assertRaisesRegex(ValueError,'not open'):
            gate.verify_monthly_preflight(**self.args)
        self.mocks[0].assert_not_called()


if __name__=='__main__':
    unittest.main()
