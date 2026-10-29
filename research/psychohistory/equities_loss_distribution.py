"""Frozen historical/filtered scenario distributions; no live risk or issuance."""
import argparse
from datetime import date
from decimal import Decimal, ROUND_CEILING
import json
import math
import os
from pathlib import Path
import random
import statistics

from equities_drawdown_research import private_path
from equities_market_study import read_archive

WINDOW, HORIZON, VOL_WINDOW = 1260, 20, 20
MODELS = ('historical', 'filtered')
QUANTILES = (('q90', .90), ('q95', .95))


def path_loss(returns):
    cumulative, lowest = 0., 0.
    for value in returns:
        if not math.isfinite(value):
            raise ValueError('Finite scenario returns required')
        cumulative += value
        lowest = min(lowest, cumulative)
    return -math.expm1(lowest)


def tail_summary(losses):
    if not losses or any(not math.isfinite(v) or not 0 <= v <= 1 for v in losses):
        raise ValueError('Bounded nonempty losses required')
    values, n = sorted(losses), len(losses)
    result = {key:values[int((Decimal(str(q))*n).to_integral_value(rounding=ROUND_CEILING))-1]
              for key,q in QUANTILES}
    tail = Decimal(n)*Decimal('.05')
    whole, fraction = int(tail), float(tail-int(tail))
    descending = values[::-1]
    numerator = sum(descending[:whole])
    if fraction:
        numerator += fraction*descending[whole]
    result['es95'] = numerator/float(tail)
    return result


def prepare(prices):
    if len(prices) < 2 or any(not math.isfinite(float(v)) or v <= 0 for _,v in prices):
        raise ValueError('Positive finite history required')
    if any(a[0] >= b[0] for a,b in zip(prices,prices[1:])):
        raise ValueError('Strictly ordered unique sessions required')
    returns = [None]+[math.log(float(prices[i][1])/float(prices[i-1][1])) for i in range(1,len(prices))]
    sigma, z = [None]*len(prices), [None]*len(prices)
    for i in range(VOL_WINDOW,len(prices)):
        sigma[i] = max(1e-6,statistics.pstdev(returns[i-VOL_WINDOW+1:i+1]))
        if i > VOL_WINDOW:
            z[i] = returns[i]/sigma[i-1]
    return returns,sigma,z


def forecast(prepared, origin):
    returns,sigma,z = prepared
    first = origin-WINDOW+1
    if first <= VOL_WINDOW or origin >= len(returns):
        raise ValueError('Full past window and lagged volatility required')
    losses = {m:[] for m in MODELS}
    for start in range(first,origin-HORIZON+2):
        losses['historical'].append(path_loss(returns[start:start+HORIZON]))
        losses['filtered'].append(path_loss([sigma[origin]*value for value in z[start:start+HORIZON]]))
    assert all(len(v)==WINDOW-HORIZON+1 for v in losses.values())
    return {m:tail_summary(values) for m,values in losses.items()}


def pinball(actual, predicted, q):
    error = actual-predicted
    return (q if error>=0 else q-1)*error


def summarize(rows, model):
    if not rows:
        return dict(n=0,quantiles={},mean_scenario_es95=None,mean_realized_q95_exceedance=None)
    quantiles = {}
    for key,q in QUANTILES:
        count = sum(r['actual_loss']>r[model][key] for r in rows)
        quantiles[key] = dict(q=q,mean_pinball=statistics.fmean(
            pinball(r['actual_loss'],r[model][key],q) for r in rows),
            strict_exceedances=count,exceedance_rate=count/len(rows))
    exceed = [r['actual_loss'] for r in rows if r['actual_loss']>r[model]['q95']]
    return dict(n=len(rows),quantiles=quantiles,
                mean_scenario_es95=statistics.fmean(r[model]['es95'] for r in rows),
                mean_realized_q95_exceedance=statistics.fmean(exceed) if exceed else None)


