"""Vintage-correct weekly release nowcast. Offline, no prospective publication."""
import argparse
from datetime import date,timedelta,datetime,timezone
import hashlib,json,math,statistics
from pathlib import Path
from macro_claims import claims_archive

HERE=Path(__file__).resolve().parent
PROTOCOL=HERE/'weekly_claims_v1.json'


def snapshot(rows,cut):
    values={}
    for r in rows:
        if r['realtime_start_date']<=cut and (not r['realtime_end_date'] or cut<=r['realtime_end_date']) and r['ICSA'] not in ('','.'):
            if r['period_start_date'] in values:raise ValueError('Overlapping claims vintage')
            values[r['period_start_date']]=int(r['ICSA'])
    return values


def fit_predict(train,x,ridge):
    if len(x)!=2 or not train or ridge<=0:raise ValueError('Two-feature positive-ridge fit required')
    means=[statistics.fmean(r['x'][i] for r in train) for i in range(2)]
    scales=[statistics.pstdev(r['x'][i] for r in train) or 1 for i in range(2)]
    z=[[(r['x'][i]-means[i])/scales[i] for i in range(2)] for r in train]
    ybar=statistics.fmean(r['y'] for r in train);n=len(train)
    a=math.fsum(v[0]**2 for v in z)/n+ridge
    b=math.fsum(v[0]*v[1] for v in z)/n
    d=math.fsum(v[1]**2 for v in z)/n+ridge
    c0=math.fsum(v[0]*(r['y']-ybar) for v,r in zip(z,train))/n
    c1=math.fsum(v[1]*(r['y']-ybar) for v,r in zip(z,train))/n
    det=a*d-b*b
    if det<=0:raise ValueError('Singular ridge system')
    weights=[(d*c0-b*c1)/det,(a*c1-b*c0)/det]
    pred=ybar+sum(w*(t-m)/s for w,t,m,s in zip(weights,x,means,scales))
    if not math.isfinite(pred):raise ValueError('Non-finite prediction')
    return pred


def training_at(history,case,p):
    earliest=(date.fromisoformat(case['target_week'])-timedelta(weeks=p['training_weeks'])).isoformat()
    return [r for r in history if earliest<=r['target_week']<case['target_week'] and 'y'in r and r['label_available_on']<=case['cut']]


def make_case(rows,first,base):
    # Saturday base -> Tuesday cut -> Wednesday issuance -> next unpublished release.
    target=base+timedelta(days=7);cut=(base+timedelta(days=10)).isoformat();issue=(base+timedelta(days=11)).isoformat()
    r=dict(base_week=base.isoformat(),target_week=target.isoformat(),cut=cut,issue_date=issue,status='MISSING_FEATURE')
    values=snapshot(rows,cut);dates=[(base-timedelta(weeks=i)).isoformat() for i in range(52)]
    if not values or max(values)!=base.isoformat() or any(d not in values for d in dates):return r
    last=values[dates[0]];avg=statistics.fmean(values[d] for d in dates)
    label=first.get(target.isoformat())
    if label and label['realtime_start_date']<=issue:return dict(r,status='LABEL_NOT_AFTER_ISSUE_DAY')
    r.update(status='ELIGIBLE',base_value=last,x=[math.log(last/avg),math.log(last/values[dates[1]])],four_week_log_change=math.log(statistics.fmean(values[d] for d in dates[:4])/last))
    if label and label['ICSA'] not in ('','.'):
        r.update(label_value=int(label['ICSA']),label_available_on=label['realtime_start_date'],y=math.log(int(label['ICSA'])/last))
    return r


def metrics(rows):
    scored=[r for r in rows if 'prediction'in r and 'y'in r]
    out=dict(scored=len(scored))
    for key in ['prediction','persistence','four_week_log_change']:
        out['rmslog_'+key]=math.sqrt(statistics.fmean((r[key]-r['y'])**2 for r in scored)) if scored else None
        out['malog_'+key]=statistics.fmean(abs(r[key]-r['y']) for r in scored) if scored else None
    out['passes_exploratory_rule']=bool(scored) and all(out['rmslog_prediction']<=.95*out['rmslog_'+k] for k in ['persistence','four_week_log_change'])
    return out


def run(rows,p):
    first={}
    for r in rows:first.setdefault(r['period_start_date'],r)
    history=[];outputs=[]
    for base in sorted(first):
        case=make_case(rows,first,date.fromisoformat(base))
        if p['test_start']<=case['target_week']<=p['test_end']:
            out=dict(case)
            if case['status']=='ELIGIBLE':
                train=training_at(history,case,p)
                if len(train)>=p['minimum_training']:
                    pred=fit_predict(train,case['x'],p['ridge_mean_loss'])
                    out.update(status='CALCULATED_NOT_ISSUED',prediction=pred,predicted_claims=case['base_value']*math.exp(pred),persistence=0.0,training_n=len(train),training_targets=[r['target_week'] for r in train])
                else:out['status']='INSUFFICIENT_TRAINING'
            outputs.append(out)
        if case['status']=='ELIGIBLE':history.append(case)
    return dict(schema=p['id'],forecast_issued=False,confirmatory=False,predictive_skill_demonstrated=False,metrics=metrics(outputs),cases=outputs,annual={y:metrics([r for r in outputs if r['target_week'][:4]==y]) for y in sorted({r['target_week'][:4] for r in outputs})})


def main():
    a=argparse.ArgumentParser(description=__doc__)
    for n in ['claims','output']:a.add_argument('--'+n,required=True,type=Path)
    a.add_argument('--protocol-sha256',required=True);args=a.parse_args();raw=PROTOCOL.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=args.protocol_sha256:raise ValueError('Frozen protocol hash required')
    if args.output.resolve().is_relative_to(HERE.parents[1]) or args.output.is_symlink():raise ValueError('Private output required')
    p=json.loads(raw);rows=claims_archive(args.claims.read_bytes(),p['claims_sha256']);result=run(rows,p)
    result.update(protocol_sha256=args.protocol_sha256,executed_at_utc=datetime.now(timezone.utc).isoformat(),code_sha256={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['weekly_claims.py','macro_claims.py']})
    with args.output.open('x') as f:json.dump(result,f,indent=2,allow_nan=False)
    print(json.dumps(result['metrics']))

if __name__=='__main__':main()
