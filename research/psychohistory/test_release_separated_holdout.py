"""Synthetic adversarial tests; no private data or network."""
import copy
import hashlib
import io
import json
import tempfile
import unittest
from unittest import mock
import zipfile
from pathlib import Path

from release_separated_holdout import run,bounded_zip,probe,PROTOCOL

def make_version(version,max_year):
    out=[]
    for cid in range(1,9):
        for yr in range(1989,max_year+1):
            # Constant and discontinuous series so rare positives aren't degenerate.
            is_on=(cid%3==0 and yr%7 in (0,1,2)) or (cid%5==0 and yr%5==1)
            if yr==2025 and cid%4==0: is_on=not is_on
            out.append(dict(country="SYNTHETIC_"+str(cid),country_id=str(cid),
                year=str(yr),Version=version,region="SYNTHETIC",
                sb_total_deaths_best=str(30*int(is_on)),
                sb_total_deaths_low=str(30*int(is_on)),
                sb_total_deaths_high=str(30*int(is_on)),
                ns_total_deaths_best="0",os_total_deaths_best="0"))
    return out

def zipped(path,rows):
    import csv
    stream=io.StringIO()
    w=csv.DictWriter(stream,fieldnames=list(rows[0]))
    w.writeheader();w.writerows(rows)
    with zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("SYNTHETIC.csv",stream.getvalue())
    return hashlib.sha256(path.read_bytes()).hexdigest()

class FrozenVintageHoldoutTests(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory(prefix="FAKE_RELEASES_")
        self.addCleanup(self.t.cleanup)
        self.old=Path(self.t.name)/"old.zip";self.new=Path(self.t.name)/"new.zip"
        self.old_rows=make_version("24.1",2023)
        self.new_rows=make_version("26.1",2025)
        self.s24=zipped(self.old,self.old_rows)
        self.s26=zipped(self.new,self.new_rows)

    def test_archive_versions_and_hash_guard(self):
        with self.assertRaisesRegex(ValueError,"SHA256 mismatch"):
            bounded_zip(self.old,"0"*64,"24.1")
        old,_=probe(self.old,self.s24,"24.1")
        self.assertEqual(max(int(x["year"]) for x in old),2023)
        with self.assertRaisesRegex(ValueError,"Version"):
            bounded_zip(self.old,self.s24,"26.1")
        with self.assertRaisesRegex(ValueError,"training cutoff"):
            b=Path(self.t.name)/"bad.zip"
            rows=[r for r in self.old_rows if int(r["year"])<2023]
            probe(b,zipped(b,rows),"24.1")

    def test_scoring_cannot_use_outcome_revisions_as_features(self):
        # Unit test frozen train path even when later source has a different digest:
        with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
            before=run(self.old,self.new,self.s24,self.s26)
            modified=copy.deepcopy(self.new_rows)
            # Change all later-version 2023 historical values: train MUST stay frozen.
            for r in modified:
                if int(r["year"])<=2023:
                    r["sb_total_deaths_best"]="999"
            self.s26=zipped(self.new,modified)
            with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
                after=run(self.old,self.new,self.s24,self.s26)
        self.assertEqual(before["models"],after["models"])
        self.assertNotEqual(before["earlier_label_revisions_among_scored"],after["earlier_label_revisions_among_scored"])
        self.assertFalse(after["forecast_issued"])
        self.assertFalse(after["independent_preissue_byte_witness"])

    def test_missing_resolution_not_converted_to_zero(self):
        truncated=[r for r in self.new_rows if not(int(r["year"])==2025 and r["country_id"]=="1")]
        self.s26=zipped(self.new,truncated)
        with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
            result=run(self.old,self.new,self.s24,self.s26)
        self.assertEqual(result["not_evaluable_no_later_outcome"],1)
        self.assertEqual(result["scored_identical_cohort"],7)

    def test_future_mutation_cannot_change_predictions_for_known_2025_labels(self):
        changed=copy.deepcopy(self.new_rows)
        for r in changed:
            if int(r["year"])==2025 and r["country_id"]=="2":
                r["sb_total_deaths_best"]="900" if r["sb_total_deaths_best"]=="0" else "0"
        with mock.patch.dict(PROTOCOL,{"archive_sha256":self.s26}):
            before=run(self.old,self.new,self.s24,self.s26)
        new_hash=zipped(self.new,changed)
        with mock.patch.dict(PROTOCOL,{"archive_sha256":new_hash}):
            after=run(self.old,self.new,self.s24,new_hash)
        self.assertEqual(before["train_eligible_rows"],after["train_eligible_rows"])
        self.assertEqual(before["scored_identical_cohort"],after["scored_identical_cohort"])
        self.assertNotEqual(before["positive_outcomes"],after["positive_outcomes"])
        self.assertFalse(after["prospective_skill_demonstrated"])


    def test_old_archival_schema_without_version_and_with_suffixes(self):
        rows=make_version("24.1",2023)
        # UCDP historical releases do not all include the same metadata columns.
        renamed=[]
        for raw in rows:
            v={("country_id_cy" if k=="country_id" else
                "sb_total_deaths_best_cy" if k=="sb_total_deaths_best" else k):value
               for k,value in raw.items() if k!="Version"}
            renamed.append(v)
        path=Path(self.t.name)/"archival.zip"
        digest=zipped(path,renamed)
        loaded,quality=probe(path,digest,"24.1")
        self.assertEqual(len(loaded),len(rows))
        self.assertTrue(all(r["Version"]=="24.1" for r in loaded))
        self.assertEqual(quality["years"],[1989,2023])

    def test_ambiguous_archival_alias_rejected(self):
        rows=make_version("24.1",2023)
        rows[0]["country_id_cy"]=rows[0]["country_id"]
        path=Path(self.t.name)/"ambiguous.zip"
        # the test fixture is intentionally inconsistent; never auto-resolve.
        digest=zipped(path,rows)
        with self.assertRaisesRegex(ValueError,"ambiguous"):
            bounded_zip(path,digest,"24.1")

if __name__=="__main__":unittest.main()
