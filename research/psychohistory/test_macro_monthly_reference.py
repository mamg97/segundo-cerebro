"""SYNTHETIC monthly frequency examples; no real observations or forecasts."""
from decimal import Decimal
import unittest

from macro_monthly_reference import calculate
from macro_retrospective import shift_month


class FrequencyReferenceTests(unittest.TestCase):
    def fixture(self, step='0'):
        return {shift_month('2026-09-01', i): str(Decimal('10')+Decimal(step)*i)
                for i in range(-61, 1)}

    def test_constant_rates_have_one_over_62_and_no_issuance(self):
        result = calculate(self.fixture(), '2026-11-01')
        self.assertEqual((result['event_count'], result['pair_count']), (0, 60))
        self.assertEqual((result['probability_numerator'], result['probability_denominator']), (1, 62))
        for flag in ('forecast_issued', 'sourceAvailabilityAsOfVerified', 'prospectiveEligible', 'predictive_skill_demonstrated'):
            self.assertFalse(result[flag])

    def test_threshold_equality_counts_without_float_rounding(self):
        result = calculate(self.fixture('0.1'), '2026-11-01')
        self.assertEqual(result['event_count'], 60)
        self.assertEqual(result['probability_numerator'], 61)
        self.assertEqual(result['probability_denominator'], 62)

    def test_missing_momentum_does_not_block_reference_but_omits_pairs(self):
        values = self.fixture()
        del values['2026-06-01']
        result = calculate(values, '2026-11-01')
        self.assertEqual(result['status'], 'CALCULATED_NOT_ISSUED')
        self.assertEqual(result['pair_count'], 58)
        self.assertEqual(len(result['excluded_pairs']), 2)
        self.assertEqual(result['probability_denominator'], 60)

    def test_missing_too_many_pairs_blocks(self):
        values = self.fixture()
        for i in range(-20, -5):
            values[shift_month('2026-09-01', i)] = None
        result = calculate(values, '2026-11-01')
        self.assertEqual(result['status'], 'INSUFFICIENT_PAIRS')
        self.assertNotIn('probability', result)

    def test_future_data_and_wrong_base_block(self):
        values = self.fixture()
        values['2026-10-01'] = '10'
        self.assertEqual(calculate(values, '2026-11-01')['status'], 'BASE_MONTH_MISMATCH')
        self.assertEqual(calculate({}, '2026-11-01')['status'], 'BASE_MONTH_MISMATCH')

    def test_bad_cohort_dates_and_nonfinite_rates_rejected(self):
        for target in ('2026-10-01', '2027-11-01', '2026-11-02'):
            with self.subTest(target=target), self.assertRaises(ValueError):
                calculate(self.fixture(), target)
        for value in ('NaN', 'Infinity', '-1', '101', True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                calculate({'2026-09-01':value}, '2026-11-01')


if __name__ == '__main__':
    unittest.main()
