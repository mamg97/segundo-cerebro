"""Best-effort public CDX observation; outages do not imply missing captures.

Only public index metadata is fetched (no UCDP records or archive binaries).
The output never claims a timestamp is independently authenticated.
"""
from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from onset_archive_witness import check_capture_index

URL = ('https://web.archive.org/cdx/search/cdx?'
       'url=ucdp.uu.se%2Fdownloads%2Fged%2Fged191-csv.zip'
       '&output=json&filter=statuscode%3A200&to=2019&collapse=digest')


def probe(request_fn=urlopen):
    status = 'INDEX_REQUEST_UNAVAILABLE_NOT_EVIDENCE_OF_ABSENCE'
    n = None
    try:
        request = Request(URL, headers={'User-Agent':'Psychohistory-Academic-Research/1.0'})
        with request_fn(request, timeout=18) as response:
            if response.geturl().split('/')[2] != 'web.archive.org':
                raise ValueError('unexpected redirected index host')
            raw = response.read(262145)
        assessment = check_capture_index(raw, 'ucdp_ged_19_1','2020-01-01T00:00:00Z')
        status = 'INDEX_METADATA_PRESENT_NO_HISTORICAL_BINARY_PROOF'
        n = assessment['n_valid_preissue_capture_claims']
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        pass
    return {
        'status':status,
        'n_preissue_capture_claims_when_index_accessible':n,
        'historical_bytes_authenticated':False,
        'source_asof_verified':False,
        'backtest_authorized':False,
        'forecast_issued':False,
    }


if __name__=='__main__':
    print(json.dumps(probe(),sort_keys=True))
