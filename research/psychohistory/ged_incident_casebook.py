"""Private factual links from frozen GED 24m outcomes to exact-date GED events.

One event illustrates a realised positive binary country-horizon outcome, but
is NEVER what was individually predicted. No inference of war/coup/onset.
"""
from __future__ import annotations
import argparse
import bisect
import csv
from collections import defaultdict
from datetime import date, datetime
import hashlib
import io
import json
from pathlib import Path
import zipfile

SCHEMA='psychohistory.ged.reemergence_recency_comparator.v1'
TARGET='at_least_one_exact_dated_state_based_lethal_GED_incident_within_24m_after_12m_quiet_at_cutoff'
RESULT='psychohistory.ged.incident_casebook.v1'
GED_SOURCE='https://ucdp.uu.se/downloads/ged/ged251-csv.zip'
GED_CODEBOOK='https://ucdp.uu.se/downloads/ged/ged251.pdf'
FIELDS={'id','year','country_id','country','type_of_violence','best','low','high',
        'date_start','date_end','date_prec','where_coordinates','where_prec',
        'side_a','side_b','dyad_name','conflict_name','source_date'}
MODELS={'global_reemergence','country_history','country_shrinkage','time_since_last_event'}


def month_num(y,m): return y*12+m-1


def read_events(ged_zip:Path,sha256:str,interested_countries:set):
    if hashlib.sha256(ged_zip.read_bytes()).hexdigest()!=sha256:
        raise ValueError('Pinned official GED archive digest mismatch')
    data=defaultdict(list)
    ids=set();total=0
    with zipfile.ZipFile(ged_zip) as z:
        members=[m for m in z.infolist() if not m.is_dir()]
        if len(members)!=1 or members[0].filename!='GEDEvent_v25_1.csv' or members[0].file_size>400_000_000:
            raise ValueError('Unsupported GED archive structure')
        with z.open(members[0]) as f,io.TextIOWrapper(f,encoding='utf-8-sig',newline='') as handle:
            reader=csv.DictReader(handle)
            if not reader.fieldnames or not FIELDS.issubset(reader.fieldnames):
                raise ValueError('GED fields unexpected')
            for row in reader:
                total+=1
                if total>650_000:raise ValueError('GED source exceeded row guard')
                eid=int(row['id']); cid=int(row['country_id']); year=int(row['year'])
                typ=int(row['type_of_violence']);best=int(row['best']);prec=int(row['date_prec'])
                if eid in ids or eid<1 or cid<1 or best<0 or typ not in (1,2,3):
                    raise ValueError('GED invalid or duplicate event identity')
                ids.add(eid)
                if cid not in interested_countries or year<2014 or typ!=1 or best<1 or prec!=1:
                    continue
                d0=datetime.fromisoformat(row['date_start']).date()
                d1=datetime.fromisoformat(row['date_end']).date()
                if d0!=d1 or d0.year!=year:continue
                def s(k,maxlen):return str(row[k] or '')[:maxlen]
                data[cid].append({'ged_id':eid,'date':d0.isoformat(),
                    'country':s('country',160),'place':s('where_coordinates',160),
                    'where_precision':int(row['where_prec']),
                    'side_a':s('side_a',180),'side_b':s('side_b',180),
                    'dyad':s('dyad_name',260),'conflict':s('conflict_name',260),
                    'best_deaths':best,'low_deaths':int(row['low']),'high_deaths':int(row['high']),
                    'source_article_publication_dates_raw':s('source_date',220),
                    'violence_type':1,'temporal_precision':1})
    if total<10_000:raise ValueError('GED truncated')
    for cid in data:data[cid].sort(key=lambda row:(row['date'],row['ged_id']))
    return data,total


