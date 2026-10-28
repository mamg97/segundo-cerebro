"""Prepare immutable weekly-reference bundles and check readback consistency.

No network or canonical writes. Hashes/JSON consistency do not prove source
origin, actual inscription, receipt validity or predictive skill.
"""
import argparse
from datetime import date, datetime, timedelta, timezone
from fractions import Fraction
import hashlib
import json
import math
import statistics
from pathlib import Path
import secrets
import subprocess

from macro_claims import claims_archive
from prospective_draft_ledger import private_root
from weekly_claims import make_case, snapshot

HERE = Path(__file__).resolve().parent
POLICY = HERE/'weekly_reference_policy_v1.json'
HEADER = ['prediccion_id','vertiente','fenomeno','region','horizonte','fecha_emision',
          'fecha_resolucion','probabilidad','resultado','estado','modelo_version','as_of','baseline_prob']


def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def utc(value):
    t = datetime.fromisoformat(value.replace('Z','+00:00')) if isinstance(value,str) else value
    if not isinstance(t,datetime) or t.tzinfo is None:
        raise ValueError('Timezone-aware timestamp required')
    return t.astimezone(timezone.utc)


def targets(policy):
    first = date.fromisoformat(policy['first_target_week'])
    return [(first+timedelta(weeks=i)).isoformat() for i in range(policy['target_count'])]


def issue_window(target,policy):
    day = date.fromisoformat(target)+timedelta(days=policy['issue_offset_days_from_target'])
    return tuple(datetime(day.year,day.month,day.day,h,tzinfo=timezone.utc) for h in
                 (policy['issue_window_start_hour_utc'],policy['issue_window_end_hour_utc']))


def prepare(rows,*,target,captured_at,release_date,now,source_sha256,policy,existing_ids=()):
    if target not in targets(policy):
        raise ValueError('Target outside fixed cohort')
    capture,now = utc(captured_at),utc(now)
    start,end = issue_window(target,policy)
    out = dict(schema='weekly-reference-plan-v1',target_week=target,forecast_issued=False,
               source_origin_verified=False,policy_sha256=sha(canonical(policy)),
               issue_window_start=start.isoformat(),issue_window_end=end.isoformat())
    if now < start:
        return dict(out,status='NOT_DUE')
    if now >= end:
        return dict(out,status='OMITTED_WINDOW_CLOSED')
    ids = [f'ICSA-WEEKLY-{target}-{model}' for model in policy['models']]
    if set(ids)&set(existing_ids):
        return dict(out,status='RECOVERY_REQUIRED_EXISTING_ID')
    if capture.date()!=start.date() or capture>now:
        raise ValueError('Source capture must be observed today before preparation')
    release = date.fromisoformat(release_date)
    if release<=start.date():
        return dict(out,status='OMITTED_RELEASE_NOT_AFTER_ISSUE_DAY')
    values = snapshot(rows,start.date().isoformat())
    base = (date.fromisoformat(target)-timedelta(weeks=1)).isoformat()
    if target in values:
        return dict(out,status='OMITTED_TARGET_ALREADY_AVAILABLE')
    if not values or max(values)!=base:
        return dict(out,status='BLOCKED_BASE_WEEK_MISMATCH')
    first = {}
    for row in rows:
        first.setdefault(row['period_start_date'],row)
    history = []
    earliest = (date.fromisoformat(target)-timedelta(weeks=policy['training_calendar_weeks'])).isoformat()
    for old_base in sorted(first):
        old_target = (date.fromisoformat(old_base)+timedelta(weeks=1)).isoformat()
        if not earliest<=old_target<target:
            continue
        case = make_case(rows,first,date.fromisoformat(old_base))
        if case['status']=='ELIGIBLE' and 'label_value' in case and case['label_available_on']<=start.date().isoformat():
            history.append(case)
    if len(history)<policy['minimum_training_cases']:
        return dict(out,status='BLOCKED_INSUFFICIENT_TRAINING',training_n=len(history))
    k = sum(r['label_value']-r['base_value']>=policy['event_threshold'] for r in history)
    prob = Fraction(k+policy['frequency_prior_alpha'],
                    len(history)+policy['frequency_prior_alpha']+policy['frequency_prior_beta'])
    threshold = values[base]+policy['event_threshold']
    planned = []
    for ident,model in zip(ids,policy['models']):
        planned.append([ident,'V2',f'First DOL advance SA initial claims >= frozen threshold {threshold}',
                        'United States',f'Week ending {target}; unpublished release nowcast',
                        '',release_date,float(prob) if model=='frequency' else 0.0,'',
                        'EMITIDA_REFERENCIA_EXPERIMENTAL',f"{policy['pilot_id']}-{model}",capture.isoformat(),0.0])
    return dict(out,status='PREPARED_NOT_ISSUED',source_sha256=source_sha256,
                captured_at=capture.isoformat(),base_week=base,base_value=values[base],
                frozen_threshold=threshold,training_n=len(history),training_events=k,
                frequency_fraction=str(prob),header=HEADER,rows=planned)


