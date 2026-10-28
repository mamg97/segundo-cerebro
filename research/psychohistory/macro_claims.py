"""Weekly claims vintages + monthly unemployment; offline exploratory experiment."""
import argparse
import csv
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from fractions import Fraction
import hashlib
import io
import json
from pathlib import Path
import statistics
import zipfile
import alfred_asof_audit as asof
import alfred_initial_release_audit as initial
from macro_retrospective import shift_month

HERE=Path(__file__).resolve().parent
PROTOCOL=HERE/'macro_claims_v1.json'


def claims_archive(raw,digest):
    if hashlib.sha256(raw).hexdigest()!=digest or len(raw)>5_000_000:
        raise ValueError('Claims archive integrity failure')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if sorted(z.namelist())!=['README.txt','obs._by_real-time_period.csv']:
            raise ValueError('Unexpected claims archive')
        readme=z.read('README.txt').decode('utf-8-sig')
        for text in ['Series ID: ICSA','Output Format: Observations by Real-Time Period','Weekly, Ending Saturday','Seasonally Adjusted','Number']:
            if text not in readme:raise ValueError('Wrong claims series or units')
        reader=csv.DictReader(io.StringIO(z.read('obs._by_real-time_period.csv').decode('utf-8-sig')))
        if reader.fieldnames!=['period_start_date','ICSA','realtime_start_date','realtime_end_date']:
            raise ValueError('Unexpected claims columns')
        rows=list(reader)
    previous={};key=None;weeks=set()
    for r in rows:
        if None in r or any(v is None for v in r.values()):raise ValueError('Bad CSV')
        week=date.fromisoformat(r['period_start_date']);start=date.fromisoformat(r['realtime_start_date']);end=date.fromisoformat(r['realtime_end_date']) if r['realtime_end_date'] else None
        current=(week,start)
        if week.weekday()!=5 or start<=week or (end and end<start) or (key and current<=key):raise ValueError('Invalid claims clock')
        if week in previous and (previous[week] is None or previous[week]+timedelta(days=1)!=start):raise ValueError('Claims intervals have gap/overlap')
        if r['ICSA'] not in ('','.'):
            v=Decimal(r['ICSA'])
            if not v.is_finite() or v<=0 or v!=int(v):raise ValueError('Invalid claims count')
        previous[week]=end;key=current;weeks.add(week)
    if len(weeks)!=(max(weeks)-min(weeks)).days//7+1:raise ValueError('Missing observation week')
    return rows


def signal_at(rows,cut,p):
    selected={}
    for r in rows:
        if r['realtime_start_date']<=cut and (not r['realtime_end_date'] or cut<=r['realtime_end_date']) and r['ICSA'] not in ('','.'):
            if r['period_start_date'] in selected:raise ValueError('Ambiguous claims vintage')
            selected[r['period_start_date']]=int(r['ICSA'])
    if not selected:return None
    last=date.fromisoformat(max(selected));age=(date.fromisoformat(cut)-last).days
    if not 0<=age<=p['maximum_week_age_days']:return None
    dates=[(last-timedelta(days=7*i)).isoformat() for i in range(8)]
    if any(d not in selected for d in dates):return None
    ratio=Fraction(sum(selected[d] for d in dates[:4]),sum(selected[d] for d in dates[4:]))
    return dict(state=int(ratio>Fraction(p['claims_signal_threshold_ratio'])),ratio=str(ratio),last_week=last.isoformat())


def score(train,case,p):
    # Frozen historical labels may train only once their release is known.
    chosen=[x for x in train if x['target_month']<case['target_month'] and x['target_month']>=shift_month(case['target_month'],-p['training_window_calendar_months']) and 'y' in x and x['label_available_on']<=case['cut']]
    if len(chosen)<p['minimum_training_cases']:return None
    b=Fraction(sum(x['y'] for x in chosen)+1,len(chosen)+2)
    group=[x for x in chosen if x['signal']['state']==case['signal']['state']]
    v=(sum(x['y'] for x in group)+p['prior_strength']*b)/(len(group)+p['prior_strength'])
    return dict(probability=float(v),fraction=str(v),baseline_probability=float(b),baseline_fraction=str(b),training_n=len(chosen),matching_n=len(group),training_targets=[x['target_month'] for x in chosen])


