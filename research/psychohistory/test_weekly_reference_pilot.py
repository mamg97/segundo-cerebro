from datetime import date,datetime,timedelta,timezone
from fractions import Fraction
import json
from pathlib import Path
import unittest
from weekly_reference_pilot import (HEADER,POLICY,prepare,audit_readback,
                                    check_receipt_interval,resolution_candidate,cohort_review,targets,materialize_request)

P=json.loads(POLICY.read_text())
NOW=datetime(2026,11,4,8,1,tzinfo=timezone.utc)
def fixture():
    # Sixty-one consecutive synthetic Saturday observations, each released Thursday.
    last=date(2026,10,24)
    return [dict(period_start_date=(last-timedelta(weeks=60-i)).isoformat(),
                 ICSA=str(100000+1000*i),
                 realtime_start_date=(last-timedelta(weeks=60-i)+timedelta(days=5)).isoformat(),
                 realtime_end_date='') for i in range(61)]
def plan(**overrides):
    args=dict(target='2026-10-31',captured_at='2026-11-04T08:00:00Z',
              release_date='2026-11-05',now=NOW,source_sha256='0'*64,
              policy={**P,'minimum_training_cases':2})
    args.update(overrides)
    return prepare(fixture(),**args)

class PilotTests(unittest.TestCase):
    def test_exact_synthetic_training_and_beta_prior(self):
        p=plan()
        self.assertEqual(p['status'],'PREPARED_NOT_ISSUED')
        self.assertEqual(p['training_n'],9)
        self.assertEqual(p['training_events'],0)
        self.assertEqual(Fraction(p['frequency_fraction']),Fraction(1,11))
        self.assertEqual(p['frozen_threshold'],170000)
        self.assertFalse(p['forecast_issued'])
        self.assertFalse(p['source_origin_verified'])
    def test_closed_window_cannot_be_reopened_by_old_capture(self):
        self.assertEqual(plan(now=NOW.replace(hour=12))['status'],'OMITTED_WINDOW_CLOSED')
        self.assertEqual(plan(now=NOW-timedelta(days=1))['status'],'NOT_DUE')
        with self.assertRaises(ValueError):plan(captured_at='2026-11-05T08:00:00Z')
        with self.assertRaises(ValueError):plan(captured_at='2026-11-03T08:00:00Z')
    def test_same_day_release_omitted_and_cohort_cannot_expand(self):
        self.assertEqual(plan(release_date='2026-11-04')['status'],'OMITTED_RELEASE_NOT_AFTER_ISSUE_DAY')
        with self.assertRaises(ValueError):plan(target='2027-01-16')
    def test_existing_partial_id_requires_recovery(self):
        self.assertEqual(plan(existing_ids=['ICSA-WEEKLY-2026-10-31-frequency'])['status'],'RECOVERY_REQUIRED_EXISTING_ID')
    def test_known_target_or_stale_base_is_not_a_new_forecast(self):
        args=dict(target='2026-10-31',captured_at='2026-11-04T08:00:00Z',release_date='2026-11-05',now=NOW,source_sha256='0'*64,policy=P)
        rows=fixture()
        self.assertEqual(prepare(rows[:-1],**args)['status'],'BLOCKED_BASE_WEEK_MISMATCH')
        rows.append(dict(period_start_date='2026-10-31',ICSA='200000',realtime_start_date='2026-11-04',realtime_end_date=''))
        self.assertEqual(prepare(rows,**args)['status'],'OMITTED_TARGET_ALREADY_AVAILABLE')
    def test_readback_preserves_every_prior_cell_and_exactly_two_rows(self):
        p=plan();old=[HEADER,['synthetic-old']+['']*12];new=old+materialize_request(p,'2026-11-04T08:02:00Z')
        audit=audit_readback(p,old,new,requested_at='2026-11-04T08:02:00Z')
        self.assertEqual(audit['new_rows'],2)
        self.assertFalse(audit['forecast_issued'])
        for bad in [new[:-1],new+[p['rows'][0]], [HEADER,['tampered']+['']*12]+p['rows']]:
            with self.assertRaises(ValueError):audit_readback(p,old,bad,requested_at='2026-11-04T08:02:00Z')
        bad=[r[:] for r in new];bad[-1][7]=0.5
        with self.assertRaises(ValueError):audit_readback(p,old,bad,requested_at='2026-11-04T08:02:00Z')
    def test_incomplete_or_forged_plans_cannot_pass_readback(self):
        p=plan();old=[HEADER]
        for changed in [dict(rows=[]),dict(rows=p['rows'][:1]),dict(header=['wrong'])]:
            with self.assertRaises(ValueError):audit_readback({**p,**changed},old,old)
        bad=json.loads(json.dumps(p));bad['rows'][1][7]=0.1
        with self.assertRaises(ValueError):audit_readback(bad,old,old+bad['rows'])
    def test_request_time_is_execution_metadata_not_a_prepared_emission_claim(self):
        p=plan();self.assertTrue(all(r[5]=='' for r in p['rows']))
        rows=materialize_request(p,'2026-11-04T08:02:00Z')
        self.assertTrue(all(r[5]=='2026-11-04T08:02:00+00:00' for r in rows))
        self.assertEqual([r[7] for r in rows],[r[7] for r in p['rows']])
        for instant in ['2026-11-04T07:59:00Z','2026-11-04T12:00:00Z']:
            with self.assertRaises(ValueError):materialize_request(p,instant)
        with self.assertRaises(ValueError):audit_readback(p,[HEADER],[HEADER]+rows)
        with self.assertRaises(ValueError):check_receipt_interval(p,'2026-11-04T08:01:00Z','2026-11-04T08:03:00Z',requested_at='2026-11-04T08:00:00Z')
    def test_receipts_must_bound_inscription_inside_window(self):
        p=plan()
        check_receipt_interval(p,'2026-11-04T08:10:00Z','2026-11-04T08:11:00Z')
        for a,b in [('2026-11-04T08:11:00Z','2026-11-04T08:10:00Z'),('2026-11-04T11:59:00Z','2026-11-04T12:00:00Z'),('2026-11-03T23:59:00Z','2026-11-04T08:00:00Z')]:
            with self.assertRaises(ValueError):check_receipt_interval(p,a,b)
    def test_resolution_threshold_exact_and_release_capture_limit(self):
        p=plan();args=dict(target='2026-10-31',value=170000,release_at='2026-11-05T13:30:00Z',captured_at='2026-11-07T13:30:00Z',source_pdf=b'%PDF-synthetic')
        r=resolution_candidate(p,**args)
        self.assertEqual(r['outcome'],1)
        self.assertEqual(r['status'],'RESOLUTION_CANDIDATE_NOT_VERIFIED')
        self.assertFalse(r['forecast_issued'])
        for patch in [dict(value=True),dict(target='2026-11-07'),dict(captured_at='2026-11-07T13:30:01Z'),dict(source_pdf=b'not a PDF')]:
            with self.assertRaises(ValueError):resolution_candidate(p,**{**args,**patch})

    def test_cohort_counts_targets_once_and_keeps_small_sample_limits(self):
        all_targets=targets(P)
        entries=[dict(target_week=t,status='VERIFIED_RESOLUTION',outcome=int(i<2),probabilities={'frequency':0.2,'persistence':0.0}) for i,t in enumerate(all_targets[:10])]
        entries += [dict(target_week=t,status='OMITTED') for t in all_targets[10:]]
        r=cohort_review(entries,P)
        self.assertEqual(r['resolved_targets'],10)
        self.assertEqual(r['omitted_targets'],2)
        self.assertTrue(r['passes_predefined_observed_rule'])
        self.assertAlmostEqual(r['brier']['frequency'],0.16)
        self.assertFalse(r['predictive_skill_demonstrated'])
        self.assertFalse(cohort_review(entries[:-1],P)['passes_predefined_observed_rule'])
        with self.assertRaises(ValueError):cohort_review(entries+[entries[0]],P)
        with self.assertRaises(ValueError):cohort_review([dict(target_week=all_targets[0],status='VERIFIED_RESOLUTION',outcome=True,probabilities={'frequency':0.2,'persistence':0.0})],P)

if __name__=='__main__':unittest.main()
