import copy
import json
import math
import unittest
from pathlib import Path
from benchmark import audit, panel, predict_origin, metrics, average_precision, uncertainty, abm_sensitivity, fit_logit, estimate

PROTOCOL=json.loads((Path(__file__).parent/'protocol.json').read_text())


def fixture():
    rows=[]
    for country in range(4):
        for year in range(1990,2011):
            active=(year+country)%4==0
            rows.append(dict(country='SYNTHETIC_'+str(country),country_id=str(country),
                             year=str(year),Version='26.1',region='SYNTHETIC',
                             sb_total_deaths_best=str(30*active),sb_total_deaths_low=str(20*active),
                             sb_total_deaths_high=str(40*active),ns_total_deaths_best='0',os_total_deaths_best='0'))
    return rows


class BenchmarkTests(unittest.TestCase):
    def test_audit_rejects_duplicates_gaps_versions_and_invalid_counts(self):
        for mutate in (lambda r:r+[r[0]], lambda r:r[:4]+r[5:],
                       lambda r:[{**r[0],'Version':'wrong'}]+r[1:],
                       lambda r:[{**r[0],'sb_total_deaths_best':'nan'}]+r[1:]):
            with self.assertRaises(ValueError): audit(mutate(fixture()),PROTOCOL,False)
        self.assertTrue(audit(fixture(),PROTOCOL,False)['passed'])

    def test_no_roster_padding_and_labels_are_separate_from_predictors(self):
        a,excluded=panel(fixture(),PROTOCOL)
        self.assertEqual(excluded,24)
        self.assertEqual(len(a),60)
        self.assertTrue(all(r['feature_year']==r['year']-2 for r in a))
        raw=fixture(); modified=copy.deepcopy(raw)
        for r in modified:
            if int(r['year'])>=2005: r['sb_total_deaths_best']='999'
        b,_=panel(modified,PROTOCOL)
        before=lambda rows:[r['x'] for r in rows if r['year']==2005]
        self.assertEqual(before(a),before(b))

    def test_purging_and_future_outcome_invariance(self):
        rows,_=panel(fixture(),PROTOCOL)
        p=PROTOCOL
        a=predict_origin(rows,2007,p)
        changed=[{**r,'target':1-r['target']} if r['year']>2005 else r for r in rows]
        b=predict_origin(changed,2007,p)
        for x,y in zip(a,b):
            self.assertLessEqual(x['training_last_year'],2005)
            for model in PROTOCOL['models']: self.assertEqual(x[model],y[model])

    def test_onset_definition_and_zero_persistence(self):
        presence,_=panel(fixture(),PROTOCOL)
        onset,_=panel(fixture(),PROTOCOL,'onset')
        self.assertEqual([r['target'] for r in onset],[r['target'] for r in presence])
        raw=fixture()
        for r in raw: r['sb_total_deaths_best']='30'
        onset,_=panel(raw,PROTOCOL,'onset')
        self.assertTrue(all(r['target']==0 for r in onset))

    def test_metrics_known_values_ties_and_empty(self):
        r=[dict(year=2020,target=1,p=.8),dict(year=2021,target=0,p=.2)]
        m=metrics(r,'p'); self.assertAlmostEqual(m['brier'],.04)
        self.assertAlmostEqual(m['log_loss'],-math.log(.8))
        self.assertEqual(m['average_precision'],1)
        tied=[{**row,'p':.5} for row in r]
        self.assertEqual(average_precision(tied,'p'),.5)
        self.assertEqual(average_precision(list(reversed(tied)),'p'),.5)
        self.assertIsNone(metrics([],'p')['brier'])
        with self.assertRaises(ValueError): metrics([dict(target=1,p=1.1)],'p')

    def test_paired_block_bootstrap_reproducible(self):
        rows=[dict(year=y,target=y%2,m=.6,b=.5) for y in range(2016,2026)]
        p={**PROTOCOL,'bootstrap_replicates':30}
        self.assertEqual(uncertainty(rows,'m','b',p),uncertainty(rows,'m','b',p))
        identity=uncertainty(rows,'m','m',p)
        self.assertEqual(identity['brier_difference_95'],[0,0])
        self.assertEqual(identity['brier_skill_95'],[0,0])

    def test_abm_seed_grid_is_synthetic_and_reproducible(self):
        report=abm_sensitivity()
        self.assertEqual(report['n_runs'],240)
        self.assertIsNone(report['empirical_fit'])
        self.assertTrue(all(g['reproduced_seed0'] for g in report['groups']))
        self.assertTrue(all(0<=g['mean_final']<=1 for g in report['groups']))

    def test_logistic_converges_to_known_intercept_and_fails_closed(self):
        w=fit_logit([[0.0]]*100,[1]*2+[0]*98)
        self.assertAlmostEqual(estimate(w,[0]),.02,places=7)
        with self.assertRaises(ValueError): fit_logit([[1],[-1]],[1,0],iterations=1)
        with self.assertRaises(ValueError): fit_logit([[0],[0]],[0,0])


if __name__=='__main__': unittest.main()
