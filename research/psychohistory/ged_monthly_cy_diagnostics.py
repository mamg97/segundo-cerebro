"""AV086 corrective audit of AV085; aggregate-only, exploratory, no new model.

CY is a geographic GED derivative. Recorded monthly counts are features,
not annual targets or authenticated observations available at historical issue.
All baseline specifications remain unchanged. Do not pool the overlapping cuts.
"""
from __future__ import annotations
import argparse
import collections
import json
import math
import random
from pathlib import Path
from ged_monthly_cy_bridge import (GED_RELEASES, ged_monthly_panel,
    monthly_descriptors, YEARS, cy23, cy24)
from duration_hazard_first_passage import fit_duration, streak, first_change_by_duration
from release_separated_first_passage import FUTURES, first_passage_bins, brier
from futures import prepare, fit, matrix_for, MODELS

ALERT_THRESHOLD=0.10  # descriptive operating point, never selected by test outcomes
CALIBRATION_EDGES=(0,.05,.10,.20,.50,1.00000001)


def annual_rows(rows, *, latest=None):
    """Reject duplicates, NaN/inf, missing/negative deaths rather than coding low."""
    out={}
    for row in rows:
        cid=int(row['country_id']);year=int(row['year'])
        value=float(row['sb_total_deaths_best'])
        if cid<1 or not math.isfinite(value) or value<0 or (cid,year) in out:
            raise ValueError('Invalid or duplicated annual observation')
        if latest is not None and year>latest:
            raise ValueError('Annual training beyond cutoff')
        out[cid,year]=row
    return out


def confusion(pairs):
    tp=sum(a and y for a,y in pairs);fp=sum(a and not y for a,y in pairs)
    fn=sum(not a and y for a,y in pairs);tn=sum(not a and not y for a,y in pairs)
    return {'n':len(pairs),'truePositive':tp,'falsePositive':fp,'falseNegative':fn,
        'trueNegative':tn,'precision':tp/(tp+fp) if tp+fp else None,
        'eventCoverage':tp/(tp+fn) if tp+fn else None,
        'falseAlarmRateAmongStable':fp/(fp+tn) if fp+tn else None}


def model_metrics(cases):
    n=len(cases);events=sum(c['event'] for c in cases)
    calibration=[]
    for lo,hi in zip(CALIBRATION_EDGES,CALIBRATION_EDGES[1:]):
        sub=[c for c in cases if lo<=c['risk']<hi]
        calibration.append({'lower':lo,'upper':min(hi,1),'n':len(sub),
            'meanRisk':sum(c['risk'] for c in sub)/len(sub) if sub else None,
            'eventRate':sum(c['event'] for c in sub)/len(sub) if sub else None})
    return {'n':n,'events':events,
        'categoricalFirstChangeBrier':sum(c['score'] for c in cases)/n if n else None,
        'categoricalLogLossCapped1e12':sum(c['logloss'] for c in cases)/n if n else None,
        'anyChangeBrier':sum((c['risk']-c['event'])**2 for c in cases)/n if n else None,
        'meanBrierOnChange':sum(c['score'] for c in cases if c['event'])/events if events else None,
        'meanBrierOnStable':sum(c['score'] for c in cases if not c['event'])/(n-events) if n>events else None,
        'calibration':calibration,'alertThreshold':ALERT_THRESHOLD,
        'alerts':confusion([(c['risk']>=ALERT_THRESHOLD,c['event']) for c in cases])}


def region_sensitivity(cases, *, draws=2000):
    """Whole-region paired resampling, descriptive only; few coarse clusters."""
    groups=collections.defaultdict(list)
    for c in cases:groups[c['region']].append(c['duration']-c['country'])
    blocks=list(groups.values());rng=random.Random(54086)
    samples=[]
    for _ in range(draws):
        sample=[v for _ in blocks for v in blocks[rng.randrange(len(blocks))]]
        samples.append(sum(sample)/len(sample))
    samples.sort()
    return {'comparison':'duration_minus_country_shrinkage_categorical_brier',
        'coarseRegionClusters':len(blocks),'draws':draws,
        'descriptivePercentile95':[samples[int(.025*(draws-1))],samples[int(.975*(draws-1))]],
        'fewClusters':True,'temporalIndependence':False,'confirmatory':False}


