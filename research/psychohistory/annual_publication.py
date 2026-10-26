"""Offline plan and evidence audit for the frozen annual cohort.

No network, canonical write, caller-supplied approval flags or ISSUED transition.
A consistent snapshot proves byte agreement, not authenticated provider origin.
The operator must independently observe source retrieval and canonical writes.
"""
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path

from cohort_2027_precommit import checked_candidate, verify_bundle
from independent_timestamp import verify_detached
from prospective_receipt_gate import private_regular_file
from sealing import utc

HEADER = ['prediccion_id', 'vertiente', 'fenomeno', 'region', 'horizonte',
          'fecha_emision', 'fecha_resolucion', 'probabilidad', 'resultado',
          'estado', 'modelo_version', 'as_of', 'baseline_prob']
SCHEMA = 'psychohistory.annual_publication_plan.v1'
TARGET_START = '2027-01-01T00:00:00Z'
TAB = 'PsicoPredicciones'


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=False, allow_nan=False) + '\n').encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def make_plan(candidate_path, bundle, *, spreadsheet_id, issue_date, source_observed_at):
    """Prepare rows, never issue. The local date is an intended UTC date only."""
    source, report, policy, _ = checked_candidate(candidate_path)
    verify_bundle(source, bundle)
    day = date.fromisoformat(issue_date)
    if day.isoformat() != issue_date or not isinstance(spreadsheet_id, str) or not spreadsheet_id.strip():
        raise ValueError('Explicit canonical identity and ISO date required')
    observed = utc(source_observed_at)
    if observed.date() > day or day >= utc(TARGET_START).date():
        raise ValueError('Source observation/issuance must precede annual horizon')
    rows = []
    # Stable identity/order across retries; include every model, no cherry picking.
    for item in sorted(report['candidates'], key=lambda c: c['countryId']):
        for model in policy['models']:
            rows.append([
                f"UCDP261-2027-{item['countryId']}-{model}", 'V2',
                policy['event_definition'], f"UCDP country_id {item['countryId']}",
                'Calendar year 2027', issue_date, '', item['probabilities'][model], '',
                'EMITIDA_EXPERIMENTAL', f'ucdp261-2027-{model}',
                observed.isoformat(), item['probabilities']['frequency']])
    return dict(schema=SCHEMA, stage='PLANNED_NOT_ISSUED', targetYear=2027,
                spreadsheetId=spreadsheet_id, tab=TAB, header=HEADER,
                candidateSha256=sha(source.read_bytes()),
                commitmentSha256=sha((Path(bundle)/'commitment.bin').read_bytes()),
                requestSha256=sha((Path(bundle)/'request.tsq').read_bytes()),
                policySha256=sha(Path(__file__).with_name('policy_2027.json').read_bytes()),
                sourceObservedAtLocalClaim=observed.isoformat(), intendedDateUtc=issue_date,
                countryCount=len(report['candidates']), modelCount=len(policy['models']),
                rows=rows, forecastIssued=False, resolutionDateKnown=False,
                warning='Rows are a private publication plan, not records already written. '
                        'as_of denotes source observation, features remain through 2025. '
                        'First official release covering full 2027 determines resolution; date unknown.')


