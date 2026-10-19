"""Synthetic geographic nomenclature cases, no real country mappings."""
import csv
import io
import unittest
from cow_gw_name_triage import analyze, _name

COW = ['stateabb','ccode','statenme','styear','stmonth','stday','endyear','endmonth','endday','version']
GW = ['statenumber','stateid','countryname','start','end']


def encode(header, rows, sep=','):
    x=io.StringIO(newline='')
    w=csv.writer(x, delimiter=sep)
    w.writerow(header)
    w.writerows(rows)
    return x.getvalue().encode()


def cow(token,code,label):
    return [token,code,label,2010,1,1,2024,12,31,2024]


def gw(token,code,label):
    return [code,token,label,'2010-01-01','2020-12-31']


def samples():
    c=encode(COW,[cow('AAA',100,'Fictional Alpha'),cow('BBB',200,'Fictional Beta'),cow('CCC',300,'Coastal Fictionia'),cow('DDD',400,'Northern Fictionia'),cow('EEE',500,'Reused Name'),cow('FFF',600,'Orphan Country')])
    g=encode(GW,[gw('AAA',100,'Fictional Alpha'),gw('BBB',201,'Fictional Beta'),gw('WWW',300,'Coastal Fictionia'),gw('TTT',701,'Northern Fictionia'),gw('YYY',702,'Reused Name')], '\t')
    m=encode(GW,[gw('QQQ',999,'Reused Name'),gw('RRR',998,'Not COW State')], '\t')
    return c,g,m

class NameTriageTests(unittest.TestCase):
    def test_exact_name_leads_are_unapproved(self):
        result, queue = analyze(*samples(), ['2020-12','2024-12','2025-01'])
        m = result['periods'][0]
        self.assertEqual((m['n_cow'],m['n_gw']),(6,7))
        self.assertEqual(m['n_same_token'],2)
        self.assertEqual(m['n_same_token_different_code'],1)
        self.assertEqual(m['n_cow_without_token'],4)
        self.assertEqual(m['n_gw_without_token'],5)
        self.assertEqual(m['n_name_leads'],2)
        self.assertEqual(m['n_name_leads_same_code'],1)
        self.assertEqual(m['n_name_leads_different_code'],1)
        self.assertEqual(m['n_ambiguous_repeated_name'],1)
        self.assertEqual(m['n_cow_still_unresolved'],2)
        self.assertEqual(m['n_gw_still_unresolved'],3)
        self.assertEqual(m['n_numeric_false_friends'],1)
        self.assertEqual(result['periods'][1]['status'],'GW_SOURCE_EXPIRED')
        self.assertEqual(result['periods'][2]['status'],'COW_SOURCE_EXPIRED')
        self.assertEqual(result['n_private_review_leads'],2)
        self.assertEqual(len(queue),2)
        self.assertTrue(all(not x['geographic_identity_verified'] for x in queue))
        for k in ('geographic_identity_verified','source_as_of_verified',
                  'ucdp_country_coverage_verified','absence_of_events_means_negative',
                  'vintage_correct_backtest','models_scored','forecast_issued'):
            self.assertFalse(result[k])
        self.assertNotIn('country_ids',result)
        self.assertNotIn('rows',result)

    def test_source_name_normalization_does_not_establish_identity(self):
        self.assertEqual(_name(' FICCIÓN    ISLE '),_name('ficción isle'))
        self.assertNotEqual(_name('Old State'),_name('New State'))
        with self.assertRaises(ValueError):
            _name('  ')
