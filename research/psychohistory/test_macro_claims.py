from datetime import date,timedelta
from fractions import Fraction
import unittest
from macro_claims import signal_at,score

P=dict(maximum_week_age_days=14,claims_signal_threshold_ratio='1.10',training_window_calendar_months=60,minimum_training_cases=1,prior_strength=12)
def weeks(recent=110):
    return [dict(period_start_date=(date(2020,2,22)-timedelta(days=7*i)).isoformat(),ICSA=str(recent if i<4 else 100),realtime_start_date='2020-02-24',realtime_end_date='') for i in range(8)]
class ClaimsTests(unittest.TestCase):
    def test_threshold_is_strict_and_averages_four_plus_four(self):
        self.assertEqual(signal_at(weeks(),'2020-02-25',P)['state'],0)
        self.assertEqual(signal_at(weeks(111),'2020-02-25',P)['state'],1)
        self.assertEqual(Fraction(signal_at(weeks(111),'2020-02-25',P)['ratio']),Fraction(111,100))
    def test_future_revision_cannot_change_historical_signal(self):
        rows=weeks(111);revised=[]
        for r in rows:
            r['realtime_end_date']='2020-02-26'
            revised.append({**r,'ICSA':'1','realtime_start_date':'2020-02-27','realtime_end_date':''})
        self.assertEqual(signal_at(rows+revised,'2020-02-25',P)['state'],1)
        self.assertEqual(signal_at(rows+revised,'2020-02-28',P)['state'],0)
    def test_gap_staleness_and_unpublished_data_fail_closed(self):
        self.assertIsNone(signal_at(weeks()[:-1],'2020-02-25',P))
        self.assertIsNone(signal_at(weeks(),'2020-03-25',P))
        self.assertIsNone(signal_at(weeks(),'2020-02-23',P))
    def test_ambiguous_intervals_rejected(self):
        with self.assertRaises(ValueError):signal_at(weeks()+weeks(),'2020-02-25',P)
    def test_unknown_training_labels_and_current_target_are_excluded(self):
        train=[dict(target_month='2019-01-01',label_available_on='2019-02-01',y=1,signal={'state':0}),dict(target_month='2019-02-01',label_available_on='2019-06-01',y=0,signal={'state':1}),dict(target_month='2019-04-01',label_available_on='2019-01-01',y=0,signal={'state':1})]
        case=dict(target_month='2019-04-01',cut='2019-03-25',signal={'state':1})
        r=score(train,case,P)
        self.assertEqual(r['training_targets'],['2019-01-01'])
        self.assertEqual(Fraction(r['fraction']),Fraction(2,3))
        train[1]['y']=1
        self.assertEqual(score(train,case,P),r)
    def test_training_calendar_window_is_not_last_sixty_available_rows(self):
        train=[dict(target_month='2010-01-01',label_available_on='2010-02-01',y=1,signal={'state':1})]
        self.assertIsNone(score(train,dict(target_month='2019-04-01',cut='2019-03-25',signal={'state':1}),P))
if __name__=='__main__':unittest.main()
