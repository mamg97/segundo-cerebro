"""All synthetic, no real historical country facts or data copied into Git."""
import csv
import hashlib
import io
import tempfile
import unittest
from pathlib import Path

from ucdp_onset import (ONSET_COLUMNS, load_onsets, forecast_origin,
                        retrospective_report, smoothed_rate, evaluate_cases,
                        save_private)


def source(start=2000,end=2024,n=5):
    lines=io.StringIO()
    columns=["name","gwno_a","year",*ONSET_COLUMNS]
    writer=csv.DictWriter(lines,fieldnames=columns)
    writer.writeheader()
    for cid in range(1,n+1):
        for year in range(start,end+1):
            positive=int((year-cid) % 7 == 0 and cid % 2 == 0)
            writer.writerow(dict(name=f"SYNTHETIC-{cid}",gwno_a=cid,year=year,
                                 **{key:positive if key=="onset1" else 0 for key in ONSET_COLUMNS}))
    body=lines.getvalue().encode()
    return body,hashlib.sha256(body).hexdigest()


def load(body=None,sha=None):
    if body is None:body,sha=source()
    return load_onsets(body,kind="intrastate_country",expected_sha256=sha)


class OnsetPipelineTests(unittest.TestCase):
    def test_checksum_country_level_schema_binary_labels_and_roster(self):
        body,sha=source()
        d=load(body,sha)
        self.assertEqual(d["n_countries"],5)
        self.assertEqual(d["n_rows"],125)
        self.assertEqual(d["max_year"],2024)
        self.assertFalse(d["vintage_verified"])
        with self.assertRaises(ValueError):
            load(body,"0"*64)
        with self.assertRaises(ValueError):
            load_onsets(body,kind="invented_data",expected_sha256=sha)
        with self.assertRaises(ValueError):
            load_onsets(body.replace(b"onset1",b"notset"),kind="intrastate_country",expected_sha256=
                        hashlib.sha256(body.replace(b"onset1",b"notset")).hexdigest())

    def test_duplicate_and_missing_labels_fail_closed(self):
        body,_=source(n=2)
        lines=body.decode().splitlines()
        duplicates=("\n".join(lines+[lines[1]])+"\n").encode()
        with self.assertRaisesRegex(ValueError,"Duplicate"):
            load(duplicates,hashlib.sha256(duplicates).hexdigest())
        erased=body.replace(b",0,0,0,0,0,0",b",,0,0,0,0,0")
        with self.assertRaises(ValueError):
            load(erased,hashlib.sha256(erased).hexdigest())

    def test_conflict_level_file_is_never_relabelled_as_country_panel(self):
        data,_=source(n=1)
        source_lines=data.decode().splitlines()
        # Even a conflict-level excerpt with one conflict per country-year fails closed.
        source_lines[0]+=",conflict_id"
        source_lines=[source_lines[0]] + [line+",19" for line in source_lines[1:]]
        rows=chr(10).join(source_lines).encode()+bytes([10])
        with self.assertRaisesRegex(ValueError,"country-onset schema|Conflict-level"):
            load(rows,hashlib.sha256(rows).hexdigest())

    def test_temporal_training_only_ends_at_t_minus_two(self):
        original=load()
        before=forecast_origin(original,year=2016)
        changed={**original,"lookup":{key:(
            {**row,"onset1":1-row["onset1"],"name":"FUTURE-INVENTED"}
            if key[1]>2014 else row)
            for key,row in original["lookup"].items()}}
        after=forecast_origin(changed,year=2016)
        self.assertEqual(before["cutoff"],2014)
        self.assertEqual(before["n_evaluated"],after["n_evaluated"])
        for a,b in zip(before["cases"],after["cases"]):
            self.assertEqual(a["probabilities"],b["probabilities"])
        self.assertNotEqual(before["cases"],after["cases"],"Observed labels deliberately changed")

    def test_country_without_previously_observed_consecutive_history_is_excluded(self):
        d=load()
        d["lookup"].pop((2,2012))
        r=forecast_origin(d,year=2016)
        self.assertEqual(r["n_total_country_years"],5)
        self.assertEqual(r["n_evaluated"],4)
        self.assertEqual(r["excluded"]["insufficient_consecutive_history"],1)
        self.assertNotIn(2,[c["country_id"] for c in r["cases"]])

    def test_two_models_have_valid_binary_probabilities_and_rare_event_metrics(self):
        d=load()
        r=retrospective_report(d)
        self.assertEqual(r["schema"],"psychohistory.conflict_onset_backtest.v1")
        self.assertFalse(r["vintage_verified"])
        self.assertFalse(r["prospective_eligible"])
        self.assertEqual(r["partitions"]["test"]["year_range"],[2016,2024])
        self.assertEqual(r["partitions"]["test"]["n_scored"],9*5)
        self.assertEqual(r["partitions"]["test"]["n_event"],
                         sum(row["outcome"] for row in r["partitions"]["test"]["cases"]))
        for section in r["partitions"].values():
            rows=section["cases"]
            for model in ("global_frequency","country_shrinkage"):
                metric=evaluate_cases(rows,model)
                self.assertGreaterEqual(metric["brier"],0)
                self.assertLessEqual(metric["brier"],1)
                self.assertGreater(metric["log_loss"],0)
                self.assertEqual(metric["events"],section["n_event"])
                self.assertTrue(all(0<row["probabilities"][model]<1 for row in rows))

    def test_second_onset_definition_is_not_silently_substituted(self):
        d=load()
        r=forecast_origin(d,year=2020,label="onset2")
        self.assertTrue(all(c["outcome"]==0 for c in r["cases"]))
        self.assertEqual(r["target"],"onset2")
        with self.assertRaises(ValueError):
            forecast_origin(d,year=2020,label="coups")
        with self.assertRaises(ValueError):
            smoothed_rate([0,2,1])

    def test_private_report_is_create_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"private"/"event-metrics.json"
            save_private(retrospective_report(load()),p)
            self.assertTrue(p.is_file())
            with self.assertRaises(FileExistsError):
                save_private(retrospective_report(load()),p)


if __name__=="__main__":
    unittest.main()
