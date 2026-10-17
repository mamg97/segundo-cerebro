"""Synthetic GED incidents and country-horizon links; no historical observations."""
import copy
import csv
import hashlib
import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from ged_incident_casebook import read_events,join_cases,SCHEMA

PROBS={'global_reemergence':.05,'country_history':.1,'country_shrinkage':.08,'time_since_last_event':.12}


def case(country,year,month,label):
    t=year*12+month-1-24
    return {'country_id':country,'origin_year':year,'origin_month':month,
            'cutoff':f'{t//12:04d}-{t%12+1:02d}','outcome':label,'probabilities':PROBS.copy()}


def report():
    v=[case(7,2016,1,1),case(8,2016,1,0)]
    t=[case(7,2020,1,1),case(7,2020,2,1)]
    return {'schema':SCHEMA,'prospective_eligible':False,'source_as_of_verified':False,
            'added_model':'time_since_last_event','target':'synthetic_event_within_24m',
            'partitions':{'validation':{'years':[2016,2019],'n':2,'events':1,'cases':v},
                          'test':{'years':[2020,2024],'n':2,'events':2,'cases':t}}}


def event(id, day):
    return {'ged_id':id,'date':day,'country':'Synthetic Republic','place':'Invented Harbor',
            'side_a':'Synthetic Government','side_b':'Synthetic Group'}


class IncidentCasebookTests(unittest.TestCase):
    def test_first_event_links_and_unique_ids(self):
        events={7:[event(101,'2014-12-17'),event(102,'2019-01-16'),event(103,'2019-11-01')]}
        out=join_cases(report(),events,'a'*64,'b'*64)
        self.assertEqual(out['total_positive_horizon_links'],3)
        self.assertEqual(out['distinct_ged_events_first_in_any_horizon'],2)
        self.assertEqual(out['partitions']['validation']['links'][0]['earliest_event_ged_id'],101)
        self.assertTrue(all(x['earliest_event_ged_id']==102 for x in out['partitions']['test']['links']))
        self.assertEqual(out['partitions']['test']['links'][0]['hypothetical_issue_month'],'2018-02')
        self.assertFalse(out['prospective_eligible'])

    def test_refuse_missing_or_future_event_and_duplication(self):
        original=report()
        with self.assertRaises(ValueError):
            join_cases(original,{7:[event(101,'2014-12-17')]},'a'*64,'b'*64)
        wrong=copy.deepcopy(original);wrong['partitions']['validation']['cases'][1]['outcome']=1
        with self.assertRaises(ValueError):
            join_cases(wrong,{7:[event(101,'2014-12-17'),event(102,'2019-01-16')]},'a'*64,'b'*64)
        repeated=copy.deepcopy(original)
        repeated['partitions']['test']['cases'].append(repeated['partitions']['test']['cases'][0])
        repeated['partitions']['test']['n']=3; repeated['partitions']['test']['events']=3
        with self.assertRaises(ValueError):
            join_cases(repeated,{7:[event(101,'2014-12-17'),event(102,'2019-01-16')]},'a'*64,'b'*64)

    def test_exact_date_official_source_filter(self):
        names=['id','year','country_id','country','type_of_violence','best','low','high',
               'date_start','date_end','date_prec','where_coordinates','where_prec',
               'side_a','side_b','dyad_name','conflict_name','source_date']
        defaults=dict.fromkeys(names,'')
        rawrows=[]
        for index in range(1,10002):
            line={**defaults,'id':str(index),'year':'2019','country_id':'7',
                  'country':'Synthetic Republic','type_of_violence':'2','best':'1',
                  'low':'1','high':'1','date_start':'2019-01-16','date_end':'2019-01-16',
                  'date_prec':'1','where_coordinates':'Invented Harbor',
                  'where_prec':'1','side_a':'A','side_b':'B','dyad_name':'A-B',
                  'conflict_name':'Invented','source_date':'2019-01-17'}
            if index==14:line['type_of_violence']='1'
            if index==15:
                line['type_of_violence']='1'
                line['date_prec']='2'
            rawrows.append(line)
        output=io.StringIO()
        writer=csv.DictWriter(output,fieldnames=names)
        writer.writeheader()
        writer.writerows(rawrows)
        with tempfile.TemporaryDirectory() as directory:
            archive=Path(directory)/'ged.zip'
            with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
                z.writestr('GEDEvent_v25_1.csv',output.getvalue())
            digest=hashlib.sha256(archive.read_bytes()).hexdigest()
            data,rawcount=read_events(archive,digest,{7})
            self.assertEqual(rawcount,10001)
            self.assertEqual([r['ged_id'] for r in data[7]],[14])
            with self.assertRaises(ValueError):
                read_events(archive,'0'*64,{7})


if __name__=='__main__':
    unittest.main()
