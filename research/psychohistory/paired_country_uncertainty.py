"""Descriptive paired resampling of countries within ONE annual test.

Countries share geopolitical shocks. This bootstrap does not account for
regional dependence or provide independent temporal confirmation.
"""
from __future__ import annotations
import math
import random

ALLOWED=frozenset(("frequency","persistence","markov","interaction_table","v2_logistic"))
DRAW_COUNT=1000
SEED=20261020

def _quantile(values,q):
    ordered=sorted(values)
    x=q*(len(ordered)-1)
    lo=int(x);hi=min(lo+1,len(ordered)-1)
    return ordered[lo]+(x-lo)*(ordered[hi]-ordered[lo])

def descriptive_paired_ci(scored, challenger="v2_logistic", comparison="markov",
                          repetitions=DRAW_COUNT, seed=SEED):
    if (challenger!="v2_logistic" or comparison not in ALLOWED-{"v2_logistic"} or
       type(repetitions) is not int or not 100<=repetitions<=5000 or
       type(seed) is not int or not 0<=seed<=2**32-1):
        raise ValueError("Unauthorized model pair or bootstrap specification")
    if not isinstance(scored,list) or len(scored)<3:
        raise ValueError("At least three paired country observations required")
    ordered=sorted(scored,key=lambda x:x["country"])
    keys=set();years=set();losses=[]
    for row in ordered:
        cid=row.get("country")
        year=row.get("year")
        y=row.get("target")
        a=row.get(challenger);b=row.get(comparison)
        if (type(cid) is not int or cid in keys or
            type(year) is not int or type(y) is not int or y not in (0,1) or
            any(type(v) not in (int,float) or not math.isfinite(v) or not 0<=v<=1 for v in (a,b))):
            raise ValueError("Paired, unique, numeric country-year probabilities required")
        keys.add(cid);years.add(year)
        losses.append((a-y)**2-(b-y)**2)
    if len(years)!=1:
        raise ValueError("Resampling is within a single fixed test year")
    n=len(losses);mean=math.fsum(losses)/n
    rnd=random.Random(seed);samples=[]
    for _ in range(repetitions):
        samples.append(math.fsum(losses[rnd.randrange(n)] for _ in range(n))/n)
    low,high=_quantile(samples,.025),_quantile(samples,.975)
    return {
        "method":"paired_country_bootstrap_single_year_descriptive",
        "test_year":next(iter(years)),"n_countries":n,
        "challenger":challenger,"comparator":comparison,
        "mean_brier_difference_challenger_minus_comparator":round(mean,8),
        "ci95_descriptive_country_resample":[round(low,8),round(high,8)],
        "bootstrap_draws":repetitions,"fixed_seed":seed,
        "directional_advantage_observed":mean<0,
        "region_dependence_accounted_for":False,
        "independent_time_blocks":1,
        "confirmatory_skill_test":False,
        "prospective_skill_demonstrated":False
    }

def compare_to_references(scored):
    return {model:descriptive_paired_ci(scored,comparison=model)
            for model in ("frequency","persistence","markov","interaction_table")}
