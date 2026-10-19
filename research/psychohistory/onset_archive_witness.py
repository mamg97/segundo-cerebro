"""Conservative audit of an Internet Archive CDX index for a UCDP vintage.

A CDX record is an independently *claimed* capture clock, not a trusted
cryptographic timestamp. Even an exact archived-byte match does not make
country-year risk membership, release clocks or historical forecasts valid.
No source rows, IDs or forecast probabilities are serialized by this auditor.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
from hashlib import sha1
import json
from pathlib import Path
import re

SCHEMA = 'psychohistory.onset_archive_cdx_witness.v1'
ORIGINALS = {
    'ucdp_ged_19_1': frozenset((
        'http://ucdp.uu.se/downloads/ged/ged191-csv.zip',
        'https://ucdp.uu.se/downloads/ged/ged191-csv.zip',
    )),
    'ucdp_candidate_20_0_10': frozenset((
        'https://ucdp.uu.se/downloads/candidateged/GEDEvent_v20_0_10.csv',
    )),
}
CDX_HEADER = ('urlkey','timestamp','original','mimetype','statuscode','digest','length')
ISSUE_TIME = re.compile(r'^\d{4}-01-01T00:00:00Z$')
DIGEST = re.compile(r'^[A-Z2-7]{32}$')


def parse_issue_instant(value):
    """Explicit UTC scenario, *not* silent ratification of AV-042's clock."""
    if not isinstance(value, str) or not ISSUE_TIME.fullmatch(value):
        raise ValueError('Explicit YYYY-01-01T00:00:00Z required (UTC scenario)')
    try:
        t = datetime.strptime(value, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError('Invalid January issue instant') from exc
    if not 1947 <= t.year <= 2024:
        raise ValueError('Outside fixed onset v25.1 historical outcome window')
    return t


def parse_cdx(raw):
    """Parse exact indexed records; never interpret empty index as no snapshots."""
    if not isinstance(raw, bytes) or len(raw) > 262144:
        raise ValueError('CDX index must be bounded raw bytes')
    try:
        data = json.loads(raw.decode('utf-8-sig'))
    except (UnicodeError, ValueError) as exc:
        raise ValueError('Expected CDX JSON table') from exc
    if not isinstance(data, list) or not data or data[0] != list(CDX_HEADER):
        raise ValueError('Unexpected CDX header')
    if len(data) > 101:
        raise ValueError('Excess capture rows; avoid incomplete/cherry-picked result')
    out = []
    for row in data[1:]:
        if (not isinstance(row, list) or len(row) != len(CDX_HEADER)
                or any(not isinstance(cell, str) for cell in row)):
            raise ValueError('Malformed CDX capture')
        d = dict(zip(CDX_HEADER, row))
        if not re.fullmatch(r'\d{14}', d['timestamp']):
            raise ValueError('Invalid capture clock')
        try:
            t = datetime.strptime(d['timestamp'], '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise ValueError('Impossible capture clock') from exc
        if d['digest'] != '-' and not DIGEST.fullmatch(d['digest']):
            raise ValueError('Invalid SHA-1 Base32 CDX digest')
        if not re.fullmatch(r'\d{1,10}|-', d['length']):
            raise ValueError('Invalid CDX length')
        d['clock_utc'] = t
        out.append(d)
    return out


def check_capture_index(raw, source_id, issue_utc, archived_bytes=None):
    """Metadata and optional SHA-1 matching; no as-of, risk-set or backtest approvals.

    Source data must remain ephemeral and outside public repository. The CDX
    SHA-1 Base32 digest is not interchangeable with an upstream SHA-256 pin.
    """
    origin = parse_issue_instant(issue_utc)
    if source_id not in ORIGINALS:
        raise ValueError('Unrecognized UCDP source identity')
    if archived_bytes is not None and (not isinstance(archived_bytes, bytes)
                                      or len(archived_bytes) > 25000000):
        raise ValueError('Unusable or oversized archived bytes')
    candidates = []
    for row in parse_cdx(raw):
        if row['original'] not in ORIGINALS[source_id]:
            raise ValueError('Cross-product/origin URL mismatch in CDX')
        # No need to publish full URL or CDX digest in report; only counts.
        t = row['clock_utc']
        good_response = (row['statuscode'] == '200'
                         and row['mimetype'] not in ('text/html', 'warc/revisit'))
        if good_response and t < origin and row['digest'] != '-':
            candidates.append(row)
    byte_hash_match = False
    if archived_bytes is not None:
        computed = base64.b32encode(sha1(archived_bytes).digest()).decode('ascii').rstrip('=')
        byte_hash_match = any(row['digest'] == computed for row in candidates)
    return {
        'schema': SCHEMA,
        'source_id': source_id,
        'hypothetical_origin_utc': issue_utc,
        'records_supplied_by_archive_index': True,
        'n_valid_preissue_capture_claims': len(candidates),
        'archive_index_asserts_prior_capture': bool(candidates),
        'archived_bytes_compared_with_index_digest': archived_bytes is not None,
        'archived_bytes_match_index_digest': byte_hash_match,
        'independent_archival_index_claim_only': True,
        'origin_timezone_contract_amendment_approved': False,
        'independent_cryptographically_authenticated_capture_time': False,
        'historical_binary_availability_proven': False,
        'source_asof_verified': False,
        'territorial_risk_set_verified': False,
        'backtest_authorized': False,
        'models_scored': False,
        'forecast_issued': False,
        'blocking_reasons': [
            'CAPTURE_CLOCK_NOT_INDEPENDENTLY_CRYPTOGRAPHICALLY_TIMESTAMPED',
            'JANUARY_UTC_ORIGIN_SCENARIO_NOT_PREREGISTERED_AV042',
            'OFFICIAL_INTRASTATE_COUNTRY_RISK_SET_UNVERIFIED',
            'HISTORICAL_UCDP_SOURCE_BYTES_NOT_PROVEN_ASOF',
        ],
        'warning': ('An archive CDX index and matching SHA1 are only capture claims. '
                    'They do not prove publication or eligibility of unobserved states.'),
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--cdx-json', type=Path, required=True)
    p.add_argument('--source-id', choices=sorted(ORIGINALS), required=True)
    p.add_argument('--issue-utc', required=True)
    p.add_argument('--archived-bytes', type=Path)
    args = p.parse_args()
    raw = args.cdx_json.read_bytes()
    archived = args.archived_bytes.read_bytes() if args.archived_bytes else None
    print(json.dumps(check_capture_index(raw, args.source_id, args.issue_utc, archived), sort_keys=True))


if __name__ == '__main__':
    main()
