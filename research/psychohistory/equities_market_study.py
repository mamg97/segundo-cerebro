"""Frozen 20-session US aggregate market study; offline, private, never issuance."""
import argparse
import csv
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
import math
import os
from pathlib import Path
import random
import re
import statistics
import zipfile

from benchmark import fit_logit, estimate
from equities_drawdown_research import private_path, features, LOOKBACK, MIN_TRAIN, HORIZON

TARGET = 'ANY_TOTAL_RETURN_MARKET_PROXY_DROP_5PCT_WITHIN_20_SESSIONS'
MEMBER = 'F-F_Research_Data_Factors_daily.csv'
MODELS = ('logistic_four_features', 'expanding_frequency', 'recent_frequency', 'volatility_only')


def read_archive(raw, expected_sha256, source_asof, start='2000-01-01', end='2026-09-30'):
    if (not re.fullmatch(r'[0-9a-f]{64}', expected_sha256 or '')
            or hashlib.sha256(raw).hexdigest() != expected_sha256):
        raise ValueError('Archive SHA mismatch')
    cutoff, first, last = map(date.fromisoformat, (source_asof, start, end))
    if not first <= last <= cutoff or len(raw) > 8_000_000:
        raise ValueError('Invalid date limits or archive size')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if z.namelist() != [MEMBER] or z.getinfo(MEMBER).file_size > 8_000_000:
            raise ValueError('Require one bounded canonical CSV')
        lines = z.read(MEMBER).decode('utf-8-sig').splitlines()
    match = re.fullmatch(r'This file was created by using the (\d{6}) CRSP database\.', lines[0])
    if not match or date.fromisoformat(match[1][:4] + '-' + match[1][4:] + '-01') > cutoff:
        raise ValueError('Invalid/future database vintage')
    header = ',Mkt-RF,SMB,HML,RF'
    if lines.count(header) != 1:
        raise ValueError('Ambiguous factor header')
    index = lines.index(header)
    if any(re.match(r'\d{8},', line) for line in lines[:index]):
        raise ValueError('Observations before header')
    prior, all_count, chosen, ended = None, 0, [], False
    for line in lines[index + 1:]:
        if not line.strip():
            continue
        if line.startswith('Copyright '):
            if ended:
                raise ValueError('Duplicate footer')
            ended = True
            continue
        fields = next(csv.reader([line]))
        if ended or len(fields) != 5 or not re.fullmatch(r'\d{8}', fields[0]):
            raise ValueError('Unexpected CSV row or content after footer')
        day = date.fromisoformat(fields[0][:4] + '-' + fields[0][4:6] + '-' + fields[0][6:])
        try:
            values = [Decimal(v.strip()) for v in fields[1:]]
        except InvalidOperation as exc:
            raise ValueError('Invalid factor value') from exc
        if any(not v.is_finite() or v in (Decimal('-99.99'), Decimal('-999')) for v in values):
            raise ValueError('Missing/nonfinite factor: never fill observations')
        total = (values[0] + values[3]) / 100
        if total <= -1 or day > cutoff or prior is not None and day <= prior:
            raise ValueError('Invalid total return, date order or future data')
        prior, all_count = day, all_count + 1
        if first <= day <= last:
            chosen.append((day, total))
    if not ended or not chosen:
        raise ValueError('Truncated/empty source')
    wealth, prices = Decimal(100), []
    for day, total in chosen:
        wealth *= 1 + total
        value = float(wealth)
        if not math.isfinite(value) or value <= 0:
            raise ValueError('Invalid chained wealth')
        prices.append((day, wealth))
    return prices, dict(raw_observations=all_count, selected_sessions=len(prices),
                        database_vintage=match[1], input_through=prior.isoformat(),
                        selected_from=prices[0][0].isoformat(), selected_to=prices[-1][0].isoformat(),
                        source_sha256=expected_sha256, return_definition='(Mkt-RF+RF)/100',
                        historical_asof_verified=False, redistributed=False)


def matrix(prices):
    # Only trailing values are needed; avoid rebuilding the full series per feature row.
    return {i: features([(day, float(v)) for day, v in prices[max(0, i - LOOKBACK):i + 1]], LOOKBACK)
            for i in range(LOOKBACK, len(prices))}


def probability(xx, yy, xnow, columns):
    if not 0 < sum(yy) < len(yy):
        return None
    means = [statistics.fmean(row[k] for row in xx) for k in columns]
    scales = [max(1e-9, statistics.pstdev(row[k] for row in xx)) for k in columns]
    transformed = [[(row[k] - means[j]) / scales[j] for j, k in enumerate(columns)] for row in xx]
    now = [(xnow[k] - means[j]) / scales[j] for j, k in enumerate(columns)]
    return estimate(fit_logit(transformed, yy, iterations=50, ridge=.1), now)


