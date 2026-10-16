"""Independent mathematical reference for UCDP-based future-state graphs.

No network, private records, or forecasting claims. The binary signal means
annual country-level state-based deaths >= a preregistered threshold (25 in the
current experiment), NOT a countrywide general stability indicator.

States are consecutive binary observations: (y[t-1], y[t]) as 00,01,10,11.
Only (a,b) -> (b,c) is admissible. Time 0 is the last *known* state,
NOT necessarily the evaluation/forecast issue year.

This module is deliberately independent of the Work/Codex v0.4 local preview:
it is an oracle for invariants, not a replacement for the existing engine.
"""
from __future__ import annotations

import math
import random
from typing import Mapping, Sequence

STATES = ("00", "01", "10", "11")
MAX_EXACT_HORIZON = 12
ALLOWED = {s: (s[1] + "0", s[1] + "1") for s in STATES}
EPS = 1e-10


def _finite_probability(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and 0 <= value <= 1


def validate_distribution(values: Mapping[str, float], tol: float = EPS) -> None:
    """Reject missing/extra states, negative numbers, NaN, or lost mass."""
    if not isinstance(values, Mapping) or set(values) != set(STATES):
        raise ValueError("A distribution must contain exactly states 00, 01, 10, 11")
    if any(not _finite_probability(values[s]) for s in STATES):
        raise ValueError("Invalid state probability")
    if abs(math.fsum(values[s] for s in STATES) - 1) > tol:
        raise ValueError("Probability mass is not conserved")


def validate_matrix(matrix: Mapping[str, Mapping[str, float]], tol: float = EPS) -> None:
    """Structural zeros must be actual zeros, not small invented probabilities."""
    if not isinstance(matrix, Mapping) or set(matrix) != set(STATES):
        raise ValueError("Expected four transition rows")
    for source in STATES:
        row = matrix[source]
        if not isinstance(row, Mapping) or set(row) != set(STATES):
            raise ValueError("Each row must contain exactly four named states")
        validate_distribution(row, tol)
        if any(row[target] != 0 for target in STATES if target not in ALLOWED[source]):
            raise ValueError("Physically impossible consecutive-year transition")


def one_hot(state: str) -> dict[str, float]:
    if state not in STATES:
        raise ValueError("Unknown state")
    return {s: float(s == state) for s in STATES}


def transition_counts(observed: Sequence[int]) -> dict[str, tuple[int, int]]:
    """Counts transitions using only observed chronological binary labels."""
    if len(observed) < 3 or any(y not in (0, 1) or isinstance(y, bool) for y in observed):
        raise ValueError("Need >=3 consecutive observed binary annual labels")
    counts = {s: [0, 0] for s in STATES}
    for i in range(2, len(observed)):
        previous = f"{observed[i-2]}{observed[i-1]}"
        counts[previous][observed[i]] += 1
    return {s: tuple(counts[s]) for s in STATES}


def transition_matrix(
    counts: Mapping[str, Sequence[int]], prior: tuple[float, float] = (1.0, 1.0)
) -> dict[str, dict[str, float]]:
    """Posterior mean under independent Beta(a,b) transition probabilities.

    Beta(1,1) is a *methodological assumption* (not a calibrated prior). Both
    possible next-year outcomes have nonzero posterior means even if unseen.
    """
    if not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0 for v in prior) or len(prior) != 2:
        raise ValueError("Invalid Beta prior")
    if set(counts) != set(STATES):
        raise ValueError("Missing state counts")
    result = {}
    for state in STATES:
        pair = counts[state]
        if len(pair) != 2 or any(not isinstance(n, int) or isinstance(n, bool) or n < 0 for n in pair):
            raise ValueError("Counts must be two non-negative integers")
        a, b = prior[0] + pair[0], prior[1] + pair[1]
        zero, one = ALLOWED[state]
        result[state] = {target: (a/(a+b) if target == zero else b/(a+b) if target == one else 0.0)
                         for target in STATES}
    validate_matrix(result)
    return result


def propagate(
    initial: Mapping[str, float], matrix: Mapping[str, Mapping[str, float]], steps: int
) -> list[dict[str, float]]:
    """Exact dynamic programming: no beam pruning or loss of probability mass."""
    validate_distribution(initial)
    validate_matrix(matrix)
    if not isinstance(steps, int) or isinstance(steps, bool) or steps < 0 or steps > MAX_EXACT_HORIZON:
        raise ValueError("Invalid number of years")
    distributions = [dict(initial)]
    for _ in range(steps):
        previous = distributions[-1]
        nxt = {state: math.fsum(previous[src]*matrix[src][state] for src in STATES)
               for state in STATES}
        validate_distribution(nxt)
        distributions.append(nxt)
    return distributions


def graph_flows(
    initial: Mapping[str, float], matrix: Mapping[str, Mapping[str, float]], steps: int
) -> dict:
    """Graph of all admissible edges, including separate conditional and joint flow."""
    distributions = propagate(initial, matrix, steps)
    edges = []
    for step in range(1, steps + 1):
        previous, current = distributions[step-1], distributions[step]
        for src in STATES:
            for dst in ALLOWED[src]:
                edges.append({
                    "year_offset": step,
                    "source": src,
                    "target": dst,
                    "conditional": matrix[src][dst],
                    "joint_flow": previous[src] * matrix[src][dst]
                })
        # Audit both sides of the mass balance independently.
        for state in STATES:
            incoming = math.fsum(edge["joint_flow"] for edge in edges
                                 if edge["year_offset"] == step and edge["target"] == state)
            outgoing = math.fsum(edge["joint_flow"] for edge in edges
                                 if edge["year_offset"] == step and edge["source"] == state)
            if abs(incoming-current[state]) > EPS or abs(outgoing-previous[state]) > EPS:
                raise AssertionError("Graph inflow/outflow is inconsistent")
    return {"states": STATES, "distributions": distributions, "edges": edges,
            "probability_mass": [math.fsum(d.values()) for d in distributions]}


