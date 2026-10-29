import hashlib
import math
import unittest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from sp500_vix_transfer import read_fred, verify_dates, study, at_origin, FIRST_ORIGIN
from equities_market_study import matrix
from vix_market_contrast import labels_for


class TransferTests(unittest.TestCase):
    def data(self, n=420):
        prices, vix = [], {}
        day, price = date(2018, 1, 1), Decimal(100)
        for i in range(n):
            while day.weekday() >= 5:
                day += timedelta(days=1)
            price *= Decimal('1.001') if i % 77 < 50 else Decimal('.994')
            prices.append((day, price))
            vix[day] = 15 + 5*math.sin(i/13)
            day += timedelta(days=1)
        return prices, vix

    def test_source_hash_schema_dates_prices_and_placeholders(self):
        raw = b'observation_date,SP500\n2020-01-01,.\n2020-01-02,100\n2020-01-03,101\n'
        def read(data=raw, sha=None):
            return read_fred(data, sha or hashlib.sha256(data).hexdigest(), '2020-01-03', '2020-01-01', '2020-01-03')
        prices, missing = read()
        self.assertEqual(len(prices), 2)
        self.assertEqual(missing, [date(2020, 1, 1)])
        for old, new in [(b',101', b',NaN'), (b',101', b',0'), (b',101', b',oops'),
                         (b'2020-01-03', b'2020-01-02'), (b'2020-01-03', b'2020-01-04'),
                         (b'2020-01-03,101', b'2020-01-03'), (b',101', b',101,1'),
                         (b',101', b',.'), (b'SP500', b'SPY')]:
            with self.subTest(new=new), self.assertRaises(ValueError):
                read(raw.replace(old, new))
        with self.assertRaises(ValueError):
            read(sha='0'*64)

    def test_calendar_disagreement_blocks_instead_of_joining_or_filling(self):
        prices, vix = self.data()
        verify_dates(prices, vix, [])
        absent = dict(vix)
        absent.pop(prices[99][0])
        with self.assertRaisesRegex(ValueError, 'calendar mismatch'):
            verify_dates(prices, absent, [])
        with self.assertRaisesRegex(ValueError, 'calendar mismatch'):
            verify_dates(prices[:99]+prices[100:], vix, [prices[99][0]])
        with self.assertRaises(ValueError):
            verify_dates(prices[:99]+[prices[98]]+prices[99:], vix, [])

    def test_future_changes_do_not_leak_into_probability_or_training(self):
        prices, vix = self.data()
        origin = FIRST_ORIGIN
        before, _ = at_origin(prices, vix, labels_for(prices), matrix(prices), origin)
        changed = [(d, p if i <= origin else p*2) for i, (d, p) in enumerate(prices)]
        future_vix = {d:(v if d < prices[origin][0] else 100) for d, v in vix.items()}
        after, _ = at_origin(changed, future_vix, labels_for(changed), matrix(changed), origin)
        for k in ('vix_logistic', 'volatility_only', 'expanding_frequency', 'recent_frequency',
                  'training_rows', 'last_training_label_date'):
            self.assertEqual(before[k], after[k])
        self.assertEqual(before['training_rows'], 252)
        self.assertEqual(before['last_training_label_date'], before['origin_date'])
        self.assertEqual(before['vix_feature_date'], prices[origin-1][0].isoformat())

    def test_one_class_ledger_keeps_original_schedule_and_all_methods_excluded(self):
        prices, vix = self.data()
        prices = [(d, Decimal(100)+i) for i, (d, _) in enumerate(prices)]
        r = study(prices, vix)
        expected = [prices[i][0].isoformat() for i in range(331, len(prices)-20, 20)]
        self.assertEqual([x['origin_date'] for x in r['exclusions']], expected)
        self.assertEqual(r['rows'], [])
        self.assertEqual(r['decision'], 'INSUFFICIENT_SAMPLE')
        self.assertFalse(r['model_admitted'])
        self.assertFalse(r['forecast_issued'])

    def test_paired_metrics_and_solver_failure_are_not_silent_exclusions(self):
        prices, vix = self.data()
        r = study(prices, vix)
        self.assertEqual(len(r['rows'])+len(r['exclusions']), r['scheduled_origins'])
        self.assertEqual({v['n'] for v in r['metrics'].values()}, {len(r['rows'])})
        self.assertEqual(r['decision'], 'INSUFFICIENT_SAMPLE')
        with patch('sp500_vix_transfer.probability', side_effect=ValueError('solver failure')):
            with self.assertRaisesRegex(ValueError, 'solver failure'):
                study(prices, vix)


if __name__ == '__main__':
    unittest.main()
