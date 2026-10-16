"""Four observable transition states; revised-release retrospective evidence only.

All actual outputs stay outside Git. Python standard library; no paid calls.
"""
from __future__ import annotations
import argparse
import collections
import hashlib
import json
import math
import platform
import random
import statistics
from pathlib import Path
from benchmark import audit, load_official, canonical, digest, percentile

HERE = Path(__file__).resolve().parent
STATES = ['Bajo → bajo', 'Entrada al episodio', 'Salida del episodio', 'Persistencia del episodio']
MODELS = ['frequency', 'persistence', 'markov', 'country_shrinkage', 'memory2']


def prepare(raw, source_protocol):
    return {(int(r['country_id']), int(r['year'])): {
        'b': int(float(r['sb_total_deaths_best']) >= source_protocol['threshold_deaths']),
        'name': r['country'], 'region': r['region']} for r in raw}


def counts(lookup, cutoff, country=None):
    frequency, transitions, memory = [0, 0], [[0, 0] for _ in range(2)], [[0, 0] for _ in range(4)]
    for (c, year), row in sorted(lookup.items()):
        if year > cutoff or (country is not None and c != country):
            continue
        b = row['b']; frequency[b] += 1
        previous = lookup.get((c, year - 1))
        if previous is None:
            continue
        transitions[previous['b']][b] += 1
        earlier = lookup.get((c, year - 2))
        if earlier is not None:
            memory[2 * earlier['b'] + previous['b']][b] += 1
    return {'frequency': frequency, 'transitions': transitions, 'memory': memory}


def fit(lookup, origin, protocol):
    cutoff = origin - protocol['information_lag_years']
    historical = {k: v for k, v in lookup.items() if k[1] <= cutoff}
    global_counts = counts(historical, cutoff)
    countries = []
    for country in sorted({c for c, _ in historical}):
        if any((country, year) not in historical for year in range(cutoff - protocol['minimum_history_years'] + 1, cutoff + 1)):
            continue
        row = historical[country, cutoff]
        countries.append({'id': country, 'name': row['name'], 'region': row['region'],
                          'initial': 2 * historical[country, cutoff - 1]['b'] + row['b'],
                          'counts': counts(historical, cutoff, country)['transitions']})
    return {'origin': origin, 'cutoff': cutoff, 'global': global_counts, 'countries': countries}


def matrix_for(fitted, country, model, protocol):
    if model not in MODELS:
        raise ValueError('Unknown model')
    glob = fitted['global']; alpha, beta = protocol['beta_prior']
    smoothed = lambda c: (c[1] + beta) / (sum(c) + alpha + beta)
    rates = []
    for state in range(4):
        last = state % 2
        if model == 'frequency': rate = smoothed(glob['frequency'])
        elif model == 'persistence': rate = float(last)
        elif model == 'markov': rate = smoothed(glob['transitions'][last])
        elif model == 'memory2': rate = smoothed(glob['memory'][state])
        else:
            c = country['counts'][last]; prior = protocol['country_prior_strength']
            rate = (c[1] + prior * smoothed(glob['transitions'][last])) / (sum(c) + prior)
        rates.append(rate)
    return [[(1 - rates[s] if j % 2 == 0 else rates[s]) if j // 2 == s % 2 else 0.0
             for j in range(4)] for s in range(4)]


def propagate(distribution, matrix):
    return [sum(distribution[i] * matrix[i][j] for i in range(4)) for j in range(4)]


def endpoint(initial, matrix, steps):
    distribution = [float(i == initial) for i in range(4)]
    for _ in range(steps): distribution = propagate(distribution, matrix)
    return distribution


def sequence_probability(initial, matrix, outcomes):
    distribution = [float(i == initial) for i in range(4)]
    # Integrate over the full bridge year; never condition on its realized label.
    distribution = propagate(distribution, matrix)
    for b in outcomes:
        distribution = [p if s % 2 == b else 0.0 for s, p in enumerate(propagate(distribution, matrix))]
    return sum(distribution)


def forecast(fitted, country, model, horizon, protocol):
    matrix = matrix_for(fitted, country, model, protocol)
    distribution = endpoint(country['initial'], matrix, horizon + 1)
    no_active = sequence_probability(country['initial'], matrix, [0] * horizon)
    return distribution, max(0.0, min(1.0, 1 - no_active)), matrix


