"""Adversarial synthetic, zero-network chronology tests."""
from datetime import datetime, timedelta, timezone
import unittest
from agenda_asof import assess, instant

EVENT={"event_id":"SYNTHETIC_MEETING","event_start_at":"2026-11-05T10:00:00+01:00","outcome_kind":"agreement"}
CUTOFF="2026-11-04T10:00:00Z"
SRC={"kind":"official_agenda","url":"https://example.org/agenda/ficticia",
     "published_at":"2026-11-03T10:00:00Z","captured_at":"2026-11-03T11:00:00Z",
     "capture_sha256":"a"*64}

class AgendaTimingTests(unittest.TestCase):
    def test_no_forecast_from_self_reported_documents(self):
        x=assess(EVENT,CUTOFF,[SRC])
        self.assertEqual(x["sources_seen_by_issue"],1)
        self.assertFalse(x["forecast_issued"])
        self.assertIsNone(x["forecast_probability"])
        self.assertFalse(x["trading_authorized"])

    def test_post_issue_document_is_rejected(self):
        for key,value in [("published_at","2026-11-04T12:00:00Z"),
                          ("captured_at","2026-11-04T12:00:00Z")]:
            with self.subTest(key=key),self.assertRaises(ValueError):
                assess(EVENT,CUTOFF,[{**SRC,key:value}])

    def test_no_timezone_no_proof_bad_digest(self):
        for src in [{**SRC,"published_at":"2026-11-03T10:00:00"},
                    {**SRC,"url":"http://example.org/agenda"},
                    {**SRC,"capture_sha256":"0"*63},
                    {**SRC,"kind":"rumour"},
                    {**SRC,"url":"https://private:token@example.org/doc"}]:
            with self.subTest(src=src),self.assertRaises(ValueError):
                assess(EVENT,CUTOFF,[src])

    def test_issue_after_event_rejected(self):
        with self.assertRaisesRegex(ValueError,"issue must precede"):
            assess(EVENT,"2026-11-06T00:00:00Z",[SRC])

    def test_external_receipt_is_not_evidence_automatically(self):
        verified={**SRC,"external_receipt_verified":True,
                  "external_receipt_at":"2026-11-04T00:00:00Z"}
        result=assess(EVENT,CUTOFF,[verified])
        self.assertEqual(result["claimed_external_receipts"],1)
        self.assertIn("NEEDS_INDEPENDENT_VERIFICATION",result["status"])
        with self.assertRaises(ValueError):
            assess(EVENT,CUTOFF,[{**verified,"external_receipt_at":"2026-11-05T00:00:00Z"}])

    def test_mutating_future_evidence_cannot_be_included(self):
        original=assess(EVENT,CUTOFF,[SRC])
        future={**SRC,"captured_at":"2026-11-07T12:00:00Z"}
        with self.assertRaises(ValueError):
            assess(EVENT,CUTOFF,[SRC,future])
        self.assertEqual(assess(EVENT,CUTOFF,[SRC]),original)

if __name__=="__main__":
    unittest.main()