def materialize_request(plan,requested_at):
    """Assign execution metadata only; the committed scientific fields stay fixed."""
    instant=utc(requested_at)
    if plan.get('status')!='PREPARED_NOT_ISSUED' or not utc(plan['issue_window_start'])<=instant<utc(plan['issue_window_end']):
        raise ValueError('Actual request must be inside issuance window')
    if utc(plan['captured_at'])>instant or any(r[5]!='' for r in plan['rows']):
        raise ValueError('Request precedes source or timestamp was already assigned')
    rows=[r[:] for r in plan['rows']]
    for row in rows:row[5]=instant.isoformat()
    return rows


def normalize(rows):
    result = []
    for row in rows:
        values = list(row)
        if len(values)>13 and any(x not in ('',None) for x in values[13:]):
            raise ValueError('Unexpected nonempty extra columns')
        values = [('' if x is None else x) for x in values[:13]]
        values += ['']*(13-len(values))
        result.append(values)
    while result and not any(x!='' for x in result[-1]):
        result.pop()
    return result


def audit_readback(plan,before,after,*,requested_at=None):
    if plan.get('status')!='PREPARED_NOT_ISSUED':
        raise ValueError('Only prepared plans may be audited')
    planned=plan.get('rows',[])
    expected={f"ICSA-WEEKLY-{plan['target_week']}-{m}" for m in ('frequency','persistence')}
    if plan.get('header')!=HEADER or len(planned)!=2 or any(len(r)!=13 for r in planned):
        raise ValueError('Exactly two complete planned model rows required')
    if {r[0] for r in planned}!=expected:
        raise ValueError('Unexpected planned IDs')
    if any(type(r[7]) not in (int,float) or not math.isfinite(r[7]) or not 0<=r[7]<=1 for r in planned):
        raise ValueError('Invalid planned probability')
    if next(r for r in planned if r[0].endswith('-persistence'))[7]!=0:
        raise ValueError('Persistence probability changed')
    before,after = normalize(before),normalize(after)
    if not before or before[0]!=HEADER or after[:len(before)]!=before:
        raise ValueError('Existing canonical content changed')
    old_ids = [r[0] for r in before[1:]]
    if len(old_ids)!=len(set(old_ids)) or any(not x for x in old_ids):
        raise ValueError('Ambiguous existing IDs')
    if any(r[0] in old_ids for r in plan['rows']):
        raise ValueError('Planned ID already existed')
    if requested_at is None:
        raise ValueError('Observed request timestamp required')
    expected_rows=materialize_request(plan,requested_at)
    if after[len(before):]!=normalize(expected_rows):
        raise ValueError('Incomplete or unexpected canonical append')
    return dict(status='CONSISTENT_READBACK_ONLY',forecast_issued=False,
                source_origin_verified=False,receipt_validity_verified=False,
                previous_rows=len(before)-1,new_rows=len(plan['rows']),
                request_timestamp_claim=utc(requested_at).isoformat(),
                before_sha256=sha(canonical(before)),after_sha256=sha(canonical(after)))


def check_receipt_interval(plan,before_timestamp,after_timestamp,*,requested_at=None):
    start,end = utc(plan['issue_window_start']),utc(plan['issue_window_end'])
    a,b = utc(before_timestamp),utc(after_timestamp)
    if not start<=a<=b<end:
        raise ValueError('Receipt interval does not bound registration inside window')
    if requested_at is not None and not a<=utc(requested_at)<=b:
        raise ValueError('Request timestamp is not between verified receipts')
    return dict(start=a.isoformat(),end=b.isoformat(),cryptographic_verification_required=True,
                exact_database_inscription_time_not_established=True)


