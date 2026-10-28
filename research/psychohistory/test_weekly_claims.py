import unittest
from datetime import date,timedelta
from weekly_claims import fit_predict,training_at,make_case,metrics

class WeeklyTests(unittest.TestCase):
    def test_analytical_orthogonal_ridge_mean_loss(self):
        train=[{'x':[a,b],'y':3+2*a+4*b} for a,b in [(-1,-1),(-1,1),(1,-1),(1,1)]]
        # Identity covariance + ridge1 halves slopes, preserves intercept.
        self.assertAlmostEqual(fit_predict(train,[1,1],1),6)
    def test_constant_features_yields_training_mean(self):
        self.assertEqual(fit_predict([dict(x=[1,2],y=2),dict(x=[1,2],y=4)],[1,2],1),3)
    def test_scaling_uses_training_only_and_is_translation_invariant(self):
        t=[dict(x=[-1,2],y=1),dict(x=[1,4],y=3)]
        moved=[dict(x=[r['x'][0]+100,r['x'][1]-5],y=r['y']) for r in t]
        self.assertAlmostEqual(fit_predict(t,[2,5],1),fit_predict(moved,[102,0],1))
    def test_training_filters_unknown_labels_current_target_and_calendar_window(self):
        p=dict(training_weeks=156);case=dict(target_week='2020-01-11',cut='2020-01-14')
        rows=[dict(target_week='2019-01-05',label_available_on='2019-01-10',y=1),dict(target_week='2020-01-04',label_available_on='2020-01-16',y=2),dict(target_week='2020-01-11',label_available_on='2020-01-01',y=3),dict(target_week='2010-01-01',label_available_on='2010-01-02',y=4)]
        self.assertEqual(training_at(rows,case,p),rows[:1])
    def test_daily_clock_excludes_wednesday_early_release(self):
        base=date(2020,1,4);rows=[dict(period_start_date=(base-timedelta(weeks=i)).isoformat(),ICSA='100',realtime_start_date='2020-01-09',realtime_end_date='') for i in range(52)]
        first={'2020-01-11':dict(ICSA='110',realtime_start_date='2020-01-15')}
        self.assertEqual(make_case(rows,first,base)['status'],'LABEL_NOT_AFTER_ISSUE_DAY')
        first['2020-01-11']['realtime_start_date']='2020-01-16'
        r=make_case(rows,first,base)
        self.assertEqual(r['status'],'ELIGIBLE');self.assertEqual(r['cut'],'2020-01-14');self.assertAlmostEqual(r['y'],0.09531017980432493)
    def test_metrics_paired_log_errors(self):
        r=metrics([dict(prediction=0.1,persistence=0,four_week_log_change=0.3,y=0.1),dict(status='MISSING_FEATURE')])
        self.assertEqual(r['scored'],1);self.assertEqual(r['rmslog_prediction'],0);self.assertTrue(r['passes_exploratory_rule'])
if __name__=='__main__':unittest.main()