def table_snapshot(response, spreadsheet_id):
    """Read one complete A:M grid response. Origin/full-read scope is external.

    Google omits trailing empty cells/rows. Pad within declared row count, but
    reject split/offset reads, hidden extra columns, formulas and invalid types.
    """
    if response.get('isError'):
        raise ValueError('Connector read failed')
    data = response.get('structuredContent', {})
    if data.get('spreadsheetId') != spreadsheet_id:
        raise ValueError('Wrong spreadsheet')
    sheets = data.get('sheets', [])
    if len(sheets) != 1 or sheets[0].get('properties', {}).get('title') != TAB:
        raise ValueError('Need the complete prediction table alone')
    sheet = sheets[0]
    grid = sheet['properties'].get('gridProperties', {})
    capacity = grid.get('rowCount')
    if type(capacity) is not int or not 1 <= capacity <= 10000 or grid.get('columnCount') != 13:
        raise ValueError('Unexpected canonical grid shape')
    chunks = sheet.get('data', [])
    if len(chunks) != 1 or chunks[0].get('startRow', 0) != 0 or chunks[0].get('startColumn', 0) != 0:
        raise ValueError('Offset or fragmented read cannot establish a whole-table diff')
    records = chunks[0].get('rowData', [])
    if len(records) > capacity:
        raise ValueError('Read exceeds grid')
    rows = []
    for record in records:
        cells = record.get('values', [])
        if len(cells) > 13:
            raise ValueError('Extra columns')
        row = []
        for cell in cells:
            entered = cell.get('userEnteredValue', {})
            if not entered:
                row.append('')
            elif set(entered) == {'stringValue'} and isinstance(entered['stringValue'], str):
                row.append(entered['stringValue'])
            elif set(entered) == {'numberValue'} and type(entered['numberValue']) in (float, int):
                row.append(entered['numberValue'])
            else:
                raise ValueError('Formula, boolean or unsupported canonical cell')
        rows.append(row + [''] * (13-len(row)))
    if not rows or rows[0] != HEADER:
        raise ValueError('Canonical header differs')
    while len(rows) > 1 and all(v == '' for v in rows[-1]):
        rows.pop()
    if any(all(v == '' for v in r) for r in rows[1:]):
        raise ValueError('Interior gap in append-only table')
    ids = [r[0] for r in rows[1:]]
    if any(not isinstance(x, str) or not x for x in ids) or len(ids) != len(set(ids)):
        raise ValueError('Missing or duplicate forecast ID')
    return rows, capacity


def check_append(plan, before, after):
    previous, capacity_before = table_snapshot(before, plan['spreadsheetId'])
    current, capacity_after = table_snapshot(after, plan['spreadsheetId'])
    additions = plan['rows']
    old_ids = {row[0] for row in previous[1:]}
    if any(row[0] in old_ids for row in additions):
        raise ValueError('Already present: recover original evidence, do not append again')
    expected = previous + additions
    if capacity_after < len(expected) or capacity_after < capacity_before:
        raise ValueError('Insufficient or reduced canonical capacity')
    # JSON number 0/0.0 may normalize across Sheets; bool/formula cells were
    # rejected above. Reject nonfinite values, then compare exact numeric values.
    canonical(current)
    canonical(expected)
    if current != expected:
        raise ValueError('Incomplete append or changed existing/new prediction')
    return dict(firstRow=len(previous)+1, lastRow=len(expected),
                rowsAppended=len(additions), existingRowsPreserved=len(previous)-1)


def check_interval(plan, *, source_times, cohort_time, lower, upper, observed_now):
    times = [utc(t) for t in source_times]
    lo, hi, cohort, now = map(utc, (lower, upper, cohort_time, observed_now))
    if len(times) != 2 or not all(t <= lo for t in times):
        raise ValueError('Both original source files must exist before registration intent')
    if not cohort <= lo <= hi <= now or hi >= utc(TARGET_START):
        raise ValueError('Invalid signed order, future evidence or missed annual horizon')
    if not lo.date().isoformat() == hi.date().isoformat() == plan['intendedDateUtc']:
        raise ValueError('Canonical date not bounded by both independent timestamps')
    if utc(plan['sourceObservedAtLocalClaim']) > min(times):
        raise ValueError('Claimed source capture follows its source seal')
    return [lo.isoformat(), hi.isoformat()]


