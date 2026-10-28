"""Additional payrolls information for an adaptive binary UNRATE experiment."""
import argparse
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from fractions import Fraction
import hashlib
import json
from pathlib import Path

import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
import macro_claims
from macro_continuous_claims import score
from macro_retrospective import shift_month

HERE = Path(__file__).resolve().parent
PROTOCOL = HERE / 'macro_payrolls_v1.json'


def payrolls_archive(raw, digest, start='2011-01-01', end='2026-09-01'):
    exported, headers, rows = asof.read_export(raw, digest, 'obs._by_real-time_period.csv',
        'Observations by Real-Time Period', series_id='PAYEMS', units='Thousands of Persons')
    if headers != ['period_start_date', 'PAYEMS', 'realtime_start_date', 'realtime_end_date']:
        raise ValueError('Wrong payrolls schema')
    months, previous = OrderedDict(), None
    for r in rows:
        month = asof.iso_day(r['period_start_date'])
        first = asof.iso_day(r['realtime_start_date'])
        last = asof.iso_day(r['realtime_end_date']) if r['realtime_end_date'] else None
        key = (month, first)
        if previous is not None and key <= previous:
            raise ValueError('Duplicate or unordered payroll interval')
        previous = key
        if (month.day != 1 or first < date.fromisoformat(shift_month(month.isoformat(), 1))
                or first.isoformat() > exported or last and (last < first or last.isoformat() > exported)):
            raise ValueError('Invalid payroll reference or release clock')
        value = None if r['PAYEMS'] in ('', '.') else Decimal(r['PAYEMS'])
        if value is not None and (not value.is_finite() or value <= 0 or value != int(value)):
            raise ValueError('Positive integer thousands-of-persons value required')
        segments = months.setdefault(month.isoformat(), [])
        if segments and (segments[-1]['end'] is None or
                date.fromisoformat(segments[-1]['end']) + timedelta(days=1) != first):
            raise ValueError('Payroll interval gap or overlap')
        segments.append(dict(start=first.isoformat(), end=last.isoformat() if last else None,
                             value=int(value) if value is not None else None))
    expected = [d.isoformat() for d in initial.month_range(asof.iso_day(start), asof.iso_day(end))]
    if list(months) != expected or any(a[-1]['end'] is not None for a in months.values()):
        raise ValueError('Missing reference months or truncated final interval')
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
            raise ValueError('Ambiguous payroll snapshot')
        if active and active[0]['value'] is not None:
            values[month] = active[0]['value']
    base = shift_month(cut[:8] + '01', -1)
    older = shift_month(base, -p['payrolls_lag_months'])
    if not values or max(values) != base or older not in values:
        return None
    # Employment contraction -> positive risk feature. No binary threshold.
    return dict(ratio=str(Fraction(values[older], values[base])), base_month=base,
                older_month=older, base_payrolls=values[base], older_payrolls=values[older])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['payrolls', 'realtime', 'initial', 'output']:
        parser.add_argument('--' + name, required=True, type=Path)
    parser.add_argument('--protocol-sha256', required=True)
    parser.add_argument('--payrolls-sha256', required=True)
    args = parser.parse_args()
    raw = PROTOCOL.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.protocol_sha256:
        raise ValueError('Frozen protocol hash required')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():
        raise ValueError('Private output required')
    p = json.loads(raw)
    payrolls = payrolls_archive(args.payrolls.read_bytes(), args.payrolls_sha256)
    periods = asof.audit(args.realtime.read_bytes(), p['unrate_realtime_sha256'], '2011-01-01', '2026-09-01')
    labels = initial.audit(args.initial.read_bytes(), p['unrate_initial_sha256'], '2011-01-01', '2026-09-01')
    result = macro_claims.run(payrolls, periods,
        {x['reference_month']: x for x in labels['observations']}, p, scorer=score, signal_provider=signal_at)
    result.update(protocol_sha256=args.protocol_sha256, payrolls_sha256=args.payrolls_sha256,
                  executed_at_utc=datetime.now(timezone.utc).isoformat(), adaptive_followup=True,
                  payrolls_month_count=payrolls['month_count'], payrolls_interval_count=payrolls['interval_count'],
                  code_sha256={n: hashlib.sha256((HERE/n).read_bytes()).hexdigest()
                  for n in ['macro_payrolls.py', 'macro_continuous_claims.py', 'macro_claims.py',
                            'macro_retrospective.py', 'alfred_asof_audit.py', 'alfred_initial_release_audit.py']})
    with args.output.open('x') as f:
        json.dump(result, f, indent=2, allow_nan=False)
    print(json.dumps(result['metrics']))


if __name__ == '__main__':
    main()
