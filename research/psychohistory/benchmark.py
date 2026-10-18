"""Revised-release historical benchmark. NOT a vintage-correct forecast.

Only aggregated official country-year data enter this pipeline. No output belongs
in Git. The protocol is fixed before scoring; tests use invented fixtures only.
"""
from __future__ import annotations
import argparse
import collections
import csv
import hashlib
import io
import json
import math
import platform
import random
import statistics
import zipfile
from pathlib import Path
from engines import estimate, sigmoid, agent_simulation

HERE = Path(__file__).resolve().parent
MODELS = ('frequency', 'persistence', 'markov', 'v1_memory_index', 'v2_logistic', 'interaction_table')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def audit(rows, protocol, strict=True):
    if not rows:
        raise ValueError('Empty dataset')
    required = {'country', 'country_id', 'year', 'Version', 'region',
                'sb_total_deaths_best', 'sb_total_deaths_low', 'sb_total_deaths_high',
                'ns_total_deaths_best', 'os_total_deaths_best'}
    seen, countries, years = set(), set(), collections.Counter()
    for row in rows:
        if not required.issubset(row):
            raise ValueError('Missing required source columns')
        key = (int(row['country_id']), int(row['year']))
        if key in seen:
            raise ValueError('Duplicate country-year')
        seen.add(key)
        if row['Version'] != protocol['dataset_version']:
            raise ValueError('Unexpected source version')
        for col in required:
            if col.endswith(('best', 'low', 'high')):
                value = float(row[col])
                if not math.isfinite(value) or value < 0 or int(value) != value:
                    raise ValueError('Invalid deaths count')
        # UCDP best/low/high need not be numerically ordered in every source
        # event; preserve bounds as alternate label definitions, never reorder.
        countries.add(key[0]); years[key[1]] += 1
    ranges = collections.defaultdict(list)
    for country, year in seen:
        ranges[country].append(year)
    gaps = sum(max(v) - min(v) + 1 - len(v) for v in ranges.values())
    if gaps:
        raise ValueError('Internal country-year gaps: no imputation permitted')
    if strict and (len(rows) != protocol['expected_raw_rows'] or
                   len(countries) != protocol['expected_countries'] or
                   [min(years), max(years)] != protocol['raw_years']):
        raise ValueError('Coverage differs from audited release')
    return {'passed': True, 'rows': len(rows), 'countries': len(countries),
            'years': [min(years), max(years)], 'country_year_counts': dict(sorted(years.items())),
            'internal_gaps': gaps, 'duplicates': 0, 'imputed_rows': 0,
            'vintage_verified': False, 'socioeconomic_covariates': 'not included in v1'}


def load_official(data_dir, protocol):
    raw = (data_dir / 'ucdp.zip').read_bytes()
    if digest(raw) != protocol['archive_sha256']:
        raise ValueError('Archive checksum mismatch')
    if digest((data_dir / 'codebook.pdf').read_bytes()) != protocol['codebook_sha256']:
        raise ValueError('Codebook checksum mismatch')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        names = [n for n in archive.namelist() if n.lower().endswith('.csv')]
        if len(names) != 1:
            raise ValueError('Expected exactly one CSV')
        csv_bytes = archive.read(names[0])
    rows = list(csv.DictReader(io.StringIO(csv_bytes.decode('utf-8-sig'))))
    return rows, {'archive_sha256': digest(raw), 'csv_sha256': digest(csv_bytes),
                  'member': names[0], 'codebook_sha256': protocol['codebook_sha256']}


