"""Create-only private observation of official NAV bytes, never an as-of stamp.

No scheduler, forecast, authenticated endpoint, upload or external timestamp.
The source may be revised and delayed; this records local retrieval, not first
provider publication or independent historical availability.
"""
import argparse
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import urllib.request

from equities_drawdown_research import private_path
from etf_issuer_source import intake

URLS={
    'nav.xlsx':'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-spy.xlsx',
    'distributions.xlsx':'https://www.ssga.com/library-content/products/fund-data/etfs/us/spdr-etf-historical-distributions.xlsx',
}
MAX_BYTES=20_000_000


def now():
    return datetime.now(timezone.utc).isoformat()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        raise ValueError('Source redirect requires an explicit contract review')


def download(url):
    if url not in URLS.values():
        raise ValueError('Only the contracted public issuer URLs are permitted')
    opener=urllib.request.build_opener(NoRedirect())
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 private research source observation'})
    with opener.open(request,timeout=30) as response:
        if response.status!=200 or response.url!=url:
            raise ValueError('Unexpected source destination/status')
        raw=response.read(MAX_BYTES+1)
        headers={k:response.headers[k] for k in ('Date','Last-Modified','ETag','Content-Type','Content-Length') if k in response.headers}
    return raw,headers


def capture(directory,*,downloader=download,ticker='SPY'):
    directory=private_path(directory,create=True)
    directory.mkdir(mode=0o700,exist_ok=False)
    def save(name,value):
        content=value if isinstance(value,bytes) else (json.dumps(value,sort_keys=True,indent=2)+'\n').encode()
        fd=os.open(directory/name,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as stream:
            stream.write(content)
    manifest=dict(schema='psychohistory.local_issuer_observation.v1',local_capture_only=True,
                  independent_time_verified=False,first_provider_publication_verified=False,
                  historical_asof_verified=False,source_admitted=False,forecast_issued=False,
                  model_admitted=False,current_risk_estimated=False,sources=[])
    raws={}
    try:
        for name,url in URLS.items():
            begin=now();raw,headers=downloader(url)
            # Preserve bounded received bytes even when they fail format validation.
            if not isinstance(raw,bytes) or len(raw)>MAX_BYTES:
                raise ValueError('Invalid or oversized source payload')
            save(name,raw);raws[name]=raw
            manifest['sources'].append(dict(filename=name,url=url,sha256=hashlib.sha256(raw).hexdigest(),
                bytes=len(raw),request_started_local_utc=begin,response_completed_local_utc=now(),
                response_headers={k:v for k,v in headers.items() if k in ('Date','Last-Modified','ETag','Content-Type','Content-Length')}))
            if not raw.startswith(b'PK'):
                raise ValueError('Original response is not an XLSX archive')
        observed=now()
        report=intake(raws['nav.xlsx'],manifest['sources'][0]['sha256'],
                      raws['distributions.xlsx'],manifest['sources'][1]['sha256'],ticker,observed[:10])
        save('intake.json',report)
        manifest.update(status='LOCAL_OBSERVATION_COMPLETE',capture_completed_local_utc=observed,
                        intake_status=report['status'],first_nav_date=report['rows'][0]['date'],
                        last_nav_date=report['rows'][-1]['date'],observations=len(report['rows']),
                        date_issues_preserved=report['date_issues'])
    except Exception:
        manifest.update(status='LOCAL_OBSERVATION_INCOMPLETE',failure_recorded_local_utc=now())
        save('MANIFEST.json',manifest)
        raise
    save('MANIFEST.json',manifest)
    return manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out-dir',required=True,type=Path,help='New private directory outside Git')
    args=parser.parse_args()
    report=capture(args.out_dir)
    print(json.dumps({k:report[k] for k in ('status','intake_status','last_nav_date','observations',
                     'independent_time_verified','source_admitted','forecast_issued','current_risk_estimated')}))


if __name__=='__main__':
    main()
