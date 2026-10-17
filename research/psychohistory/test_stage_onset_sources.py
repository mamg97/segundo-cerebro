"""Synthetic, offline source staging: never download real CSVs in CI."""
import hashlib
import tempfile
import unittest
from pathlib import Path

from stage_onset_sources import stage_sources, download_public_csv
from test_ucdp_onset import source


class StageOnsetSourcesTests(unittest.TestCase):
    def test_success_stages_two_separate_sources_without_authorizing_scoring(self):
        data, digest = source(start=2000,end=2024,n=5)
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)/"official"
            result=stage_sources(folder,downloader=lambda url:data)
            self.assertEqual(len(result["sources"]),2)
            self.assertFalse(result["retrospective_scoring_authorized"])
            self.assertFalse(result["as_of_availability_independently_verified"])
            self.assertTrue((folder/"manifest.json").exists())
            for entry in result["sources"]:
                self.assertEqual(entry["observed_sha256"],digest)
                self.assertEqual(entry["integrity"],"observed_checksum_not_independently_pinned")
                self.assertFalse(entry["retrospective_backtest_eligible"])
                self.assertEqual(hashlib.sha256((folder/entry["filename"]).read_bytes()).hexdigest(),digest)
            with self.assertRaises(FileExistsError):
                stage_sources(folder,downloader=lambda url:data)

    def test_invalid_second_dataset_never_publishes_first(self):
        data,_=source()
        calls=iter([data,b"<!DOCTYPE html><title>error</title>"])
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)/"official"
            with self.assertRaises(ValueError):
                stage_sources(folder,downloader=lambda url:next(calls))
            self.assertFalse(folder.exists())

    def test_reject_unexpected_host_or_unpinned_uri(self):
        for url in ("http://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv",
                    "https://attacker.example/false.csv",
                    "https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-999.csv"):
            with self.assertRaises(ValueError):
                download_public_csv(url,opener=lambda *args,**kwargs:None)

    def test_cannot_write_under_public_repository(self):
        from ucdp_onset import REPOSITORY
        data,_=source()
        with self.assertRaises(ValueError):
            stage_sources(REPOSITORY/"private-no-write",downloader=lambda url:data)


if __name__=="__main__":
    unittest.main()
