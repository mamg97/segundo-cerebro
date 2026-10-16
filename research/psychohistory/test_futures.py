import copy
import itertools
import json
import unittest
from pathlib import Path
from futures import prepare, fit, matrix_for, endpoint, sequence_probability, origin_predictions, metrics, paired_interval, MODELS
from test_benchmark import fixture, PROTOCOL as SOURCE

P = json.loads((Path(__file__).parent / 'futures_protocol.json').read_text())


class FuturesTests(unittest.TestCase):
    def setUp(self): self.data = prepare(fixture(), SOURCE)

    def test_four_states_are_exhaustive_and_only_coherent_transitions_have_mass(self):
        fitted = fit(self.data, 2005, P)
        for model in MODELS:
            matrix = matrix_for(fitted, fitted['countries'][0], model, P)
            for state, row in enumerate(matrix):
                self.assertAlmostEqual(sum(row), 1)
                self.assertTrue(all(0 <= v <= 1 for v in row))
                for destination, value in enumerate(row):
                    if destination // 2 != state % 2: self.assertEqual(value, 0)

    def test_future_data_and_country_names_do_not_change_fitted_information(self):
        before = fit(self.data, 2005, P)
        changed = {key: {**value, 'b': 1 - value['b'], 'name': 'FUTURE'} if key[1] > 2003 else value for key, value in self.data.items()}
        self.assertEqual(before, fit(changed, 2005, P))
        self.assertEqual(before['cutoff'], 2003)

    def test_bridge_year_is_integrated_and_horizon_not_shifted(self):
        fitted = fit(self.data, 2005, P); country = fitted['countries'][0]
        matrix = matrix_for(fitted, country, 'markov', P)
        prediction, _ = origin_predictions(self.data, 2005, 1, P)
        row = next(r for r in prediction if r['country'] == country['id'])
        self.assertEqual(row['end'], 2005)
        self.assertEqual(row['models']['markov']['probabilities'], endpoint(country['initial'], matrix, 2))
        self.assertNotEqual(endpoint(country['initial'], matrix, 1), endpoint(country['initial'], matrix, 2))

    def test_distributions_and_sequence_enumeration_conserve_mass(self):
        fitted = fit(self.data, 2005, P); c = fitted['countries'][0]
        for model in MODELS:
            matrix = matrix_for(fitted, c, model, P)
            for h in [1, 3, 5, 10]: self.assertAlmostEqual(sum(endpoint(c['initial'], matrix, h + 1)), 1)
            probabilities = [sequence_probability(c['initial'], matrix, sequence) for sequence in itertools.product([0, 1], repeat=5)]
            self.assertAlmostEqual(sum(probabilities), 1)

    def test_scored_samples_are_identical_and_missing_labels_not_zero_filled(self):
        rows, dropped = origin_predictions(self.data, 2005, 5, P)
        self.assertEqual(dropped, 0)
        self.assertTrue(all(metrics(rows, model)['n'] == len(rows) for model in MODELS))
        shortened = {key: value for key, value in self.data.items() if key != (0, 2008)}
        kept, dropped = origin_predictions(shortened, 2005, 5, P)
        self.assertEqual(dropped, 1); self.assertEqual(len(kept), len(rows) - 1)

    def test_nominal_brier_known_values_and_calibration_denominators(self):
        rows, _ = origin_predictions(self.data, 2005, 1, P)
        rows = copy.deepcopy(rows[:2])
        for r in rows: r['models']['markov']['probabilities'] = [.25] * 4
        m = metrics(rows, 'markov'); self.assertAlmostEqual(m['brier'], .75)
        for state in m['calibration']: self.assertEqual(sum(b['count'] for b in state['bins']), 2)
        rows[0]['models']['markov']['probabilities'][0] = .8
        with self.assertRaises(ValueError): metrics(rows, 'markov')

    def test_uncertainty_requires_multiple_origins_and_is_paired(self):
        rows, _ = origin_predictions(self.data, 2005, 1, P)
        self.assertIsNone(paired_interval(rows, 'markov', 'frequency', P))
        rows += origin_predictions(self.data, 2006, 1, P)[0] + origin_predictions(self.data, 2007, 1, P)[0] + origin_predictions(self.data, 2008, 1, P)[0]
        self.assertEqual(paired_interval(rows, 'markov', 'markov', {**P, 'bootstrap_replicates': 20}), [0, 0])


if __name__ == '__main__': unittest.main()