def origin_predictions(lookup, origin, horizon, protocol, fitted=None):
    fitted = fitted or fit(lookup, origin, protocol)
    out, excluded = [], 0
    end = origin + horizon - 1
    for country in fitted['countries']:
        c = country['id']
        # Ex-post label availability is counted explicitly; never pad missing years.
        if any((c, y) not in lookup for y in range(origin - 1, end + 1)):
            excluded += 1; continue
        target = 2 * lookup[c, end - 1]['b'] + lookup[c, end]['b']
        outcomes = [lookup[c, y]['b'] for y in range(origin, end + 1)]
        models = {}
        for model in MODELS:
            p, risk, matrix = forecast(fitted, country, model, horizon, protocol)
            seq = sequence_probability(country['initial'], matrix, outcomes)
            models[model] = {'probabilities': p, 'risk': risk, 'sequence_probability': seq}
        out.append({'country': c, 'region': country['region'], 'origin': origin,
                    'cutoff': fitted['cutoff'], 'end': end, 'horizon': horizon,
                    'target': target, 'risk_target': int(any(outcomes)), 'models': models})
    return out, excluded


def losses(row, model):
    prediction = row['models'][model]; p = prediction['probabilities']; target = row['target']
    if len(p) != 4 or any(not math.isfinite(v) or not 0 <= v <= 1 for v in p) or abs(sum(p) - 1) > 1e-10:
        raise ValueError('Invalid probability distribution')
    return {'brier': sum((v - int(i == target)) ** 2 for i, v in enumerate(p)),
            'log_loss': -math.log(max(1e-12, p[target])),
            'sequence_log_loss': -math.log(max(1e-12, prediction['sequence_probability'])),
            'risk_brier': (prediction['risk'] - row['risk_target']) ** 2}


def metrics(rows, model):
    if not rows: return None
    scored = [losses(r, model) for r in rows]
    calibration = []
    for state in range(4):
        bins = []
        for b in range(5):
            group = [r for r in rows if min(4, int(r['models'][model]['probabilities'][state] * 5)) == b]
            bins.append({'count': len(group), 'meanProbability': statistics.fmean(r['models'][model]['probabilities'][state] for r in group) if group else None,
                         'eventRate': statistics.fmean(r['target'] == state for r in group) if group else None})
        calibration.append({'state': state, 'bins': bins, 'ece': sum(b['count'] * abs(b['meanProbability'] - b['eventRate']) for b in bins if b['count']) / len(rows)})
    return {'n': len(rows), 'origins': len({r['origin'] for r in rows}),
            'stateCounts': [sum(r['target'] == state for r in rows) for state in range(4)],
            **{key: statistics.fmean(r[key] for r in scored) for key in scored[0]},
            'ece': statistics.fmean(c['ece'] for c in calibration), 'calibration': calibration}


def paired_interval(rows, model, baseline, protocol):
    years = sorted({r['origin'] for r in rows})
    block = max(2, rows[0]['horizon']) if rows else 2
    if len(years) < 2 * block: return None
    grouped = {y: [sum(losses(r, m)['brier'] for r in rows if r['origin'] == y) for m in [model, baseline]] for y in years}
    rng = random.Random(protocol['seed']); skills = []
    for _ in range(protocol['bootstrap_replicates']):
        sample = []
        while len(sample) < len(years):
            start = rng.randrange(len(years))
            sample.extend(years[(start + k) % len(years)] for k in range(block))
        sample = sample[:len(years)]
        a, b = [sum(grouped[y][i] for y in sample) for i in range(2)]
        if b: skills.append(1 - a / b)
    return [percentile(skills, .025), percentile(skills, .975)] if skills else None


def summarize(rows, model, protocol):
    result = metrics(rows, model)
    if result is None: return None
    result['comparisons'] = {baseline: {'skill': 1 - result['brier'] / metrics(rows, baseline)['brier'],
                                      'skill95': paired_interval(rows, model, baseline, protocol)}
                             for baseline in ['frequency', 'persistence', 'markov'] if metrics(rows, baseline)['brier'] > 0}
    result['yearly'] = [{'origin': y, **metrics([r for r in rows if r['origin'] == y], model)} for y in sorted({r['origin'] for r in rows})]
    result['regions'] = [{'region': region, **metrics([r for r in rows if r['region'] == region], model)} for region in sorted({r['region'] for r in rows})]
    result['windows'] = [{'from': a, 'to': b, 'metrics': metrics([r for r in rows if a <= r['origin'] <= b], model)} for a, b in [(2016, 2020), (2021, 2025)]]
    result['countries'] = [{'country': c, 'n': len(sub), 'brier': metrics(sub, model)['brier']}
                           for c in sorted({r['country'] for r in rows}) for sub in [[r for r in rows if r['country'] == c]]]
    return result


