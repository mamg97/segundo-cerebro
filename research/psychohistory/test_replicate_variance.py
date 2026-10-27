import unittest
from replicate_variance import covariance, variance, ratio, summarize


class ReplicateVarianceTests(unittest.TestCase):
    def test_center_is_full_estimate_not_replicate_mean(self):
        self.assertEqual(variance([10]+[12]*80), 16)

    def test_negative_covariance_cancels_sum_uncertainty(self):
        a=[10]+[11,9]*40; b=[20]+[19,21]*40
        self.assertEqual(covariance(a,b),-4)
        result=summarize(a,b,[100]*81)
        self.assertEqual(result['standardErrorSum'],0)
        self.assertEqual(result['standardErrorAlways'],2)

    def test_ratio_recomputes_denominator_for_each_replicate(self):
        result=summarize([20]+[22,18]*40,[30]+[33,27]*40,[100]+[110,90]*40)
        self.assertEqual(result['standardErrorRatio'],0)
        self.assertAlmostEqual(result['fixedDenominatorNormalization'],0.1)

    def test_constant_total_ratio_matches_normalization(self):
        result=summarize([20]+[22,18]*40,[30]*81,[100]*81)
        self.assertAlmostEqual(result['standardErrorRatio'],0.04)
        self.assertAlmostEqual(result['fixedDenominatorNormalization'],0.04)

    def test_count_finiteness_and_types(self):
        for bad in ([1]*80,[1]*82,[True]+[1]*80,[float('nan')]+[1]*80,[1]*80+[float('inf')]):
            with self.assertRaises(ValueError):variance(bad)

    def test_invalid_denominators_and_counts(self):
        for d in ([0]+[1]*80,[1]*80+[0],[-1]*81):
            with self.assertRaises(ValueError):ratio([1]*81,d)
        with self.assertRaises(ValueError):summarize([-1]*81,[2]*81,[10]*81)
        with self.assertRaises(ValueError):summarize([8]*81,[4]*81,[10]*81)

    def test_scale_and_symmetry(self):
        a=[10]+[11,9]*40;b=[20]+[22,18]*40
        self.assertEqual(covariance(a,b),covariance(b,a))
        self.assertEqual(variance([3*x for x in a]),9*variance(a))


if __name__ == '__main__':unittest.main()
