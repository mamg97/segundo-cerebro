"""Synthetic checks for the Candidate monthly/quarterly comparison."""

import csv
import hashlib
import io
import unittest
from unittest.mock import patch

import candidate_monthly_quarterly_audit as mod


def source(events):
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(['id', 'country_id', 'type_of_violence', 'date_start', 'date_end', 'date_prec'])
    writer.writerows(events)
    return out.getvalue().encode()


class QuarterlyCorrespondenceTests(unittest.TestCase):
    def compare(self, monthly, quarterly):
        m, q = source(monthly), source(quarterly)
        with patch.object(mod, 'MONTHLY_SHA', hashlib.sha256(m).hexdigest()), \
             patch.object(mod, 'QUARTERLY_SHA', hashlib.sha256(q).hexdigest()):
            return mod.audit(m, q)

    def test_matching_spanning_interval_remains_blocked(self):
        row = [1, 1, 1, '2026-08-29', '2026-10-03', 2]
        other = [2, 2, 1, '2026-09-04', '2026-09-04', 1]
        result = self.compare([row, other], [row, other, [3, 3, 2, '2026-01-01', '2026-01-01', 1]])
        self.assertEqual(result['nMonthlyIdentifiersFoundInQuarterly'], 2)
        self.assertEqual(result['nMonthlySpanningWithoutEndpoint'], 1)
        self.assertEqual(result['nSpanningFoundWithIdenticalCoreFields'], 1)
        self.assertEqual(result['status'], 'SOURCE_QUALITY_BLOCKED')
        self.assertFalse(result['independentSourceConfirmation'])
        self.assertFalse(result['backtestAuthorized'])
        self.assertNotIn('country_id', str(result))

    def test_missing_or_changed_record_is_aggregated(self):
        first = [1, 1, 1, '2026-09-04', '2026-09-04', 1]
        second = [2, 2, 1, '2026-09-05', '2026-09-05', 1]
        changed = [1, 1, 1, '2026-09-04', '2026-09-06', 2]
        result = self.compare([first, second], [changed])
        self.assertEqual(result['nMonthlyIdentifiersFoundInQuarterly'], 1)
        self.assertEqual(result['nMonthlyCoreRecordsIdentical'], 0)
        self.assertEqual(result['status'], 'SOURCE_QUALITY_BLOCKED')

    def test_hash_and_ragged_quarterly_fail_closed(self):
        one = [1, 1, 1, '2026-09-04', '2026-09-04', 1]
        monthly = source([one])
        with self.assertRaisesRegex(ValueError, 'Pinned quarterly'):
            with patch.object(mod, 'MONTHLY_SHA', hashlib.sha256(monthly).hexdigest()):
                mod.audit(monthly, monthly)
        with self.assertRaisesRegex(ValueError, 'Ragged'):
            self.compare([one], [one + ['extra']])


if __name__ == '__main__':
    unittest.main()