def metrics(rows, model):
    if not rows:
        return dict(n=0, events=0, brier=None, log_loss=None, bins=[], alerts=None)
    ps, ys = [r[model] for r in rows], [r['outcome'] for r in rows]
    bins = []
    for k in range(5):
        ids = [i for i, p in enumerate(ps) if min(4, int(p * 5)) == k]
        bins.append(dict(lower=k / 5, upper=(k + 1) / 5, n=len(ids),
                         mean_probability=statistics.fmean(ps[i] for i in ids) if ids else None,
                         event_rate=statistics.fmean(ys[i] for i in ids) if ids else None))
    tp = sum(p >= .2 and y == 1 for p, y in zip(ps, ys))
    fp = sum(p >= .2 and y == 0 for p, y in zip(ps, ys))
    positives, negatives = sum(ys), len(ys) - sum(ys)
    return dict(n=len(rows), events=positives, brier=statistics.fmean((p-y)**2 for p, y in zip(ps, ys)),
                log_loss=-statistics.fmean(y*math.log(max(1e-12, min(1-1e-12, p))) +
                    (1-y)*math.log(max(1e-12, min(1-1e-12, 1-p))) for p, y in zip(ps, ys)), bins=bins,
                alerts=dict(threshold=.2, true_positives=tp, false_positives=fp,
                            precision=tp/(tp+fp) if tp+fp else None,
                            recall=tp/positives if positives else None,
                            false_positive_rate=fp/negatives if negatives else None))


def paired_intervals(rows):
    if not rows:
        return {}
    rng, n, length = random.Random(20261029), len(rows), min(12, len(rows))
    deltas = {name: [(r['logistic_four_features']-r['outcome'])**2 -
                     (r[name]-r['outcome'])**2 for r in rows] for name in MODELS[1:]}
    samples = {name: [] for name in deltas}
    for _ in range(1000):
        ids = []
        while len(ids) < n:
            start = rng.randrange(n-length+1)
            ids.extend(range(start, start+length))
        for name, values in deltas.items():
            samples[name].append(statistics.fmean(values[i] for i in ids[:n]))
    return {name: dict(delta_brier=statistics.fmean(deltas[name]),
                       percentile95=[sorted(values)[24], sorted(values)[974]],
                       block_length=length, replicates=1000, seed=20261029,
                       interpretation='conditional_descriptive_not_confirmatory')
            for name, values in samples.items()}


def study(prices, source, test_from='2010-01-01'):
    xx = matrix(prices)
    # Decimal strings avoid binary equality ambiguity at exactly the 5% boundary.
    labels = {i: int(min(Decimal(str(v)) for _, v in prices[i+1:i+21]) <=
                     Decimal(str(prices[i][1])) * Decimal('.95'))
              for i in range(LOOKBACK, len(prices)-HORIZON)}
    start = next((i for i, (day, _) in enumerate(prices) if day >= date.fromisoformat(test_from)), None)
    if start is None or start-HORIZON-LOOKBACK+1 < MIN_TRAIN:
        raise ValueError('Insufficient resolved training before test')
    rows, excluded = [], 0
    for origin in range(start, len(prices)-HORIZON, 20):
        train = list(range(LOOKBACK, origin-HORIZON+1))
        yy = [labels[i] for i in train]
        train_x = [xx[i] for i in train]
        full = probability(train_x, yy, xx[origin], (0, 1, 2, 3))
        vol = probability(train_x, yy, xx[origin], (2,))
        if full is None or vol is None:
            excluded += 1
            continue
        rows.append(dict(origin_date=prices[origin][0].isoformat(),
                         label_end_date=prices[origin+HORIZON][0].isoformat(),
                         last_training_label_date=prices[train[-1]+HORIZON][0].isoformat(),
                         training_rows=len(train), outcome=labels[origin],
                         logistic_four_features=full, volatility_only=vol,
                         expanding_frequency=(sum(yy)+1)/(len(yy)+2),
                         recent_frequency=(sum(yy[-252:])+1)/254))
    summaries = {model: metrics(rows, model) for model in MODELS}
    candidate = summaries[MODELS[0]]
    enough = candidate['n'] >= 100 and candidate['events'] >= 20
    passes = bool(enough and all(candidate['brier'] <= .95*summaries[k]['brier']
                                 for k in MODELS[1:3]) and
                  candidate['brier'] < summaries['volatility_only']['brier'])
    return dict(schema='psychohistory.equities_real_market_study.v1', target=TARGET,
                status='RETROSPECTIVE_REVISED_EXPLORATORY', source=source, rows=rows,
                metrics=summaries, one_class_exclusions=excluded,
                blocks={label: {m: metrics([r for r in rows if lo <= r['origin_date'][:4] <= hi], m)
                                for m in MODELS}
                        for label, lo, hi in [('2010-14', '2010', '2014'), ('2015-19', '2015', '2019'),
                                             ('2020-22', '2020', '2022'), ('2023-26', '2023', '2026')]},
                paired_intervals=paired_intervals(rows),
                decision='PROMISING_RETROSPECTIVE_ONLY' if passes else 'DISCARDED_BY_FROZEN_SCREEN',
                sufficient_screen_sample=enough, historical_asof_verified=False,
                forecast_issued=False, model_admitted=False, current_market_risk_estimated=False,
                trading_pnl_evaluated=False)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--archive', type=Path, required=True)
    ap.add_argument('--sha256', required=True)
    ap.add_argument('--source-asof', required=True)
    ap.add_argument('--output', type=Path, required=True)
    args = ap.parse_args()
    raw = private_path(args.archive).read_bytes()
    output = private_path(args.output, create=True)
    prices, source = read_archive(raw, args.sha256, args.source_asof)
    report = study(prices, source)
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(report, f, allow_nan=False, indent=2)
        f.write('\n')
    print(json.dumps(dict(n=report['metrics'][MODELS[0]]['n'], decision=report['decision'],
                          forecast_issued=False, model_admitted=False)))


if __name__ == '__main__':
    main()
