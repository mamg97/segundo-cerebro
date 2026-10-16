"""Synthetic mathematical invariants for futures_audit.

Tests use invented probabilities only. They do not assert any forecasting skill.
"""
import copy
import math
import unittest

from futures_audit import (
    ALLOWED, STATES, one_hot, transition_counts, transition_matrix,
    propagate, graph_flows, exact_top_paths, parameter_intervals,
    validate_distribution, validate_matrix, verify_aggregate_output,
)


def example_matrix():
    # Independent invented parameters resembling the local preview, NOT real UCDP estimates.
    rates = {"00": 0.8659, "01": 0.2727, "10": 0.6, "11": 0.4}
    result = {}
    for state in STATES:
        zero, one = ALLOWED[state]
        result[state] = {target: rates[state] if target == zero
                         else 1.0-rates[state] if target == one else 0.0
                         for target in STATES}
    return result


class ReferenceOracleTests(unittest.TestCase):
    def test_structural_zeros_and_normalization(self):
        matrix = example_matrix()
        validate_matrix(matrix)
        for source in STATES:
            self.assertEqual(set(ALLOWED[source]), {s for s in STATES if matrix[source][s] > 0})
        bad = copy.deepcopy(matrix)
        bad["00"]["10"] = .01
        bad["00"]["00"] -= .01
        with self.assertRaises(ValueError):
            validate_matrix(bad)
        for wrong in ({"00": .5}, {"00": 1, "01": 0, "10": 0, "11": .1},
                      {"00": float("nan"), "01": 0, "10": 0, "11": 0},
                      {"00": -1, "01": 2, "10": 0, "11": 0}):
            with self.assertRaises(ValueError):
                validate_distribution(wrong)

    def test_screenshot_like_example_two_year_bridge(self):
        # Synthetic: last observed pair 00 in 2008. 2009 is a nonobserved bridge.
        result = propagate(one_hot("00"), example_matrix(), 2)
        self.assertAlmostEqual(result[1]["00"], .8659)
        self.assertAlmostEqual(result[1]["01"], .1341)
        expected = {
            "00": .8659 * .8659,
            "01": .8659 * .1341,
            "10": .1341 * .2727,
            "11": .1341 * .7273,
        }
        for state in STATES:
            self.assertAlmostEqual(result[2][state], expected[state], places=12)
        self.assertAlmostEqual(math.fsum(result[2].values()), 1.0)

    def test_flow_reconciles_every_year_and_node(self):
        graph = graph_flows(one_hot("01"), example_matrix(), 10)
        self.assertEqual(len(graph["distributions"]), 11)
        self.assertEqual(len(graph["edges"]), 80)  # 8 structurally admissible per year
        for mass in graph["probability_mass"]:
            self.assertAlmostEqual(mass, 1.0)
        for year in range(1, 11):
            for node in STATES:
                outgoing = math.fsum(e["joint_flow"] for e in graph["edges"]
                                    if e["year_offset"] == year and e["source"] == node)
                incoming = math.fsum(e["joint_flow"] for e in graph["edges"]
                                    if e["year_offset"] == year and e["target"] == node)
                self.assertAlmostEqual(outgoing, graph["distributions"][year - 1][node])
                self.assertAlmostEqual(incoming, graph["distributions"][year][node])

    def test_paths_sum_to_one_and_residual_is_not_renormalized(self):
        initial = {"00": .3, "01": .2, "10": .1, "11": .4}
        matrix = example_matrix()
        for horizon in (0, 1, 2, 5, 10, 12):
            for keep in (1, 12):
                result = exact_top_paths(initial, matrix, horizon, keep)
                self.assertAlmostEqual(result["represented_mass"] + result["residual_mass"], 1)
                self.assertEqual(len(result["top_paths"]), min(keep, result["all_path_count"]))
                self.assertEqual(result["top_paths"], sorted(
                    result["top_paths"], key=lambda p: (-p["probability"], p["states"])))
                self.assertAlmostEqual(sum(p["probability"] for p in result["top_paths"]),
                                       result["represented_mass"])
        with self.assertRaises(ValueError):
            exact_top_paths(initial, matrix, 13)

    def test_posterior_mean_and_intervals_repeat_with_seed(self):
        observed = [0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]
        counts = transition_counts(observed)
        matrix = transition_matrix(counts)
        initial = one_hot("00")
        intervals = parameter_intervals(initial, counts, 4, draws=150, seed=11)
        self.assertEqual(intervals, parameter_intervals(initial, counts, 4, draws=150, seed=11))
        predictions = propagate(initial, matrix, 4)
        for t in range(5):
            for state in STATES:
                lo, hi = intervals[t][state]["lower_95"], intervals[t][state]["upper_95"]
                self.assertTrue(0 <= lo <= hi <= 1)
                self.assertLessEqual(lo, predictions[t][state] + .15)
                self.assertGreaterEqual(hi, predictions[t][state] - .15)

    def test_oracle_detects_corrupted_payload(self):
        initial, matrix = one_hot("00"), example_matrix()
        distributions = propagate(initial, matrix, 3)
        paths = exact_top_paths(initial, matrix, 3, keep=5)
        payload = {"initial": initial, "matrix": matrix, "horizon": 3,
                   "distributions": distributions, "paths": paths, "keep": 5}
        self.assertTrue(verify_aggregate_output(payload)["ok"])
        mutated = copy.deepcopy(payload)
        mutated["distributions"][3]["00"] -= .03
        mutated["distributions"][3]["01"] += .03
        with self.assertRaises(ValueError):
            verify_aggregate_output(mutated)
        mutated = copy.deepcopy(payload)
        mutated["paths"]["residual_mass"] += .001
        with self.assertRaises(ValueError):
            verify_aggregate_output(mutated)

    def test_counts_only_use_provided_past_binary_labels(self):
        counts = transition_counts([0, 0, 0, 1, 1, 0])
        self.assertEqual(counts["00"], (1, 1))
        self.assertEqual(counts["01"], (0, 1))
        self.assertEqual(counts["11"], (1, 0))
        self.assertEqual(counts["10"], (0, 0))
        with self.assertRaises(ValueError):
            transition_counts([0, 1, 2])
        with self.assertRaises(ValueError):
            transition_counts([0, 1])


if __name__ == "__main__":
    unittest.main()
