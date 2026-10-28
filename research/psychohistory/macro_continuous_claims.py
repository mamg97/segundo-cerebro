"""One frozen, adaptive exploratory monotone claims experiment; offline only."""
import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
import macro_claims
from macro_retrospective import shift_month

HERE = Path(__file__).resolve().parent
PROTOCOL = HERE / 'macro_continuous_claims_v1.json'


def sigmoid(z):
    if z >= 0:
        return 1 / (1 + math.exp(-z))
    e = math.exp(z)
    return e / (1 + e)


def feature(ratio, p):
    r = float(Fraction(ratio))
    if not math.isfinite(r) or r <= 0:
        raise ValueError('Positive finite claims ratio required')
    return max(-p['feature_clip'], min(p['feature_clip'],
               math.log(r) / math.log(float(p['feature_scale_ratio']))))


def fit(xs, ys, baseline, penalty):
    """Strictly convex penalized likelihood with fixed baseline logit offset."""
    if (not xs or len(xs) != len(ys) or not 0 < baseline < 1 or
            not math.isfinite(penalty) or penalty <= 0 or
            any(not math.isfinite(x) for x in xs) or any(y not in (0, 1) for y in ys)):
        raise ValueError('Invalid fit inputs')
    offset = math.log(baseline / (1 - baseline))

    def gradient(beta):
        return math.fsum(x * (sigmoid(offset + beta*x) - y)
                         for x, y in zip(xs, ys)) + penalty*beta

    beta = 0.0
    if gradient(0) < 0:
        lo, hi = 0.0, 1.0
        while gradient(hi) < 0:
            hi *= 2
        for _ in range(100):
            mid = (lo + hi) / 2
            if gradient(mid) < 0:
                lo = mid
            else:
                hi = mid
        beta = (lo + hi) / 2
    loss = math.fsum(max(z, 0) + math.log1p(math.exp(-abs(z))) - y*z
                     for x, y in zip(xs, ys) for z in [offset + beta*x])
    return dict(coefficient=beta, offset=offset, gradient=gradient(beta),
                penalized_training_loss=loss + penalty*beta*beta/2)


def score(train, case, p):
    chosen = [x for x in train if shift_month(case['target_month'],
              -p['training_window_calendar_months']) <= x['target_month'] < case['target_month']
              and 'y' in x and x['label_available_on'] <= case['cut']]
    if len(chosen) < p['minimum_training_cases']:
        return None
    baseline = Fraction(sum(x['y'] for x in chosen) + 1, len(chosen) + 2)
    result = fit([feature(x['signal']['ratio'], p) for x in chosen],
                 [x['y'] for x in chosen], float(baseline), p['ridge_penalty'])
    x = feature(case['signal']['ratio'], p)
    return dict(result, probability=sigmoid(result['offset'] + result['coefficient']*x),
                baseline_probability=float(baseline), baseline_fraction=str(baseline),
                feature=x, training_n=len(chosen),
                training_targets=[x['target_month'] for x in chosen])


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
    claims = macro_claims.claims_archive(args.claims.read_bytes(), p['claims_sha256'])
    periods = asof.audit(args.realtime.read_bytes(), p['unrate_realtime_sha256'],
                         '2011-01-01', '2026-09-01')
    labels = initial.audit(args.initial.read_bytes(), p['unrate_initial_sha256'],
                           '2011-01-01', '2026-09-01')
    result = macro_claims.run(claims, periods,
             {x['reference_month']: x for x in labels['observations']}, p, scorer=score)
    result.update(protocol_sha256=args.protocol_sha256,
                  executed_at_utc=datetime.now(timezone.utc).isoformat(),
                  adaptive_followup=True,
                  code_sha256={n: hashlib.sha256((HERE / n).read_bytes()).hexdigest()
                  for n in ['macro_continuous_claims.py', 'macro_claims.py',
                            'macro_retrospective.py', 'alfred_asof_audit.py',
                            'alfred_initial_release_audit.py']})
    with args.output.open('x') as f:
        json.dump(result, f, indent=2, allow_nan=False)
    print(json.dumps(result['metrics']))


if __name__ == '__main__':
    main()
