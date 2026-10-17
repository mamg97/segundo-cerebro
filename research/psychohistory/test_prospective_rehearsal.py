"""Synthetic preparation tests: deliberate absence of future observations."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path

from prospective_rehearsal import make_rehearsal, write_private
from test_benchmark import fixture, PROTOCOL as SOURCE

FUTURE=json.loads((Path(__file__).parent/"futures_protocol.json").read_text())


def synthetic_through_2025():
    # Original fixture stops in 2010; shift by 15 years so target 2027 has 2025 cutoff.
    return [{**r,"year":str(int(r["year"])+15)} for r in fixture()]


class ProspectiveRehearsalTests(unittest.TestCase):
    def build(self, rows=None, now=None):
        return make_rehearsal(
            synthetic_through_2025() if rows is None else rows,
            SOURCE, FUTURE, 2027, "f"*64,
            now or dt.datetime(2026,10,17,0,0,tzinfo=dt.timezone.utc),
            horizons=(1,3))

    def test_future_cohort_has_proper_temporal_cutoff_and_no_labels(self):
        result=self.build()
        self.assertEqual(result["target_year"],2027)
        self.assertEqual(result["information_cutoff_year"],2025)
        self.assertEqual(result["unknown_bridge_year"],2026)
        self.assertGreater(result["country_horizon_model_predictions"],0)
        self.assertEqual(result["country_horizon_model_predictions"],
                         result["eligible_countries"]*2*5)
        self.assertFalse(result["eligible_for_prospective_scoring"])
        self.assertFalse(result["external_timestamp_receipt_verified"])
        self.assertFalse(result["outcomes_included"])
        self.assertNotIn("actual",str(result["predictions"]))
        self.assertEqual(sorted(set(p["terminal_year"] for p in result["predictions"])),[2027,2029])
        for p in result["predictions"]:
            self.assertAlmostEqual(sum(p["state_probabilities"]),1)
            self.assertTrue(0<=p["any_episode_probability"]<=1)

    def test_same_inputs_produce_same_model_outputs_not_fake_timestamps(self):
        a=self.build()
        b=self.build(list(reversed(synthetic_through_2025())))
        self.assertEqual(a["predictions"],b["predictions"])
        self.assertEqual(a["model_protocol_sha256"],b["model_protocol_sha256"])

    def test_rejects_late_issuance_and_any_future_observation(self):
        with self.assertRaises(ValueError):
            self.build(now=dt.datetime(2027,1,1,tzinfo=dt.timezone.utc))
        extra={**synthetic_through_2025()[0],"year":"2026","sb_total_deaths_best":"900"}
        with self.assertRaises(ValueError):
            self.build(rows=synthetic_through_2025()+[extra])
        too_old=[r for r in synthetic_through_2025() if int(r["year"])<2025]
        with self.assertRaises(ValueError):
            self.build(rows=too_old)
        with self.assertRaises(ValueError):
            make_rehearsal(synthetic_through_2025(),SOURCE,FUTURE,2027,"f"*64,
                           dt.datetime(2026,10,17,tzinfo=dt.timezone.utc),horizons=(2,))

    def test_private_write_is_create_only_with_hashes(self):
        report=self.build()
        with tempfile.TemporaryDirectory() as tmp:
            target=Path(tmp)/"rehearsal"
            meta=write_private(report,target)
            self.assertEqual(meta["status"],"UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE")
            self.assertFalse(meta["prospective_eligible"])
            self.assertTrue((target/"forecast-candidate.json").is_file())
            with self.assertRaises(FileExistsError):
                write_private(report,target)


if __name__=="__main__":
    unittest.main()