def join_cases(report:dict,events:dict,source_sha:str,report_sha:str):
    if (report.get('schema')!=SCHEMA or report.get('prospective_eligible') is not False
        or report.get('source_as_of_verified') is not False
        or report.get('target')!=TARGET or report.get('added_model')!='time_since_last_event'):
        raise ValueError('Untrusted or prospective report')
    event_catalog={}
    out={'schema':RESULT,'status':'RETROSPECTIVE_REVISED_EVENT_CONTEXT_ONLY',
         'ged_version':'25.1','ged_source':GED_SOURCE,'ged_codebook':GED_CODEBOOK,
         'ged_zip_sha256':source_sha,'recency_report_sha256':report_sha,
         'prediction_target':report.get('target'),
         'target_description':'At least one exact-date lethal state-based GED event in next 24 months after 12 complete eligible-event-free months at cutoff',
         'information_available_at_historical_issue_verified':False,
         'ucdp_record_release_date_verified':None,
         'source_article_dates_are_not_ucdp_availability':True,
         'prospective_eligible':False,
         'event_is_not_specific_forecast':True,
         'onset_war_invasion_coup_claim':False,
         'partitions':{}}
    for name,(lo,hi) in {'validation':(2016,2019),'test':(2020,2024)}.items():
        part=report['partitions'][name]
        if part['years']!=[lo,hi]:raise ValueError('Partition mismatch')
        output=[];seen=set();positive=0
        for case in part['cases']:
            yy=int(case['origin_year']);mm=int(case['origin_month']);cid=int(case['country_id'])
            key=(yy,mm,cid)
            if key in seen or not lo<=yy<=hi or not 1<=mm<=12:raise ValueError('Invalid case identity')
            seen.add(key)
            cutoff=month_num(yy,mm)-24
            if case['cutoff']!=f'{cutoff//12:04d}-{cutoff%12+1:02d}':raise ValueError('Bad target horizon cutoff')
            probs=case['probabilities'];label=case['outcome']
            if label not in (0,1) or set(probs)!=MODELS:raise ValueError('Bad frozen label/models')
            first_idx=cutoff+1
            first=date(first_idx//12,first_idx%12+1,1)
            next_month=month_num(yy,mm)+1
            end_exclusive=date(next_month//12,next_month%12+1,1)
            arr=events.get(cid,[])
            ix=bisect.bisect_left([v['date'] for v in arr],first.isoformat())
            event=arr[ix] if ix<len(arr) and arr[ix]['date']<end_exclusive.isoformat() else None
            if int(event is not None)!=label:raise ValueError('GED events disagree with scored outcome')
            if label:positive+=1
            if not label:continue
            existing=event_catalog.get(event['ged_id'])
            if existing is not None and existing != event:
                raise ValueError('Same GED event ID has conflicting factual metadata')
            event_catalog[event['ged_id']]=event
            output.append({'country_id':cid,'target_end_month':f'{yy}-{mm:02d}',
                           'hypothetical_issue_month':f'{(cutoff+1)//12}-{(cutoff+1)%12+1:02d}',
                           'cutoff_month':case['cutoff'],'horizon_months':24,
                           'event_target_binary':1,'probabilities_retrospective':probs,
                           'earliest_event_ged_id':event['ged_id'],
                           'link_semantics':'first_eligible_event_in_positive_window_not_a_specific_event_prediction'})
        if len(seen)!=part['n'] or positive!=part['events']:
            raise ValueError('Report totals differ from GED context')
        out['partitions'][name]={'n_scored':part['n'],'positive_horizons':positive,
                                  'linked_positive_horizons':len(output),'links':output}
    out['events_by_id']={str(event_id):event for event_id,event in sorted(event_catalog.items())}
    out['distinct_ged_events_first_in_any_horizon']=len(event_catalog)
    out['total_positive_horizon_links']=sum(p['linked_positive_horizons'] for p in out['partitions'].values())
    out['duplication_note']='Positive overlapping windows repeatedly link to a much smaller set of unique GED events; do not count horizon links as independent incidents or forecasts.'
    return out


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--ged-zip',required=True,type=Path)
    cli.add_argument('--ged-sha256',required=True)
    cli.add_argument('--recency-report',required=True,type=Path)
    cli.add_argument('--out',required=True,type=Path)
    args=cli.parse_args()
    repo=Path(__file__).resolve().parents[2]
    if args.out.resolve().is_relative_to(repo):
        raise ValueError('Cannot save private GED event casebook inside public Git repository')
    raw=args.recency_report.read_bytes();r=json.loads(raw)
    countries={row['country_id'] for p in r['partitions'].values() for row in p['cases']}
    events,n=read_events(args.ged_zip,args.ged_sha256,countries)
    casebook=join_cases(r,events,args.ged_sha256,hashlib.sha256(raw).hexdigest())
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open('x',encoding='utf-8') as fp:
        json.dump(casebook,fp,sort_keys=True,ensure_ascii=False,allow_nan=False,indent=2)
        fp.write('\n')
    print(json.dumps({'schema':RESULT,'ged_rows_checked':n,
                      'validation_positive_links':len(casebook['partitions']['validation']['links']),
                      'test_positive_links':len(casebook['partitions']['test']['links']),
                      'no_prospective_claim':True}))


if __name__=='__main__':main()
