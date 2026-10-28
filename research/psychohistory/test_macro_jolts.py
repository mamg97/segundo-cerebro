import unittest
from macro_jolts import signal_at, feature, score

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


if __name__=='__main__':unittest.main()
