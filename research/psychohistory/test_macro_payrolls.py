import csv
import hashlib
import io
import unittest
import zipfile
from macro_payrolls import payrolls_archive, signal_at
from macro_continuous_claims import feature

P = dict(payrolls_lag_months=3, feature_scale_ratio='1.01', feature_clip=3)


def fixture(series='PAYEMS', units='Thousands of Persons', mutate=None):
    rows=[['2019-12-01','100','2020-01-03',''],
          ['2020-01-01','101','2020-02-07',''],
          ['2020-02-01','102','2020-03-06',''],
          ['2020-03-01','99','2020-04-03','2020-04-26'],
          ['2020-03-01','999','2020-04-27','']]
    if mutate:
        mutate(rows)
    f=io.StringIO();w=csv.writer(f)
    w.writerow(['period_start_date',series,'realtime_start_date','realtime_end_date']);w.writerows(rows)
    readme=f'Series ID: {series}\nOutput Format: Observations by Real-Time Period\nFile Created: 2020-05-01 1:00 PM CDT\nUnits\n{units} 2011-01-01 Current\nFrequency\nMonthly 2011-01-01 Current\nSeasonal Adjustment\nSeasonally Adjusted 2011-01-01 Current\n'
    raw=io.BytesIO()
    with zipfile.ZipFile(raw,'w') as z:
        z.writestr('README.txt',readme);z.writestr('obs._by_real-time_period.csv',f.getvalue())
    return raw.getvalue()


def audit(raw):
    return payrolls_archive(raw,hashlib.sha256(raw).hexdigest(),'2019-12-01','2020-03-01')


class PayrollsTests(unittest.TestCase):
    def test_contraction_risk_uses_historical_revision_not_latest(self):
        report=audit(fixture());r=signal_at(report,'2020-04-25',P)
        self.assertEqual(r['ratio'],'100/99')
        self.assertEqual(r['base_payrolls'],99)
        self.assertGreater(feature(r['ratio'],P),0)
        self.assertEqual(signal_at(report,'2020-04-28',P)['ratio'],'100/999')
        changed=audit(fixture(mutate=lambda rows:rows[-1].__setitem__(1,'9999')))
        self.assertEqual(signal_at(changed,'2020-04-25',P),r)

    def test_series_units_and_value_rejected(self):
        for raw in [fixture(series='UNRATE'),fixture(units='Percent'),
                    fixture(mutate=lambda r:r[0].__setitem__(1,'-1')),
                    fixture(mutate=lambda r:r[0].__setitem__(1,'1.5')),
                    fixture(mutate=lambda r:r[0].__setitem__(1,'NaN'))]:
            with self.assertRaises(ValueError):
                audit(raw)

    def test_hash_and_interval_gaps_overlap_and_truncation_rejected(self):
        raw=fixture()
        with self.assertRaises(ValueError):
            payrolls_archive(raw,'0'*64)
        for mutate in [lambda r:r[-1].__setitem__(2,'2020-04-28'),
                       lambda r:r[-1].__setitem__(2,'2020-04-26'),
                       lambda r:r[-1].__setitem__(3,'2020-04-30'),
                       lambda r:r.pop(1)]:
            with self.assertRaises(ValueError):
                audit(fixture(mutate=mutate))

    def test_unpublished_base_missing_older_and_postexport_fail_closed(self):
        report=audit(fixture())
        self.assertIsNone(signal_at(report,'2020-04-02',P))
        report['months'].pop('2019-12-01')
        self.assertIsNone(signal_at(report,'2020-04-25',P))
        with self.assertRaises(ValueError):
            signal_at(report,'2020-05-02',P)

    def test_complete_report_records_units_without_original_bytes_claim(self):
        report=audit(fixture())
        self.assertEqual(report['month_count'],4)
        self.assertEqual(report['interval_count'],5)
        self.assertFalse(report['original_bls_bytes_verified'])


if __name__ == '__main__':
    unittest.main()
