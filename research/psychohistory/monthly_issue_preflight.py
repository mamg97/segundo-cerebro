"""Bind monthly protocol, source receipt, draft receipt and issuance window.

Read-only preflight. No caller-provided success reports, clock override, network,
ledger mutation, canonical publication or ISSUED transition. Source provenance
and actual registration remain separate from timestamped byte existence.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path

import alfred_asof_audit as asof
from independent_timestamp import verify_detached, verify_independent_precommitment
from macro_monthly_reference import calculate, PROTOCOL_FILE
from macro_retrospective import shift_month
from prospective_receipt_gate import private_regular_file
from sealing import utc

PROTOCOL_SHA256 = '8dc274885140dae905204c40c4a836c359c66aaac5546892d020dd6fd5be19cd'


def window(target):
    protocol = json.loads(PROTOCOL_FILE.read_text())
    parsed = date.fromisoformat(target)
    if parsed.isoformat() != target or parsed.day != 1 or not protocol['future_target_start'] <= target <= protocol['future_target_end']:
        raise ValueError('Target outside frozen monthly cohort')
    previous = date.fromisoformat(shift_month(target, -1))
    def at(day, clock):
        return utc(previous.replace(day=day).isoformat()+'T'+clock+'Z')
    return dict(source_start=at(protocol['source_capture_start_day'], '00:00:00'),
                cut=at(protocol['vintage_day'], protocol['vintage_end_utc']),
                start=at(protocol['issue_day'], protocol['issuance_window_start_utc']),
                deadline=at(protocol['issue_day'], protocol['issuance_deadline_utc']))


def check_timing(target, payload, source_timestamp, forecast_timestamp, observed_at):
    """Pure rule check. The production wrapper supplies its own current clock."""
    times = window(target)
    source, forecast, now = map(utc, (source_timestamp, forecast_timestamp, observed_at))
    if not times['source_start'] <= source <= times['cut']:
        raise ValueError('Source commitment outside pre-cut capture window')
    if utc(payload['asOf']) != times['cut'] or utc(payload['issuedAt']) != times['deadline']:
        raise ValueError('Draft cutoff or planned deadline differs from protocol')
    if not times['start'] <= forecast <= now <= times['deadline']:
        raise ValueError('Forecast commitment/check outside issuance window or future receipt')
    if utc(payload['resolutionAt']) < utc(shift_month(target, 1)+'T00:00:00Z'):
        raise ValueError('Resolution cannot precede end of target month')
    return {key: value.isoformat() for key, value in times.items()}


def verify_monthly_preflight(*, target, source_request, source_receipt, source_chain,
                             crls, independent_catalog, **draft_args):
    frozen = PROTOCOL_FILE.read_bytes()
    if hashlib.sha256(frozen).hexdigest() != PROTOCOL_SHA256:
        raise ValueError('Frozen monthly protocol changed')
    for field in ('model_protocol', 'resolution_protocol'):
        if private_regular_file(draft_args[field]).read_bytes() != frozen:
            raise ValueError('Model and resolution must use exact frozen monthly contract')
    times = window(target)
    if not times['start'] <= datetime.now(timezone.utc) <= times['deadline']:
        raise ValueError('Monthly issuance window is not open')

    forecast = verify_independent_precommitment(crls=crls, independent_catalog=independent_catalog,
                                               **draft_args)
    source = verify_detached(content=draft_args['data_archive'], request=source_request,
                             receipt=source_receipt, chain=source_chain,
                             trust_root=draft_args['trust_root'], crls=crls,
                             independent_catalog=independent_catalog)
    raw = private_regular_file(draft_args['data_archive']).read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    if source['inputSha256']['content'] != source_hash or forecast['artifactSha256']['dataSha256'] != source_hash:
        raise ValueError('Source receipt and forecast bind different data')
    payload = json.loads(private_regular_file(Path(draft_args['prepared_dir'])/'payload.json').read_text())
    if payload.get('targetMonth') != target or payload['modelVersion'] != json.loads(frozen)['id']:
        raise ValueError('Draft targets another month or model')
    archive = asof.audit(raw, source_hash, json.loads(frozen)['source_start'], shift_month(target, -2))
    if not times['source_start'].date().isoformat() <= archive['exported_on'] <= times['cut'].date().isoformat():
        raise ValueError('Archive export outside capture window')
    if archive['exported_on'] > utc(source['timestamp']).date().isoformat():
        raise ValueError('Archive claims export after its independent timestamp')
    values = {r['reference_month']:r['rate_percent'] for r in asof.select(archive, archive['exported_on'])
              if r['status'] == 'AVAILABLE'}
    calculated = calculate(values, target)
    if (calculated['status'] != 'CALCULATED_NOT_ISSUED' or
            payload['probability'] != calculated['probability'] or payload['baselineProbability'] != 0 or
            payload.get('baseMonth') != calculated['base_month'] or
            Decimal(str(payload.get('baseRate'))) != Decimal(calculated['base_rate'])):
        raise ValueError('Draft differs from recalculated monthly reference')
    timing = check_timing(target, payload, source['timestamp'], forecast['rfc3161Timestamp'],
                          datetime.now(timezone.utc).isoformat())
    # Re-bind after calculation; reports alone are never supplied as approvals.
    repeated = verify_independent_precommitment(crls=crls, independent_catalog=independent_catalog,
                                               **draft_args)
    def identity(proof):
        # A fresh successful verification has a new observation time, while
        # every signed/artifact binding must remain identical.
        copied = json.loads(json.dumps(proof))
        copied['independentTimestamp'].pop('checkedAtUtc', None)
        return copied
    if identity(repeated) != identity(forecast):
        raise ValueError('Forecast evidence changed during preflight')
    check_timing(target, payload, source['timestamp'], forecast['rfc3161Timestamp'],
                 datetime.now(timezone.utc).isoformat())
    return dict(schema='psychohistory.monthly_issue_preflight.v1',
                status='TEMPORAL_AND_CALCULATION_BINDINGS_VERIFIED_NOT_ISSUED',
                targetMonth=target, timing=timing, plannedDeadlineUtc=timing['deadline'],
                externalCommitmentAtUtc=forecast['rfc3161Timestamp'],
                sourceBytesExistenceBeforeCutVerified=True, referenceRecalculated=True,
                sourceReceiptSha256=source['inputSha256']['receipt'],
                forecastReceiptSha256=forecast['receiptSha256'], entrySha256=forecast['entrySha256'],
                sourceSha256=source_hash, protocolSha256=PROTOCOL_SHA256,
                sourceOriginIndependentlyVerified=False, canonicalRegistrationVerified=False,
                forecastActuallyIssuedAtClaimedTimeVerified=False,
                prospectiveEligible=False, evaluationEligible=False,
                warning='Independent commitment time is not actual publication time; '
                        'official source provenance and canonical append-only registration still required.')
