"""Only synthetic series: temporal leakage, exact threshold, gaps and baseline checks."""
import copy
from decimal import Decimal
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from macro_monthly_pilot import monthly_forecast, make_case, metrics
from macro_retrospective import shift_month

P = json.loads((Path(__file__).parent/'macro_monthly_protocol_v1.json').read_text())

def series():
    return {shift_month('2028-09-01', i): '4.0' for i in range(-70, 1)}

class MonthlyTests(unittest.TestCase):
    def test_flat_and_zero_drift_equal_baseline(self):
        r = monthly_forecast(series(), '2028-11-01', P)
        self.assertEqual(r['pair_count'], 60)
        self.assertEqual(r['probability'], 1/62)
        self.assertEqual(r['probability'], r['baseline_probability'])
        self.assertEqual(r['persistence_probability'], 0)

    def test_exact_threshold_and_drift_counts(self):
        v = series();v['2028-09-01'] = '4.3'
        r = monthly_forecast(v, '2028-11-01', P)
        self.assertEqual(Decimal(r['drift_pp']), Decimal('0.2'))
        self.assertEqual(r['baseline_count'], 1)
        self.assertEqual(r['candidate_count'], 60)
        self.assertEqual(r['probability'], 61/62)
        v['2028-09-01'] = '4.2'
        self.assertEqual(monthly_forecast(v,'2028-11-01',P)['baseline_count'],1)

    def test_gaps_and_insufficient_pairs(self):
        v = series();del v['2027-05-01']
        r = monthly_forecast(v, '2028-11-01', P)
        self.assertEqual(r['pair_count'],58)
        self.assertEqual(len(r['excluded_pairs']),2)
        for i in range(-50,-30):v.pop(shift_month('2028-09-01',i),None)
        self.assertEqual(monthly_forecast(v,'2028-11-01',P)['status'],'INSUFFICIENT_PAIRS')

    def test_stale_or_future_base_and_missing_momentum(self):
        for key in ('2028-09-01','2028-06-01'):
            v=series();del v[key]
            self.assertNotIn('probability',monthly_forecast(v,'2028-11-01',P))
        v=series();v['2028-11-01']='5.0'
        self.assertEqual(monthly_forecast(v,'2028-11-01',P)['status'],'BASE_MONTH_MISMATCH')

    def test_future_labels_cannot_change_forecast_and_early_label_rejected(self):
        selected=[{'reference_month':m,'rate_percent':v,'status':'AVAILABLE'} for m,v in series().items()]
        with patch('macro_monthly_pilot.asof.select',return_value=selected) as select:
            labels={'2028-11-01':{'rate_percent':'4.2','alfred_realtime_start_date':'2028-12-01'}}
            r=make_case({},labels,'2028-11-01',P)
            self.assertEqual(r['y'],1)
            self.assertEqual(r['vintage_date'],'2028-10-25')
            self.assertEqual(r['issue_timestamp'],'2028-10-26T12:00:00+00:00')
            changed=copy.deepcopy(labels);changed['2028-11-01']['rate_percent']='3.0'
            r2=make_case({},changed,'2028-11-01',P)
            self.assertEqual(r2['y'],0)
            for key in ('probability','baseline_probability','pairs','drift_pp'):
                self.assertEqual(r[key],r2[key])
            changed['2028-11-01']['alfred_realtime_start_date']='2028-10-26'
            with self.assertRaises(ValueError):make_case({},changed,'2028-11-01',P)

    def test_missing_labels_and_paired_metrics(self):
        selected=[{'reference_month':m,'rate_percent':v,'status':'AVAILABLE'} for m,v in series().items()]
        with patch('macro_monthly_pilot.asof.select',return_value=selected):
            r=make_case({}, {}, '2028-11-01',P)
        self.assertNotIn('y',r)
        self.assertEqual(metrics([r])['scored'],0)
        rows=[dict(status='CALCULATED_NOT_ISSUED',y=y,probability=p,baseline_probability=.5,persistence_probability=0.) for y,p in [(0,.1),(1,.9)]]
        result=metrics(rows+[r])
        self.assertAlmostEqual(result['brier_probability'],.01)
        self.assertEqual(result['brier_baseline_probability'],.25)
        self.assertEqual(result['brier_persistence_probability'],.5)
        self.assertTrue(result['passes_exploratory_admission'])
        self.assertFalse(result['prospective_issuance_authorized'])

    def test_invalid_values_and_dates(self):
        for value in ('NaN','Infinity','-1','101'):
            v=series();v['2028-09-01']=value
            with self.assertRaises(ValueError):monthly_forecast(v,'2028-11-01',P)
        with self.assertRaises(ValueError):monthly_forecast(series(),'2028-11-02',P)

if __name__=='__main__':unittest.main()
