"""Bounds for the SE of two estimates' sum with unknown covariance."""
import argparse
from hashlib import sha256
import json
import math
from pathlib import Path


def finite_nonnegative(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError("SE must be a finite nonnegative number")
    return float(value)


def bounds(se_a, se_b, denominator=None):
    a, b = finite_nonnegative(se_a), finite_nonnegative(se_b)
    low, high = abs(a - b), a + b
    if not math.isfinite(high):
        raise ValueError("SE sum overflow")
    result = {"schema": "two-estimate-sum-se-bounds-v1", "se_lower": low, "se_upper": high,
              "covariance_known": False, "exact_aggregate_se_identified": a == 0 or b == 0,
              "bound_scope": "All covariance matrices compatible with the two supplied marginal standard errors.",
              "includes_nonsampling_bias": False, "forecast_issued": False}
    if denominator is not None:
        total = finite_nonnegative(denominator)
        if total == 0:
            raise ValueError("denominator must be positive")
        low_pp, high_pp = low / total * 100, high / total * 100
        if not math.isfinite(high_pp):
            raise ValueError("normalized SE overflow")
        result.update(denominator_assumed_fixed=total, se_lower_percentage_points=low_pp,
                      se_upper_percentage_points=high_pp,
                      ratio_variance_with_random_denominator_computed=False)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists(): parser.error("refusing overwrite")
    raw = args.input.read_bytes()
    data = json.loads(raw)
    if set(data) != {"se_a", "se_b", "denominator"}:
        raise ValueError("unexpected input schema")
    result = bounds(data["se_a"], data["se_b"], data["denominator"])
    result.update(input_sha256=sha256(raw).hexdigest(), code_sha256=sha256(Path(__file__).read_bytes()).hexdigest())
    with args.output.open("x") as output:
        output.write(json.dumps(result, indent=2, allow_nan=False) + "\n")


if __name__ == "__main__": main()
