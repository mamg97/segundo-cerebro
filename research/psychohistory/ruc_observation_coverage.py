"""Count first appearances inside RUC vintages, without dating BLS releases.

The first RUC vintage containing a month is a quarterly observation, not the
first BLS publication of that month. This deliberately produces no targets,
scores, predictions, or historical release timestamps.
"""

from __future__ import annotations

import argparse
import json
import zipfile
from collections import Counter
from pathlib import Path

from ruc_vintage_audit import HEADER, MONTH, _cells, audit


def _vintage(header: str) -> tuple[int, int]:
    match = HEADER.fullmatch(header)
    if match is None:
        raise ValueError("Unexpected vintage header")
    yy = int(match.group(1))
    return (1900 + yy if yy >= 65 else 2000 + yy), int(match.group(2))


def _month(label: str) -> tuple[int, int]:
    match = MONTH.fullmatch(label)
    if match is None:
        raise ValueError("Unexpected observation month")
    return int(match.group(1)), int(match.group(2))


def _distance(later: tuple[int, int], earlier: tuple[int, int]) -> int:
    return (later[0] - earlier[0]) * 12 + later[1] - earlier[1]


def summarize(cells: dict, vintage_count: int, month_count: int) -> dict:
    vintages = [_vintage(cells[column, 1]) for column in range(2, vintage_count + 2)]
    months = [_month(cells[1, row]) for row in range(2, month_count + 2)]
    if not vintages or not months:
        raise ValueError("An audited RUC table is required")

    # The first vintage is a stock of old observations. Its middle-month
    # cutoff cannot tell us when any earlier month originally appeared.
    first_cutoff = (vintages[0][0], (vintages[0][1] - 1) * 3 + 1)
    first_lags: Counter[int] = Counter()
    end_lags: Counter[int] = Counter()
    censored = 0
    missing: list[str] = []
    for row, month in enumerate(months, 2):
        if month <= first_cutoff:
            censored += 1
            continue
        appearances = [column for column in range(2, vintage_count + 2)
                       if isinstance(cells.get((column, row)), float)]
        if not appearances:
            missing.append(f"{month[0]:04d}-{month[1]:02d}")
            continue
        first = vintages[appearances[0] - 2]
        potential_cutoff = (first[0], (first[1] - 1) * 3 + 1)
        lag = _distance(potential_cutoff, month)
        if lag < 0:
            raise ValueError("First appearance precedes potential availability")
        first_lags[lag] += 1

    for column, vintage in enumerate(vintages, 2):
        observed = [month for row, month in enumerate(months, 2)
                    if isinstance(cells.get((column, row)), float)]
        if not observed:
            raise ValueError("Empty vintage")
        potential_cutoff = (vintage[0], (vintage[1] - 1) * 3 + 1)
        lag = _distance(potential_cutoff, observed[-1])
        if lag < 0:
            raise ValueError("Vintage contains a future observation")
        end_lags[lag] += 1

    return {
        "schema": "psychohistory.ruc_observation_coverage.v1",
        "left_censored_months": censored,
        "assessed_months": sum(first_lags.values()),
        "never_observed_months_after_first_cutoff": missing,
        "first_ruc_appearance_lag_months": dict(sorted(first_lags.items())),
        "last_observation_lag_by_vintage_months": dict(sorted(end_lags.items())),
        "first_bls_release_identified": False,
        "exact_historical_release_times_verified": False,
        "forecast_issued": False,
        "predictive_skill_demonstrated": False,
    }


def coverage(path: Path, expected_sha256: str) -> dict:
    source = audit(path, expected_sha256)
    with zipfile.ZipFile(path) as book:
        cells = _cells(book)
    report = summarize(cells, source["vintage_count"], source["observation_month_count"])
    report["source_sha256"] = source["source_sha256"]
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", required=True, type=Path)
    parser.add_argument("--sha256", required=True)
    arguments = parser.parse_args()
    print(json.dumps(coverage(arguments.workbook, arguments.sha256), sort_keys=True))


if __name__ == "__main__":
    main()
