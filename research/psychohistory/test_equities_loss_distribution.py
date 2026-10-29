"""Synthetic tail arithmetic, timing and whole-pipeline regressions."""
from datetime import date,timedelta
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from equities_loss_distribution import path_loss,tail_summary,prepare,forecast,pinball,study
from test_equities_drawdown_research import synthetic_prices
from test_equities_market_study import archive


class LossDistributionTests(unittest.TestCase):
    def test_loss_is_from_origin_not_peak_to_trough(self):
        self.assertAlmostEqual(path_loss([math.log(.9),math.log(1.3),math.log(.8)]),.1)
        self.assertEqual(path_loss([.01,.02,.03]),0)
        self.assertAlmostEqual(path_loss([-1000]),1)
        with self.assertRaises(ValueError):path_loss([float('nan')])

    def test_quantiles_and_fractional_tail_exact(self):
        result=tail_summary([i/100 for i in range(1,21)])
        self.assertEqual(result,dict(q90=.18,q95=.19,es95=.20))
        result=tail_summary([i/100 for i in range(21)])
        self.assertAlmostEqual(result['es95'],(.20+.05*.19)/1.05)
        for values in ([],[float('nan')],[-.1],[1.1]):
            with self.subTest(values=values),self.assertRaises(ValueError):tail_summary(values)

    def test_positive_volatility_uses_only_past_window(self):
        rows=synthetic_prices(1450);before=prepare(rows)
        changed=rows[:]
        for i in range(1331,len(rows)):
            changed[i]=(changed[i][0],changed[i][1]*(.2 if i%2 else 5))
        after=prepare(changed)
        for origin in (1300,1320,1330):
            self.assertEqual(forecast(before,origin),forecast(after,origin))
        result=forecast(before,1300)
        for value in result.values():
            self.assertLessEqual(value['q90'],value['q95'])
            self.assertLessEqual(value['q95'],value['es95'])

    def test_whole_study_past_forecasts_survive_future_mutation(self):
        rows=synthetic_prices(1400)
        before=study(rows,{'synthetic':True},rows[1300][0].isoformat())
        changed=rows[:]
        for i in range(1341,len(rows)):
            changed[i]=(changed[i][0],changed[i][1]*.3)
        after=study(changed,{'synthetic':True},rows[1300][0].isoformat())
        for a,b in zip(before['rows'],after['rows']):
            if a['origin_date']<=rows[1340][0].isoformat():
                self.assertEqual(a['historical'],b['historical'])
                self.assertEqual(a['filtered'],b['filtered'])
                self.assertEqual(a['scenarios'],1241)
                self.assertEqual(a['last_scenario_date'],a['origin_date'])
        self.assertFalse(before['forecast_issued'])
        self.assertFalse(before['model_admitted'])
        self.assertFalse(before['expected_shortfall_validated'])

    def test_degenerate_perfect_reference_is_not_claimed_as_improved(self):
        rows=[(date(2000,1,1)+timedelta(days=i),100.) for i in range(1400)]
        result=study(rows,{'synthetic':True},rows[1300][0].isoformat())
        self.assertEqual(result['metrics']['filtered']['quantiles']['q95']['mean_pinball'],0)
        self.assertEqual(result['decision'],'DISCARDED_BY_FROZEN_SCREEN')

    def test_pinball_and_invalid_history(self):
        self.assertAlmostEqual(pinball(.2,.1,.95),.095)
        self.assertAlmostEqual(pinball(.1,.2,.95),.005)
        with self.assertRaises(ValueError):prepare([(date(2000,1,1),1),(date(2000,1,1),2)])
        with self.assertRaises(ValueError):forecast(prepare(synthetic_prices(1300)),100)

    def test_cli_private_create_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);rows=synthetic_prices(2750)
            lines=['This file was created by using the 202609 CRSP database.',',Mkt-RF,SMB,HML,RF']
            day,prior=date(2000,1,1),100.
            for _,value in rows:
                day+=timedelta(days=1)
                while day.weekday()>=5:day+=timedelta(days=1)
                lines.append(f'{day:%Y%m%d},{(value/prior-1)*100:.8f},0,0,0');prior=value
            lines.append('Copyright SYNTHETIC')
            raw=archive(lines);source=root/'fake.zip';source.write_bytes(raw);output=root/'report.json'
            cmd=[sys.executable,str(Path(__file__).with_name('equities_loss_distribution.py')),
                 '--archive',str(source),'--sha256',hashlib.sha256(raw).hexdigest(),
                 '--source-asof','2026-10-29','--output',str(output)]
            result=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(os.stat(output).st_mode & 0o777,0o600)
            original=output.read_bytes()
            self.assertFalse(json.loads(original)['current_risk_estimated'])
            self.assertNotEqual(subprocess.run(cmd,capture_output=True).returncode,0)
            self.assertEqual(output.read_bytes(),original)


if __name__=='__main__':unittest.main()