def panel(rows, protocol, target='presence', estimate_kind='best'):
    """No current-year predictors, roster padding, or retrospective as-of dates.

    Onset is a label defined by y[t] AND NOT y[t-1]. y[t-1] is never a predictor
    or an eligibility filter at issue time. This is a country aggregate episode,
    NOT UCDP's dyad-level armed-conflict onset definition.
    """
    lookup = {(int(r['country_id']), int(r['year'])): r for r in rows}
    threshold = protocol['threshold_deaths']
    is_active = lambda r: int(float(r['sb_total_deaths_' + estimate_kind]) >= threshold)
    result, excluded = [], 0
    for (country, year), row in sorted(lookup.items()):
        cutoff = year - protocol['feature_lag_years']
        history_years = list(range(cutoff - protocol['minimum_history'] + 1, cutoff + 1))
        if any((country, y) not in lookup for y in history_years + [year-1]):
            excluded += 1
            continue
        history = [lookup[country, y] for y in history_years]
        last = history[-1]
        actives = [is_active(r) for r in history]
        last_onset = int(is_active(last) and not is_active(lookup[country, cutoff-1]))
        x = [float(actives[-1]), statistics.fmean(actives),
             math.log1p(float(last['sb_total_deaths_best'])),
             math.log1p(float(last['ns_total_deaths_best'])),
             math.log1p(float(last['os_total_deaths_best']))]
        y = is_active(row)
        if target == 'onset':
            y *= 1 - is_active(lookup[country, year-1])
        result.append({'country': country, 'year': year, 'target': y, 'x': x,
                       'feature_year': cutoff, 'region': row['region'],
                       'last_target': actives[-1] if target == 'presence' else last_onset})
    return sorted(result, key=lambda r: (r['year'], r['country'])), excluded


def normalizer(train):
    dims = len(train[0]['x'])
    means = [statistics.fmean(r['x'][i] for r in train) for i in range(dims)]
    scales = [max(1e-9, statistics.pstdev(r['x'][i] for r in train)) for i in range(dims)]
    return means, scales


def scaled(row, means, scales):
    return [(v-m)/s for v,m,s in zip(row['x'], means, scales)]


def cell(row):
    x = row['x']
    return (x[0] > 0, x[1] > 0, x[3] > 0, x[4] > 0)


def solve(matrix, vector):
    """Small positive-definite system, Gaussian elimination with pivoting."""
    a=[list(row)+[v] for row,v in zip(matrix,vector)]
    n=len(vector)
    for i in range(n):
        pivot=max(range(i,n),key=lambda k:abs(a[k][i]))
        a[i],a[pivot]=a[pivot],a[i]
        if abs(a[i][i])<1e-12: raise ValueError('Singular logistic Hessian')
        scale=a[i][i]
        a[i]=[v/scale for v in a[i]]
        for j in range(n):
            if i!=j:
                scale=a[j][i]
                a[j]=[v-scale*w for v,w in zip(a[j],a[i])]
    return [r[-1] for r in a]


def fit_logit(x, y, iterations=50, ridge=.025):
    """Mean binary log loss + ridge/2 * ||non-intercept weights||².

    A fixed number of gradient steps is not evidence of convergence. Stop only
    on the penalized training gradient; fail rather than score an unfit model.
    """
    if not 0<sum(y)<len(y): raise ValueError('Logistic fit requires two classes')
    groups=collections.defaultdict(lambda:[0,0])
    for xi,yi in zip(x,y):
        groups[tuple([1.0]+xi)][0]+=1; groups[tuple([1.0]+xi)][1]+=yi
    n=len(y); d=len(x[0])+1; rate=sum(y)/n
    w=[math.log(rate/(1-rate))]+[0.0]*(d-1)
    def objective(weights):
        total=0.0
        for xi,(count,positives) in groups.items():
            z=sum(a*b for a,b in zip(weights,xi))
            total+=count*(max(z,0)+math.log1p(math.exp(-abs(z))))-positives*z
        return total/n+ridge/2*sum(v*v for v in weights[1:])
    for _ in range(iterations):
        grad=[0.0]*d; hessian=[[0.0]*d for _ in range(d)]
        for xi,(count,positives) in groups.items():
            p=sigmoid(sum(a*b for a,b in zip(w,xi)))
            error=(count*p-positives)/n; curvature=count*p*(1-p)/n
            for j in range(d):
                grad[j]+=error*xi[j]
                for k in range(d): hessian[j][k]+=curvature*xi[j]*xi[k]
        for j in range(1,d):
            grad[j]+=ridge*w[j]; hessian[j][j]+=ridge
        if max(abs(v) for v in grad)<1e-7: return w
        step=solve(hessian,grad); rate=1.0; loss=objective(w)
        while rate>1e-8:
            nxt=[v-rate*s for v,s in zip(w,step)]
            if objective(nxt)<=loss+1e-12: break
            rate/=2
        if rate<=1e-8: raise ValueError('Logistic line search failed')
        w=nxt
    raise ValueError('Logistic fit failed convergence check')


