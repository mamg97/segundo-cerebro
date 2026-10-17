"""Retrospective-only sensitivity to 24 target-end calendar phases.

No real observations or scores are committed to public Git. JSON input/output
must stay private. Each phase has only 2/3 nonoverlapping calendar horizons.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path

MODELS = ('global_reemergence', 'country_shrinkage', 'country_history', 'time_since_last_event')
BUCKETS = ('12_23m', '24_59m', '60plus_documented', 'history_incomplete')
RECENCY_SCHEMA = 'psychohistory.ged.reemergence_recency_comparator.v1'
ORIGINAL_SCHEMA = 'psychohistory.ged.reemergence_24m.v1'
RESULT_SCHEMA = 'psychohistory.ged.calendar_robustness.v1'


def midx(year, month):
    return year * 12 + month - 1


def scores(rows, model):
    if not rows:
        return None
    ys = [r['outcome'] for r in rows]
    ps = [r['probabilities'][model] for r in rows]
    n = len(rows)
    brier = math.fsum((p-y)**2 for p,y in zip(ps,ys)) / n
    loss = math.fsum(-y*math.log(p)-(1-y)*math.log1p(-p) for p,y in zip(ps,ys)) / n
    bins = []
    for i in range(5):
        pick = [(p,y) for p,y in zip(ps,ys) if min(int(p*5),4)==i]
        bins.append({'n':len(pick), 'mean_probability':math.fsum(p for p,_ in pick)/len(pick) if pick else None,
                     'observed_rate':sum(y for _,y in pick)/len(pick) if pick else None})
    grouped = defaultdict(lambda: [0,0])
    for p,y in zip(ps,ys):
        grouped[p][0] += 1
        grouped[p][1] += y
    total_pos = sum(ys)
    ap = None
    if total_pos:
        ranked = sorted(grouped.items(),reverse=True)
        seen=hits=0
        ap=0.0
        for _,(count,positives) in ranked:
            seen+=count
            hits+=positives
            ap+=(positives/total_pos)*(hits/seen)
    auc=None
    if 0<total_pos<n:
        negatives_before=0
        concordance=0.0
        for _,(count,positives) in sorted(grouped.items()):
            negatives=count-positives
            concordance+=positives*(negatives_before+negatives/2)
            negatives_before+=negatives
        auc=concordance/(total_pos*(n-total_pos))
    return {'n':n,'events':total_pos,'brier':brier,'log_loss':loss,
            'average_precision_ties':ap,'roc_auc_ties':auc,'calibration':bins}


def audit(original, recency, original_sha256=None, recency_sha256=None):
    if (original.get('schema')!=ORIGINAL_SCHEMA or recency.get('schema')!=RECENCY_SCHEMA or
        original.get('prospective_eligible') is not False or recency.get('prospective_eligible') is not False or
        original.get('source_as_of_verified') is not False or recency.get('source_as_of_verified') is not False or
        original.get('outcome_horizon_months')!=24 or tuple(original.get('models',()))!=MODELS[:3] or
        recency.get('added_model')!=MODELS[3] or set(recency.get('recency_buckets',()))!=set(BUCKETS)):
        raise ValueError('Incorrect original/recency target, models or retrospective flags')
    result={'schema':RESULT_SCHEMA,'status':'RETROSPECTIVE_REVISED_SENSITIVITY_ONLY',
            'source_as_of_verified':False,'prospective_eligible':False,
            'original_report_sha256':original_sha256,'recency_report_sha256':recency_sha256,
            'source':original['source'], 'target':original['target'],
            'calendar_anchor_semantics':'target_end_not_issue_month',
            'comparison':'fixed outcomes, identical countries per anchor, no refitting',
            'confidence_interval_95':None,'p_value':None,'partitions':{}}
    for part,years in (('validation',(2016,2019)),('test',(2020,2024))):
        base=original['partitions'][part]
        sub=recency['partitions'][part]
        if base['years']!=list(years) or sub['years']!=list(years):
            raise ValueError('Invalid or modified time partitions')
        frozen={(r['origin_year'],r['origin_month'],r['country_id']):r for r in base['cases']}
        if len(frozen)!=len(base['cases']) or len(sub['cases'])!=len(frozen):
            raise ValueError('Missing or duplicated country-horizon rows')
        rows=[]
        for r in sub['cases']:
            y,m,cid=r['origin_year'],r['origin_month'],r['country_id']
            key=(y,m,cid)
            old=frozen.pop(key,None)
            if old is None or r['outcome']!=old['outcome'] or r['cutoff']!=old['cutoff']:
                raise ValueError('Case identity, outcome, or cutoff changed')
            if not (years[0]<=y<=years[1] and 1<=m<=12 and isinstance(cid,int) and not isinstance(cid,bool)):
                raise ValueError('Invalid country/time')
            cutoff=f'{(midx(y,m)-24)//12:04d}-{(midx(y,m)-24)%12+1:02d}'
            if r['cutoff']!=cutoff or r['recency_bucket'] not in BUCKETS:
                raise ValueError('Cutoff or history bucket malformed')
            probs=r['probabilities']
            if set(probs)!=set(MODELS) or any(type(probs[k]) not in (int,float) or not math.isfinite(probs[k]) or not 0<probs[k]<1 for k in MODELS):
                raise ValueError('Probability invalid')
            if any(probs[k]!=old['probabilities'][k] for k in MODELS[:3]):
                raise ValueError('Frozen historical probabilities modified')
            if r['recency_bucket']=='history_incomplete' and probs[MODELS[3]]!=probs[MODELS[0]]:
                raise ValueError('Unverified roster history must use global baseline')
            rows.append(r)
        if frozen or len(rows)!=sub['n'] or sum(r['outcome'] for r in rows)!=sub['events']:
            raise ValueError('Missing cases or changed denominators')
        for model in MODELS:
            recorded=sub['all_months']['models'][model]['brier']
            if abs(scores(rows,model)['brier']-recorded)>1e-12:
                raise ValueError('Archived score and cases disagree')
        start=midx(years[0],1)
        phases=[]
        for phase in range(24):
            chosen=[r for r in rows if (midx(r['origin_year'],r['origin_month'])-start)%24==phase]
            anchors=sorted({(r['origin_year'],r['origin_month']) for r in chosen})
            count_expected=2 if part=='validation' else (3 if phase<12 else 2)
            if len(anchors)!=count_expected:
                raise ValueError('Incomplete calendar-phase blocks')
            estimates={m:scores(chosen,m) for m in MODELS}
            strong=estimates['country_history']['brier']
            rec=estimates[MODELS[3]]['brier']
            counts=Counter(r['recency_bucket'] for r in chosen)
            phases.append({'phase_offset_months':phase,
                           'target_end_months':[f'{y}-{m:02}' for y,m in anchors],
                           'hypothetical_issue_months':[f'{(midx(y,m)-23)//12}-{(midx(y,m)-23)%12+1:02}' for y,m in anchors],
                           'n':len(chosen),'events':sum(r['outcome'] for r in chosen),
                           'recency_bucket_counts':{b:counts.get(b,0) for b in BUCKETS},
                           'models':estimates,'delta_brier_recency_minus_country_history':rec-strong})
        result['partitions'][part]={'years':list(years),'n_all_overlapping':len(rows),
                                     'events_all_overlapping':sum(r['outcome'] for r in rows),
                                     'phase_count':24,'non_independent_phase_warning':True,
                                     'phase_diagnostics':phases,
                                     'recency_beats_country_history_brier_phases':sum(p['delta_brier_recency_minus_country_history']<0 for p in phases),
                                     'recency_history_incomplete_cases':sum(r['recency_bucket']=='history_incomplete' for r in rows)}
    return result


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--original',type=Path,required=True)
    p.add_argument('--recency',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    args=p.parse_args()
    original=args.original.read_bytes()
    recency=args.recency.read_bytes()
    result=audit(json.loads(original),json.loads(recency),hashlib.sha256(original).hexdigest(),hashlib.sha256(recency).hexdigest())
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open('x',encoding='utf-8') as f:
        json.dump(result,f,sort_keys=True,ensure_ascii=False,indent=2)
        f.write('\n')
    print(json.dumps({'schema':RESULT_SCHEMA,'phase_count_per_partition':24,
                      'test_recency_better_brier_phases':result['partitions']['test']['recency_beats_country_history_brier_phases'],
                      'no_independence_claim':True}))


if __name__=='__main__':
    main()
