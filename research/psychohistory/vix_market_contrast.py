"""One frozen lagged-VIX contrast; private revised history, never issuance."""
import argparse
import csv
from datetime import date,datetime
from decimal import Decimal
import hashlib
import io
import json
import math
import os
from pathlib import Path

from equities_drawdown_research import private_path,HORIZON,LOOKBACK,MIN_TRAIN
from equities_market_study import read_archive,probability,metrics,paired_intervals,TARGET

REFERENCES=('expanding_frequency','recent_frequency','volatility_only')


def pinned(raw,sha):
    if len(sha)!=64 or hashlib.sha256(raw).hexdigest()!=sha:
        raise ValueError('Pinned input SHA mismatch')


def read_vix(raw,sha,captured_on):
    pinned(raw,sha)
    if len(raw)>3_000_000:
        raise ValueError('Oversized CSV')
    cutoff=date.fromisoformat(captured_on)
    reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig'),newline=''))
    if reader.fieldnames!=['DATE','OPEN','HIGH','LOW','CLOSE']:
        raise ValueError('Unexpected Cboe daily CSV schema')
    prior=None;result={}
    for r in reader:
        day=datetime.strptime(r['DATE'],'%m/%d/%Y').date()
        values=[float(r[k]) for k in ('OPEN','HIGH','LOW','CLOSE')]
        if (None in r or day>cutoff or prior is not None and day<=prior or
                any(not math.isfinite(x) or x<0 for x in values) or values[-1]<=0):
            raise ValueError('Invalid VIX close/date/order; never fill')
        result[day]=values[-1];prior=day
    if not result:
        raise ValueError('Empty VIX source')
    return result


def labels_for(prices):
    return {i:int(min(v for _,v in prices[i+1:i+HORIZON+1])<=prices[i][1]*Decimal('.95'))
            for i in range(LOOKBACK,len(prices)-HORIZON)}


def candidate(prices,vix,labels,origin):
    train=list(range(LOOKBACK,origin-HORIZON+1))
    if len(train)<MIN_TRAIN:
        raise ValueError('Insufficient matured training')
    def x(i):
        previous=prices[i-1][0]
        if previous not in vix:
            raise ValueError('Missing exact previous-session VIX; never forward fill')
        return [math.log(vix[previous])]
    yy=[labels[i] for i in train]
    p=probability([x(i) for i in train],yy,x(origin),(0,))
    if p is None:
        raise ValueError('One-class candidate blocks the paired sample')
    return p,len(train)


def contrast(prices,vix,reference,market_sha):
    if (reference.get('schema')!='psychohistory.equities_real_market_study.v1' or
            reference.get('target')!=TARGET or reference.get('source',{}).get('source_sha256')!=market_sha or
            reference.get('forecast_issued') is not False):
        raise ValueError('Original report identity or source mismatch')
    labels=labels_for(prices)
    start=next(i for i,(day,_) in enumerate(prices) if day>=date(2010,1,1))
    origins=list(range(start,len(prices)-HORIZON,20))
    original=reference.get('rows',[])
    if len(original)!=len(origins):
        raise ValueError('Original paired sample cannot be dropped or expanded')
    rows=[]
    for origin,r in zip(origins,original):
        expected=(prices[origin][0].isoformat(),prices[origin+HORIZON][0].isoformat(),labels[origin],origin-HORIZON-LOOKBACK+1)
        actual=(r.get('origin_date'),r.get('label_end_date'),r.get('outcome'),r.get('training_rows'))
        if actual!=expected or r.get('last_training_label_date')!=expected[0] or any(
                type(r.get(k)) not in (int,float) or not math.isfinite(r[k]) or not 0<=r[k]<=1 for k in REFERENCES):
            raise ValueError('Original label/training/reference integrity mismatch')
        p,n=candidate(prices,vix,labels,origin)
        rows.append({**{k:r[k] for k in ('origin_date','label_end_date','last_training_label_date','training_rows','outcome')+REFERENCES},
                     'vix_logistic':p,'vix_feature_date':prices[origin-1][0].isoformat()})
    summary={k:metrics(rows,k) for k in ('vix_logistic',)+REFERENCES}
    c=summary['vix_logistic'];enough=c['n']>=100 and c['events']>=20
    passed=bool(enough and all(c['brier']<=.95*summary[k]['brier'] for k in REFERENCES[:2]) and c['brier']<summary[REFERENCES[2]]['brier'])
    intervals=paired_intervals([{**r,'logistic_four_features':r['vix_logistic']} for r in rows])
    return dict(schema='psychohistory.vix_market_contrast.v1',target=TARGET,
                status='RETROSPECTIVE_REVISED_EXPLORATORY',rows=rows,metrics=summary,paired_intervals=intervals,
                decision='PROMISING_RETROSPECTIVE_ONLY' if passed else 'DISCARDED_BY_FROZEN_SCREEN',
                original_references_reused_without_refit=True,same_original_sample=True,
                historical_asof_verified=False,forecast_issued=False,model_admitted=False,
                current_market_risk_estimated=False,trading_pnl_evaluated=False)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('market','vix','reference','output'):
        p.add_argument('--'+name,type=Path,required=True)
    for name in ('market-sha','vix-sha','reference-sha','captured-on'):
        p.add_argument('--'+name,required=True)
    a=p.parse_args();output=private_path(a.output,create=True)
    market=private_path(a.market).read_bytes();vix=private_path(a.vix).read_bytes();ref=private_path(a.reference).read_bytes()
    pinned(ref,a.reference_sha)
    prices,_=read_archive(market,a.market_sha,a.captured_on)
    r=contrast(prices,read_vix(vix,a.vix_sha,a.captured_on),json.loads(ref),a.market_sha)
    r['inputs']={k:getattr(a,k+'_sha') for k in ('market','vix','reference')}
    fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:json.dump(r,f,sort_keys=True,indent=2)
    print(json.dumps({k:r[k] for k in ('status','decision','forecast_issued','model_admitted')}))


if __name__=='__main__':main()
