"""Adaptive direct numeric UNRATE experiment. Offline; no forecasts issued."""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import statistics

import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
from macro_claims import claims_archive, signal_at
from macro_retrospective import shift_month
from weekly_claims import fit_predict

HERE = Path(__file__).resolve().parent
PROTOCOL = HERE / 'macro_direct_change_v1.json'


def make_case(claims, periods, labels, target, p):
    previous = shift_month(target, -1)
    cut = previous[:8] + str(p['cut_day'])
    issue = previous[:8] + str(p['issue_day'])
    base = shift_month(target, -2)
    older = shift_month(base, -2)
    values = {x['reference_month']: x['rate_percent'] for x in asof.select(periods, cut)
              if x['status'] == 'AVAILABLE'}
    sig = signal_at(claims, cut, p)
    row = dict(target_month=target, cut=cut, issue_date=issue, status='MISSING_FEATURE')
    label = labels.get(target)
    if label and label['alfred_realtime_start_date'] <= issue:
        raise ValueError('Target already known at issue')
    if not values or max(values) != base or older not in values or sig is None:
        return row
    base_value = Decimal(values[base])
    row.update(status='ELIGIBLE', base_rate=str(base_value), base_month=base,
               claims_ratio=sig['ratio'],
               x=[float(base_value - Decimal(values[older])), math.log(float(Fraction(sig['ratio'])))])
    if label and label['rate_percent'] is not None:
        row.update(y=float(Decimal(label['rate_percent']) - base_value),
                   label_value=label['rate_percent'],
                   label_available_on=label['alfred_realtime_start_date'])
    return row


def training_at(history, case, p):
    earliest = shift_month(case['target_month'], -p['training_window_calendar_months'])
    return [r for r in history if earliest <= r['target_month'] < case['target_month']
            and 'y' in r and r['label_available_on'] <= case['cut']]


def metrics(rows):
    paired = [r for r in rows if 'prediction' in r and 'y' in r]
    result = dict(scored=len(paired), units='percentage_points')
    for key in ['prediction', 'persistence', 'training_mean']:
        result['rmse_' + key] = math.sqrt(statistics.fmean((r[key]-r['y'])**2 for r in paired)) if paired else None
        result['mae_' + key] = statistics.fmean(abs(r[key]-r['y']) for r in paired) if paired else None
    result['passes_exploratory_rule'] = bool(paired) and all(
        result['rmse_prediction'] <= .95*result['rmse_' + k]
        for k in ['persistence', 'training_mean']) and result['mae_prediction'] <= result['mae_persistence']
    return result


def run(claims, periods, labels, p):
    history, outputs = [], []
    for t in initial.month_range(date.fromisoformat(p['training_origins_start']),
                                 date.fromisoformat(p['test_end'])):
        case = make_case(claims, periods, labels, t.isoformat(), p)
        if case['target_month'] >= p['test_start']:
            out = dict(case)
            if case['status'] == 'ELIGIBLE':
                train = training_at(history, case, p)
                if len(train) >= p['minimum_training_cases']:
                    pred = fit_predict(train, case['x'], p['ridge_mean_loss'])
                    out.update(status='CALCULATED_NOT_ISSUED', prediction=pred,
                               predicted_level=float(case['base_rate']) + pred,
                               persistence=0.0, training_mean=statistics.fmean(r['y'] for r in train),
                               training_targets=[r['target_month'] for r in train], training_n=len(train))
                else:
                    out['status'] = 'INSUFFICIENT_TRAINING'
            outputs.append(out)
        if case['status'] == 'ELIGIBLE':
            history.append(case)
    return dict(schema=p['id'], forecast_issued=False, confirmatory=False,
                predictive_skill_demonstrated=False, adaptive_followup=True,
                metrics=metrics(outputs), cases=outputs,
                annual={y: metrics([r for r in outputs if r['target_month'][:4] == y])
                        for y in sorted({r['target_month'][:4] for r in outputs})})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['claims', 'realtime', 'initial', 'output']:
        parser.add_argument('--' + name, required=True, type=Path)
    parser.add_argument('--protocol-sha256', required=True)
    args = parser.parse_args()
    raw = PROTOCOL.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.protocol_sha256:
        raise ValueError('Frozen protocol hash required')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():
        raise ValueError('Private output required')
    p = json.loads(raw)
    claims = claims_archive(args.claims.read_bytes(), p['claims_sha256'])
    periods = asof.audit(args.realtime.read_bytes(), p['unrate_realtime_sha256'], '2011-01-01', '2026-09-01')
    labels = initial.audit(args.initial.read_bytes(), p['unrate_initial_sha256'], '2011-01-01', '2026-09-01')
    result = run(claims, periods, {x['reference_month']: x for x in labels['observations']}, p)
    result.update(protocol_sha256=args.protocol_sha256, executed_at_utc=datetime.now(timezone.utc).isoformat(),
                  code_sha256={n: hashlib.sha256((HERE/n).read_bytes()).hexdigest()
                  for n in ['macro_direct_change.py', 'weekly_claims.py', 'macro_claims.py',
                            'macro_retrospective.py', 'alfred_asof_audit.py', 'alfred_initial_release_audit.py']})
    with args.output.open('x') as f:
        json.dump(result, f, indent=2, allow_nan=False)
    print(json.dumps(result['metrics']))


if __name__ == '__main__':
    main()
