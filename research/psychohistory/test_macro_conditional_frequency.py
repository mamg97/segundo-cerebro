import unittest
from fractions import Fraction
from macro_conditional_frequency import forecast, metrics, run

P=dict(candidate_end_months=4, minimum_pairs=4, event_threshold_pp='0.2', prior_strength=12)
VALUES={f'2020-{m:02d}-01':str(v) for m,v in enumerate([0,.1,.4,.3,.4,.8,.7,.8,1.2,.9],1)}

class ConditionalTests(unittest.TestCase):
    def test_exact_hand_calculation_uses_signal_at_start_not_end(self):
        r=forecast(VALUES,'2020-12-01',P)
        self.assertEqual(r['baseline_fraction'],'1/2')
        self.assertEqual(r['conditional_pairs'],1)
        self.assertEqual(r['conditional_events'],1)
        self.assertEqual(Fraction(r['probability_fraction']),Fraction(7,13))
        self.assertEqual(r['pairs'][2]['start'],'2020-07-01')
        self.assertEqual(r['pairs'][2]['signal'],-1)

    def test_translation_of_all_rates_preserves_probabilities(self):
        moved={m:str(float(v)+5) for m,v in VALUES.items()}
        self.assertEqual(forecast(moved,'2020-12-01',P)['probability_fraction'],forecast(VALUES,'2020-12-01',P)['probability_fraction'])

    def test_missing_current_signal_excludes_every_comparator(self):
        v=dict(VALUES);del v['2020-09-01']
        r=forecast(v,'2020-12-01',P)
        self.assertEqual(r['status'],'MISSING_SIGNAL')
        self.assertEqual(metrics([r])['scored'],0)

    def test_future_rate_and_invalid_rate_are_not_accepted(self):
        v=dict(VALUES);v['2020-11-01']='0.5'
        self.assertEqual(forecast(v,'2020-12-01',P)['status'],'BASE_MONTH_MISMATCH')
        for value in [True,'NaN','-1','101']:
            with self.assertRaises(ValueError):forecast({**VALUES,'2020-10-01':value},'2020-12-01',P)

    def test_training_missing_signal_does_not_invent_zero_class(self):
        v=dict(VALUES);del v['2020-06-01']
        r=forecast(v,'2020-12-01',{**P,'minimum_pairs':2})
        pair=next(x for x in r['pairs'] if x['start']=='2020-07-01')
        self.assertIsNone(pair['signal'])
        self.assertEqual(r['conditional_pairs'],0)
        self.assertEqual(r['probability'],r['baseline_probability'])

    def test_exact_brier_rule_and_common_sample(self):
        rows=[dict(status='CALCULATED_NOT_ISSUED',y=1,probability=.8,baseline_probability=.5,persistence_probability=0),dict(status='CALCULATED_NOT_ISSUED',y=0,probability=.2,baseline_probability=.5,persistence_probability=0),dict(status='MISSING_SIGNAL')]
        r=metrics(rows)
        self.assertEqual(r['scored'],2)
        self.assertAlmostEqual(r['brier_probability'],.04)
        self.assertTrue(r['passes_exploratory_rule'])

if __name__=='__main__':unittest.main()
