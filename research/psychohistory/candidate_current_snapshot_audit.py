"""AV087: current Candidate source admission audit, no model or forecast.

Reuses the prior historical reader; does not repeat historical experiments.
All source rows, including out-of-month observations, remain in the denominator.
Only aggregate quality counts and public source metadata may be printed.
"""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
from candidate_cross_vintage import read_month

EDITION='26.0.9'
SOURCE_URL='https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_9.csv'
SOURCE_SHA='20256b0d674f4c58d747c7c75ddc012eabfedf44ada22f436ef2d9a6405567d5'
CODEBOOK_URL='https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.5.pdf'
CODEBOOK_SHA='0107eac75e0b0bf0c0c1f2146dd1818af8ec943e254471b73453f53a64384d33'
CODEBOOK_BYTES=739188


def audit(raw,codebook):
    if (not isinstance(codebook,bytes) or len(codebook)!=CODEBOOK_BYTES or
        not codebook.startswith(b'%PDF-') or hashlib.sha256(codebook).hexdigest()!=CODEBOOK_SHA):
        raise ValueError('Current Candidate codebook does not match pinned bytes')
    vintage=read_month(raw,EDITION,SOURCE_SHA)
    first,last=date(2026,9,1),date(2026,10,1)
    counts={'neitherEndpointInMonth':0,'entireIntervalBeforeMonth':0,
        'entireIntervalAfterMonth':0,'spansWholeMonthWithoutEndpoint':0,
        'undocumentedPrecision':0,'exactDayContradiction':0}
    exact=state_exact=0
    for cid,kind,start,end,precision in vintage['rows'].values():
        inside=first<=start<last or first<=end<last
        counts['neitherEndpointInMonth']+=int(not inside)
        counts['entireIntervalBeforeMonth']+=int(end<first)
        counts['entireIntervalAfterMonth']+=int(start>=last)
        counts['spansWholeMonthWithoutEndpoint']+=int(start<first and end>=last)
        counts['undocumentedPrecision']+=int(precision not in ('1','2','3','4','5'))
        counts['exactDayContradiction']+=int(precision=='1' and start!=end)
        exact+=int(inside and precision=='1' and start==end)
        state_exact+=int(inside and precision=='1' and start==end and kind==1)
    blocked=any(counts[k] for k in ('neitherEndpointInMonth','undocumentedPrecision','exactDayContradiction'))
    return {'schema':'psychohistory.current_candidate_quality_observation.v1',
        'edition':EDITION,'nominalMonth':'2026-09','sourceUrl':SOURCE_URL,
        'sourceSha256':SOURCE_SHA,'codebookUrl':CODEBOOK_URL,'codebookSha256':CODEBOOK_SHA,
        'codebookVersion':'1.5','observedUtcDate':'2026-10-21',
        'nSourceEvents':vintage['n_events'],
        'nCountriesWithRecordedEvents':len({v[0] for v in vintage['rows'].values()}),
        'precisionCounts':vintage['counts_date_prec'],'temporalQualityCounts':counts,
        'nExactDayRecordsWithinExportMonth':exact,
        'nStateBasedExactDayRecordsWithinExportMonth':state_exact,
        'status':'SOURCE_QUALITY_BLOCKED' if blocked else 'QUALITY_INTACT_OTHER_ADMISSION_GATES_PENDING',
        'rowsSilentlyDropped':0,'countryRosterKnownFromEvents':False,
        'absentCountryIsConflictFree':False,'sourceHistoricallyAvailableAtIssueVerified':False,
        'backtestAuthorized':False,'forecastIssued':False,'scoresComputed':False,
        'caveat':'Observation of bytes now cannot date their first publication. Current codebook permits precision 1-5 and either endpoint in exported month; do not reinterpret an anomalous row, drop it silently, infer negatives, or substitute Candidate for annual CY.'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',required=True,type=Path)
    p.add_argument('--codebook',required=True,type=Path)
    args=p.parse_args()
    if args.source.stat().st_size>80000000 or args.codebook.stat().st_size>2000000:
        p.error('Source or codebook exceeds bounds')
    print(json.dumps(audit(args.source.read_bytes(),args.codebook.read_bytes()),indent=2,sort_keys=True))

if __name__=='__main__':main()
