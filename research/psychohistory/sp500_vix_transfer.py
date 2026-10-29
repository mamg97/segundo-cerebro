"""Frozen price-index transfer screen; private revised history, never issuance."""
import argparse
import csv
from datetime import date
from decimal import Decimal, InvalidOperation
import io
import json
import math
import os
from pathlib import Path
import re

from equities_drawdown_research import private_path, LOOKBACK, HORIZON, MIN_TRAIN
from equities_market_study import matrix, probability, metrics, paired_intervals
from vix_market_contrast import pinned, read_vix, labels_for

START, END = '2016-10-29', '2026-10-28'
TARGET = 'ANY_SP500_PRICE_INDEX_DROP_5PCT_WITHIN_20_SESSIONS'
MODELS = ('vix_logistic', 'expanding_frequency', 'recent_frequency', 'volatility_only')
FIRST_ORIGIN = LOOKBACK + HORIZON + MIN_TRAIN - 1


def read_fred(raw, sha, captured_on, start=START, end=END):
    pinned(raw, sha)
    first, last, capture = map(date.fromisoformat, (start, end, captured_on))
    if len(raw) > 3_000_000 or not first <= last <= capture:
        raise ValueError('Invalid source limits')
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''))
    if reader.fieldnames != ['observation_date', 'SP500']:
        raise ValueError('Unexpected FRED SP500 schema')
    prior, prices, missing = None, [], []
    for row in reader:
        token, value = row.get('observation_date'), row.get('SP500')
        if None in row or not isinstance(token, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', token) or value is None:
            raise ValueError('Malformed FRED row')
        day = date.fromisoformat(token)
        if day > capture or prior is not None and day <= prior or day.weekday() >= 5:
            raise ValueError('Invalid FRED date/order')
        prior = day
        if value in ('', '.'):
            if first <= day <= last:
                missing.append(day)
            continue
        try:
            close = Decimal(value)
        except InvalidOperation as exc:
            raise ValueError('Invalid index close') from exc
        if not close.is_finite() or close <= 0:
            raise ValueError('Invalid index close')
        if first <= day <= last:
            prices.append((day, close))
    if not prices or prices[-1][0] != last:
        raise ValueError('Missing required final price close')
    return prices, missing


def verify_dates(prices, vix, missing):
    if not prices or any(day.weekday() >= 5 or not value.is_finite() or value <= 0
                         for day, value in prices):
        raise ValueError('Invalid price sequence')
    days = [day for day, _ in prices]
    if any(a >= b for a, b in zip(days, days[1:])):
        raise ValueError('Non-increasing price sequence')
    observed = set(days)
    other = {d for d in vix if days[0] <= d <= days[-1]}
    if observed != other or observed.intersection(missing) or other.intersection(missing):
        raise ValueError('Price/VIX calendar mismatch; never fill or intersect away dates')


def at_origin(prices, vix, labels, xx, origin):
    train = list(range(LOOKBACK, origin-HORIZON+1))
    if len(train) < MIN_TRAIN:
        raise ValueError('Insufficient matured training')
    yy = [labels[i] for i in train]
    identity = dict(origin_date=prices[origin][0].isoformat(),
                    label_end_date=prices[origin+HORIZON][0].isoformat(),
                    last_training_label_date=prices[train[-1]+HORIZON][0].isoformat(),
                    training_rows=len(train), outcome=labels[origin])
    if not 0 < sum(yy) < len(yy):
        return None, dict(**identity, reason='ONE_CLASS_TRAINING_ALL_PAIRED_METHODS_EXCLUDED')
    def vx(i):
        day = prices[i-1][0]
        if day not in vix or not math.isfinite(vix[day]) or vix[day] <= 0:
            raise ValueError('Missing/invalid exact previous-session VIX')
        return [math.log(vix[day])]
    p = probability([vx(i) for i in train], yy, vx(origin), (0,))
    vol = probability([xx[i] for i in train], yy, xx[origin], (2,))
    return dict(**identity, vix_logistic=p, volatility_only=vol,
                vix_feature_date=prices[origin-1][0].isoformat(),
                expanding_frequency=(sum(yy)+1)/(len(yy)+2),
                recent_frequency=(sum(yy[-252:])+1)/254), None


def study(prices, vix, missing=()):
    verify_dates(prices, vix, missing)
    if len(prices) <= FIRST_ORIGIN + HORIZON:
        raise ValueError('Insufficient source history')
    xx, labels = matrix(prices), labels_for(prices)
    rows, excluded = [], []
    origins = list(range(FIRST_ORIGIN, len(prices)-HORIZON, 20))
    for origin in origins:
        row, exclusion = at_origin(prices, vix, labels, xx, origin)
        if exclusion:
            excluded.append(exclusion)
        else:
            rows.append(row)
    summary = {k: metrics(rows, k) for k in MODELS}
    candidate = summary[MODELS[0]]
    enough = candidate['n'] >= 100 and candidate['events'] >= 20
    passed = bool(enough and all(candidate['brier'] <= .95*summary[k]['brier'] for k in MODELS[1:3])
                  and candidate['brier'] < summary['volatility_only']['brier'])
    decision = ('INSUFFICIENT_SAMPLE' if not enough else
                'PROMISING_RETROSPECTIVE_ONLY' if passed else 'DISCARDED_BY_FROZEN_SCREEN')
    return dict(schema='psychohistory.sp500_vix_transfer.v1', target=TARGET,
                status='RETROSPECTIVE_REVISED_EXPLORATORY', decision=decision,
                rows=rows, exclusions=excluded, scheduled_origins=len(origins), metrics=summary,
                sufficient_screen_sample=enough,
                paired_intervals=paired_intervals([{**r, 'logistic_four_features':r['vix_logistic']} for r in rows]),
                source=dict(selected_from=prices[0][0].isoformat(), selected_to=prices[-1][0].isoformat(),
                            selected_sessions=len(prices), missing_placeholder_rows=len(missing),
                            paired_source_dates_equal=True, independently_verified_exchange_calendar=False),
                historical_asof_verified=False, model_admitted=False, forecast_issued=False,
                current_market_risk_estimated=False, trading_pnl_evaluated=False)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('prices', 'vix', 'output'):
        p.add_argument('--'+name, type=Path, required=True)
    for name in ('prices-sha', 'vix-sha', 'captured-on'):
        p.add_argument('--'+name, required=True)
    a = p.parse_args()
    out = private_path(a.output, create=True)
    prices, missing = read_fred(private_path(a.prices).read_bytes(), a.prices_sha, a.captured_on)
    vix = read_vix(private_path(a.vix).read_bytes(), a.vix_sha, a.captured_on)
    report = study(prices, vix, missing)
    report['inputs'] = dict(prices=a.prices_sha, vix=a.vix_sha, captured_on=a.captured_on)
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(report, f, indent=2, allow_nan=False)
        f.write('\n')
    print(json.dumps(dict(decision=report['decision'], paired_cases=len(report['rows']),
                          exclusions=len(report['exclusions']), forecast_issued=False)))


if __name__ == '__main__':
    main()
