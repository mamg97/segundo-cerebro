"""Offline metadata-only validation of a historical third-party UCDP GED 19.1 mirror.

A Git tree and blob SHA pin immutable *object identity* but neither commit
author/committer timestamps nor an unsigned commit prove when GitHub received
the file. No source bytes, state IDs, events, scores or forecasts are emitted.
"""
from __future__ import annotations

import argparse
from datetime import datetime, date, timezone
import json
from pathlib import Path
import re

SCHEMA = 'psychohistory.ged191_thirdparty_git_tree_metadata.v1'
REPO = 'knapply/data4ds4da'
COMMIT = '02ac3d720bb0a34248888a6900e2d7854be8a4ba'
TREE = '58119f4869633210bc28b94bce9061596a517ed3'
PATH = 'inst/datasets/ucdp_19.1/ged191.csv'
BLOB = '3f7e4621ba0d264a62b221fa06773e02d66d046f'
SIZE = 68235762
SOURCE_OBSERVATIONS_END = date(2018,12,31)
ISO_UTC = re.compile(r'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$')


def _utc(text):
    if not isinstance(text,str) or not ISO_UTC.fullmatch(text):
        raise ValueError('Require exact UTC timestamp ending Z')
    try:
        return datetime.strptime(text,'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError('Invalid timestamp') from exc


def _origin(text):
    if not isinstance(text,str) or not re.fullmatch(r'[0-9]{4}-01-01',text):
        raise ValueError('Keep AV-042 January 1 calendar-origin only')
    try:
        d=date.fromisoformat(text)
    except ValueError as exc:
        raise ValueError('Invalid calendar origin') from exc
    if not 1947 <= d.year <= 2024:
        raise ValueError('Outside UCDP onset 25.1 target window')
    return d


def inspect_mirror(commit, tree, issue_dates=('2020-01-01','2021-01-01')):
    if (not isinstance(commit,dict) or not isinstance(tree,dict) or
            commit.get('sha')!=COMMIT or tree.get('sha')!=TREE):
        raise ValueError('Unexpected repository historical object revision')
    internal=commit.get('commit')
    if not isinstance(internal,dict):
        raise ValueError('GitHub commit fields absent')
    if internal.get('tree',{}).get('sha')!=TREE:
        raise ValueError('Commit does not refer to pinned tree')
    author=internal.get('author',{})
    committer=internal.get('committer',{})
    author_clock=_utc(author.get('date'))
    committer_clock=_utc(committer.get('date'))
    if author_clock!=committer_clock or committer_clock.isoformat()!='2020-01-11T17:55:45+00:00':
        raise ValueError('Pinned third-party claim of commit time changed')
    verification=internal.get('verification',{})
    if verification.get('verified') is not False or verification.get('reason')!='unsigned':
        raise ValueError('Pinned unsigned historical commit assertion changed')
    if tree.get('truncated') is not False or not isinstance(tree.get('tree'),list):
        raise ValueError('Incomplete tree metadata')
    files=[e for e in tree['tree'] if e.get('path')==PATH]
    if len(files)!=1 or files[0].get('sha')!=BLOB or files[0].get('size')!=SIZE or files[0].get('type')!='blob' or files[0].get('mode')!='100644':
        raise ValueError('Historical GED raw CSV path and Git object identity mismatched')
    if (not isinstance(issue_dates,tuple) or not 1<=len(issue_dates)<=12 or
            any(not isinstance(t,str) for t in issue_dates)):
        raise ValueError('1–12 ordered origins required')
    origins=[_origin(t) for t in issue_dates]
    if origins!=sorted(set(origins)):
        raise ValueError('Require unique ordered issue dates')
    rows=[]
    for issue in origins:
        # Date in Git object is written by author, not independent GitHub receipt.
        claimed_before=committer_clock < datetime(issue.year,1,1,tzinfo=timezone.utc)
        # No archive through 2019 can arise from a file ending in 2018.
        covers_prior=SOURCE_OBSERVATIONS_END >= date(issue.year-1,12,31)
        rows.append({
            'issue_date':issue.isoformat(),
            'thirdparty_git_commit_claim_before_origin':claimed_before,
            'complete_prior_year_activity_present':covers_prior,
            'historical_origin_eligible':False,
            'reasons':['AUTHOR_CONTROLLED_UNSIGNED_GIT_COMMIT_CLOCK',
                       'NO_INDEPENDENT_HISTORICAL_REPOSITORY_RECEIPT',
                       'THIRD_PARTY_MIRROR_BYTES_NOT_DOWNLOADED_OR_COMPARED',
                       'INTRASTATE_ACTIVITY_PRIOR_YEAR_AND_ZERO_COUNTRIES_NOT_CERTIFIED'],
        })
    return {
        'schema':SCHEMA,
        'source':'UCDP GED 19.1 third-party historical mirror',
        'thirdparty_repo':REPO,
        'pinned_commit':COMMIT,
        'pinned_tree':TREE,
        'pinned_blob_sha1_git':BLOB,
        'pinned_csv_size_bytes':SIZE,
        'source_observations_end':SOURCE_OBSERVATIONS_END.isoformat(),
        'unsigned_git_commit_time_claim_utc':committer_clock.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'immutable_git_tree_metadata_matches_pins_now':True,
        'actual_blob_bytes_compared_to_official_ucdp':False,
        'independent_server_push_time_authenticated':False,
        'historical_byte_availability_proven':False,
        'source_asof_verified':False,
        'country_risk_set_verified':False,
        'backtest_authorized':False,
        'models_scored':False,
        'forecast_issued':False,
        'issue_scenarios':rows,
        'warning':('Pinned Git object SHA identifies repository content, NOT historically '
                   'authenticated publication time; no original-event rows are read.'),
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--commit-json',type=Path,required=True)
    p.add_argument('--tree-json',type=Path,required=True)
    p.add_argument('--issue-date',action='append',required=True)
    args=p.parse_args()
    c=json.loads(args.commit_json.read_text(encoding='utf-8'))
    t=json.loads(args.tree_json.read_text(encoding='utf-8'))
    print(json.dumps(inspect_mirror(c,t,tuple(args.issue_date)),sort_keys=True))


if __name__=='__main__':
    main()
