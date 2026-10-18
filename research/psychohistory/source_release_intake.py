"""Strict offline intake for the PINNED official UCDP OrganizedViolenceCY v26.1.

This checks bytes and content against the already preregistered research protocol.
It does NOT independently date release or certify source availability as-of a
hypothetical forecast. It neither estimates probabilities nor issues forecasts.
All input/output files remain outside the public source repository.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import re
import stat
import zipfile

from source_schema import normalized_source_rows

REPOSITORY = Path(__file__).resolve().parents[2]
SCHEMA = 'psychohistory.ucdp_cy261_official_source_intake.v1'
ALLOWED_VERSION = '26.1'
REQUIRED = {
    'country', 'country_id', 'year', 'Version', 'region',
    'sb_total_deaths_best', 'sb_total_deaths_low', 'sb_total_deaths_high',
    'ns_total_deaths_best', 'os_total_deaths_best',
}
COUNT_FIELDS = (
    'sb_total_deaths_best', 'sb_total_deaths_low', 'sb_total_deaths_high',
    'ns_total_deaths_best', 'os_total_deaths_best',
)
HEX = re.compile(r'^[0-9a-f]{64}$')


def digest_file(path):
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ValueError('Input must be a normal file')
    h = hashlib.sha256()
    with path.open('rb') as src:
        for part in iter(lambda: src.read(1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()


def validate_pinned_protocol(protocol):
    if protocol.get('dataset_version') != ALLOWED_VERSION:
        raise ValueError('Wrong dataset release')
    if protocol.get('archive_url') != 'https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip':
        raise ValueError('Non-official ZIP locator')
    if protocol.get('codebook_url') != 'https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_261.pdf':
        raise ValueError('Non-official codebook locator')
    if any(not isinstance(protocol.get(key), str) or not HEX.fullmatch(protocol[key])
           for key in ('archive_sha256', 'codebook_sha256')):
        raise ValueError('Pinned official checksum is missing')
    if protocol.get('raw_years') != [1989, 2025]:
        raise ValueError('Unexpected source year range')
    for key in ('expected_raw_rows', 'expected_countries'):
        if type(protocol.get(key)) is not int or protocol[key] <= 0:
            raise ValueError('Invalid preregistered coverage')


def inspect(source_dir, protocol):
    """Strict source byte and panel audit; no model fitting or forecast emission."""
    validate_pinned_protocol(protocol)
    folder = Path(source_dir)
    zfile = folder / 'ucdp.zip'
    codebook = folder / 'codebook.pdf'
    zip_hash = digest_file(zfile)
    pdf_hash = digest_file(codebook)
    if zip_hash != protocol['archive_sha256'] or pdf_hash != protocol['codebook_sha256']:
        raise ValueError('Official-source SHA-256 mismatch; do not repin silently')
    if zfile.stat().st_size > 20_000_000 or codebook.stat().st_size > 25_000_000:
        raise ValueError('Unexpected source file size')
    with zipfile.ZipFile(zfile) as zipped:
        files = [member for member in zipped.infolist() if not member.is_dir()]
        if len(files) != 1 or not files[0].filename.lower().endswith('.csv'):
            raise ValueError('Official archive must contain exactly one CSV file')
        m = files[0]
        if (m.flag_bits & 1 or m.file_size > 70_000_000 or m.file_size <= 0 or
            m.filename.startswith('/') or '/' in m.filename or '\\' in m.filename or
            m.filename in ('.', '..') or (stat.S_IFMT(m.external_attr >> 16) not in (0, stat.S_IFREG))):
            raise ValueError('Unsafe or unexpected official CSV ZIP member')
        with zipped.open(m) as raw:
            content = raw.read(70_000_001)
        if len(content) != m.file_size:
            raise ValueError('Truncated or oversized CSV data')
        csv_hash = hashlib.sha256(content).hexdigest()
    rows = 0
    seen = set()
    countries = set()
    years = collections.Counter()
    spans = collections.defaultdict(list)
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig'), newline=''))
    for row in normalized_source_rows(reader, pinned_version=ALLOWED_VERSION):
        if None in row:
            raise ValueError('Malformed CSV row')
        if row['Version'] != ALLOWED_VERSION:
            raise ValueError('Unexpected edition inside official file')
        try:
            cid = int(row['country_id'])
            year = int(row['year'])
            if str(cid) != row['country_id'].strip() or str(year) != row['year'].strip() or cid < 1:
                raise ValueError('Invalid country-year identity')
            if year < 1989 or year > 2025:
                raise ValueError('Unexpected country-year')
            for col in COUNT_FIELDS:
                num = float(row[col])
                if not 0 <= num <= 1e9 or not num.is_integer():
                    raise ValueError('Invalid fatality count')
        except (ValueError, OverflowError, TypeError) as exc:
            raise ValueError('Unusable country-year or fatality record') from exc
        key = (cid, year)
        if key in seen:
            raise ValueError('Duplicate official country-year row')
        seen.add(key)
        countries.add(cid)
        years[year] += 1
        spans[cid].append(year)
        rows += 1
        if rows > protocol['expected_raw_rows']:
            raise ValueError('Excess rows relative to registered release')
    if rows != protocol['expected_raw_rows'] or len(countries) != protocol['expected_countries']:
        raise ValueError('Official release coverage differs from protocol')
    if [min(years), max(years)] != protocol['raw_years'] or len(years) != 37:
        raise ValueError('Unexpected calendar-year coverage')
    if any(max(vals) - min(vals) + 1 != len(vals) for vals in spans.values()):
        raise ValueError('Country-year roster contains gaps; no imputation permitted')
    return {
        'schema': SCHEMA,
        'dataset': 'UCDP OrganizedViolenceCY',
        'version': ALLOWED_VERSION,
        'provenanceStatus': 'OFFICIAL_URL_AND_PINNED_BYTES_ONLY',
        'officialZipUrl': protocol['archive_url'],
        'officialCodebookUrl': protocol['codebook_url'],
        'archiveSha256': zip_hash, 'codebookSha256': pdf_hash,
        'csvMemberSha256': csv_hash, 'csvMember': m.filename,
        'sourceRows': rows, 'sourceCountries': len(countries),
        'yearRange': [min(years), max(years)],
        'annualCountryCounts': dict(sorted(years.items())),
        'schemaValidated': True, 'sourceChecksumMatchesPinnedProtocol': True,
        'observedSourceReleaseTimestampVerified': False,
        'independentPublicationEvidenceVerified': False,
        'historicalAsOfVerified': False,
        'modelTrained': False, 'prospectiveForecastIssued': False,
        'prospectiveEligible': False, 'evaluationEligible': False,
        'warning': 'This checks a frozen revised annual source, not its original publication timestamp or independent as-of availability.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.resolve().is_relative_to(REPOSITORY):
        raise ValueError('Never write dataset manifests inside public Git')
    if not args.out.parent.is_dir():
        raise ValueError('Create private output folder before intake')
    path = Path(__file__).with_name('protocol.json')
    protocol = json.loads(path.read_text(encoding='utf-8'))
    result = inspect(args.source_dir, protocol)
    result['registeredProtocolSha256'] = digest_file(path)
    result['inspectedLocallyAtUtc'] = dt.datetime.now(dt.timezone.utc).isoformat()
    with args.out.open('x', encoding='utf-8') as dest:
        json.dump(result, dest, ensure_ascii=False, sort_keys=True, indent=2)
        dest.write('\n')
    args.out.chmod(0o600)
    print(json.dumps({
        'result': 'OFFICIAL_SOURCE_BYTES_VERIFIED', 'manifestSha256': digest_file(args.out),
        'rows': result['sourceRows'], 'countries': result['sourceCountries'],
        'historicalAsOfVerified': False, 'prospectiveEligible': False,
    }, sort_keys=True))


if __name__ == '__main__':
    main()