def predict_origin(rows, year, protocol):
    train = [r for r in rows if r['year'] <= year-protocol['training_label_lag_years']]
    test = [r for r in rows if r['year'] == year]
    if not train or not test:
        raise ValueError('Empty temporal fold')
    assert max(r['year'] for r in train) <= year - 2
    assert all(r['feature_year'] <= year - 2 for r in test)
    means, scales = normalizer(train)
    xx = [scaled(r, means, scales) for r in train]
    yy = [r['target'] for r in train]
    # V1 is a hypothesized conflict-memory index, not a validated historical law.
    index = lambda z: statistics.fmean([z[1], z[2], z[3], z[4]])
    index_fit = fit_logit([[index(z)] for z in xx], yy,
                            iterations=protocol['logit_iterations'], ridge=protocol['logit_ridge'])
    logit = fit_logit(xx, yy, iterations=protocol['logit_iterations'], ridge=protocol['logit_ridge'])
    base = (sum(yy) + 1)/(len(yy) + 2)
    grouped, markov = collections.defaultdict(list), collections.defaultdict(list)
    for r in train:
        grouped[cell(r)].append(r['target'])
        markov[r['last_target']].append(r['target'])
    out = []
    for r in test:
        z = scaled(r, means, scales)
        group = grouped[cell(r)]; previous = markov[r['last_target']]
        prior = protocol['interaction_prior_n']
        probs = {'frequency': base, 'persistence': float(r['last_target']),
                 'markov': (sum(previous)+1)/(len(previous)+2),
                 'v1_memory_index': estimate(index_fit, [index(z)]),
                 'v2_logistic': estimate(logit, z),
                 'interaction_table': (sum(group)+prior*base)/(len(group)+prior)}
        out.append({**{k:r[k] for k in ('country','year','target','region','feature_year')},
                    'training_n': len(train), 'training_last_year': max(t['year'] for t in train), **probs})
    return out


def average_precision(rows, model):
    """Non-interpolated AP; ties enter as one threshold, never ranked by outcome."""
    positives = sum(r['target'] for r in rows)
    if not positives:
        return None
    groups = collections.defaultdict(list)
    for r in rows:
        groups[r[model]].append(r['target'])
    tp, n, total = 0, 0, 0.0
    for p in sorted(groups, reverse=True):
        new = sum(groups[p]); tp += new; n += len(groups[p])
        total += new / positives * tp/n
    return total


def metrics(rows, model, bins=5):
    if not rows:
        return {'n':0, 'brier':None, 'log_loss':None, 'average_precision':None, 'ece':None, 'calibration':[]}
    if any(r['target'] not in (0,1) or not math.isfinite(r[model]) or not 0 <= r[model] <= 1 for r in rows):
        raise ValueError('Invalid scored observation')
    calibration = []
    for i in range(bins):
        subset = [r for r in rows if min(bins-1, int(r[model]*bins)) == i]
        n = len(subset)
        p = statistics.fmean(r[model] for r in subset) if n else None
        y = statistics.fmean(r['target'] for r in subset) if n else None
        # Wilson binomial interval is descriptive; panel dependence is NOT removed.
        if n:
            denom = 1+1.96**2/n
            mid = (y+1.96**2/(2*n))/denom
            width = 1.96*math.sqrt(y*(1-y)/n+1.96**2/(4*n*n))/denom
            interval = [max(0,mid-width), min(1,mid+width)]
        else:
            interval = None
        calibration.append({'bin':i,'count':n,'mean_probability':p,'event_rate':y,
                            'descriptive_wilson95':interval})
    eps=1e-12
    loss=lambda r: -(r['target']*math.log(max(eps,min(1-eps,r[model]))) +
                     (1-r['target'])*math.log(max(eps,min(1-eps,1-r[model]))))
    return {'n':len(rows), 'events':sum(r['target'] for r in rows),
            'mean_probability':statistics.fmean(r[model] for r in rows),
            'event_rate':statistics.fmean(r['target'] for r in rows),
            'brier':statistics.fmean((r[model]-r['target'])**2 for r in rows),
            'log_loss':statistics.fmean(loss(r) for r in rows),
            'log_loss_clip':eps, 'average_precision':average_precision(rows, model),
            'ece':sum(b['count']*abs(b['mean_probability']-b['event_rate']) for b in calibration if b['count'])/len(rows),
            'calibration':calibration}


