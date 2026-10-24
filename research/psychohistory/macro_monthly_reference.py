"""Frozen monthly frequency reference. Prepares private calculations, NEVER issues.

Selected after AV133 results were known. No new backtest, momentum adjustment,
or claim of confirmed skill. Source availability remains a separate gate.
"""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path

import alfred_asof_audit as asof
from macro_retrospective import shift_month
from prospective_draft_ledger import private_root

HERE = Path(__file__).resolve().parent
PROTOCOL_FILE = HERE / "macro_monthly_reference_v1.json"


def calculate(values, target):
    protocol = json.loads(PROTOCOL_FILE.read_text())
    day = date.fromisoformat(target)
    if day.isoformat() != target or day.day != 1 or not protocol['future_target_start'] <= target <= protocol['future_target_end']:
        raise ValueError('Target outside fixed twelve-month cohort')
    available = {}
    for month, value in values.items():
        parsed = date.fromisoformat(month)
        if parsed.day != 1 or parsed.isoformat() != month:
            raise ValueError('Expected canonical first-of-month reference dates')
        if value is None:
            continue
        if isinstance(value, bool):
            raise ValueError('Boolean is not an unemployment rate')
        number = Decimal(str(value))
        if not number.is_finite() or not 0 <= number <= 100:
            raise ValueError('Invalid unemployment rate')
        available[month] = number
    base_month = shift_month(target, -protocol['horizon_months_from_base'])
    common = dict(schema='macro-monthly-reference-v1', target_month=target,
                  protocol_sha256=hashlib.sha256(PROTOCOL_FILE.read_bytes()).hexdigest(),
                  forecast_issued=False, sourceAvailabilityAsOfVerified=False,
                  prospectiveEligible=False, predictive_skill_demonstrated=False)
    if not available or max(available) != base_month:
        return dict(common, status='BASE_MONTH_MISMATCH')
    pairs, excluded = [], []
    for offset in range(1-protocol['candidate_end_months'], 1):
        end = shift_month(base_month, offset)
        start = shift_month(end, -protocol['horizon_months_from_base'])
        if start not in available or end not in available:
            excluded.append(dict(start=start, end=end))
        else:
            pairs.append(dict(start=start, end=end, change_pp=str(available[end]-available[start])))
    result = dict(common, base_month=base_month, base_rate=str(available[base_month]),
                  pairs=pairs, excluded_pairs=excluded, pair_count=len(pairs))
    if len(pairs) < protocol['minimum_pairs']:
        return dict(result, status='INSUFFICIENT_PAIRS')
    k = sum(Decimal(p['change_pp']) >= Decimal(protocol['event_threshold_pp']) for p in pairs)
    return dict(result, status='CALCULATED_NOT_ISSUED', event_count=k,
                probability_numerator=k+1, probability_denominator=len(pairs)+2,
                probability=(k+1)/(len(pairs)+2), persistence_probability=0.0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('realtime', 'output'):
        parser.add_argument('--'+name, required=True, type=Path)
    for name in ('source-sha256', 'protocol-sha256', 'target', 'as-of-date'):
        parser.add_argument('--'+name, required=True)
    args = parser.parse_args()
    if hashlib.sha256(PROTOCOL_FILE.read_bytes()).hexdigest() != args.protocol_sha256:
        raise ValueError('Protocol must match frozen hash')
    protocol = json.loads(PROTOCOL_FILE.read_text())
    month = date.fromisoformat(shift_month(args.target, -1))
    cut = month.replace(day=protocol['vintage_day'])
    asof_day = date.fromisoformat(args.as_of_date)
    if not month.replace(day=protocol['source_capture_start_day']) <= asof_day <= min(cut, datetime.now(timezone.utc).date()):
        raise ValueError('As-of must be an observed capture date within the pre-cut window')
    report = asof.audit(args.realtime.read_bytes(), args.source_sha256,
                       protocol['source_start'], shift_month(args.target, -2))
    snapshot = {r['reference_month']: r['rate_percent'] for r in asof.select(report, args.as_of_date)
                if r['status'] == 'AVAILABLE'}
    result = calculate(snapshot, args.target)
    result.update(source_sha256=args.source_sha256, as_of_date=args.as_of_date,
                  prepared_at_utc=datetime.now(timezone.utc).isoformat(),
                  code_sha256={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in
                               ('macro_monthly_reference.py', 'alfred_asof_audit.py', 'macro_retrospective.py')})
    private_root(args.output.parent)
    if args.output.is_symlink():
        raise ValueError('Unsafe output')
    with args.output.open('x', encoding='utf-8') as f:
        json.dump(result, f, indent=2, allow_nan=False)
        f.write('\n')
    print(json.dumps({'status':result['status'], 'forecast_issued':False}))


if __name__ == '__main__':
    main()