def intervals(rows):
    if not rows:
        return {}
    rng,n,length = random.Random(20261029),len(rows),min(12,len(rows))
    deltas = {key:[pinball(r['actual_loss'],r['filtered'][key],q)-
                   pinball(r['actual_loss'],r['historical'][key],q) for r in rows]
              for key,q in QUANTILES}
    samples = {key:[] for key in deltas}
    for _ in range(1000):
        ids = []
        while len(ids)<n:
            first = rng.randrange(n-length+1)
            ids.extend(range(first,first+length))
        for key,values in deltas.items():
            samples[key].append(statistics.fmean(values[i] for i in ids[:n]))
    return {key:dict(delta_pinball=statistics.fmean(deltas[key]),
                     percentile95=[sorted(values)[24],sorted(values)[974]],block_length=length,
                     replicates=1000,seed=20261029,interpretation='conditional_descriptive')
            for key,values in samples.items()}


def study(prices,source,test_from='2010-01-01'):
    prepared = prepare(prices)
    start = next((i for i,(day,_) in enumerate(prices) if day>=date.fromisoformat(test_from)),None)
    if start is None or start-WINDOW+1<=VOL_WINDOW:
        raise ValueError('Insufficient source history before test')
    rows = []
    for origin in range(start,len(prices)-HORIZON,HORIZON):
        models = forecast(prepared,origin)
        minimum = min(Decimal(str(v)) for _,v in prices[origin+1:origin+HORIZON+1])
        actual = float(max(Decimal(0),1-minimum/Decimal(str(prices[origin][1]))))
        rows.append(dict(origin_date=prices[origin][0].isoformat(),
                         label_end_date=prices[origin+HORIZON][0].isoformat(),
                         last_scenario_date=prices[origin][0].isoformat(),scenarios=WINDOW-HORIZON+1,
                         actual_loss=actual,**models))
    metrics = {m:summarize(rows,m) for m in MODELS}
    candidate,baseline = metrics['filtered']['quantiles'],metrics['historical']['quantiles']
    passed = len(rows)>=100 and all(baseline[key]['mean_pinball']>0 and
              candidate[key]['mean_pinball']<=.95*baseline[key]['mean_pinball'] for key,_ in QUANTILES)
    passed = bool(passed and candidate['q90']['exceedance_rate']<=.20 and candidate['q95']['exceedance_rate']<=.10)
    return dict(schema='psychohistory.equities_loss_distribution.v1',source=source,
                status='RETROSPECTIVE_REVISED_EXPLORATORY',horizon_sessions=HORIZON,
                scenario_window=WINDOW,scenario_count=WINDOW-HORIZON+1,volatility_window=VOL_WINDOW,
                target='MAX_CLOSE_LOSS_FROM_ORIGIN_WITHIN_20_SESSIONS',rows=rows,metrics=metrics,
                blocks={label:{m:summarize([r for r in rows if lo<=r['origin_date'][:4]<=hi],m) for m in MODELS}
                        for label,lo,hi in [('2010-14','2010','2014'),('2015-19','2015','2019'),
                                           ('2020-22','2020','2022'),('2023-26','2023','2026')]},
                paired_intervals=intervals(rows),
                decision='PROMISING_RETROSPECTIVE_ONLY' if passed else 'DISCARDED_BY_FROZEN_SCREEN',
                current_risk_estimated=False,historical_asof_verified=False,forecast_issued=False,
                model_admitted=False,expected_shortfall_validated=False,trading_pnl_evaluated=False)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--archive',type=Path,required=True)
    ap.add_argument('--sha256',required=True)
    ap.add_argument('--source-asof',required=True)
    ap.add_argument('--output',type=Path,required=True)
    a = ap.parse_args()
    raw = private_path(a.archive).read_bytes()
    output = private_path(a.output,create=True)
    prices,source = read_archive(raw,a.sha256,a.source_asof)
    report = study(prices,source)
    fd = os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:
        json.dump(report,f,indent=2,allow_nan=False);f.write('\n')
    print(json.dumps(dict(n=len(report['rows']),decision=report['decision'],forecast_issued=False)))


if __name__=='__main__':main()