def percentile(values, q):
    values=sorted(values); pos=(len(values)-1)*q
    lo=int(pos); hi=min(lo+1,len(values)-1)
    return values[lo]+(values[hi]-values[lo])*(pos-lo)


def uncertainty(rows, model, baseline, protocol):
    """Paired moving-block bootstrap: entire years retain all country rows.

    Conditional on fitted forecasts; does not include model refitting, source
    revision or specification uncertainty. Ten years make the interval fragile.
    """
    years=sorted({r['year'] for r in rows})
    totals={y:[sum((r[k]-r['target'])**2 for r in rows if r['year']==y) for k in (model,baseline)] for y in years}
    counts=collections.Counter(r['year'] for r in rows)
    rng=random.Random(protocol['seed']); delta=[]; skill=[]
    for _ in range(protocol['bootstrap_replicates']):
        sample=[]
        while len(sample)<len(years):
            start=rng.randrange(len(years))
            sample.extend(years[(start+j)%len(years)] for j in range(protocol['bootstrap_year_block']))
        sample=sample[:len(years)]
        a=sum(totals[y][0] for y in sample); b=sum(totals[y][1] for y in sample)
        n=sum(counts[y] for y in sample)
        delta.append((a-b)/n)
        if b>0: skill.append(1-a/b)
    return {'method':'paired circular two-year block bootstrap, conditional on fitted predictions',
            'replicates':protocol['bootstrap_replicates'], 'years':len(years),
            'brier_difference_95':[percentile(delta,.025),percentile(delta,.975)],
            'brier_skill_95':[percentile(skill,.025),percentile(skill,.975)] if skill else None}


def summarize(predictions, protocol):
    result={}
    for model in MODELS:
        m=metrics(predictions,model,protocol['calibration_bins'])
        m['comparisons']={}
        for baseline in ('frequency','persistence','markov'):
            b=metrics(predictions,baseline)['brier']
            m['comparisons'][baseline]={'brier_skill':1-m['brier']/b if b else None,
                                       **uncertainty(predictions,model,baseline,protocol)}
        m['by_year']=[{'year':year,**metrics([r for r in predictions if r['year']==year],model)}
                      for year in sorted({r['year'] for r in predictions})]
        m['windows']=[{'from':a,'to':b,**metrics([r for r in predictions if a<=r['year']<=b],model)}
                     for a,b in ((2016,2020),(2021,2025))]
        m['by_region']=[{'region':reg,**metrics([r for r in predictions if r['region']==reg],model)}
                        for reg in sorted({r['region'] for r in predictions})]
        result[model]=m
    return result


def abm_sensitivity():
    """Synthetic mechanism sensitivity, no fit or mapping to conflict countries."""
    groups=[]
    for threshold in (.15,.25,.35,.5):
        for share in (.05,.12,.25):
            runs=[agent_simulation(n=180,steps=40,seed=s,initial_share=share,threshold=threshold) for s in range(20)]
            finals=[r['final_share'] for r in runs]
            repeat=agent_simulation(n=180,steps=40,seed=0,initial_share=share,threshold=threshold)
            groups.append({'threshold':threshold,'initial_share':share,'seeds':20,
                           'mean_final':statistics.fmean(finals),'min_final':min(finals),'max_final':max(finals),
                           'sd_final':statistics.pstdev(finals),'reproduced_seed0':repeat==runs[0]})
    return {'evidence_type':'synthetic_simulation_only','n_runs':240,'n':180,'steps':40,
            'empirical_fit':None,'groups':groups,
            'limitation':'Irreversible contagion cannot model conflict cessation; no empirical calibration or causal claim.'}


