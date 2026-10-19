"""Outcome-blind source-name comparison; never certify geographic identity."""
from __future__ import annotations
import csv
import io
import unicodedata
from datetime import date, timedelta
from collections import defaultdict
from cow_gw_token_review import _records, _membership


def _name(x):
    if not isinstance(x, str) or not x.strip():
        raise ValueError('Blank state label')
    return ' '.join(unicodedata.normalize('NFKC', x).casefold().split())


def _source(raw, kind):
    interval_rows = _records(raw, kind)
    if kind == 'cow':
        reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''))
        field = 'statenme'
    else:
        try:
            txt = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            txt = raw.decode('cp1252')
        reader = csv.DictReader(io.StringIO(txt, newline=''), delimiter='\t')
        field = 'countryname'
    labels = [_name(row[field]) for row in reader]
    if len(labels) != len(interval_rows):
        raise ValueError('Source membership and names differ')
    return [(code, token, start, end, label)
            for (code, token, start, end), label in zip(interval_rows, labels)]

def analyze(cow_raw, gw_raw, micro_raw, months,
            cow_hash=None, gw_hash=None, micro_hash=None):
    """Report only aggregated review candidates, never country rows."""
    import re
    from cow_gw_denominator_bridge import parse_cow, build_gw_with_microstates
    from independent_gw_roster import SOURCE_END
    cow = parse_cow(cow_raw, cow_hash)
    gw = build_gw_with_microstates(gw_raw, micro_raw, gw_hash, micro_hash)
    if not isinstance(months, list) or not 1 <= len(months) <= 24 or (
        any(not isinstance(x, str) or not re.fullmatch(
            r'(?:19|20)[0-9]{2}-(?:0[1-9]|1[0-2])', x) for x in months)
        or months != sorted(set(months))
    ):
        raise ValueError('Issue months must be unique and chronological')
    crows = _source(cow_raw, 'cow')
    grows = _source(gw_raw, 'gw') + _source(micro_raw, 'gw')
    summaries, review = [], []
    for ym in months:
        year, month = map(int, ym.split('-'))
        first = date(year, month, 1)
        last = date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)
        if last > date(2024, 12, 31):
            summaries.append({'period': ym, 'status': 'COW_SOURCE_EXPIRED',
                              'n_cow': None, 'n_gw': None, 'n_name_leads': 0})
            continue
        def active(rows):
            _membership([(c,t,a,z) for c,t,a,z,_ in rows], first, last)
            selected = {}
            for code, token, start, stop, name in rows:
                if start <= first and stop >= last:
                    if code in selected:
                        raise ValueError('Ambiguous full-month state code')
                    selected[code] = (token, name)
            if len({x[0] for x in selected.values()}) != len(selected):
                raise ValueError('Ambiguous full-month state abbreviation')
            return selected
        cf = active(crows)
        if last > SOURCE_END:
            summaries.append({'period': ym, 'status': 'GW_SOURCE_EXPIRED',
                              'n_cow': len(cf), 'n_gw': None, 'n_name_leads': 0})
            continue
        gf = active(grows)
        ct = {v[0]: code for code,v in cf.items()}
        gt = {v[0]: code for code,v in gf.items()}
        shared = set(ct) & set(gt)
        missing_c = {code: (tok,name) for code,(tok,name) in cf.items() if tok not in gt}
        missing_g = {code: (tok,name) for code,(tok,name) in gf.items() if tok not in ct}
        cn, gn = defaultdict(list), defaultdict(list)
        for code,(tok,name) in missing_c.items():
            cn[name].append((code,tok))
        for code,(tok,name) in missing_g.items():
            gn[name].append((code,tok))
        common = set(cn) & set(gn)
        unique = {name for name in common if len(cn[name]) == len(gn[name]) == 1}
        equal = 0
        for name in sorted(unique):
            cc, ctoken = cn[name][0]
            gc, gtoken = gn[name][0]
            equal += (cc == gc)
            review.append({'period': ym, 'cow_code': cc, 'cow_token': ctoken,
                           'gw_code': gc, 'gw_token': gtoken, 'source_name': name,
                           'status': 'EXACT_NAME_LEAD_UNAPPROVED',
                           'geographic_identity_verified': False,
                           'historical_availability_verified': False})
        summaries.append({
            'period': ym, 'status': 'NAME_TRIAGE_REVIEW_REQUIRED',
            'n_cow': len(cf), 'n_gw': len(gf),
            'n_same_token': len(shared),
            'n_same_token_different_code': sum(ct[t] != gt[t] for t in shared),
            'n_cow_without_token': len(missing_c),
            'n_gw_without_token': len(missing_g),
            'n_name_leads': len(unique),
            'n_name_leads_same_code': equal,
            'n_name_leads_different_code': len(unique)-equal,
            'n_ambiguous_repeated_name': len(common)-len(unique),
            'n_cow_still_unresolved': len(missing_c)-len(unique),
            'n_gw_still_unresolved': len(missing_g)-len(unique),
            'n_numeric_false_friends': sum(code in gf and gf[code][0] != tok
                                          for code,(tok,_) in missing_c.items()),
            'all_mappings_approved': False,
        })
    return ({
        'schema': 'psychohistory.cow_gw_name_triage.v1',
        'status': 'NAMES_AND_CODES_ARE_ONLY_REVIEW_LEADS',
        'periods': summaries, 'n_private_review_leads': len(review),
        'cow_sha256_observed_now': cow['sha256_observed_now'],
        'gw_sha256_observed_now': gw['base_sha256_observed_now'],
        'micro_sha256_observed_now': gw['micro_sha256_observed_now'],
        'geographic_identity_verified': False,
        'source_as_of_verified': False, 'ucdp_country_coverage_verified': False,
        'absence_of_events_means_negative': False,
        'vintage_correct_backtest': False, 'models_scored': False,
        'forecast_issued': False,
        'warning': 'Name equality is not territorial equivalence; source vintages and negative labels not certified.'
    }, review)
