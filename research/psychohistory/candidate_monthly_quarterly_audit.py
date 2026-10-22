"""Compare pinned September 2026 Candidate with its official quarterly release.

Only aggregate counts leave this script. Agreement between releases from the
same provider does not independently verify the monthly export rule or as-of.
"""

import argparse
import csv
from datetime import date
import hashlib
import io
import json
from pathlib import Path

from candidate_cross_vintage import read_month
from candidate_source_probe import _parse_event_date

MONTHLY_SHA = '20256b0d674f4c58d747c7c75ddc012eabfedf44ada22f436ef2d9a6405567d5'
QUARTERLY_SHA = '134da9b3df08b65266802c4b662e572f396c70c92ab62297319be657540bcede'
MONTHLY_URL = 'https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_9.csv'
QUARTERLY_URL = 'https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_09.csv'
FIELDS = ('id', 'country_id', 'type_of_violence', 'date_start', 'date_end', 'date_prec')
MAX_BYTES = 80_000_000
MAX_EVENTS = 500_000


def read_quarterly(raw):
    if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_BYTES:
        raise ValueError('Invalid quarterly source bytes')
    if hashlib.sha256(raw).hexdigest() != QUARTERLY_SHA:
        raise ValueError('Pinned quarterly archive changed')
    try:
        reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''))
        if reader.fieldnames is None or len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError('Duplicate or absent quarterly header')
        if not set(FIELDS).issubset(reader.fieldnames):
            raise ValueError('Quarterly schema columns absent')
        observations = {}
        for n, row in enumerate(reader, start=1):
            if n > MAX_EVENTS:
                raise ValueError('Excess quarterly event count')
            if None in row or any(v is None for v in row.values()):
                raise ValueError('Ragged quarterly record')
            ident = row['id']
            if not ident.isdecimal() or int(ident) <= 0 or ident in observations:
                raise ValueError('Invalid or repeated quarterly event identifier')
            country = int(row['country_id'])
            kind = int(row['type_of_violence'])
            start = _parse_event_date(row['date_start'])
            end = _parse_event_date(row['date_end'])
            if country <= 0 or kind not in (1, 2, 3) or not date(1989, 1, 1) <= start <= end:
                raise ValueError('Invalid quarterly event fields')
            observations[ident] = (country, kind, start, end, row['date_prec'].strip())
    except (UnicodeError, csv.Error, KeyError, TypeError, OverflowError) as exc:
        raise ValueError('Unparseable quarterly source') from exc
    if not observations:
        raise ValueError('Empty quarterly source')
    return observations


def audit(monthly_raw, quarterly_raw):
    monthly = read_month(monthly_raw, '26.0.9', MONTHLY_SHA)['rows']
    quarterly = read_quarterly(quarterly_raw)
    first, after = date(2026, 9, 1), date(2026, 10, 1)
    spanning = {ident for ident, row in monthly.items() if row[2] < first and row[3] >= after}
    shared = monthly.keys() & quarterly.keys()
    equal = {ident for ident in shared if monthly[ident] == quarterly[ident]}
    blocked = bool(spanning or monthly.keys() - shared or shared - equal)
    return {
        'schema': 'psychohistory.candidate_monthly_quarterly_observation.v1',
        'monthlySourceUrl': MONTHLY_URL,
        'monthlySha256': MONTHLY_SHA,
        'quarterlySourceUrl': QUARTERLY_URL,
        'quarterlySha256': QUARTERLY_SHA,
        'nMonthlyEvents': len(monthly),
        'nQuarterlyEvents': len(quarterly),
        'nMonthlyIdentifiersFoundInQuarterly': len(shared),
        'nMonthlyCoreRecordsIdentical': len(equal),
        'nMonthlySpanningWithoutEndpoint': len(spanning),
        'nSpanningFoundWithIdenticalCoreFields': len(spanning & equal),
        'status': 'SOURCE_QUALITY_BLOCKED' if blocked else 'COMPARISON_ONLY_OTHER_GATES_PENDING',
        'independentSourceConfirmation': False,
        'exportRuleClarified': False,
        'firstPublicationTimeVerified': False,
        'backtestAuthorized': False,
        'forecastIssued': False,
        'caveat': 'Two releases from UCDP may share source records; matching identifiers and fields do not clarify the monthly endpoint rule or establish historical availability.',
    }


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--monthly', required=True, type=Path)
    cli.add_argument('--quarterly', required=True, type=Path)
    args = cli.parse_args()
    if args.monthly.stat().st_size > MAX_BYTES or args.quarterly.stat().st_size > MAX_BYTES:
        cli.error('Candidate source exceeds byte limit')
    print(json.dumps(audit(args.monthly.read_bytes(), args.quarterly.read_bytes()), indent=2, sort_keys=True))


if __name__ == '__main__':
    main()
