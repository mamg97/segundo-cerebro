"""Synthetic only: private preparation ledger is not prospective issuance."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from prospective_draft_ledger import SCHEMA, append_draft, scan


def draft(id="SYNTHETIC-FORECAST-001", entry="SYNTHETIC-ENTRY-001", supersedes=None):
    return {
        "schema":SCHEMA,"kind":"UNSEALED_DRAFT","entryId":entry,
        "sourceAvailabilityVerified":False,"independentSealVerified":False,
        "prospectiveEligible":False,"supersedesEntrySha256":supersedes,
        "resolutionProtocolSha256":"a"*64,
        "payload":{
            "id":id,"phenomenon":"SYNTHETIC mock event at synthetic threshold",
            "region":"SYNTHETIC-LAND","horizon":"2029 full calendar year",
            "issuedAt":"2028-12-01T12:00:00+00:00",
            "resolutionAt":"2030-07-01T00:00:00+00:00",
            "asOf":"2028-11-30T00:00:00+00:00",
            "probability":0.25,"baselineProbability":0.2,
            "modelVersion":"SYNTHETIC-MODEL-v1","datasetVersion":"SYNTHETIC-DATA-v1",
            "domain":"SYNTHETIC_GEOPOLITICS","targetDefinition":"At least one synthetic event in target year",
            "population":"SYNTHETIC_COHORT","benchmarkId":"SYNTHETIC_FREQUENCY",
            "verificationSource":"SYNTHETIC_SOURCE","verificationMethod":"SYNTHETIC_OFFLINE_RESOLUTION",
            "sourceEditionReleaseDate":"2028-11-01",
            "codeSha256":"b"*64,"dataSha256":"c"*64,"modelProtocolSha256":"d"*64,
        }
    }


class LedgerTests(unittest.TestCase):
    def test_create_only_and_chain(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"private-ledger"
            first=append_draft(root,draft())
            self.assertFalse(first["prospectiveEligible"])
            self.assertFalse(first["independentlyTimestamped"])
            self.assertEqual(len(scan(root)),1)
            follow=draft(entry="SYNTHETIC-ENTRY-002",supersedes=first["sha256"])
            follow["payload"]["probability"]=0.35
            second=append_draft(root,follow)
            self.assertEqual(len(scan(root)),2)
            self.assertNotEqual(first["sha256"],second["sha256"])
            oldFile=next((root/"entries").glob("00000001-*.json"))
            self.assertAlmostEqual(json.loads(oldFile.read_text())["draft"]["payload"]["probability"],.25)
            self.assertAlmostEqual(json.loads(next((root/"entries").glob("00000002-*.json")).read_text())["draft"]["payload"]["probability"],.35)
            with self.assertRaises(ValueError):
                append_draft(root,draft())

    def test_tampering_invalidates_entire_chain(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"private-ledger"
            append_draft(root,draft())
            entry=next((root/"entries").glob("*.json"))
            text=entry.read_text()
            entry.write_text(text.replace('"probability":0.25','"probability":0.99'))
            with self.assertRaises(ValueError):
                scan(root)
            with self.assertRaises(ValueError):
                append_draft(root,draft(entry="SYNTHETIC-ENTRY-002"))

    def test_no_unsealed_payload_can_claim_real_issuance_or_outcome(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"private-ledger"
            for change in ["asof","seal","prospective","outcome","date","duplicate","prob"]:
                d=draft()
                if change=="asof":d["sourceAvailabilityVerified"]=True
                if change=="seal":d["independentSealVerified"]=True
                if change=="prospective":d["prospectiveEligible"]=True
                if change=="outcome":d["payload"]["outcome"]=1
                if change=="date":d["payload"]["resolutionAt"]="2028-01-01T00:00:00+00:00"
                if change=="duplicate":d["supersedesEntrySha256"]="f"*64
                if change=="prob":d["payload"]["probability"]=1.5
                with self.subTest(change=change),self.assertRaises(ValueError):
                    append_draft(root,d)
            self.assertEqual(scan(root),[])

    def test_chain_does_not_accept_missing_link_or_seq(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"private-ledger"
            with self.assertRaises(ValueError):
                append_draft(root,draft(entry="SYNTHETIC-ENTRY-002",supersedes="b"*64))
            self.assertEqual(scan(root),[])
            append_draft(root,draft())
            record=next((root/"entries").glob("*.json"))
            record.rename(root/"entries"/record.name.replace("00000001","00000002"))
            with self.assertRaises(ValueError):
                scan(root)


if __name__=="__main__":
    unittest.main()
