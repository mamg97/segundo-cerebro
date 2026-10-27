"""HTOPS SDR: full estimate followed by exactly 80 replicate estimates.

Formula from Census HTOPS March 2026 Source and Accuracy, page 11.
Only sampling-design uncertainty; does not establish vintage or forecast skill.
"""
import math


def checked(values):
    values = list(values)
    if len(values) != 81 or any(type(v) not in (int, float) or not math.isfinite(v) for v in values):
        raise ValueError('One full estimate and exactly 80 finite replicates required')
    return values


def covariance(left, right):
    left, right = checked(left), checked(right)
    return math.fsum((a-left[0])*(b-right[0]) for a, b in zip(left[1:], right[1:])) / 20


def variance(values):
    values = checked(values)
    return covariance(values, values)


def ratio(numerators, denominators):
    numerators, denominators = checked(numerators), checked(denominators)
    if any(d <= 0 for d in denominators):
        raise ValueError('Full and replicate denominators must be positive')
    return checked(n/d for n, d in zip(numerators, denominators))


def summarize(always, usually, denominator):
    a, b, d = checked(always), checked(usually), checked(denominator)
    if any(x < 0 or y < 0 or x+y > n+1e-6 for x, y, n in zip(a, b, d)):
        raise ValueError('Invalid disjoint population counts')
    combined = checked(x+y for x, y in zip(a, b))
    rates = ratio(combined, d)
    va, vb, vs, cov = variance(a), variance(b), variance(combined), covariance(a,b)
    if not math.isclose(vs, va+vb+2*cov, rel_tol=1e-12, abs_tol=1e-8):
        raise ValueError('Variance decomposition inconsistent')
    return dict(estimate=rates[0], standardErrorRatio=math.sqrt(variance(rates)),
                standardErrorSum=math.sqrt(vs), standardErrorAlways=math.sqrt(va),
                standardErrorUsually=math.sqrt(vb), covariance=cov,
                fixedDenominatorNormalization=math.sqrt(vs)/d[0],
                denominatorRange=[min(d),max(d)], forecastIssued=False)
