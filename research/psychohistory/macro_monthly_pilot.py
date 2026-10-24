"""Monthly UNRATE admission experiment. Offline, exploratory, never issues forecasts."""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import statistics

import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
from macro_retrospective import shift_month

HERE = Path(__file__).resolve().parent


def monthly_forecast(values, target, protocol):
    """Only an already selected as-of snapshot; no outcomes in this function."""
    target_day = date.fromisoformat(target)
    if target_day.day != 1:
        raise ValueError('target must be a first-of-month date')
    available = {m: Decimal(v) for m, v in values.items() if v is not None}
    for m, v in available.items():
        if date.fromisoformat(m).day != 1 or not v.is_finite() or not 0 <= v <= 100:
            raise ValueError('invalid month or unemployment rate')
    base_month = shift_month(target, -protocol['horizon_months_from_base'])
    if not available or max(available) != base_month:
        return {'status': 'BASE_MONTH_MISMATCH', 'target_month': target}
    base = available[base_month]
    lag_month = shift_month(base_month, -protocol['momentum_months'])
    if lag_month not in available:
        return {'status': 'MISSING_MOMENTUM', 'target_month': target}
    drift = (base - available[lag_month]) * Decimal(protocol['horizon_months_from_base']) / Decimal(protocol['momentum_months'])
    pairs, excluded = [], []
    for offset in range(-protocol['candidate_end_months'] + 1, 1):
        end = shift_month(base_month, offset)
        start = shift_month(end, -protocol['horizon_months_from_base'])
        if start not in available or end not in available:
            excluded.append({'start': start, 'end': end})
        else:
            pairs.append({'start': start, 'end': end, 'change_pp': str(available[end]-available[start])})
    result = {'target_month': target, 'base_month': base_month, 'base_rate': str(base),
              'drift_pp': str(drift), 'pair_count': len(pairs), 'pairs': pairs, 'excluded_pairs': excluded}
    if len(pairs) < protocol['minimum_pairs']:
        return {**result, 'status': 'INSUFFICIENT_PAIRS'}
    threshold = Decimal(protocol['event_threshold_pp'])
    k = sum(Decimal(p['change_pp']) >= threshold for p in pairs)
    shifted = sum(Decimal(p['change_pp']) + drift >= threshold for p in pairs)
    return {**result, 'status': 'CALCULATED_NOT_ISSUED', 'baseline_count': k,
            'candidate_count': shifted, 'probability': (shifted+1)/(len(pairs)+2),
            'baseline_probability': (k+1)/(len(pairs)+2), 'persistence_probability': 0.0}


def make_case(report, initials, target, protocol):
    issue_month = date.fromisoformat(shift_month(target, -1))
    cut = issue_month.replace(day=protocol['vintage_day']).isoformat()
    issue = datetime(issue_month.year, issue_month.month, protocol['issue_day'],
                     protocol['issue_hour_utc'], tzinfo=timezone.utc).isoformat()
    if cut >= issue[:10] or issue[:10] >= target:
        raise ValueError('invalid cut or issuance calendar')
    snapshot = {r['reference_month']: r['rate_percent'] for r in asof.select(report, cut)
                if r['status'] == 'AVAILABLE'}
    result = {**monthly_forecast(snapshot, target, protocol), 'vintage_date': cut, 'issue_timestamp': issue}
    label = initials.get(target)
    if label is not None and label['alfred_realtime_start_date'] <= issue[:10]:
        raise ValueError('target already available by issue date')
    if label is None:
        result['label_status'] = 'OUTSIDE_ARCHIVE'
    elif label['rate_percent'] is None:
        result['label_status'] = 'MISSING'
    else:
        result.update(label_status='AVAILABLE', label_available_on=label['alfred_realtime_start_date'],
                      label_rate=label['rate_percent'])
        if result['status'] == 'CALCULATED_NOT_ISSUED':
            result['y'] = int(Decimal(label['rate_percent'])-Decimal(result['base_rate']) >= Decimal(protocol['event_threshold_pp']))
    return result


def metrics(rows):
    scored = [r for r in rows if r.get('status') == 'CALCULATED_NOT_ISSUED' and 'y' in r]
    out = {'candidate_origins': len(rows), 'scored': len(scored), 'events': sum(r['y'] for r in scored)}
    for key in ('probability', 'baseline_probability', 'persistence_probability'):
        out['brier_'+key] = statistics.fmean((r[key]-r['y'])**2 for r in scored) if scored else None
    out['passes_exploratory_admission'] = bool(scored) and all(
        out['brier_probability'] < out['brier_'+key] for key in ('baseline_probability', 'persistence_probability'))
    out['prospective_issuance_authorized'] = False
    return out


def run(report, initials, protocol):
    targets = initial.month_range(date.fromisoformat(protocol['historical_target_start']), date.fromisoformat(protocol['historical_target_end']))
    rows = [make_case(report, initials, t.isoformat(), protocol) for t in targets]
    return {'schema': 'macro-monthly-admission-v1', 'run_type': 'retrospective_exploratory',
            'forecast_issued': False, 'confirmatory': False, 'predictive_skill_demonstrated': False,
            'metrics': metrics(rows), 'cases': rows,
            'annual': {y: metrics([r for r in rows if r['target_month'][:4] == y])
                       for y in sorted({r['target_month'][:4] for r in rows})}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('protocol', 'realtime', 'initial', 'output'):
        p.add_argument('--'+name, type=Path, required=True)
    p.add_argument('--protocol-sha256', required=True)
    args = p.parse_args()
    raw = args.protocol.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.protocol_sha256 or raw != (HERE/'macro_monthly_protocol_v1.json').read_bytes():
        raise ValueError('protocol must match frozen bytes and hash')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():
        raise ValueError('output must be private and outside public repository')
    protocol = json.loads(raw)
    periods = asof.audit(args.realtime.read_bytes(), protocol['realtime_sha256'], protocol['source_start'], protocol['source_end'])
    initials = initial.audit(args.initial.read_bytes(), protocol['initial_sha256'], protocol['source_start'], protocol['source_end'])
    result = run(periods, {r['reference_month']:r for r in initials['observations']}, protocol)
    result['protocol_sha256'] = args.protocol_sha256
    result['source_sha256'] = {k:protocol[k+'_sha256'] for k in ('realtime', 'initial')}
    result['code_sha256'] = {n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in
                            ('macro_monthly_pilot.py','macro_retrospective.py','alfred_asof_audit.py','alfred_initial_release_audit.py','benchmark.py','engines.py')}
    with args.output.open('x') as f:
        json.dump(result, f, indent=2, allow_nan=False)
        f.write('\n')
    print(json.dumps({'metrics':result['metrics'], 'forecast_issued':False}))


if __name__ == '__main__':
    main()
