"""Synthetic-only GED join tests. No country deaths or actual events published."""
import csv
import hashlib
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from ged_event_context import build_event_context, save_private


def casebook():
    return {
      "schema":"psychohistory.onset.casebook.v1",
      "datasetVersion":"25.1", "target":"onset1",
      "sourceAsOfVerified":False,"prospectiveEligible":False,
      "cases":[
        {"kind":"intrastate_country","countryId":365,"country":"SYNTHETIC_A",
         "year":2022,"onset":1,"cutoffYear":2020},
        {"kind":"interstate_country","countryId":2,"country":"SYNTHETIC_B",
         "year":2022,"onset":1,"cutoffYear":2020},
      ]
    }


def zip_fixture(path, data=None):
    columns=["id","year","country_id","type_of_violence","date_start",
        "date_end","date_prec","where_prec","where_coordinates",
        "dyad_name","conflict_name","best","low","high","latitude","longitude"]
    if data is None:
        data=[]
        for i,best in enumerate((8,5,12,2)):
            data.append({
                "id":i+10,"year":2022,"country_id":365,"type_of_violence":1,
                "date_start":f"2022-04-{i+1:02d}","date_end":f"2022-04-{i+1:02d}",
                "date_prec":1,"where_prec":2,"where_coordinates":"SYNTHETIC_TOWN",
                "dyad_name":"SYNTHETIC_SIDE_A - SYNTHETIC_SIDE_B",
                "conflict_name":"SYNTHETIC_CONFLICT",
                "best":best,"low":best-1,"high":best+1,"latitude":1.2,"longitude":22.1,
            })
        # Different type => not comparable to state-based onset; must be excluded.
        data.append({**data[0],"id":90,"type_of_violence":2,"best":999})
        # Event in country other than participating country (not causal onset match).
        data.append({**data[0],"id":91,"country_id":100,"best":999})
    with io.StringIO() as buf:
        writer=csv.DictWriter(buf,fieldnames=columns)
        writer.writeheader()
        writer.writerows(data)
        txt=buf.getvalue()
    with zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("ged25/GEDEvent_v25_1.csv",txt)
    return hashlib.sha256(path.read_bytes()).hexdigest()


class GEDContextTests(unittest.TestCase):
    def test_event_locations_are_context_not_equated_with_conflict_onset(self):
        with tempfile.TemporaryDirectory() as tmp:
            zip_path=Path(tmp)/"GED_SYNTHETIC.zip"
            digest=zip_fixture(zip_path)
            result=build_event_context(zip_path,digest,casebook())
            self.assertEqual(result["schema"],"psychohistory.onset.ged_context.v1")
            self.assertTrue(result["notAnOnsetEventLink"])
            self.assertFalse(result["prospectiveEligible"])
            self.assertFalse(result["asOfVerified"])
            self.assertEqual(len(result["cases"]),2)
            first,second=result["cases"]
            self.assertEqual(first["stateBasedEventsWithinBorders"],4)
            self.assertEqual(len(first["examples"]),3)
            self.assertEqual([x["bestDeaths"] for x in first["examples"]],[12,8,5])
            self.assertEqual(first["examples"][0]["dateStart"],"2022-04-03")
            self.assertEqual(second["stateBasedEventsWithinBorders"],0)
            self.assertEqual(second["examples"],[])
            self.assertEqual(second["matchingRelation"],"same_country_id_and_calendar_year_only")

    def test_wrong_checksums_missing_archive_headers_and_duplicate_case_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            zip_path=Path(tmp)/"GED_SYNTHETIC.zip"
            digest=zip_fixture(zip_path)
            with self.assertRaisesRegex(ValueError,"digest mismatch"):
                build_event_context(zip_path,"0"*64,casebook())
            bad=casebook()
            bad["cases"].append(bad["cases"][0])
            with self.assertRaisesRegex(ValueError,"duplicated"):
                build_event_context(zip_path,digest,bad)
            bad=casebook()
            bad["sourceAsOfVerified"]=True
            with self.assertRaisesRegex(ValueError,"authorized"):
                build_event_context(zip_path,digest,bad)

    def test_duplicated_geolocated_event_and_unsupported_date_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"GED_SYNTHETIC.zip"
            dig=zip_fixture(path)
            with zipfile.ZipFile(path) as z:
                reader=csv.DictReader(io.StringIO(z.read(z.namelist()[0]).decode()))
                rows=list(reader)
            rows[1]["id"]=rows[0]["id"]
            digest=zip_fixture(path,rows)
            with self.assertRaisesRegex(ValueError,"Duplicate GED"):
                build_event_context(path,digest,casebook())
            rows[1]["id"]=11
            rows[1]["date_start"]="2022-15-99"
            digest=zip_fixture(path,rows)
            # This syntactically YYYY-MM-DD; date parsing is tightened separately.
            # Still an invalid month must be rejected, not displayed as a fact.
            with self.assertRaises(ValueError):
                build_event_context(path,digest,casebook())

    def test_output_is_private_create_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            path=root/"g.zip";digest=zip_fixture(path)
            result=build_event_context(path,digest,casebook())
            dest=root/"private"/"GED-event-context.json"
            save_private(result,dest)
            self.assertEqual(json.loads(dest.read_text())["cases"][0]["year"],2022)
            with self.assertRaises(FileExistsError):
                save_private(result,dest)


if __name__ == "__main__":
    unittest.main()