def exact_top_paths(
    initial: Mapping[str, float], matrix: Mapping[str, Mapping[str, float]], steps: int,
    keep: int = 12
) -> dict:
    """Exact (not beam-approximate) top-k path enumeration, maximum 12 years.

    Every history is kept distinct even if different paths merge at a node.
    Residual probability is all omitted histories, without renormalization.
    """
    validate_distribution(initial)
    validate_matrix(matrix)
    if not isinstance(steps, int) or isinstance(steps, bool) or not 0 <= steps <= MAX_EXACT_HORIZON:
        raise ValueError("Exact reference computation supports 0..12 annual steps")
    if not isinstance(keep, int) or isinstance(keep, bool) or keep < 1 or keep > 4096:
        raise ValueError("Invalid path limit")
    paths = [((s,), initial[s]) for s in STATES if initial[s] > 0]
    for _ in range(steps):
        paths = [(path + (next_state,), p*matrix[path[-1]][next_state])
                 for path, p in paths for next_state in ALLOWED[path[-1]]
                 if p*matrix[path[-1]][next_state] > 0]
    total = math.fsum(p for _,p in paths)
    if abs(total-1) > EPS:
        raise AssertionError("Exact path enumeration lost probability mass")
    paths.sort(key=lambda record: (-record[1], record[0]))
    visible = paths[:keep]
    displayed = math.fsum(p for _,p in visible)
    residual = max(0.0, 1.0-displayed)
    if abs(displayed + residual - 1.0) > EPS:
        raise AssertionError("Path residual accounting failed")
    return {"top_paths": [{"states": list(path), "probability": p} for path,p in visible],
            "represented_mass": displayed,
            "residual_mass": residual,
            "all_path_count": len(paths),
            "exact": True}


def _quantile(sorted_values: Sequence[float], fraction: float) -> float:
    h = fraction * (len(sorted_values)-1)
    low = int(math.floor(h))
    high = min(low+1, len(sorted_values)-1)
    return sorted_values[low] + (sorted_values[high]-sorted_values[low])*(h-low)


def parameter_intervals(
    initial: Mapping[str, float], counts: Mapping[str, Sequence[int]], steps: int,
    draws: int = 512, seed: int = 17, prior: tuple[float, float] = (1.0, 1.0)
) -> list[dict[str, dict[str, float]]]:
    """Conditional uncertainty in transition parameters, NOT calibrated skill.

    One sampled matrix is used consistently for each entire trajectory;
    independent redraws at each future step would understate uncertainty.
    """
    validate_distribution(initial)
    transition_matrix(counts, prior)  # validates counts and hyperparameters
    if not isinstance(draws, int) or isinstance(draws, bool) or draws < 100 or draws > 10000:
        raise ValueError("Need 100..10000 Monte Carlo draws")
    rng = random.Random(seed)
    samples = [{s: [] for s in STATES} for _ in range(steps+1)]
    for _ in range(draws):
        matrix = {}
        for state in STATES:
            count0, count1 = counts[state]
            prob0 = rng.betavariate(prior[0]+count0, prior[1]+count1)
            next0, next1 = ALLOWED[state]
            matrix[state] = {target: prob0 if target == next0 else 1-prob0 if target == next1 else 0.0
                             for target in STATES}
        sequence = propagate(initial, matrix, steps)
        for t, distribution in enumerate(sequence):
            for state in STATES:
                samples[t][state].append(distribution[state])
    return [{state: {"lower_95": _quantile(sorted(samples[t][state]), 0.025),
                     "upper_95": _quantile(sorted(samples[t][state]), 0.975)}
             for state in STATES} for t in range(steps+1)]


def verify_aggregate_output(payload: Mapping) -> dict:
    """Optional adapter for normalized v0.4 JSON once Codex exposes that contract.

    The adapter intentionally accepts a small, documented *canonical contract*,
    not scraped browser text. It verifies any state/matrix/graph/path payload.
    """
    initial, matrix, horizon = payload["initial"], payload["matrix"], payload["horizon"]
    expected = graph_flows(initial, matrix, horizon)
    reported = payload["distributions"]
    if len(reported) != len(expected["distributions"]):
        raise ValueError("Unexpected distribution length")
    for t, (actual, reference) in enumerate(zip(reported, expected["distributions"])):
        validate_distribution(actual)
        for state in STATES:
            if abs(actual[state]-reference[state]) > EPS:
                raise ValueError(f"Distribution mismatch at horizon {t}, state {state}")
    if "paths" in payload:
        top = exact_top_paths(initial, matrix, horizon, keep=payload.get("keep", 12))
        p = payload["paths"]
        if abs(p["represented_mass"]-top["represented_mass"]) > EPS or abs(
            p["residual_mass"]-top["residual_mass"]) > EPS:
            raise ValueError("Top path mass or residual disagrees with independent reference")
        for got, expected_path in zip(p["top_paths"], top["top_paths"]):
            if got["states"] != expected_path["states"] or abs(
                got["probability"]-expected_path["probability"]) > EPS:
                raise ValueError("Top path ranking disagrees with independent reference")
    return {"ok": True, "horizon": horizon, "mass_conserved": True,
            "audit_type": "mathematical_invariants_not_empirical_validation"}