def metrics(rows):
    scored=[x for x in rows if 'probability' in x and 'y' in x]
    out=dict(scored=len(scored),events=sum(x['y'] for x in scored))
    for k in ['probability','baseline_probability','reference_probability','persistence_probability']:
        out['brier_'+k]=statistics.fmean((x[k]-x['y'])**2 for x in scored) if scored else None
    out['passes_exploratory_rule']=bool(scored) and all(out['brier_probability']<=.95*out['brier_'+k] for k in ['baseline_probability','reference_probability']) and out['brier_probability']<out['brier_persistence_probability']
    return out


def run(claims,periods,labels,p,scorer=score,signal_provider=signal_at):
    cases=[];outputs=[]
    for t in initial.month_range(date.fromisoformat(p['training_origins_start']),date.fromisoformat(p['test_end'])):
        target=t.isoformat();month=shift_month(target,-1);cut=month[:8]+str(p['cut_day']);issue=month[:8]+str(p['issue_day'])
        snapshot={x['reference_month']:x['rate_percent'] for x in asof.select(periods,cut) if x['status']=='AVAILABLE'}
        base=shift_month(target,-2);sig=signal_provider(claims,cut,p)
        row=dict(target_month=target,cut=cut,signal=sig,status='MISSING_FEATURE')
        label=labels.get(target)
        if label and label['alfred_realtime_start_date']<=issue:raise ValueError('Future target already known')
        if snapshot and max(snapshot)==base and sig:
            row.update(status='ELIGIBLE',base_rate=snapshot[base])
            if label and label['rate_percent'] is not None:row.update(y=int(Decimal(label['rate_percent'])-Decimal(snapshot[base])>=Decimal(p['event_threshold_pp'])),label_available_on=label['alfred_realtime_start_date'])
        if target>=p['test_start']:
            out=dict(row)
            if row['status']=='ELIGIBLE':
                fit=scorer(cases,row,p)
                changes=[]
                for offset in range(-59,1):
                    end=shift_month(base,offset);start=shift_month(end,-2)
                    if end in snapshot and start in snapshot:changes.append(Decimal(snapshot[end])-Decimal(snapshot[start]))
                if fit and len(changes)>=48:
                    ref=(sum(x>=Decimal(p['event_threshold_pp']) for x in changes)+1)/(len(changes)+2)
                    out.update(fit,reference_probability=ref,persistence_probability=0.0,status='CALCULATED_NOT_ISSUED')
                else:out['status']='INSUFFICIENT_TRAINING_OR_REFERENCE'
            outputs.append(out)
        if row['status']=='ELIGIBLE':cases.append(row)
    return dict(schema=p['id'],forecast_issued=False,confirmatory=False,predictive_skill_demonstrated=False,metrics=metrics(outputs),cases=outputs,annual={y:metrics([x for x in outputs if x['target_month'][:4]==y]) for y in sorted({x['target_month'][:4] for x in outputs})})


def main():
    a=argparse.ArgumentParser(description=__doc__)
    for n in ['claims','realtime','initial','output']:a.add_argument('--'+n,required=True,type=Path)
    a.add_argument('--protocol-sha256',required=True);args=a.parse_args();raw=PROTOCOL.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=args.protocol_sha256:raise ValueError('Protocol hash required')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():raise ValueError('Private output required')
    p=json.loads(raw);claims=claims_archive(args.claims.read_bytes(),p['claims_sha256'])
    periods=asof.audit(args.realtime.read_bytes(),p['unrate_realtime_sha256'],'2011-01-01','2026-09-01')
    labels=initial.audit(args.initial.read_bytes(),p['unrate_initial_sha256'],'2011-01-01','2026-09-01')
    result=run(claims,periods,{x['reference_month']:x for x in labels['observations']},p)
    result.update(protocol_sha256=args.protocol_sha256,executed_at_utc=datetime.now(timezone.utc).isoformat(),code_sha256={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['macro_claims.py','macro_conditional_frequency.py','macro_retrospective.py','alfred_asof_audit.py','alfred_initial_release_audit.py']})
    with args.output.open('x') as f:json.dump(result,f,indent=2,allow_nan=False)
    print(json.dumps(result['metrics']))

if __name__=='__main__':main()
