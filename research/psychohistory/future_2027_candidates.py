"""Prospective 2027 CANDIDATE computation from pinned OrganizedViolenceCY 26.1.

No future labels are fabricated. All six previously preregistered benchmark models
are fitted only on historical labels through 2025 and used with features
available in 2025 for a 2027 target. Output is NOT an issued forecast, and
never enters PsicoPredicciones without independent source and timestamp gates.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import statistics
import tempfile
import zipfile

from benchmark import audit, load_official, panel, predict_origin
from source_release_intake import inspect, digest_file
from private_archive_intake import verify_private_archive, verified_input

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
SCHEMA = 'psychohistory.ucdp_cy261_future_candidates.v1'
TARGET_YEAR = 2027
OBSERVED_THROUGH = 2025
MODELS = ('frequency', 'persistence', 'markov',
          'v1_memory_index', 'v2_logistic', 'interaction_table')


def candidate_rows(rows, protocol):
    """Pure testable model path. Byte-level source gate is enforced by main()."""
    if protocol.get('dataset_version') != '26.1' or protocol.get('raw_years') != [1989, 2025]:
        raise ValueError('Wrong preregistered source release')
    if (protocol.get('feature_lag_years') != 2 or
        protocol.get('training_label_lag_years') != 2 or
        protocol.get('threshold_deaths') != 25 or
        tuple(protocol.get('models', ())) != MODELS):
        raise ValueError('Incompatible forecast features, horizon or model specification')
    if protocol.get('minimum_history') != 5:
        raise ValueError('Unknown minimum history')
    if not rows or any(int(row['year']) > OBSERVED_THROUGH for row in rows):
        raise ValueError('Unexpected outcomes dated after the observed information cutoff')

    # A country must appear in the official 2025 roster with a contiguous
    # 2021–25 history. Neither absent future countries nor year-2026 outcomes
    # may be imputed from retrospectively known labels.
    lookup = {(int(row['country_id']), int(row['year'])): row for row in rows}
    countries = sorted(cid for cid, year in lookup if year == OBSERVED_THROUGH)
    future = []
    omitted = []
    for cid in countries:
        years = range(OBSERVED_THROUGH - protocol['minimum_history'] + 1,
                      OBSERVED_THROUGH + 1)
        if any((cid, y) not in lookup for y in years):
            omitted.append(cid)
            continue
        history = [lookup[cid, y] for y in years]
        high = [int(float(r['sb_total_deaths_best']) >= 25) for r in history]
        last = history[-1]
        # EXACTLY the same feature definitions as benchmark.panel() and
        # same baseline/regularizers via benchmark.predict_origin().
        features = [
            float(high[-1]),
            statistics.fmean(high),
            math.log1p(float(last['sb_total_deaths_best'])),
            math.log1p(float(last['ns_total_deaths_best'])),
            math.log1p(float(last['os_total_deaths_best'])),
        ]
        if any(not math.isfinite(v) for v in features):
            raise ValueError('Invalid future feature')
        future.append({
            'country': cid, 'year': TARGET_YEAR,
            'target': None, 'region': last['region'],
            'x': features, 'feature_year': OBSERVED_THROUGH,
            'last_target': high[-1],
        })

    if not future:
        raise ValueError('No eligible countries: never substitute dummy outcomes')
    training, excluded = panel(rows, protocol, target='presence', estimate_kind='best')
    if not training or max(row['year'] for row in training) != OBSERVED_THROUGH:
        raise ValueError('Historical training labels do not reach 2025')
    # predict_origin() only reads the test 'target' to copy it into the result;
    # it never fits to that column. It accepts None for yet-unseen 2027 labels.
    computed = predict_origin(training + future, TARGET_YEAR, protocol)
    if len(computed) != len(future):
        raise ValueError('Candidate cohort truncated')
    result = []
    for row in computed:
        if (row['target'] is not None or row['year'] != TARGET_YEAR or
            row['feature_year'] != OBSERVED_THROUGH or
            row['training_last_year'] != OBSERVED_THROUGH):
            raise ValueError('Future labels or feature cutoffs were contaminated')
        vals = {model: row[model] for model in MODELS}
        if any(type(v) not in (int, float) or not math.isfinite(v) or
               v < 0 or v > 1 for v in vals.values()):
            raise ValueError('Invalid predictive probability')
        result.append({
            'countryId': row['country'],
            'targetYear': TARGET_YEAR, 'featureCutoffYear': OBSERVED_THROUGH,
            'trainingLabelsThroughYear': row['training_last_year'],
            'trainingN': row['training_n'],
            'outcome': None, 'probabilities': vals,
        })
    return {'candidates': result, 'selectedCountries': len(countries),
            'excludedForMissingHistory': len(omitted),
            'historicalRowsExcludedFromTraining': excluded}


def generate_private_candidates(source_dir, protocol):
    # A caller cannot supply substitute checksums/roster expectations and then
    # have them reported as the repository's preregistered protocol.
    frozen = json.loads((HERE / 'protocol.json').read_text(encoding='utf-8'))
    if protocol != frozen:
        raise ValueError('Source protocol differs from the preregistered repository file')
    source_root = Path(source_dir).resolve()
    if source_root.is_relative_to(REPO):
        raise ValueError('Original UCDP source bytes must stay outside the public repository')
    manifest = inspect(source_dir, protocol)
    if (not manifest['schemaValidated'] or
        not manifest['sourceChecksumMatchesPinnedProtocol'] or
        manifest['version'] != '26.1'):
        raise ValueError('Exact official UCDP source gate did not pass')
    data, loaded = load_official(source_dir, protocol)
    if loaded['archive_sha256'] != manifest['archiveSha256'] or (
            loaded['codebook_sha256'] != manifest['codebookSha256']):
        raise ValueError('Inconsistent source snapshot')
    audit(data, protocol, strict=True)
    candidates = candidate_rows(data, protocol)
    return {
        'schema': SCHEMA, 'status': 'UNISSUED_SHADOW_CANDIDATES_ONLY',
        'dataset': 'UCDP OrganizedViolenceCY', 'datasetVersion': '26.1',
        'inputZipSha256': manifest['archiveSha256'],
        'inputCodebookSha256': manifest['codebookSha256'],
        'sourceMemberSha256': manifest['csvMemberSha256'],
        'protocolSha256': digest_file(HERE / 'protocol.json'),
        'modelCodeSha256': digest_file(HERE / 'benchmark.py'),
        'candidateCodeSha256': digest_file(Path(__file__)),
        'sourceIntegrityVerified': True,
        'sourcePublicationAsOfVerified': False,
        'independentTimestampVerified': False,
        'forecastIssued': False, 'prospectiveEligible': False,
        'target': 'sb_total_deaths_best >= 25 within country borders in calendar year',
        'targetYear': TARGET_YEAR, 'featuresAvailableThroughYear': OBSERVED_THROUGH,
        'benchmarkModel': 'frequency',
        'models': list(MODELS),
        'selectionRule': protocol['selection_rule'],
        'candidates': candidates['candidates'],
        'counts': {k: candidates[k] for k in (
            'selectedCountries', 'excludedForMissingHistory',
            'historicalRowsExcludedFromTraining')},
        'warning': 'Computed on a revised annual edition. No issuance, independent as-of evidence, prospective score or future outcome is claimed.',
    }


def generate_private_candidates_from_archive(archive_path, protocol):
    """Compute unissued candidates directly from an EXISTING private source bundle.

    No permanent duplicate of official bytes; strict full-MANIFEST validation
    precedes source extraction and the existing checked candidate pipeline.
    """
    archive_path = verified_input(archive_path)
    archived = verify_private_archive(archive_path, protocol)
    if (not archived['sourceChecksumMatchesPinnedProtocol'] or
            archived['sourceRows'] != protocol['expected_raw_rows'] or
            archived['sourceCountries'] != protocol['expected_countries'] or
            archived['prospectiveEligible'] or archived['prospectiveForecastIssued']):
        raise ValueError('Private source archive did not pass strict integrity gate')
    with tempfile.TemporaryDirectory(prefix='psychohistory-cy261-private-') as temp:
        source = Path(temp)
        with zipfile.ZipFile(archive_path) as zipped:
            for name, target in (('sources/ucdp.zip', 'ucdp.zip'),
                                 ('sources/codebook.pdf', 'codebook.pdf')):
                (source / target).write_bytes(zipped.read(name))
        result = generate_private_candidates(source, protocol)
    if (result['inputZipSha256'] != archived['archiveOfficialZipSha256'] or
            result['inputCodebookSha256'] != archived['archiveOfficialCodebookSha256']):
        raise ValueError('Source changed between archive verification and calculation')
    result['sourcePrivateArchiveSha256'] = archived['archiveSha256']
    result['sourcePrivateArchiveManifestEntriesVerified'] = archived['manifestEntriesVerified']
    # A privately archived source does not certify the actual forecast's issuance.
    result['forecastIssued'] = False
    result['prospectiveEligible'] = False
    return result


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    inputs = cli.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--source-dir', type=Path)
    inputs.add_argument('--private-archive', type=Path)
    cli.add_argument('--out', type=Path, required=True)
    args = cli.parse_args()
    output = args.out.absolute()
    if output.resolve().is_relative_to(REPO) or output.is_symlink() or not output.parent.is_dir():
        raise ValueError('Output must be a new file in an existing private directory')
    protocol = json.loads((HERE / 'protocol.json').read_text(encoding='utf-8'))
    report = (generate_private_candidates_from_archive(args.private_archive, protocol)
              if args.private_archive is not None else
              generate_private_candidates(args.source_dir, protocol))
    report['computedLocallyAtUtc'] = dt.datetime.now(dt.timezone.utc).isoformat()
    with output.open('x', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)
        f.write('\n')
    output.chmod(0o600)
    # Private probabilities appear ONLY in the private report.
    print(json.dumps({
        'status': report['status'], 'targetYear': TARGET_YEAR,
        'candidates': len(report['candidates']), 'forecastIssued': False,
        'prospectiveEligible': False,
        'reportSha256': digest_file(output),
    }, sort_keys=True))


if __name__ == '__main__':
    main()