def execute(data_dir, output_dir, protocol_path=HERE/'protocol.json'):
    protocol=json.loads(protocol_path.read_text())
    raw, provenance=load_official(data_dir,protocol)
    quality=audit(raw,protocol)
    output_dir.mkdir(parents=True,exist_ok=True)
    # Persist the locked specification before computing any model score.
    (output_dir/'protocol.lock.json').write_bytes(canonical(protocol)+b'\n')
    reports={}; all_predictions={}
    for target in ('presence','onset'):
        dataset,excluded=panel(raw,protocol,target)
        sets={}
        for partition,(start,end) in (('validation',protocol['validation_years']),('test',protocol['test_years'])):
            pred=[]
            for year in range(start,end+1):
                pred.extend(predict_origin(dataset,year,protocol))
            sets[partition]={'metrics':summarize(pred,protocol),'rows':len(pred)}
            all_predictions[target+'_'+partition]=pred
        reports[target]={'eligible_panel_rows':len(dataset),'excluded_history_rows':excluded,**sets}
    # Label uncertainty: alternative low/high definitions; models stay frozen.
    sensitivity={}
    for kind in ('low','high'):
        alt,_=panel(raw,protocol,'presence',kind)
        labels={(r['country'],r['year']):r['target'] for r in alt}
        fixed=[{**r,'target':labels[r['country'],r['year']]} for r in all_predictions['presence_test']]
        sensitivity[kind]={'changed_labels':sum(a['target']!=b['target'] for a,b in zip(fixed,all_predictions['presence_test'])),
                           'metrics':{m:metrics(fixed,m) for m in MODELS}}
    result={'schema_version':1,'run_type':'retrospective_revised_release',
            'prospective_eligible':False,'as_of_verified':False,
            'protocol_sha256':digest(canonical(protocol)), 'provenance':provenance,
            'code_sha256':digest(b''.join((HERE/name).read_bytes() for name in ('benchmark.py','engines.py','protocol.json'))),
            'specification_status':'exploratory; v2 fixes underconverged prototype solver after inspection of v1 outputs; not a preregistered confirmatory test',
            'environment':{'python':platform.python_version(),'implementation':platform.python_implementation()},
            'quality':quality,'tasks':reports,'label_sensitivity':sensitivity,
            'abm':abm_sensitivity(),
            'limitations':['Single revised release; NOT a reconstruction of historical available information.',
                           'Zeros mean no qualifying recorded deaths, not absence of violence.',
                           'No GDP, demographic or institutional vintage covariates in v1.',
                           'Two-year lags reduce publication leakage but do not remove revisions.',
                           'Onset means country aggregate threshold crossing after one quiet year.',
                           'Confidence intervals condition on fitted predictions and a short history.']}
    artifact=canonical(result)
    (output_dir/'report.json').write_bytes(artifact+b'\n')
    (output_dir/'predictions.json').write_bytes(canonical(all_predictions)+b'\n')
    (output_dir/'checksums.json').write_bytes(canonical({p.name:digest(p.read_bytes()) for p in sorted(output_dir.glob('*.json')) if p.name!='checksums.json'})+b'\n')
    print(json.dumps({'report_sha256':digest(artifact),'quality':quality,
                      'test':{task:{m:{k:rep['test']['metrics'][m][k] for k in ('n','events','brier','log_loss','average_precision','ece')} for m in MODELS} for task,rep in reports.items()}},indent=2))
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir',type=Path,required=True)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args()
    execute(args.data_dir,args.output_dir)
