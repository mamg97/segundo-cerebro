"""JOLTS engine for the frozen adaptive experiment; no network or issuance."""
import argparse
from collections import OrderedDict
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from fractions import Fraction
import hashlib
import json
from pathlib import Path

import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
from macro_continuous_claims import fit, sigmoid
from macro_retrospective import shift_month
import macro_claims

HERE = Path(__file__).resolve().parent
PROTOCOL = HERE / 'macro_jolts_v1.json'


def jolts_archive(raw, digest, start, end):
    exported, headers, rows = asof.read_export(raw, digest, 'obs._by_real-time_period.csv',
        'Observations by Real-Time Period', series_id='JTSJOR', units='Rate')
    if headers != ['period_start_date', 'JTSJOR', 'realtime_start_date', 'realtime_end_date']:
        raise ValueError('Wrong JOLTS schema')
    months, previous = OrderedDict(), None
    for r in rows:
        month = asof.iso_day(r['period_start_date'])
        first = asof.iso_day(r['realtime_start_date'])
        last = asof.iso_day(r['realtime_end_date']) if r['realtime_end_date'] else None
        key = (month, first)
        if previous is not None and key <= previous:
            raise ValueError('Duplicate or unordered JOLTS interval')
        previous = key
        if (month.day != 1 or first < date.fromisoformat(shift_month(month.isoformat(), 1))
                or first.isoformat() > exported or last and (last < first or last.isoformat() > exported)):
            raise ValueError('Invalid JOLTS reference or release clock')
        value = asof.rate(r['JTSJOR'])
        segments = months.setdefault(month.isoformat(), [])
        if segments and (segments[-1]['end'] is None or
                date.fromisoformat(segments[-1]['end']) + timedelta(days=1) != first):
            raise ValueError('JOLTS interval gap or overlap')
        segments.append(dict(start=first.isoformat(), end=last.isoformat() if last else None, value=value))
    expected = [d.isoformat() for d in initial.month_range(asof.iso_day(start), asof.iso_day(end))]
    if list(months) != expected or any(a[-1]['end'] is not None for a in months.values()):
        raise ValueError('Missing JOLTS months or truncated interval')
    return dict(source_sha256=digest, exported_on=exported, months=months,
                interval_count=len(rows), month_count=len(months), original_bls_bytes_verified=False)


def signal_at(report, cut, p):
    asof.iso_day(cut)
    if cut > report['exported_on']:
        raise ValueError('Cut after export')
    values = {}
    for month, segments in report['months'].items():
        active = [s for s in segments if s['start'] <= cut and (s['end'] is None or cut <= s['end'])]
        if len(active) > 1:
            raise ValueError('Ambiguous JOLTS snapshot')
        if active and active[0]['value'] is not None:
            values[month] = Decimal(active[0]['value'])
    target = shift_month(cut[:8] + '01', 1)
    latest = shift_month(target, p['jolts_latest_reference_offset_from_target'])
    older = shift_month(latest, -p['jolts_change_months'])
    if not values or max(values) != latest or older not in values:
        return None
    return dict(decline_pp=str(values[older] - values[latest]), latest_month=latest,
                older_month=older, latest_rate=str(values[latest]), older_rate=str(values[older]))


def feature(signal, p):
    v = float(Decimal(signal['decline_pp']) / Decimal(p['feature_scale_pp']))
    if not Decimal(str(v)).is_finite():
        raise ValueError('Finite decline required')
    return max(-p['feature_clip'], min(p['feature_clip'], v))


def score(train, case, p):
    earliest = shift_month(case['target_month'], -p['training_window_calendar_months'])
    chosen = [r for r in train if earliest <= r['target_month'] < case['target_month']
              and 'y' in r and r['label_available_on'] <= case['cut']]
    if len(chosen) < p['minimum_training_cases']:
        return None
    baseline = Fraction(sum(r['y'] for r in chosen) + 1, len(chosen) + 2)
    result = fit([feature(r['signal'], p) for r in chosen], [r['y'] for r in chosen],
                 float(baseline), p['ridge_penalty'])
    x = feature(case['signal'], p)
    return dict(result, probability=sigmoid(result['offset'] + result['coefficient']*x),
                baseline_probability=float(baseline), baseline_fraction=str(baseline),
                feature=x, training_n=len(chosen), training_targets=[r['target_month'] for r in chosen])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['jolts', 'realtime', 'initial', 'output']:
        parser.add_argument('--' + name, required=True, type=Path)
    parser.add_argument('--protocol-sha256', required=True)
    parser.add_argument('--jolts-sha256', required=True)
    args = parser.parse_args()
    raw = PROTOCOL.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.protocol_sha256:
        raise ValueError('Frozen protocol hash required')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():
        raise ValueError('Private output required')
    p = json.loads(raw)
    jolts = jolts_archive(args.jolts.read_bytes(), args.jolts_sha256, p['jolts_start'], p['jolts_end'])
    periods = asof.audit(args.realtime.read_bytes(), p['unrate_realtime_sha256'], '2011-01-01', '2026-09-01')
    labels = initial.audit(args.initial.read_bytes(), p['unrate_initial_sha256'], '2011-01-01', '2026-09-01')
    result = macro_claims.run(jolts, periods,
        {x['reference_month']: x for x in labels['observations']}, p, scorer=score, signal_provider=signal_at)
    result.update(protocol_sha256=args.protocol_sha256, jolts_sha256=args.jolts_sha256,
                  executed_at_utc=datetime.now(timezone.utc).isoformat(), adaptive_followup=True,
                  jolts_month_count=jolts['month_count'], jolts_interval_count=jolts['interval_count'],
                  code_sha256={n: hashlib.sha256((HERE/n).read_bytes()).hexdigest()
                  for n in ['macro_jolts.py', 'macro_continuous_claims.py', 'macro_claims.py',
                            'macro_retrospective.py', 'alfred_asof_audit.py', 'alfred_initial_release_audit.py']})
    with args.output.open('x') as f:
        json.dump(result, f, indent=2, allow_nan=False)
    print(json.dumps(result['metrics']))


if __name__ == '__main__':
    main()
