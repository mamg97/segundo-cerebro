"""Reversible synthetic network mechanisms. Steps have no calendar-time mapping."""
import argparse
import json
import random
import statistics
from pathlib import Path
from benchmark import canonical, digest, percentile


def simulate(n=180, steps=60, seed=0, threshold=.3, recovery=.1, initial_share=.12, activation=.45, background=.005):
    if not isinstance(n, int) or n < 8 or n > 2000 or not isinstance(steps, int) or not 1 <= steps <= 1000:
        raise ValueError('Invalid scale')
    if any(not 0 <= p <= 1 for p in [threshold, recovery, initial_share, activation, background]):
        raise ValueError('Invalid probability or threshold')
    rng = random.Random(seed)
    neighbors = []
    for i in range(n):
        peers = {(i - 2) % n, (i - 1) % n, (i + 1) % n, (i + 2) % n, rng.randrange(n)} - {i}
        neighbors.append(peers)
    active = {i for i in range(n) if rng.random() < initial_share}; trace = [len(active) / n]
    recovered = activated = 0
    for _ in range(steps):
        nxt = set()
        for i, peers in enumerate(neighbors):
            if i in active:
                if rng.random() >= recovery: nxt.add(i)
                else: recovered += 1
            else:
                pressure = len(active & peers) / len(peers)
                p = background + (1 - background) * activation * int(pressure >= threshold)
                if rng.random() < p: nxt.add(i); activated += 1
        active = nxt; trace.append(len(active) / n)
    return {'seed': seed, 'trace': trace, 'finalShare': trace[-1], 'activated': activated, 'recovered': recovered}


def execute(output):
    specification = {'n': 180, 'steps': 60, 'thresholds': [.15, .3, .5], 'recoveries': [.02, .1, .25],
                     'initialShares': [.05, .25], 'seeds': list(range(20)), 'activation': .45, 'background': .005,
                     'evidenceType': 'synthetic_simulation_only', 'empiricalFit': None, 'calendarMapping': None}
    groups, runs = [], []
    for initial in specification['initialShares']:
        for threshold in specification['thresholds']:
            for recovery in specification['recoveries']:
                cohort = [simulate(seed=seed, threshold=threshold, recovery=recovery, initial_share=initial) for seed in specification['seeds']]
                finals = [r['finalShare'] for r in cohort]
                groups.append({'initialShare': initial, 'threshold': threshold, 'recovery': recovery, 'seeds': len(cohort),
                    'mean': statistics.fmean(finals), 'q05': percentile(finals, .05), 'q95': percentile(finals, .95),
                    'min': min(finals), 'max': max(finals), 'sd': statistics.pstdev(finals),
                    'reproducedSeed0': cohort[0] == simulate(seed=0, threshold=threshold, recovery=recovery, initial_share=initial)})
                runs.extend([{'initialShare': initial, 'threshold': threshold, 'recovery': recovery, **r} for r in cohort])
    result = {'schema': 'psychohistory.abm.recovery.v1', **specification, 'groups': groups, 'nRuns': len(runs),
              'codeSha256': digest(Path(__file__).read_bytes()), 'protocolSha256': digest(canonical(specification)),
              'limitation': 'Contagio y recuperación sintéticos; no ajuste a países, no causalidad, pasos sin unidad anual. Cuantiles son dispersión entre semillas, no IC del mundo real.'}
    output.mkdir(parents=True, exist_ok=True)
    (output / 'report.json').write_bytes(canonical(result) + b'\n'); (output / 'runs.json').write_bytes(canonical(runs) + b'\n')
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--output-dir', type=Path, required=True)
    a = p.parse_args(); r = execute(a.output_dir); print(json.dumps({'runs': r['nRuns'], 'allReproduced': all(g['reproducedSeed0'] for g in r['groups'])}))
