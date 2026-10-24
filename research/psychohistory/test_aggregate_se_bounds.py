"""Analytic synthetic checks of covariance bounds, not real survey records."""
import math
import unittest
from aggregate_se_bounds import bounds


class AggregateSEBoundsTests(unittest.TestCase):
    def test_extreme_correlations_attain_bounds(self):
        r = bounds(3, 4)
        self.assertEqual((r['se_lower'], r['se_upper']), (1, 7))
        for rho in [-1, -.5, 0, .5, 1]:
            se = math.sqrt(3**2 + 4**2 + 2*rho*3*4)
            self.assertLessEqual(r['se_lower'], se)
            self.assertLessEqual(se, r['se_upper'])
        self.assertFalse(r['exact_aggregate_se_identified'])

    def test_zero_equal_and_order_symmetry(self):
        self.assertEqual(bounds(3, 4), bounds(4, 3))
        self.assertEqual(bounds(2, 2)['se_lower'], 0)
        self.assertEqual(bounds(0, 4)['se_lower'], 4)
        self.assertTrue(bounds(0, 4)['exact_aggregate_se_identified'])

    def test_fixed_denominator_scaling(self):
        r = bounds(3, 4, 200)
        self.assertEqual(r['se_lower_percentage_points'], .5)
        self.assertAlmostEqual(r['se_upper_percentage_points'], 3.5)
        self.assertFalse(r['ratio_variance_with_random_denominator_computed'])
        self.assertFalse(r['includes_nonsampling_bias'])

    def test_invalid_values_rejected(self):
        for value in [True, '3', -1, float('nan'), float('inf')]:
            with self.assertRaises(ValueError): bounds(value, 4)
        for total in [0, -1, True, '200', float('nan')]:
            with self.assertRaises(ValueError): bounds(3, 4, total)
        with self.assertRaises(ValueError): bounds(1e308, 1e308)


if __name__ == '__main__': unittest.main()
