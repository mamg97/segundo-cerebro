"""Adversarial synthetic tests. No real country or event identities."""
import copy
import tempfile
import unittest
import hashlib
import zipfile
from pathlib import Path
from unittest.mock import patch
import ged_monthly_cy_bridge as bridge
from ged_monthly_cy_diagnostics import evaluate, annual_rows, confusion
from test_ged_monthly_cy_bridge import create, event
from test_release_separated_holdout import make_version


def synthetic_panel(old,year):
    return {int(r['country_id']):{'months':[0]*11+[1],
        'deaths':[0]*11+[int(float(r['sb_total_deaths_best']))],
        'impreciseRecords':0,'allDateDeaths':int(float(r['sb_total_deaths_best'])),
        'name':r['country']} for r in old if int(r['year'])==year}


class MonthlyAuditTests(unittest.TestCase):
    def read(self,events):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'synthetic.zip';sha=create(path,events)
            with patch.dict(bridge.GED_RELEASES[2022],{'sha256':sha}),patch.object(bridge,'MIN_EXPECTED_ROWS',1):
                return bridge.ged_monthly_panel(path,2022,expected_sha=sha)

    def test_future_date_hidden_in_old_year_and_excluded_type_rejected(self):
        for kind in (1,2,3):
            r=event(1,1,'2023-01-01',kind=kind);r['year']=2021
            with self.subTest(kind=kind),self.assertRaisesRegex(ValueError,'Future'):
                self.read([r])

    def test_bad_precision_reversed_and_missing_dates_rejected(self):
        for r in (event(1,1,'2022-01-01',prec=6),
                  event(1,1,'2022-01-03',end='2022-01-01'),
                  {**event(1,1,'2022-01-03'),'date_end':''},
                  event(1,1,'2022-01-03T12:30:00')):
            with self.subTest(row=r),self.assertRaises(ValueError):self.read([r])

    def test_duplicate_events_and_corrupt_sha_fail(self):
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            self.read([event(1,1,'2022-01-01')]*2)
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'synthetic.zip';sha=create(p,[event(1,1,'2022-01-01')])
            with patch.dict(bridge.GED_RELEASES[2022],{'sha256':sha}):
                with p.open('ab') as f:f.write(b'corrupt')
                with self.assertRaisesRegex(ValueError,'SHA mismatch'):
                    bridge.ged_monthly_panel(p,2022,expected_sha=sha)

    def test_duplicate_headers_and_ragged_csv_rejected(self):
        header='id,country_id,year,type_of_violence,best,date_start,date_end,date_prec'
        row='1,1,2022,1,2,2022-01-01,2022-01-01,1'
        for content in (header+',best\n'+row+',2\n',header+'\n'+row+',EXTRA\n',
                        header+'\n'+row.rsplit(',',1)[0]+'\n'):
            with tempfile.TemporaryDirectory() as folder:
                p=Path(folder)/'synthetic.zip'
                with zipfile.ZipFile(p,'w') as z:z.writestr('ged.csv',content)
                sha=hashlib.sha256(p.read_bytes()).hexdigest()
                with patch.dict(bridge.GED_RELEASES[2022],{'sha256':sha}),patch.object(bridge,'MIN_EXPECTED_ROWS',1):
                    with self.assertRaises(ValueError):bridge.ged_monthly_panel(p,2022,expected_sha=sha)

    def test_actual_monthly_counts_preserve_exclusions_and_undefined_concentration(self):
        panel,_=self.read([event(1,1,'2022-01-01',best=2),
            event(2,1,'2022-12-01',best=3),event(3,1,'2022-12-05',prec=3,best=4),
            event(4,2,'2022-06-01',prec=4,best=2)])
        d=bridge.monthly_descriptors(panel[1])
        self.assertEqual(d['recordedExactEvents'],2)
        self.assertEqual(d['recordedExactDeaths'],5)
        self.assertEqual(panel[1]['allDateDeaths'],9)
        self.assertEqual(d['monthsWithEligibleRecords'],2)
        self.assertEqual(d['q4MinusQ3RecordedEvents'],1)
        self.assertEqual(d['temporalEventHHI'],.5)
        self.assertEqual(d['linearMonthlyCountSlope'],0)
        self.assertIsNone(bridge.monthly_descriptors(panel[2])['temporalEventHHI'])
        self.assertIsNone(bridge.monthly_descriptors(panel[2])['monthsSinceLastEligibleRecord'])

    def test_cy_semantics_reconciliation_and_probabilities_do_not_use_future_labels(self):
        old=make_version('24.1',2023);later=make_version('26.1',2025)
        panel=synthetic_panel(old,2023)
        a=evaluate(old,later,panel,2023)
        bad=copy.deepcopy(panel);bad[1]['name']='FICTIONAL_DIFFERENT_GEOGRAPHY'
        with self.assertRaisesRegex(ValueError,'reconciliation'):evaluate(old,later,bad,2023)
        bad=copy.deepcopy(panel);bad[1]['allDateDeaths']+=1
        with self.assertRaisesRegex(ValueError,'reconciliation'):evaluate(old,later,bad,2023)
        revised=copy.deepcopy(later)
        for r in revised:
            if int(r['year'])<=2023:r['sb_total_deaths_best']='nan'
            else:r['sb_total_deaths_best']='999'
        b=evaluate(old,revised,panel,2023)
        for m in a['models']:
            for x,y in zip(a['models'][m]['all']['calibration'],b['models'][m]['all']['calibration']):
                self.assertEqual((x['n'],x['meanRisk']),(y['n'],y['meanRisk']))
        self.assertEqual(a['monthlyExactDayRecordedEvents'],b['monthlyExactDayRecordedEvents'])
        self.assertFalse(a['reconciliation']['independentSource'])
        self.assertNotIn('FICTIONAL',str(a));self.assertNotIn('country_id',str(a))

    def test_missing_labels_not_coded_stable_and_nan_duplicates_rejected(self):
        old=make_version('24.1',2023);later=make_version('26.1',2025)
        panel=synthetic_panel(old,2023)
        reduced=[r for r in later if not (r['country_id']=='1' and r['year']=='2024')]
        result=evaluate(old,reduced,panel,2023)
        self.assertEqual(result['missingOutcomes'],1);self.assertEqual(result['scored'],7)
        for bad in ('nan','inf','-1',''):
            changed=copy.deepcopy(later)
            target=next(r for r in changed if r['year']=='2024');target['sb_total_deaths_best']=bad
            with self.subTest(value=bad),self.assertRaises(ValueError):evaluate(old,changed,panel,2023)
        with self.assertRaisesRegex(ValueError,'duplicated'):annual_rows(old+[old[0]])
        with self.assertRaisesRegex(ValueError,'beyond cutoff'):annual_rows(later,latest=2023)

    def test_alerts_have_correct_denominators_and_no_alert_precision_is_undefined(self):
        r=confusion([(True,True),(True,False),(False,True),(False,False)])
        self.assertEqual(r['precision'],.5);self.assertEqual(r['eventCoverage'],.5)
        self.assertEqual(r['falseAlarmRateAmongStable'],.5)
        self.assertIsNone(confusion([(False,False)])['precision'])
        self.assertIsNone(confusion([(False,False)])['eventCoverage'])

if __name__=='__main__':unittest.main()
