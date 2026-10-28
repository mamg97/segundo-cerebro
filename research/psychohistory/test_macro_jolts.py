import unittest
from decimal import Decimal
import hashlib
from macro_jolts import jolts_archive, signal_at, feature, score
from test_macro_payrolls import fixture as payroll_fixture

P=dict(jolts_latest_reference_offset_from_target=-3,jolts_change_months=3,
       feature_scale_pp='0.5',feature_clip=3,training_window_calendar_months=60,
       minimum_training_cases=1,ridge_penalty=1)


def report():
    return dict(exported_on='2020-12-31',months={
        '2019-12-01':[dict(start='2020-02-01',end=None,value='4.0')],
        '2020-03-01':[dict(start='2020-05-01',end='2020-05-26',value='3.5'),
                      dict(start='2020-05-27',end=None,value='9.0')]})


class JoltsDraftTests(unittest.TestCase):
    def test_distinct_release_lag_and_future_revision_exclusion(self):
        r=signal_at(report(),'2020-05-25',P)
        self.assertEqual(r['latest_month'],'2020-03-01')
        self.assertEqual(r['decline_pp'],'0.5')
        self.assertEqual(feature(r,P),1)
        self.assertEqual(signal_at(report(),'2020-05-28',P)['decline_pp'],'-5.0')

    def test_missing_older_stale_newer_and_postexport_fail_closed(self):
        r=report();r['months'].pop('2019-12-01')
        self.assertIsNone(signal_at(r,'2020-05-25',P))
        self.assertIsNone(signal_at(report(),'2020-04-25',P))
        r=report();r['months']['2020-04-01']=[dict(start='2020-05-01',end=None,value='4')]
        self.assertIsNone(signal_at(r,'2020-05-25',P))
        with self.assertRaises(ValueError):signal_at(report(),'2021-01-25',P)

    def test_pp_scale_is_not_a_ratio_or_thousands_count(self):
        self.assertEqual(feature({'decline_pp':'0.25'},P),.5)
        self.assertEqual(feature({'decline_pp':'-0.5'},P),-1)
        self.assertEqual(feature({'decline_pp':'100'},P),3)
        with self.assertRaises(ValueError):feature({'decline_pp':'NaN'},P)

    def test_unknown_labels_current_target_and_old_calendar_rows_excluded(self):
        rows=[dict(target_month=t,label_available_on=d,y=y,signal={'decline_pp':'0.5'})
              for t,d,y in [('2019-01-01','2019-02-01',1),('2019-02-01','2019-05-01',0),
                            ('2019-04-01','2019-01-01',0),('2010-01-01','2010-02-01',0)]]
        case=dict(target_month='2019-04-01',cut='2019-03-25',signal={'decline_pp':'0'})
        r=score(rows,case,P)
        self.assertEqual(r['training_targets'],['2019-01-01'])
        self.assertEqual(r['baseline_fraction'],'2/3')
        self.assertAlmostEqual(r['probability'],2/3)
        self.assertIsNone(score([],case,P))

    def test_decimal_rate_archive_preserves_scale_and_monthly_coverage(self):
        r=audit(fixture())
        self.assertEqual(r['month_count'],4)
        self.assertEqual(r['interval_count'],5)
        self.assertEqual(Decimal(r['months']['2019-12-01'][0]['value']),Decimal('4.0'))
        self.assertEqual(r['months']['2020-01-01'][0]['value'],'4.04')
        self.assertFalse(r['original_bls_bytes_verified'])

    def test_source_identity_units_hash_and_range_rejected(self):
        for raw in [fixture(series='UNRATE'),fixture(units='Thousands of Persons'),
                    fixture(mutate=lambda r:r[0].__setitem__(1,'100.1')),
                    fixture(mutate=lambda r:r[0].__setitem__(1,'-0.1')),
                    fixture(mutate=lambda r:r[0].__setitem__(1,'NaN'))]:
            with self.assertRaises(ValueError):audit(raw)
        with self.assertRaises(ValueError):jolts_archive(fixture(),'0'*64,'2019-12-01','2020-03-01')

    def test_interval_gap_overlap_truncation_and_missing_month_rejected(self):
        for mutate in [lambda r:r[-1].__setitem__(2,'2020-04-28'),
                       lambda r:r[-1].__setitem__(2,'2020-04-26'),
                       lambda r:r[-1].__setitem__(3,'2020-04-30'),
                       lambda r:r.pop(1),
                       lambda r:r[0].__setitem__(2,'2019-12-31')]:
            with self.assertRaises(ValueError):audit(fixture(mutate=mutate))


def fixture(series='JTSJOR',units='Rate',mutate=None):
    def rewrite(rows):
        for r in rows:r[1]=str(Decimal(r[1])/25)
        if mutate:mutate(rows)
    return payroll_fixture(series=series,units=units,mutate=rewrite)


def audit(raw):
    return jolts_archive(raw,hashlib.sha256(raw).hexdigest(),'2019-12-01','2020-03-01')


if __name__=='__main__':unittest.main()
