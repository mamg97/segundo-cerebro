"""Entirely fictional external metadata records; no third-party data asserted here."""
import copy
import unittest
from thirdparty_release_clock import parse_catalog, audit, SCHEMA

URL="https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_01_24_12.csv"
EVIDENCE="https://datasette-public.owid.io/owid.json?sql=synthetic"


def fake():
    return {
        "ok":True,
        "columns":["producer","versionProducer","urlDownload","datePublished","dateAccessed"],
        "rows":[["Uppsala Conflict Data Program","v24.01.24.12",URL,
                 "2025-01-28","2025-02-19T00:00:00"]],
    }


def parse(payload=None, **overrides):
    return parse_catalog(fake() if payload is None else payload,
                         expected_version=overrides.get("version","v24.01.24.12"),
                         expected_download_url=overrides.get("url",URL),
                         evidence_url=overrides.get("evidence",EVIDENCE))


class ThirdPartyClockTests(unittest.TestCase):
    def test_three_distinct_issue_stages_no_positive_asof_status(self):
        result=audit(parse(),["2025-01","2025-02","2025-03"])
        self.assertEqual(result["schema"],SCHEMA)
        self.assertEqual([c["status"] for c in result["cells"]],[
            "NOT_PUBLISHED_BY_DECLARED_DATE",
            "NO_THIRD_PARTY_ACCESS_BEFORE_ISSUE",
            "METADATA_PREISSUE_BYTES_NOT_ATTESTED",
        ])
        self.assertFalse(result["source_as_of_verified"])
        self.assertFalse(result["historical_byte_hash_attested_by_third_party"])
        self.assertFalse(result["vintage_correct_replay_authorized"])
        self.assertFalse(result["models_scored"])
        self.assertFalse(result["forecast_issued"])
        self.assertFalse(result["independent_timestamp_cryptographically_authenticated"])

    def test_same_day_not_before_issue_and_origin_order(self):
        obs=fake()
        obs["rows"][0][-2:]=["2025-01-01","2025-02-01T00:00:00"]
        result=audit(parse(obs),["2025-01","2025-02","2025-03"])
        self.assertEqual(result["cells"][0]["status"],"NOT_PUBLISHED_BY_DECLARED_DATE")
        self.assertEqual(result["cells"][1]["status"],"NO_THIRD_PARTY_ACCESS_BEFORE_ISSUE")
        for issue in (["2025-02","2025-02"],["2025-02","2025-01"],["2025-00"],[]):
            with self.subTest(issue=issue), self.assertRaises(ValueError):
                audit(parse(),issue)

    def test_source_and_publisher_identity_cannot_be_swapped(self):
        cases=[]
        for i,v in [(0,"Unverified publishing office"),(1,"v24.0.12"),
                    (2,"https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_0_12.csv")]:
            z=fake()
            z["rows"][0][i]=v
            cases.append(z)
        for row in cases:
            with self.assertRaises(ValueError):
                parse(row)
        for bad_url in ("https://ucdp.uu.se.evil.invalid/downloads/candidateged/GEDEvent_v24_01_24_12.csv",
                        "http://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_01_24_12.csv",
                        "https://ucdp.uu.se@evil.invalid/downloads/candidateged/GEDEvent_v24_01_24_12.csv",
                        "https://ucdp.uu.se/downloads/ged/ged251.zip"):
            with self.subTest(bad_url=bad_url),self.assertRaises(ValueError):
                parse(url=bad_url)

    def test_reject_backdated_incoherent_or_ambiguous_records(self):
        cases=[]
        for i,v in [(3,"2025-13-01"),(3,"2025-03-01"),(4,"2025-02-19"),
                    (4,"2025-02-19T15:30:00")]:
            z=fake()
            z["rows"][0][i]=v
            cases.append(z)
        z=fake()
        z["rows"].append(list(z["rows"][0]))
        cases.append(z)
        z=fake()
        z["columns"][0]="unexpected"
        cases.append(z)
        for c in cases:
            with self.subTest(c=c),self.assertRaises(ValueError):
                parse(c)
        with self.assertRaises(ValueError):
            parse(evidence="https://datasette-public.owid.io.evil.invalid/owid.json")
        with self.assertRaises(ValueError):
            parse(evidence="http://datasette-public.owid.io/owid.json")


if __name__=="__main__":
    unittest.main()
