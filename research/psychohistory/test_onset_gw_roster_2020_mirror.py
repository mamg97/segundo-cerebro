"""Only synthetic Git metadata; no historical state row IDs in test output."""
from copy import deepcopy
import unittest
from onset_gw_roster_2020_mirror import (
    audit_git,COMMIT,TREE,GW_PATH,GW_SHA,SOURCE_PATH,SOURCE_SHA,CLOCK,
)


def fake():
    return (
        {"sha":COMMIT,"commit":{
            "tree":{"sha":TREE},"author":{"date":CLOCK},"committer":{"date":CLOCK},
            "verification":{"verified":False,"reason":"unsigned"}}},
        {"sha":TREE,"truncated":False,"tree":[
            {"path":GW_PATH,"sha":GW_SHA,"size":4024,"mode":"100644","type":"blob"},
            {"path":SOURCE_PATH,"sha":SOURCE_SHA,"size":1949,"mode":"100644","type":"blob"}]}
    )


class GwRosterMirrorTests(unittest.TestCase):
    def test_metadata_pin_never_certifies_roster(self):
        out=audit_git(*fake())
        self.assertTrue(out["github_git_objects_match_current_metadata"])
        for key in ("roster_contents_parsed","roster_membership_2020_verified",
                    "preissue_server_receipt_independently_verified",
                    "roster_was_available_before_2020_07_01_proven",
                    "zero_event_countries_included_in_valid_frame",
                    "country_onset_risk_set_verified","backtest_authorized",
                    "models_scored","forecast_issued"):
            self.assertFalse(out[key])

    def test_refuse_forged_file_sha_or_time(self):
        for field in ("sha","size","mode","path"):
            c,t=fake()
            t["tree"][0][field]="wrong" if field!="size" else 1
            with self.subTest(field=field), self.assertRaises(ValueError):
                audit_git(c,t)
        c,t=fake(); c["commit"]["committer"]["date"]="2019-01-01T00:00:00Z"
        with self.assertRaises(ValueError): audit_git(c,t)
        c,t=fake(); c["commit"]["verification"]["verified"]=True
        with self.assertRaises(ValueError): audit_git(c,t)
        c,t=fake(); t["truncated"]=True
        with self.assertRaises(ValueError): audit_git(c,t)
        c,t=fake(); t["tree"].append(deepcopy(t["tree"][0]))
        with self.assertRaises(ValueError): audit_git(c,t)


if __name__=="__main__":
    unittest.main()
