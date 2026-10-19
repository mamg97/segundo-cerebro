"""Fictional state-system names/codes only; never actual national crosswalk."""
from __future__ import annotations

import csv
import hashlib
from io import StringIO
from pathlib import Path
import os
import tempfile
import unittest

from cow_gw_token_review import compare_token_candidates, save_review_private, _records


COW_FIELDS=("stateabb","ccode","statenme","styear","stmonth","stday",
            "endyear","endmonth","endday","version")
GW_FIELDS=("statenumber","stateid","countryname","start","end")


def csvdata(fields, rows, delimiter=","):
    stream=StringIO(newline="")
    writer=csv.writer(stream,delimiter=delimiter)
    writer.writerow(fields)
    writer.writerows(rows)
    return stream.getvalue().encode()


def cow_row(token,code,start=2010,end=2024):
    return (token,code,"Fictional "+token,start,1,1,end,12,31,2024)


def gw_row(code,token,start=2010,end=2020):
    return (code,token,"Fictional "+token,f"{start}-01-01",f"{end}-12-31")


def fixtures():
    cow=csvdata(COW_FIELDS,[
        cow_row("AAA",100),cow_row("BBB",200),cow_row("CCC",300),cow_row("EEE",600),
    ])
    gw=csvdata(GW_FIELDS,[
        gw_row(100,"AAA"),gw_row(210,"BBB"),gw_row(300,"DDD"),gw_row(700,"JJJ"),
    ],delimiter="\t")
    micro=csvdata(GW_FIELDS,[
        gw_row(800,"KKK"),gw_row(900,"LLL"),
    ],delimiter="\t")
    return cow,gw,micro


class TokenCandidatesTests(unittest.TestCase):
    def test_exact_token_not_inferred_geographic_identity(self):
        cow,gw,micro=fixtures()
        public,queue=compare_token_candidates(cow,(gw,micro),["2020-12","2024-12","2025-01"])
        x=public["months"][0]
        self.assertEqual(x["n_cow_full"],4)
        self.assertEqual(x["n_gw_full"],6)
        self.assertEqual(x["n_textual_proposals"],2)
        self.assertEqual(x["n_equal_abbreviation_and_equal_number"],1)
        self.assertEqual(x["n_equal_abbreviation_but_different_number"],1)
        self.assertEqual(x["n_numeric_contact_with_different_token_unresolved"],1)
        self.assertEqual(x["n_cow_unmatched_codes"],2)
        self.assertEqual(x["n_gw_unmatched_codes"],4)
        self.assertEqual(public["months"][1]["n_cow_full"],4)
        self.assertEqual(public["months"][1]["n_proposed_mappings"],0)
        self.assertIsNone(public["months"][1]["n_gw_full"])
        self.assertEqual(public["months"][2]["status"],"NO_EVALUABLE_COW_AFTER_2024")
        self.assertEqual(len(queue),8)
        self.assertEqual(public["n_private_review_rows"],len(queue))
        self.assertEqual({v["status"] for v in queue},
                         {"TOKEN_ONLY_NOT_REVIEWED","COW_UNRESOLVED","GW_UNRESOLVED"})
        self.assertFalse(public["one_to_one_geographic_concordance_verified"])
        self.assertFalse(public["ucdp_event_coverage_verified"])
        self.assertFalse(public["absence_of_event_equals_zero_verified"])
        self.assertFalse(public["source_as_of_verified"])
        self.assertFalse(public["forecast_issued"])
        self.assertNotIn("country_id",public)
        self.assertNotIn("rows",public)

    def test_duplicate_token_not_admitted(self):
        cow,gw,micro=fixtures()
        doubles=csvdata(COW_FIELDS,[cow_row("AAA",100),cow_row("AAA",200)])
        result,queue=compare_token_candidates(doubles,(gw,micro),["2020-12"])
        x=result["months"][0]
        self.assertEqual(x["n_duplicated_active_abbreviations_cow"],1)
        self.assertEqual(x["n_textual_proposals"],0)
        self.assertTrue(all(row["status"]!="TOKEN_ONLY_NOT_REVIEWED" for row in queue))

    def test_ambiguous_active_code_is_rejected(self):
        cow,gw,micro=fixtures()
        doubled=csvdata(COW_FIELDS,[cow_row("AAA",100),cow_row("BBB",100)])
        with self.assertRaises(ValueError):
            compare_token_candidates(doubled,(gw,micro),["2020-12"])

    def test_temporal_change_and_unordered_months_fail_closed(self):
        cow,gw,micro=fixtures()
        for months in ([],["2020-12","2020-12"],["2024-12","2020-12"],["2024-13"]):
            with self.subTest(months=months),self.assertRaises(ValueError):
                compare_token_candidates(cow,(gw,micro),months)
        invalid=csvdata(COW_FIELDS,[cow_row("AAB",100),cow_row("we!",200)])
        with self.assertRaises(ValueError):
            compare_token_candidates(invalid,(gw,micro),["2020-12"])

    def test_private_queue_create_only_no_public_repo(self):
        cow,gw,micro=fixtures()
        public,queue=compare_token_candidates(cow,(gw,micro),["2020-12"])
        with tempfile.TemporaryDirectory() as temp:
            target=Path(temp)/"manual-review.json"
            save_review_private(queue,target)
            self.assertTrue(target.exists())
            self.assertEqual(os.stat(target).st_mode & 0o777,0o600)
            self.assertIn("TOKEN_ONLY_NOT_REVIEWED",target.read_text())
            with self.assertRaises(FileExistsError):
                save_review_private(queue,target)
            self.assertTrue(public["forecast_issued"] is False)
        with self.assertRaises(ValueError):
            save_review_private(queue,Path(__file__).resolve().parent/"NO_CREATE_QUEUE.json")

if __name__=="__main__":
    unittest.main()
