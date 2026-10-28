"""Offline conditional-frequency experiment; cannot issue prospective forecasts."""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import statistics

import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
from macro_retrospective import shift_month

HERE = Path(__file__).resolve().parent
PROTOCOL = HERE / 'macro_conditional_frequency_v1.json'


def sign(value):
    return (value > 0) - (value < 0)


def forecast(values, target, p):
    if date.fromisoformat(target).isoformat() != target or not target.endswith('-01'):
        raise ValueError('Canonical monthly target required')
    available = {}
    for month, raw in values.items():
        if date.fromisoformat(month).isoformat() != month or not month.endswith('-01'):
            raise ValueError('Canonical month required')
        if raw is None:
            continue
        if isinstance(raw, bool):
            raise ValueError('Invalid rate')
        value = Decimal(str(raw))
        if not value.is_finite() or not 0 <= value <= 100:
            raise ValueError('Invalid rate')
        available[month] = value
    base = shift_month(target, -2)
    out = dict(target_month=target, base_month=base)
    if not available or max(available) != base:
        return dict(out, status='BASE_MONTH_MISMATCH')
    lag = shift_month(base, -1)
    if lag not in available:
        return dict(out, status='MISSING_SIGNAL')
    signal = sign(available[base]-available[lag])
    threshold = Decimal(p['event_threshold_pp'])
    pairs = []
    for offset in range(1-p['candidate_end_months'], 1):
        end = shift_month(base, offset)
        start = shift_month(end, -2)
        previous = shift_month(start, -1)
        if start not in available or end not in available:
            continue
        pairs.append(dict(start=start, end=end,
                          y=int(available[end]-available[start] >= threshold),
                          signal=sign(available[start]-available[previous]) if previous in available else None))
    out.update(base_rate=str(available[base]), signal=signal, pairs=pairs, pair_count=len(pairs))
    if len(pairs) < p['minimum_pairs']:
        return dict(out, status='INSUFFICIENT_PAIRS')
    baseline = Fraction(sum(x['y'] for x in pairs)+1, len(pairs)+2)
    matching = [x for x in pairs if x['signal'] == signal]
    strength = p['prior_strength']
    candidate = (sum(x['y'] for x in matching)+strength*baseline)/(len(matching)+strength)
    return dict(out, status='CALCULATED_NOT_ISSUED', conditional_pairs=len(matching),
                conditional_events=sum(x['y'] for x in matching),
                probability=float(candidate), probability_fraction=str(candidate),
                baseline_probability=float(baseline), baseline_fraction=str(baseline),
                persistence_probability=0.0)


def metrics(rows):
    rows = [r for r in rows if r['status'] == 'CALCULATED_NOT_ISSUED' and 'y' in r]
    out = dict(scored=len(rows), events=sum(r['y'] for r in rows))
    for key in ['probability', 'baseline_probability', 'persistence_probability']:
        out['brier_'+key] = statistics.fmean((r[key]-r['y'])**2 for r in rows) if rows else None
    a,b,c = [out['brier_'+k] for k in ['probability','baseline_probability','persistence_probability']]
    out['relative_improvement'] = 1-a/b if b else None
    out['passes_exploratory_rule'] = bool(rows) and b > 0 and a <= .95*b and a < c
    return out


def run(periods, labels, p):
    rows = []
    for target_day in initial.month_range(date.fromisoformat(p['historical_target_start']), date.fromisoformat(p['historical_target_end'])):
        target = target_day.isoformat()
        month = date.fromisoformat(shift_month(target, -1))
        cut = month.replace(day=p['vintage_day']).isoformat()
        issue = month.replace(day=p['issue_day']).isoformat()
        snapshot = {r['reference_month']:r['rate_percent'] for r in asof.select(periods, cut) if r['status'] == 'AVAILABLE'}
        row = dict(forecast(snapshot,target,p), vintage_date=cut, issue_date=issue)
        label = labels.get(target)
        if label is not None and label['alfred_realtime_start_date'] <= issue:
            raise ValueError('Target known by issuance date')
        row['label_status'] = 'MISSING_OR_OUTSIDE_ARCHIVE'
        if label and label['rate_percent'] is not None:
            row['label_status'] = 'AVAILABLE'
            if row['status'] == 'CALCULATED_NOT_ISSUED':
                row['y'] = int(Decimal(label['rate_percent'])-Decimal(row['base_rate']) >= Decimal(p['event_threshold_pp']))
        rows.append(row)
    return dict(schema=p['id'], confirmatory=False, forecast_issued=False,
                predictive_skill_demonstrated=False, prior_history_inspected=True,
                metrics=metrics(rows), cases=rows,
                annual={y:metrics([r for r in rows if r['target_month'][:4] == y]) for y in sorted({r['target_month'][:4] for r in rows})})


def main():
    a = argparse.ArgumentParser(description=__doc__)
    for name in ['realtime','initial','output']:
        a.add_argument('--'+name,required=True,type=Path)
    a.add_argument('--protocol-sha256',required=True)
    args = a.parse_args()
    raw = PROTOCOL.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.protocol_sha256:
        raise ValueError('Frozen protocol hash required')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():
        raise ValueError('Output must be private')
    p = json.loads(raw)
    periods = asof.audit(args.realtime.read_bytes(),p['realtime_sha256'],p['source_start'],p['source_end'])
    labels = initial.audit(args.initial.read_bytes(),p['initial_sha256'],p['source_start'],p['source_end'])
    out = run(periods,{r['reference_month']:r for r in labels['observations']},p)
    out.update(protocol_sha256=args.protocol_sha256, executed_at_utc=datetime.now(timezone.utc).isoformat(),
               code_sha256={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in
                            ['macro_conditional_frequency.py','macro_retrospective.py','alfred_asof_audit.py','alfred_initial_release_audit.py']})
    with args.output.open('x') as f:
        json.dump(out,f,indent=2,allow_nan=False)
    print(json.dumps(out['metrics']))


if __name__ == '__main__':
    main()
