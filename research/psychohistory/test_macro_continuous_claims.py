import math
import unittest
from macro_continuous_claims import feature, fit, score, sigmoid

P = dict(feature_clip=3, feature_scale_ratio='1.10', ridge_penalty=1,
         training_window_calendar_months=60, minimum_training_cases=1)


class ContinuousClaimsTests(unittest.TestCase):
    def test_continuous_feature_and_prespecified_clipping(self):
        self.assertAlmostEqual(feature('11/10', P), 1)
        self.assertAlmostEqual(feature('10/11', P), -1)
        self.assertEqual(feature('1', P), 0)
        self.assertEqual(feature('100', P), 3)
        self.assertEqual(feature('1/100', P), -3)
        with self.assertRaises(ValueError):
            feature('0', P)

    def test_boundary_returns_baseline_for_wrong_direction(self):
        r = fit([-1, 1], [1, 0], .5, 1)
        self.assertEqual(r['coefficient'], 0)
        self.assertGreater(r['gradient'], 0)

    def test_known_stationary_solution(self):
        # For symmetric observations, derivative=2*(sigmoid(beta)-1)+lambda*beta.
        beta = math.log(3)
        penalty = .5 / beta
        r = fit([-1, 1], [0, 1], .5, penalty)
        self.assertAlmostEqual(r['coefficient'], beta, places=12)
        self.assertAlmostEqual(r['gradient'], 0, places=12)
        self.assertAlmostEqual(sigmoid(r['offset'] + beta), .75)

    def test_zero_feature_and_extreme_logits_are_finite(self):
        self.assertEqual(fit([0, 0], [0, 1], .5, 1)['coefficient'], 0)
        self.assertEqual(sigmoid(-1000), 0)
        self.assertEqual(sigmoid(1000), 1)
        for bad in [0, -1, float('nan')]:
            with self.assertRaises(ValueError):
                fit([1], [1], .5, bad)

    def test_future_labels_current_target_and_old_calendar_rows_excluded(self):
        train = [dict(target_month=t, label_available_on=d, y=y, signal={'ratio':r})
                 for t,d,y,r in [('2019-01-01','2019-02-01',1,'11/10'),
                 ('2019-02-01','2019-06-01',0,'1'),
                 ('2019-04-01','2019-01-01',0,'1'),
                 ('2010-01-01','2010-02-01',0,'1')]]
        case = dict(target_month='2019-04-01',cut='2019-03-25',signal={'ratio':'1'})
        r = score(train, case, P)
        self.assertEqual(r['training_targets'], ['2019-01-01'])
        self.assertEqual(r['baseline_fraction'], '2/3')
        train[1]['y'] = 1
        train[1]['signal']['ratio'] = '100'
        self.assertEqual(score(train, case, P), r)
        self.assertIsNone(score([], case, P))

    def test_monotone_probabilities_and_frozen_intercept(self):
        train = [dict(target_month='2018-01-01', label_available_on='2018-02-01',
                      y=1, signal={'ratio':'11/10'})]
        def one(r):
            return score(train, dict(target_month='2019-04-01',cut='2019-03-25',
                                    signal={'ratio':r}), P)
        lo, mid, hi = [one(x) for x in ['10/11','1','11/10']]
        self.assertLess(lo['probability'], mid['probability'])
        self.assertLess(mid['probability'], hi['probability'])
        self.assertAlmostEqual(mid['probability'], 2/3)


if __name__ == '__main__':
    unittest.main()
