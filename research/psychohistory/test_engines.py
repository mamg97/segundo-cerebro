import datetime as dt
import unittest
from engines import synthetic_fixture, rolling_backtest, agent_simulation, scored

class EngineTests(unittest.TestCase):
    def test_no_future_labels_enter_training(self):
        rows = synthetic_fixture()
        predictions = rolling_backtest(rows, dt.date(2025,1,1), [0.5,0.5])
        self.assertGreater(len(predictions),0)
        # Six-month label delay => most recent unresolved labels never enter fit.
        for p in predictions:
            issue=dt.date.fromisoformat(p["issued_at"])
            expected=sum(1 for r in rows if r["issued_at"]<issue and r["resolved_at"]<=issue)
            self.assertEqual(p["training_n"],expected)
    def test_probability_bounds(self):
        pred=rolling_backtest(synthetic_fixture(),dt.date(2025,1,1))
        self.assertTrue(all(0<=p[k]<=1 for p in pred for k in ("baseline","v1_structural","v2_logistic")))
    def test_scores_paired(self):
        rows=[{"target":1,"baseline":0.5,"v2_logistic":0.8},
              {"target":0,"baseline":0.5,"v2_logistic":0.2}]
        score=scored(rows,"v2_logistic")
        self.assertEqual(score["n"],2)
        self.assertGreater(score["brier_skill"],0)
    def test_agents_deterministic(self):
        a=agent_simulation(seed=23)
        b=agent_simulation(seed=23)
        self.assertEqual(a["trace"],b["trace"])
        self.assertEqual(len(a["trace"]),31)
        self.assertTrue(all(0<=v<=1 for v in a["trace"]))

if __name__ == "__main__":
    unittest.main()
