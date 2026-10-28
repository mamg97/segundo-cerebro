"""Private offline rehearsal of frozen 2027 annual scoring, never admission.

No network, canonical writes, first-release selection or origin authentication.
Real probabilities, country IDs and derived reports must stay outside Git.
"""
from __future__ import annotations
import argparse
import csv
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import io
import json
import math
import os
from pathlib import Path
import re
import zipfile
from annual_publication import canonical, make_plan, sha
from benchmark import metrics
from issue_2027_preflight import safe_private_file
from paired_country_uncertainty import descriptive_paired_ci
from prospective_draft_ledger import private_root
from sealing import utc

HERE = Path(__file__).resolve().parent
MODELS = ('frequency', 'persistence', 'markov', 'v1_memory_index', 'v2_logistic', 'interaction_table')
HEX = re.compile(r'^[0-9a-f]{64}$')


def frozen_rows(plan, policy):
    """Structural agreement is not proof of authenticated registration."""
    if (plan.get('schema') != 'psychohistory.annual_publication_plan.v1' or
            plan.get('targetYear') != 2027 or plan.get('countryCount') != 196 or
            plan.get('modelCount') != 6 or policy['models'] != list(MODELS) or
            plan.get('policySha256') != sha((HERE/'policy_2027.json').read_bytes())):
        raise ValueError('Wrong frozen annual cohort/policy')
    countries = {}
    rows = plan.get('rows', [])
    if len(rows) != 1176:
        raise ValueError('Exactly 196 countries times six models required')
    for row in rows:
        if not isinstance(row, list) or len(row) != 13:
            raise ValueError('Malformed frozen row')
        match = re.fullmatch(r'UCDP261-2027-([1-9][0-9]*)-(.+)', str(row[0]))
        if not match or match[2] not in MODELS:
            raise ValueError('Unexpected forecast identity')
        country, model = int(match[1]), match[2]
        if (row[1] != 'V2' or row[2] != policy['event_definition'] or
                row[3] != f'UCDP country_id {country}' or row[4] != 'Calendar year 2027' or
                row[5] != plan['intendedDateUtc'] or row[6] != '' or row[8] != '' or
                row[9] != 'EMITIDA_EXPERIMENTAL' or row[10] != f'ucdp261-2027-{model}' or
                row[11] != utc(plan['sourceObservedAtLocalClaim']).isoformat() or
                any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1
                    for v in (row[7], row[12]))):
            raise ValueError('Frozen row changed or already resolved')
        item = countries.setdefault(country, {})
        if model in item:
            raise ValueError('Duplicate country/model')
        item[model] = row[7]
    if len(countries) != 196 or any(set(item) != set(MODELS) for item in countries.values()):
        raise ValueError('Incomplete paired model roster')
    for row in rows:
        if row[12] != countries[int(row[0].split('-')[2])]['frequency']:
            raise ValueError('Frozen baseline disagrees')
    return countries


def load_outcomes(source_dir, pin, *, observed_now):
    """Audit pinned bytes; pin assertions cannot authenticate origin/first release."""
    fields = {'schema', 'version', 'archiveSha256', 'codebookSha256', 'capturedAtUtc'}
    if (set(pin) != fields or pin['schema'] != 'psychohistory.annual_outcome_source_pin.v1' or
            not isinstance(pin['version'], str) or not re.fullmatch(r'[0-9]{2}\.[0-9]+', pin['version']) or
            any(not isinstance(pin[k], str) or not HEX.fullmatch(pin[k])
                for k in ('archiveSha256', 'codebookSha256'))):
        raise ValueError('Explicit byte pin required; approval flags are not accepted')
    captured = utc(pin['capturedAtUtc'])
    if not utc('2028-01-01T00:00:00Z') <= captured <= utc(observed_now):
        raise ValueError('Full calendar year must end before capture; no future capture')
    archive_raw = safe_private_file(Path(source_dir)/'ucdp.zip').read_bytes()
    book_raw = safe_private_file(Path(source_dir)/'codebook.pdf').read_bytes()
    if (sha(archive_raw) != pin['archiveSha256'] or sha(book_raw) != pin['codebookSha256'] or
            not book_raw.startswith(b'%PDF-')):
        raise ValueError('Outcome archive/codebook mismatch')
    with zipfile.ZipFile(io.BytesIO(archive_raw)) as archive:
        entries = [item for item in archive.infolist() if item.filename.lower().endswith('.csv')]
        if len(entries) != 1 or not 0 < entries[0].file_size <= 20_000_000:
            raise ValueError('Exactly one bounded CSV required')
        raw, member = archive.read(entries[0]), entries[0].filename
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    required = {'country_id', 'year', 'Version', 'sb_total_deaths_best'}
    if (not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames)) or
            not required.issubset(reader.fieldnames)):
        raise ValueError('Missing/duplicate annual source columns')
    seen, target, missing = set(), {}, set()
    for row in reader:
        if None in row or any(v is None for v in row.values()):
            raise ValueError('Malformed CSV record')
        if (not re.fullmatch(r'[1-9][0-9]*', row['country_id']) or
                not re.fullmatch(r'[0-9]{4}', row['year']) or row['Version'] != pin['version']):
            raise ValueError('Invalid identity/year/version')
        cid, year = int(row['country_id']), int(row['year'])
        if (cid, year) in seen:
            raise ValueError('Duplicate country-year; never aggregate duplicates')
        seen.add((cid, year))
        value = row['sb_total_deaths_best']
        if value in ('', 'NA'):
            outcome = None
        else:
            try:
                count = Decimal(value)
            except InvalidOperation as error:
                raise ValueError('Invalid deaths count') from error
            if not count.is_finite() or count < 0 or count != count.to_integral_value():
                raise ValueError('Noninteger/negative/nonfinite deaths count')
            outcome = int(count >= 25)
        if year == 2027:
            if outcome is None:
                missing.add(cid)
            else:
                target[cid] = outcome
    if not target and not missing:
        raise ValueError('No 2027 observations; release does not cover target year')
    return target, missing, dict(archiveSha256=sha(archive_raw), codebookSha256=sha(book_raw),
                                 csvSha256=sha(raw), csvMember=member, version=pin['version'],
                                 capturedAtUtc=captured.isoformat(),
                                 officialOriginVerified=False, firstReleaseVerified=False)


