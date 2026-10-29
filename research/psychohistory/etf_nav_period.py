"""Issuer-documented payment-date period ledger, not a tradable price index."""
import argparse
from datetime import date
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path

from equities_drawdown_research import private_path
from etf_issuer_source import intake,workbook,distribution_day,decimal


def period_return(source,schedule,start,end):
    date.fromisoformat(start);date.fromisoformat(end)
    nav={row['date']:Decimal(row['nav']) for row in source['rows']}
    if not start<end or start not in nav or end not in nav:
        raise ValueError('Explicit observed period endpoints required')
    issues=[x for x in source['date_issues'] if start<x['ex_date']<=end]
    if issues:
        raise ValueError('Issuer date metadata blocked within requested period')
    eligible=[x for x in schedule if start<x['ex_date']<=end]
    if len({x['ex_date'] for x in eligible})!=len(eligible):
        raise ValueError('Duplicate distribution entitlement')
    for item in eligible:
        if item['ex_date'] not in nav or item['payable_date']<item['ex_date']:
            raise ValueError('Invalid ex/payment chronology')
        if item['payable_date']<=end and item['payable_date'] not in nav:
            raise ValueError('Unobserved payment NAV; never fill')
    units,pending,trace=Decimal(1),{},[]
    for day in sorted(d for d in nav if start<d<=end):
        # Rights use units owned before that day's closing reinvestment.
        for item in eligible:
            if item['ex_date']==day:
                pending[item['ex_date']]=units*Decimal(item['amount'])
        cash=Decimal(0)
        for item in eligible:
            if item['payable_date']==day:
                cash+=pending.pop(item['ex_date'])
        units+=cash/nav[day]
        receivable=sum(pending.values(),Decimal(0))
        trace.append(dict(date=day,units=str(units),receivable=str(receivable),
                          wealth=str(units*nav[day]+receivable)))
    final=Decimal(trace[-1]['wealth'])
    return dict(start=start,end=end,start_nav=str(nav[start]),end_wealth=str(final),
                growth_ratio=str(final/nav[start]),trace=trace,
                pending_entitlements=len(pending),uses_future_payment_nav=False)


def reconcile_periods(nav_raw,nav_sha,dist_raw,dist_sha,ticker,captured_on,published):
    source=intake(nav_raw,nav_sha,dist_raw,dist_sha,ticker,captured_on)
    table=workbook(dist_raw,dist_sha,'dividend')
    schedule=[dict(ex_date=distribution_day(row['D']).isoformat(),
                   payable_date=distribution_day(row['F']).isoformat(),
                   amount=str(sum((decimal(row.get(c,''),blank_zero=True) for c in 'GHI'),Decimal(0))))
              for row in table[1:] if row.get('B')==ticker]
    comparisons=[];seen=set()
    if not isinstance(published,list) or not published:
        raise ValueError('Explicit issuer comparisons required')
    for item in published:
        start,end,years=item['start'],item['end'],item['years']
        if isinstance(years,bool) or not isinstance(years,int) or not 0<=years<=100 or (start,end,years) in seen:
            raise ValueError('Invalid/duplicate period annualization')
        seen.add((start,end,years))
        ledger=period_return(source,schedule,start,end)
        ratio=Decimal(ledger['growth_ratio'])
        result=(ratio**(Decimal(1)/years)-1)*100 if years else (ratio-1)*100
        expected=Decimal(item['percent'])
        if not expected.is_finite():
            raise ValueError('Invalid issuer comparison')
        difference=result-expected
        comparisons.append(dict(start=start,end=end,years=years,issuer_percent=str(expected),
                                period_percent=str(result),difference_pp=str(difference),
                                within_tolerance=abs(difference)<=Decimal('.03'),ledger=ledger))
    passed=all(x['within_tolerance'] for x in comparisons)
    return dict(schema='psychohistory.etf_nav_payment_period.v1',
                status='PERIOD_METHOD_RECONCILED_SOURCE_NOT_ADMITTED' if passed else 'PERIOD_METHOD_MISMATCH_SOURCE_NOT_ADMITTED',
                global_source_status=source['status'],global_source_issues=source['date_issues'],
                period_comparisons=comparisons,
                all_periods_reconciled=passed,tolerance_pp='.03',source_admitted=False,
                historical_asof_verified=False,forecast_issued=False,model_admitted=False,
                market_price_reconstructed=False,current_risk_estimated=False,
                definition='Independent per-period NAV holdings, ex-date cash rights, reinvestment at payment NAV')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for name in ('nav','distributions','published-returns','output'):
        ap.add_argument('--'+name,type=Path,required=True)
    for name in ('nav-sha256','distributions-sha256','published-returns-sha256','ticker','captured-on'):
        ap.add_argument('--'+name,required=True)
    a=ap.parse_args()
    published=private_path(a.published_returns).read_bytes()
    if hashlib.sha256(published).hexdigest()!=a.published_returns_sha256:
        raise ValueError('Issuer comparison bytes differ from pin')
    output=private_path(a.output,create=True)
    report=reconcile_periods(private_path(a.nav).read_bytes(),a.nav_sha256,
                            private_path(a.distributions).read_bytes(),a.distributions_sha256,
                            a.ticker,a.captured_on,json.loads(published))
    fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:
        json.dump(report,f,allow_nan=False,indent=2);f.write('\n')
    print(json.dumps({k:report[k] for k in ('status','all_periods_reconciled','source_admitted','forecast_issued')}))


if __name__=='__main__':main()
