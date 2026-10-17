"""Synthetic-only QA for fixed 24-phase retrospective GED diagnostics."""
import copy
import unittest
from ged_calendar_robustness import audit, scores, MODELS, RECENCY_SCHEMA, ORIGINAL_SCHEMA


def prepared():
    source={'ged_sha256':'a'*64,'roster_sha256':'b'*64,
            'ged_edition':'25.1','roster_edition':'25.1'}
    original={'schema':ORIGINAL_SCHEMA,'prospective_eligible':False,
              'source_as_of_verified':False,'outcome_horizon_months':24,
              'models':list(MODELS[:3]),'target':'synthetic_GED_target',
              'source':source,'partitions':{}}
    recency={'schema':RECENCY_SCHEMA,'prospective_eligible':False,
             'source_as_of_verified':False,'added_model':MODELS[3],
             'recency_buckets':['12_23m','24_59m','60plus_documented',
                                'history_incomplete'],'partitions':{}}
    for part,lo,hi in [('validation',2016,2019),('test',2020,2024)]:
        old=[];new=[]
        for year in range(lo,hi+1):
            for month in range(1,13):
                t=year*12+month-1
                cutoff=f'{(t-24)//12:04d}-{(t-24)%12+1:02d}'
                for cid in (1,2,3):
                    label=int((year+month+cid)%13==0)
                    row={'country_id':cid,'origin_year':year,'origin_month':month,
                         'cutoff':cutoff,'outcome':label,'probabilities':{
                             'global_reemergence':0.05,
                             'country_history':0.11 if cid==1 else .035,
                             'country_shrinkage':0.095 if cid==1 else .04}}
                    fresh=copy.deepcopy(row)
                    fresh['recency_bucket']=('history_incomplete' if cid==3
                                             else '24_59m' if cid==2 else '12_23m')
                    fresh['probabilities'][MODELS[3]]=(.05 if cid==3
                                                         else .08 if cid==2 else .16)
                    old.append(row);new.append(fresh)
        original['partitions'][part]={'years':[lo,hi],'cases':old}
        recency['partitions'][part]={'years':[lo,hi],
                                    'cases':new,'n':len(new),
                                    'events':sum(x['outcome'] for x in new),
                                    'all_months':{'models':{m:scores(new,m) for m in MODELS}}}
    return original,recency


class CalendarRobustnessTests(unittest.TestCase):
    def test_fixed_phases_and_temporal_semantics(self):
        original,recency=prepared()
        report=audit(original,recency)
        self.assertFalse(report['prospective_eligible'])
        for part in ('validation','test'):
            phases=report['partitions'][part]['phase_diagnostics']
            self.assertEqual(len(phases),24)
            self.assertTrue(all(len(p['target_end_months']) in (2,3)
                                for p in phases))
            self.assertEqual(phases[0]['target_end_months'],
                             ['2016-01','2018-01'] if part=='validation'
                             else ['2020-01','2022-01','2024-01'])
            self.assertEqual(phases[0]['hypothetical_issue_months'][0],
                             '2014-02' if part=='validation' else '2018-02')
            self.assertTrue(all(p['recency_bucket_counts']['history_incomplete']>0
                                for p in phases))

    def test_bad_inputs_are_rejected(self):
        original,recency=prepared()
        for case in ('cutoff','outcome','baseline','history','missing','score'):
            bad=copy.deepcopy(recency)
            row=bad['partitions']['test']['cases'][0]
            if case=='cutoff':row['cutoff']='2025-01'
            elif case=='outcome':row['outcome']=1-row['outcome']
            elif case=='baseline':row['probabilities']['country_history']=.99
            elif case=='history':
                row=next(r for r in bad['partitions']['test']['cases']
                         if r['recency_bucket']=='history_incomplete')
                row['probabilities']['time_since_last_event']=.9
            elif case=='missing':bad['partitions']['test']['cases'].pop()
            else:bad['partitions']['test']['all_months']['models']['country_history']['brier']=.9
            with self.subTest(case=case),self.assertRaises(ValueError):
                audit(original,bad)

    def test_ties_and_missing_auc(self):
        rows=[{'outcome':y,'probabilities':{'global_reemergence':p}}
              for p,y in ((.1,0),(.1,1),(.2,0),(.2,1))]
        self.assertAlmostEqual(scores(rows,'global_reemergence')['roc_auc_ties'],.5)
        self.assertAlmostEqual(scores(rows,'global_reemergence')['average_precision_ties'],.5)
        for row in rows: row['outcome']=0
        self.assertIsNone(scores(rows,'global_reemergence')['roc_auc_ties'])
        self.assertIsNone(scores(rows,'global_reemergence')['average_precision_ties'])


if __name__=='__main__':
    unittest.main()