def execute(data_dir, output_dir):
    source_protocol = json.loads((HERE / 'protocol.json').read_text())
    protocol = json.loads((HERE / 'futures_protocol.json').read_text())
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'protocol.lock.json').write_bytes(canonical(protocol) + b'\n')
    raw, provenance = load_official(data_dir, source_protocol)
    quality = audit(raw, source_protocol)
    lookup = prepare(raw, source_protocol)
    reports, predictions, fits = {}, {}, {}
    for partition, (start, end) in [('validation', protocol['validation_years']), ('test', protocol['test_years'])]:
        reports[partition] = {}
        for horizon in protocol['horizons']:
            rows, excluded = [], 0
            for origin in range(start, end - horizon + 2):
                if origin not in fits: fits[origin] = fit(lookup, origin, protocol)
                pred, dropped = origin_predictions(lookup, origin, horizon, protocol, fits[origin]); rows.extend(pred); excluded += dropped
            predictions[partition + '_' + str(horizon)] = rows
            reports[partition][horizon] = {'excludedMissingLabels': excluded,
                'sampleSha256': digest(canonical([[r['country'], r['origin'], r['end'], r['target'], r['risk_target']] for r in rows])),
                'models': {model: summarize(rows, model, protocol) for model in MODELS}}
    catalogs = []
    for origin in protocol['catalog_origins']:
        fitted = fits.get(origin) or fit(lookup, origin, protocol)
        max_horizon = min(10, quality['years'][1] - origin + 1)
        cases = [{**country, 'observedStates': [
                    2 * lookup[country['id'], year - 1]['b'] + lookup[country['id'], year]['b']
                    if (country['id'], year - 1) in lookup and (country['id'], year) in lookup else None
                    for year in range(fitted['cutoff'], origin + max_horizon)]}
                 for country in fitted['countries']]
        catalogs.append({**fitted, 'countries': cases, 'observedThrough': quality['years'][1],
                         'maxHorizon': max_horizon})
    result = {'schema': 'psychohistory.futures.report.v1', 'runType': 'retrospective_revised_release',
              'vintageVerified': False, 'prospectiveEligible': False, 'protocolSha256': digest(canonical(protocol)),
              'codeSha256': digest(b''.join((HERE / name).read_bytes() for name in ['futures.py', 'futures_protocol.json', 'benchmark.py']) +
                                   (HERE.parent.parent / 'private-cloudflare/src/research-futures-engine.mjs').read_bytes()),
              'environment': {'python': platform.python_version()}, 'quality': quality, 'provenance': provenance,
              'states': STATES, 'models': MODELS, 'protocol': protocol, 'results': reports, 'catalogs': catalogs,
              'limitations': ['Revised source release; historical publication vintages unavailable.',
                              'Global stationary transitions; no socioeconomic mechanism, causal claim or current forecast.',
                              'Horizon H ends at origin+H-1; one fully unobserved bridge year is integrated.',
                              'Terminal four-state outcome and whole binary sequence are different scored objects.',
                              'Long horizons have few origins and overlapping outcomes; intervals conditional and fragile.',
                              'Complete-case scoring excludes missing future labels, counted explicitly; no roster padding.',
                              'No ensemble, latent crisis labels, RPS, parameter tuning or test-selected winner.']}
    (output_dir / 'report.json').write_bytes(canonical(result) + b'\n')
    (output_dir / 'predictions.json').write_bytes(canonical(predictions) + b'\n')
    (output_dir / 'checksums.json').write_bytes(canonical({p.name: digest(p.read_bytes()) for p in sorted(output_dir.glob('*.json')) if p.name != 'checksums.json'}) + b'\n')
    print(json.dumps({'reportSha256': digest((output_dir / 'report.json').read_bytes()), 'qualityPassed': quality['passed'],
                      'test': {h: {m: None if v is None else {k: v[k] for k in ['n', 'origins', 'brier', 'log_loss', 'sequence_log_loss']} for m, v in d['models'].items()} for h, d in reports['test'].items()}}, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True); parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(); execute(args.data_dir, args.output_dir)
