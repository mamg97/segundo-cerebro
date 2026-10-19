"""Validate 2020 third-party GW roster Git object identity, not its as-of timestamp.

The historical RData blob is 4 KB but is deliberately NOT loaded into
GitHub logs, public source, or the forecasting risk-set. The 2020 git commit
was unsigned; author dates are not independent server receipts.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone

SCHEMA="psychohistory.gw_roster_2020_mirror_metadata.v1"
COMMIT="a42f5b0ce0b648abbdc2d5bf156ae51637d2fdaa"
TREE="3e531cc283e35551623b2acbd8418fbfaf37a8e6"
GW_PATH="data/gwstates.rda"
GW_SHA="312f49a9d18074c7677e445dc6eb8ab2a75d3ddc"
SOURCE_PATH="data-raw/gwstates.R"
SOURCE_SHA="4eef06006a7886c2c3ecf5056d92ad474b09b174"
CLOCK="2020-05-26T08:40:01Z"


def audit_git(commit,tree):
    if not isinstance(commit,dict) or not isinstance(tree,dict):
        raise ValueError("Git metadata must be dictionaries")
    if commit.get("sha")!=COMMIT or tree.get("sha")!=TREE or tree.get("truncated") is not False:
        raise ValueError("Unexpected historical Git commit/tree")
    inner=commit.get("commit",{})
    if inner.get("tree",{}).get("sha")!=TREE:
        raise ValueError("Incorrect Git tree ancestry")
    auth=inner.get("author",{}).get("date")
    stamped=inner.get("committer",{}).get("date")
    if auth!=CLOCK or stamped!=CLOCK:
        raise ValueError("Historical Git claimed time differs from verified record")
    if inner.get("verification",{}).get("verified") is not False or inner.get("verification",{}).get("reason")!="unsigned":
        raise ValueError("Unsigned clock expectation changed; re-audit")
    rows=tree.get("tree")
    if not isinstance(rows,list):
        raise ValueError("Missing file entries")
    for path,sha,size in ((GW_PATH,GW_SHA,4024),(SOURCE_PATH,SOURCE_SHA,1949)):
        hits=[x for x in rows if x.get("path")==path]
        if (len(hits)!=1 or hits[0].get("sha")!=sha or hits[0].get("size")!=size
                or hits[0].get("type")!="blob" or hits[0].get("mode")!="100644"):
            raise ValueError("GW roster blob identity mismatch")
    return {
        "schema":SCHEMA,
        "provider":"andybega/states",
        "historical_commit":COMMIT,"historical_tree":TREE,
        "gw_roster_git_blob":GW_SHA,"gw_roster_bytes":4024,
        "raw_source_git_blob":SOURCE_SHA,
        "claimed_git_commit_date_utc":CLOCK,
        "github_git_objects_match_current_metadata":True,
        "roster_contents_parsed":False,
        "roster_membership_2020_verified":False,
        "preissue_server_receipt_independently_verified":False,
        "roster_was_available_before_2020_07_01_proven":False,
        "zero_event_countries_included_in_valid_frame":False,
        "country_onset_risk_set_verified":False,
        "source_asof_verified":False,
        "backtest_authorized":False,
        "models_scored":False,
        "forecast_issued":False,
        "warning":"Unsigned Git author time does NOT certify server receipt before July 2020.",
    }


if __name__=="__main__":
    import argparse
    from pathlib import Path
    p=argparse.ArgumentParser()
    p.add_argument("--commit-json",type=Path,required=True)
    p.add_argument("--tree-json",type=Path,required=True)
    x=p.parse_args()
    print(json.dumps(audit_git(json.loads(x.commit_json.read_text()),
                               json.loads(x.tree_json.read_text())),sort_keys=True))