def evaluate(old,later,panel,cutoff):
    if cutoff not in YEARS:raise ValueError('Unsupported cutoff')
    old_map=annual_rows(old,latest=cutoff)
    if not old_map or max(y for _,y in old_map)!=cutoff:raise ValueError('Wrong annual cutoff')
    # Source-internal reconciliation, not an independent outcome validation.
    old_at_cut={c:r for (c,y),r in old_map.items() if y==cutoff}
    mismatched=names=0
    for cid,row in old_at_cut.items():
        item=panel.get(cid)
        mismatched+=int((item['allDateDeaths'] if item else 0)!=float(row['sb_total_deaths_best']))
        names+=int(item is not None and item['name']!=row['country'])
    if mismatched or names:raise ValueError('GED/CY geographic reconciliation failed')
    lookup=prepare(old,{'threshold_deaths':25})
    fitted=fit(lookup,cutoff+2,FUTURES);duration=fit_duration(lookup,cutoff)
    # Freeze all feature records and baseline probabilities BEFORE reading outcomes.
    frozen=[]
    for c in fitted['countries']:
        cid=c['id'];item=panel.get(cid,{'months':[0]*12,'deaths':[0]*12,
            'impreciseRecords':0})
        descriptor=monthly_descriptors(item)
        probs={m:first_passage_bins(c['initial'],matrix_for(fitted,c,m,FUTURES)) for m in MODELS}
        probs['duration_hazard_fixed']=first_change_by_duration(c['initial']%2,
            streak(lookup,cid,cutoff),duration['rates'])
        frozen.append((c,descriptor,probs,sum(item['months'][9:])>0))
    labels=annual_rows([r for r in later if int(r['year']) in YEARS[cutoff]])
    results={m:[] for m in [*MODELS,'duration_hazard_fixed']}
    rules={'any_exact_record_in_year':[],'q4_exact_record':[]}
    monthly=[0]*12;monthly_deaths=[0]*12;missing=0;region_cases=[]
    desc=[]
    for c,d,probs,q4 in frozen:
        cid=c['id']
        item=panel.get(cid)
        if item:
            monthly=[a+b for a,b in zip(monthly,item['months'])]
            monthly_deaths=[a+b for a,b in zip(monthly_deaths,item['deaths'])]
        desc.append(d)
        if any((cid,y) not in labels for y in YEARS[cutoff]):missing+=1;continue
        initial=c['initial']%2
        actual=next((i for i,y in enumerate(YEARS[cutoff])
            if int(float(labels[cid,y]['sb_total_deaths_best'])>=25)!=initial),2)
        event=actual<2
        for m,p in probs.items():
            results[m].append({'event':event,'risk':sum(p[:2]),'score':brier(p,actual),
                'logloss':-math.log(max(1e-12,p[actual])),'initial':initial})
        region_cases.append({'region':c['region'],
            'duration':brier(probs['duration_hazard_fixed'],actual),
            'country':brier(probs['country_shrinkage'],actual)})
        if initial==0:
            rules['any_exact_record_in_year'].append((d['recordedExactEvents']>0,event))
            rules['q4_exact_record'].append((q4,event))
    if not region_cases:raise ValueError('No complete outcomes')
    return {'schema':'psychohistory.ged_monthly_cy_corrective_audit.v1',
        'status':'EXPLORATORY_DIAGNOSTICS_NOT_NEW_MODEL_OR_INDEPENDENT_VALIDATION',
        'cutoff':cutoff,'outcomeYears':list(YEARS[cutoff]),
        'roster':len(frozen),'scored':len(region_cases),'missingOutcomes':missing,
        'reconciliation':{'countryYears':len(old_at_cut),'deathTotalMismatches':mismatched,
            'nameMismatches':names,'independentSource':False},
        'monthlyExactDayRecordedEvents':monthly,'monthlyExactDayRecordedDeaths':monthly_deaths,
        'featureCoverage':{'countriesWithExactRecords':sum(d['recordedExactEvents']>0 for d in desc),
            'countriesWithExcludedImpreciseRecords':sum(d['excludedImpreciseRecords']>0 for d in desc),
            'temporalHHIDefinedCountries':sum(d['temporalEventHHI'] is not None for d in desc)},
        'models':{m:{'all':model_metrics(rows),
            'initialLow':model_metrics([c for c in rows if not c['initial']])} for m,rows in results.items()},
        'gedRulesInitialLowOnly':{k:confusion(v) for k,v in rules.items()},
        'regionUncertaintySensitivity':region_sensitivity(region_cases),
        'sourcePublicationAtOriginVerified':False,'forecastIssued':False,
        'prospectiveSkillDemonstrated':False,'newModelFitted':False,
        'countrySemantics':'BOTH_GW_GEOGRAPHY_CY_DERIVED_FROM_GED',
        'caveat':'Two inspected overlapping windows; late-downloaded annual archives, no source-vintage clock at historical issue. Monthly recorded zeros are not absence of violence; no threshold or model selection.'}


def run(ged_zip,cy_old,cy_new,cutoff):
    panel,quality=ged_monthly_panel(ged_zip,cutoff,expected_sha=GED_RELEASES[cutoff]['sha256'])
    if cutoff==2022:
        old,_=cy23.rows_23_xlsx(cy_old,cy23.PIN_231)
        later,_=cy23.bounded_zip(cy_new,cy23.PIN_251,cy23.NEW_VERSION)
    else:
        old,_=cy24.probe(cy_old,'00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260',cy24.OLD_VERSION)
        later,_=cy24.probe(cy_new,cy24.PROTOCOL['archive_sha256'],cy24.NEW_VERSION)
    return {**evaluate(old,later,panel,cutoff),'gedSource':quality}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ged',required=True,type=Path)
    parser.add_argument('--cy-old',required=True,type=Path)
    parser.add_argument('--cy-new',required=True,type=Path)
    parser.add_argument('--cutoff',required=True,type=int,choices=YEARS)
    a=parser.parse_args()
    print(json.dumps(run(a.ged,a.cy_old,a.cy_new,a.cutoff),indent=2,sort_keys=True,allow_nan=False))

if __name__=='__main__':main()