def compare(countries, outcomes, missing):
    """One paired observation per country, not one per forecast model."""
    roster = set(countries)
    resolved = sorted(roster & set(outcomes))
    scored = [dict(country=cid, year=2027, target=outcomes[cid], **countries[cid]) for cid in resolved]
    result = dict(coverage=dict(frozenCountries=len(roster), resolvedCountries=len(resolved),
                               pairedFraction=len(resolved)/len(roster),
                               absentCountryIds=sorted(roster-set(outcomes)-missing),
                               missingValueCountryIds=sorted(roster & missing),
                               extraSourceCountryIds=sorted((set(outcomes)|missing)-roster),
                               imputedOutcomes=0, pairedModels=list(MODELS)),
                  models={model: metrics(scored, model) for model in MODELS}, primary=None)
    if scored:
        a, b = (result['models'][m]['brier'] for m in ('v2_logistic', 'frequency'))
        result['primary'] = dict(challenger='v2_logistic', baseline='frequency',
                                 brierDifference=a-b, brierSkill=1-a/b if b > 0 else None,
                                 countryBootstrapSensitivity=(descriptive_paired_ci(
                                     scored, comparison='frequency') if len(scored) >= 3 else None))
    return result


def run(*, candidate_path, bundle, plan_path, source_dir, pin_path):
    plan_raw = safe_private_file(plan_path).read_bytes()
    plan = json.loads(plan_raw)
    expected = make_plan(candidate_path, bundle, spreadsheet_id=plan['spreadsheetId'],
                         issue_date=plan['intendedDateUtc'],
                         source_observed_at=plan['sourceObservedAtLocalClaim'])
    if canonical(plan) != canonical(expected):
        raise ValueError('Plan differs from original frozen candidate/commitment')
    countries = frozen_rows(plan, json.loads((HERE/'policy_2027.json').read_text()))
    pin_raw = safe_private_file(pin_path).read_bytes()
    outcomes, missing, source = load_outcomes(source_dir, json.loads(pin_raw),
                                             observed_now=datetime.now(timezone.utc).isoformat())
    return dict(schema='psychohistory.annual_scoring_rehearsal.v1',
                status='OFFLINE_CANDIDATE_NOT_ADMITTED', targetYear=2027,
                planSha256=sha(plan_raw), policySha256=plan['policySha256'],
                sourcePinSha256=sha(pin_raw), evaluatorSha256=sha(Path(__file__).read_bytes()),
                source=source, **compare(countries, outcomes, missing),
                forecastIssued=False, canonicalRowsResolved=False, evaluationEligible=False,
                predictiveSkillDemonstrated=False,
                warning='Offline arithmetic only. Independently verify original registration, '
                        'official first full-year release and authenticated retrieval before admission. '
                        'Country bootstrap ignores regional dependence; one annual cohort cannot '
                        'establish skill across years. Later revisions require separate reports.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    private_root(args.out.parent)
    if args.out.exists() or args.out.is_symlink() or not args.out.parent.is_dir():
        parser.error('Use a new private output beneath an existing directory')
    config = json.loads(safe_private_file(args.config).read_text())
    if set(config) != {'candidate_path', 'bundle', 'plan_path', 'source_dir', 'pin_path'}:
        parser.error('Only explicit private inputs allowed; no admission flags')
    result = run(**config)
    fd = os.open(args.out, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as output:
        output.write(canonical(result)); output.flush(); os.fsync(output.fileno())
    print(json.dumps(dict(status=result['status'], evaluationEligible=False,
                          resolvedCountries=result['coverage']['resolvedCountries'])))


if __name__ == '__main__':
    main()
