"""Synthetic-only regression checks for unlabeled 2027 candidate forecasts.

Tests intentionally do NOT contain any real UCDP records or predictions.
"""
import copy
import json
from pathlib import Path
import unittest
from unittest.mock import patch

from benchmark import panel, predict_origin
from future_2027_candidates import candidate_rows, generate_private_candidates, MODELS

PROTOCOL = json.loads((Path(__file__).parent / 'protocol.json').read_text())


def synthetic_country_years():
    rows = []
    for cid in range(101, 107):
        for year in range(1989, 2026):
            # Pseudo-variation in each historical information set.
            high = ((year + cid) % 7 in (0, 1, 3))
            rows.append({
                'country': 'SYNTHETIC_' + str(cid), 'country_id': str(cid),
                'year': str(year), 'Version': '26.1', 'region': 'FICTIONAL',
                'sb_total_deaths_best': '32' if high else '0',
                'sb_total_deaths_low': '25' if high else '0',
                'sb_total_deaths_high': '42' if high else '0',
                'ns_total_deaths_best': str((year + cid) % 3),
                'os_total_deaths_best': str((year + 2*cid) % 5),
            })
    return rows


class FutureOriginCandidatesTests(unittest.TestCase):
    def test_six_preregistered_models_and_no_2027_label(self):
        report = candidate_rows(synthetic_country_years(), PROTOCOL)
        self.assertEqual(report['selectedCountries'], 6)
        self.assertEqual(report['excludedForMissingHistory'], 0)
        self.assertEqual(len(report['candidates']), 6)
        for row in report['candidates']:
            self.assertEqual(row['targetYear'], 2027)
            self.assertEqual(row['featureCutoffYear'], 2025)
            self.assertEqual(row['trainingLabelsThroughYear'], 2025)
            self.assertIsNone(row['outcome'])
            self.assertEqual(tuple(row['probabilities']), MODELS)
            self.assertTrue(all(0 <= p <= 1 for p in row['probabilities'].values()))

    def test_same_engine_and_model_prescriptions_not_a_retrofit(self):
        source = synthetic_country_years()
        panel_rows, _ = panel(source, PROTOCOL)
        report = candidate_rows(source, PROTOCOL)
        future = []
        for row in report['candidates']:
            cid = row['countryId']
            last = {int(r['year']): r for r in source if int(r['country_id']) == cid}
            history = [last[y] for y in range(2021, 2026)]
            active = [int(float(r['sb_total_deaths_best']) >= 25) for r in history]
            import math, statistics
            future.append({
                'country': cid, 'year': 2027, 'target': None,
                'region': 'FICTIONAL', 'feature_year': 2025,
                'x': [float(active[-1]), statistics.fmean(active),
                      math.log1p(float(history[-1]['sb_total_deaths_best'])),
                      math.log1p(float(history[-1]['ns_total_deaths_best'])),
                      math.log1p(float(history[-1]['os_total_deaths_best']))],
                'last_target': active[-1],
            })
        direct = predict_origin(panel_rows + future, 2027, PROTOCOL)
        for report_row, source_row in zip(report['candidates'], direct):
            self.assertEqual(report_row['countryId'], source_row['country'])
            for model in MODELS:
                self.assertAlmostEqual(report_row['probabilities'][model], source_row[model], places=12)

    def test_future_year_outcomes_cannot_be_smuggled(self):
        rows = synthetic_country_years()
        invalid = rows + [{**rows[0], 'year': '2026'}]
        with self.assertRaisesRegex(ValueError, 'after the observed'):
            candidate_rows(invalid, PROTOCOL)

    def test_absent_roster_and_history_are_not_imputed(self):
        rows = synthetic_country_years()
        remove = [r for r in rows if not (
            int(r['country_id']) == 101 and int(r['year']) == 2023)]
        out = candidate_rows(remove, PROTOCOL)
        self.assertEqual(out['selectedCountries'], 6)
        self.assertEqual(out['excludedForMissingHistory'], 1)
        self.assertEqual(len(out['candidates']), 5)
        without2025 = [r for r in remove if not (int(r['country_id']) == 102 and int(r['year']) == 2025)]
        result = candidate_rows(without2025, PROTOCOL)
        self.assertEqual(result['selectedCountries'], 5)
        self.assertEqual(len(result['candidates']), 4)

    def test_contract_is_fail_closed_if_model_specification_changes(self):
        rows = synthetic_country_years()
        for key, value in [('feature_lag_years', 1), ('training_label_lag_years', 1),
                           ('dataset_version', '25.1'), ('threshold_deaths', 1),
                           ('models', ['frequency'])]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                candidate_rows(rows, {**PROTOCOL, key: value})

    def test_private_runner_rejects_unverified_snapshot(self):
        fake_manifest = {
            'schemaValidated': False, 'sourceChecksumMatchesPinnedProtocol': True,
            'version': '26.1'
        }
        with patch('future_2027_candidates.inspect', return_value=fake_manifest), \
             patch('future_2027_candidates.load_official') as loader:
            with self.assertRaisesRegex(ValueError, 'did not pass'):
                generate_private_candidates(Path('/SYNTHETIC/not-real'), PROTOCOL)
            loader.assert_not_called()

    def test_historical_labels_remain_unaffected_by_future_missingness(self):
        rows = synthetic_country_years()
        history, _ = panel(rows, PROTOCOL)
        future = candidate_rows(rows, PROTOCOL)
        self.assertLessEqual(max(item['year'] for item in history), 2025)
        self.assertTrue(all(item['outcome'] is None for item in future['candidates']))
        self.assertNotIn('score', json.dumps(future).lower())


if __name__ == '__main__':
    unittest.main()
