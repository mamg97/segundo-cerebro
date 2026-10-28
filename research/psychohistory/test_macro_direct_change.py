import unittest
from datetime import date, timedelta
from macro_direct_change import make_case, training_at, metrics
from test_macro_claims import weeks

P = dict(cut_day=25, issue_day=26, maximum_week_age_days=14,
         claims_signal_threshold_ratio='1.10', training_window_calendar_months=60)


def source():
    return dict(exported_on='2020-12-31', months={
        '2019-12-01': [dict(start='2020-01-01', end=None, rate_percent='3.9')],
        '2020-02-01': [dict(start='2020-02-01', end='2020-03-26', rate_percent='4.0'),
                       dict(start='2020-03-27', end=None, rate_percent='9.0')]})


def claims():
    return [{**r, 'realtime_start_date':'2020-03-01',
             'period_start_date':(date.fromisoformat(r['period_start_date'])+timedelta(weeks=4)).isoformat()}
            for r in weeks(111)]


class DirectChangeTests(unittest.TestCase):
    def test_numeric_target_is_first_release_minus_frozen_asof_base(self):
        labels = {'2020-04-01':dict(alfred_realtime_start_date='2020-05-08',rate_percent='4.2')}
        r = make_case(claims(), source(), labels, '2020-04-01', P)
        self.assertEqual(r['status'], 'ELIGIBLE')
        self.assertEqual(r['cut'], '2020-03-25')
        self.assertEqual(r['base_rate'], '4.0')
        self.assertAlmostEqual(r['y'], .2)
        self.assertAlmostEqual(r['x'][0], .1)

    def test_future_revision_and_label_cannot_enter_current_training(self):
        rows=[dict(target_month=t,label_available_on=d,y=y) for t,d,y in
              [('2019-01-01','2019-02-01',.1),('2019-02-01','2019-05-01',10),
               ('2019-04-01','2019-01-01',100),('2010-01-01','2010-02-01',1000)]]
        case=dict(target_month='2019-04-01',cut='2019-03-25')
        self.assertEqual(training_at(rows,case,P),rows[:1])
        original = make_case(claims(),source(),{},'2020-04-01',P)
        p = source();p['months']['2020-02-01'][1]['rate_percent'] = '99.0'
        self.assertEqual(make_case(claims(),p,{},'2020-04-01',P),original)

    def test_missing_trend_stale_claims_and_future_base_fail_closed(self):
        p=source();p['months'].pop('2019-12-01')
        self.assertEqual(make_case(claims(),p,{},'2020-04-01',P)['status'],'MISSING_FEATURE')
        self.assertEqual(make_case(weeks(),source(),{},'2020-04-01',P)['status'],'MISSING_FEATURE')
        p=source();p['months']['2020-03-01']=[dict(start='2020-03-01',end=None,rate_percent='4.1')]
        self.assertEqual(make_case(claims(),p,{},'2020-04-01',P)['status'],'MISSING_FEATURE')

    def test_already_released_target_rejected(self):
        with self.assertRaises(ValueError):
            make_case(claims(),source(),{'2020-04-01':dict(
                alfred_realtime_start_date='2020-03-26',rate_percent='4.1')},'2020-04-01',P)

    def test_paired_rmse_and_mae_are_distinct_acceptance_gates(self):
        rows=[dict(y=y,prediction=.5,persistence=0,training_mean=2) for y in [0,0,0,2]]
        r=metrics(rows+[dict(status='MISSING_FEATURE')])
        self.assertEqual(r['scored'],4)
        self.assertLess(r['rmse_prediction'],.95*r['rmse_persistence'])
        self.assertGreater(r['mae_prediction'],r['mae_persistence'])
        self.assertFalse(r['passes_exploratory_rule'])


if __name__ == '__main__':
    unittest.main()