def audit_evidence(*, candidate_path, bundle, plan_path, observation_path,
                   source_dir, stamps, trust):
    """Recheck original bytes/receipts, not success booleans saved by a caller.

    stamps maps source_zip/source_codebook/cohort/intent/observation to request,
    receipt, chain paths. trust supplies pinned-root/catalog/CRL files. Result
    deliberately cannot attest HTTP or connector origin and never sets ISSUED.
    """
    from source_release_intake import inspect
    plan_file = private_regular_file(plan_path)
    observation_file = private_regular_file(observation_path)
    plan_raw, obs_raw = plan_file.read_bytes(), observation_file.read_bytes()
    plan, obs = json.loads(plan_raw), json.loads(obs_raw)
    expected = make_plan(candidate_path, bundle, spreadsheet_id=plan['spreadsheetId'],
                         issue_date=plan['intendedDateUtc'],
                         source_observed_at=plan['sourceObservedAtLocalClaim'])
    if canonical(plan) != canonical(expected):
        raise ValueError('Publication plan differs from frozen cohort')
    protocol = json.loads(Path(__file__).with_name('protocol.json').read_text())
    for name in ('ucdp.zip', 'codebook.pdf'):
        private_regular_file(Path(source_dir)/name)
    intake = inspect(source_dir, protocol)
    contents = dict(source_zip=Path(source_dir)/'ucdp.zip',
                    source_codebook=Path(source_dir)/'codebook.pdf',
                    cohort=Path(bundle)/'commitment.bin', intent=plan_file,
                    observation=observation_file)
    if set(stamps) != set(contents) or set(trust) != {'trust_root', 'crls', 'independent_catalog'}:
        raise ValueError('All five independent receipts and explicit trust inputs required')
    if Path(stamps['cohort']['request']).resolve() != (Path(bundle)/'request.tsq').resolve():
        raise ValueError('Use original frozen cohort request')
    proofs = {}
    for name, content in contents.items():
        if set(stamps[name]) != {'request', 'receipt', 'chain'}:
            raise ValueError('Unexpected timestamp inputs')
        proofs[name] = verify_detached(content=content, **stamps[name], **trust)
        if proofs[name]['inputSha256']['content'] != sha(content.read_bytes()):
            raise ValueError('Content changed during timestamp verification')
    if plan_file.read_bytes() != plan_raw or observation_file.read_bytes() != obs_raw:
        raise ValueError('Evidence changed during verification')
    if obs.get('schema') != 'psychohistory.annual_connector_observation.v1' or obs.get('planSha256') != sha(plan_raw):
        raise ValueError('Observation belongs to another publication intent')
    append = check_append(plan, obs['before'], obs['after'])
    interval = check_interval(plan, source_times=[proofs[n]['timestamp'] for n in ('source_zip','source_codebook')],
                              cohort_time=proofs['cohort']['timestamp'], lower=proofs['intent']['timestamp'],
                              upper=proofs['observation']['timestamp'], observed_now=datetime.now(timezone.utc).isoformat())
    # Recheck cohort/code and source bindings after all crypto operations.
    if make_plan(candidate_path, bundle, spreadsheet_id=plan['spreadsheetId'],
                 issue_date=plan['intendedDateUtc'], source_observed_at=plan['sourceObservedAtLocalClaim']) != expected:
        raise ValueError('Cohort changed during audit')
    if inspect(source_dir, protocol) != intake:
        raise ValueError('Source changed during audit')
    return dict(schema='psychohistory.annual_registration_evidence.v1',
                status='BYTE_AND_TIME_EVIDENCE_CONSISTENT_ORIGIN_ATTESTATION_REQUIRED',
                append=append, registrationIntervalUtc=interval, proofs=proofs,
                planSha256=sha(plan_raw), observationSha256=sha(obs_raw),
                authenticatedConnectorOriginVerified=False, officialRetrievalOriginVerified=False,
                forecastIssued=False, evaluationEligible=False, predictiveSkillDemonstrated=False,
                warning='Requires directly observed authenticated full-table reads/write and official HTTPS '
                        'retrieval. A timestamp cannot authenticate provider origin; local JSON cannot issue forecasts.')


def main():
    import argparse
    import os
    from prospective_draft_ledger import private_root
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan', 'audit'])
    parser.add_argument('--config', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    config = json.loads(private_regular_file(args.config).read_text())
    private_root(args.out.parent)
    if args.out.exists() or args.out.is_symlink():
        parser.error('Output must be new; preserve prior evidence')
    result = make_plan(**config) if args.action == 'plan' else audit_evidence(**config)
    fd = os.open(args.out, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as output:
        output.write(canonical(result)); output.flush(); os.fsync(output.fileno())
    print(json.dumps({'status': result.get('status', result.get('stage')),
                      'forecastIssued': False, 'evaluationEligible': False}))


if __name__ == '__main__':
    main()