def resolution_candidate(plan,*,target,value,release_at,captured_at,source_pdf):
    if target!=plan['target_week'] or isinstance(value,bool) or not isinstance(value,int) or value<0:
        raise ValueError('Wrong target or invalid advance count')
    release,capture = utc(release_at),utc(captured_at)
    if release<=utc(plan['issue_window_end']) or not release<=capture<=release+timedelta(hours=48):
        raise ValueError('Invalid first-release capture interval')
    if not source_pdf.startswith(b'%PDF-'):
        raise ValueError('Original PDF bytes required')
    y = int(value>=plan['frozen_threshold'])
    return dict(status='RESOLUTION_CANDIDATE_NOT_VERIFIED',forecast_issued=False,
                observed_target=target,value=value,outcome=y,release_at=release.isoformat(),
                captured_at=capture.isoformat(),source_pdf_sha256=sha(source_pdf),
                scores={r[0]:(r[7]-y)**2 for r in plan['rows']},
                actual_issuance_and_first_dol_value_require_observed_origin=True)


def cohort_review(entries,policy):
    """Consistency-only summary: two model rows are ONE target observation."""
    allowed=set(targets(policy));seen=set();resolved=[];omitted=0
    for item in entries:
        target=item['target_week']
        if target not in allowed or target in seen:
            raise ValueError('Unknown or duplicate cohort target')
        seen.add(target)
        if item['status']=='OMITTED':
            omitted+=1
            continue
        if item['status']!='VERIFIED_RESOLUTION' or type(item.get('outcome')) is not int or item['outcome'] not in (0,1):
            raise ValueError('Only separately verified resolutions may be summarized')
        probs=item['probabilities']
        if set(probs)!=set(policy['models']) or probs['persistence']!=0:
            raise ValueError('Unexpected model or persistence reference')
        if any(type(p) not in (int,float) or not math.isfinite(p) or not 0<=p<=1 for p in probs.values()):
            raise ValueError('Invalid probability')
        resolved.append(item)
    n=len(resolved);k=sum(r['outcome'] for r in resolved)
    scores={m:statistics.fmean((r['probabilities'][m]-r['outcome'])**2 for r in resolved) if n else None for m in policy['models']}
    complete=len(seen)==len(allowed)
    enough=n>=policy['minimum_resolved_targets'] and min(k,n-k)>=policy['minimum_each_outcome']
    relative=(1-scores['frequency']/scores['persistence']) if n and scores['persistence'] else None
    passes=complete and enough and relative is not None and relative>=float(policy['minimum_relative_brier_improvement'])
    return dict(status='COHORT_CONSISTENCY_SUMMARY_ONLY',target_count=len(allowed),resolved_targets=n,
                omitted_targets=omitted,pending_targets=len(allowed)-len(seen),events=k,
                brier=scores,relative_improvement=relative,passes_predefined_observed_rule=passes,
                predictive_skill_demonstrated=False,independence_demonstrated=False,
                actual_source_and_issuance_origin_must_be_verified_separately=True)


def main():
    a = argparse.ArgumentParser(description=__doc__)
    for key in ['claims','existing_ids','output']:
        a.add_argument('--'+key.replace('_','-'),type=Path,required=True)
    for key in ['source_sha256','captured_at','target','release_date']:
        a.add_argument('--'+key.replace('_','-'),required=True)
    args = a.parse_args()
    policy = json.loads(POLICY.read_text())
    source = args.claims.read_bytes()
    rows = claims_archive(source,args.source_sha256)
    plan = prepare(rows,target=args.target,captured_at=args.captured_at,
                   release_date=args.release_date,now=datetime.now(timezone.utc),
                   source_sha256=args.source_sha256,policy=policy,
                   existing_ids=json.loads(args.existing_ids.read_text()))
    private_root(args.output.parent)
    args.output.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    args.output.mkdir(mode=0o700)
    def write(name,raw):
        with (args.output/name).open('xb') as f:
            f.write(raw)
    write('plan.json',canonical(plan))
    write('policy.json',canonical(policy))
    if plan['status']=='PREPARED_NOT_ISSUED':
        write('source.zip',source)
        commitment = dict(schema='weekly-reference-commitment-v1',salt_hex=secrets.token_hex(32),plan=plan)
        write('commitment.json',canonical(commitment))
        query = subprocess.run(['openssl','ts','-query','-data',str(args.output/'commitment.json'),
                                '-sha256','-cert'],check=True,capture_output=True).stdout
        write('commitment.tsq',query)
    print(json.dumps(dict(status=plan['status'],forecast_issued=False)))

if __name__=='__main__':
    main()
