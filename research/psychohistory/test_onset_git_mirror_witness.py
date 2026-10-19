"""Synthetic GitHub API metadata only; no real files or country-level rows."""
from copy import deepcopy
import unittest
from onset_git_mirror_witness import inspect_mirror, COMMIT, TREE, PATH, BLOB, SIZE


def fixture():
    return (
        {'sha':COMMIT,'commit':{
            'tree':{'sha':TREE},
            'author':{'date':'2020-01-10T15:14:26Z'},
            'committer':{'date':'2020-01-10T15:14:26Z'},
            'verification':{'verified':False,'reason':'unsigned'}}},
        {'sha':TREE,'truncated':False,'tree':[
            {'path':PATH,'sha':BLOB,'size':SIZE,'type':'blob','mode':'100644'},
            {'path':'readme.md','sha':'0'*40,'size':10,'type':'blob','mode':'100644'}]},
    )


class HistoricalGitMirrorTests(unittest.TestCase):
    def test_real_metadata_shape_preserves_no_certification(self):
        c,t=fixture()
        r=inspect_mirror(c,t)
        self.assertTrue(r['immutable_git_tree_metadata_matches_pins_now'])
        self.assertFalse(r['historical_byte_availability_proven'])
        self.assertFalse(r['country_risk_set_verified'])
        self.assertFalse(r['backtest_authorized'])
        self.assertFalse(r['forecast_issued'])
        self.assertEqual(r['issue_scenarios'][0]['issue_date'],'2020-01-01')
        self.assertFalse(r['issue_scenarios'][0]['thirdparty_git_commit_claim_before_origin'])
        self.assertTrue(r['issue_scenarios'][1]['thirdparty_git_commit_claim_before_origin'])
        self.assertFalse(r['issue_scenarios'][1]['complete_prior_year_activity_present'])
        self.assertNotIn('country_ids',r)

    def test_not_canonical_git_object_rejected(self):
        for mode in ['sha','tree_sha','truncated']:
            c,t=fixture()
            if mode=='sha': c['sha']='0'*40
            if mode=='tree_sha': t['sha']='0'*40
            if mode=='truncated': t['truncated']=True
            with self.subTest(mode=mode),self.assertRaises(ValueError):
                inspect_mirror(c,t)

    def test_unexpected_git_blob_path_size_or_type_rejected(self):
        for name,value in [('sha','f'*40),('path','somewhere/else.csv'),
                           ('size',1),('type','tree'),('mode','100755')]:
            c,t=fixture()
            t['tree'][0][name]=value
            with self.subTest(name=name),self.assertRaises(ValueError):
                inspect_mirror(c,t)
        c,t=fixture()
        t['tree'].append(deepcopy(t['tree'][0]))
        with self.assertRaises(ValueError): inspect_mirror(c,t)

    def test_unsigned_commit_not_time_attestation(self):
        for change in [('verification',{'verified':True,'reason':'valid'}),
                       ('author',{'date':'2020-01-01T00:00:00Z'}),
                       ('committer',{'date':'2020-01-10T15:14:27Z'}),
                       ('tree',{'sha':'f'*40})]:
            c,t=fixture()
            c['commit'][change[0]]=change[1]
            with self.subTest(change=change),self.assertRaises(ValueError):
                inspect_mirror(c,t)

    def test_bad_or_unsorted_origins_rejected(self):
        invalid=[[],['2020-01-01'],(),('2020-02-01',),('2020-01-01T00:00:00Z',),
                 ('2021-01-01','2020-01-01'),('2020-01-01','2020-01-01'),
                 ('2025-01-01',)]
        for years in invalid:
            c,t=fixture()
            with self.subTest(years=years),self.assertRaises(ValueError):
                inspect_mirror(c,t,years)

    def test_retroactive_before_mirror_is_not_proof(self):
        c,t=fixture()
        r=inspect_mirror(c,t,('2019-01-01','2020-01-01','2021-01-01'))
        for scenario in r['issue_scenarios']:
            self.assertFalse(scenario['historical_origin_eligible'])
        self.assertFalse(r['source_asof_verified'])
        self.assertFalse(r['models_scored'])


if __name__=='__main__':
    unittest.main()
