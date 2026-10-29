"""Synthetic entitlement/payment and source-boundary tests."""
import copy
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from etf_nav_period import period_return,reconcile_periods
from test_etf_issuer_source import run,nav_rows,distributions,book


def schedule(pay='2026-01-30'):
    return [dict(ex_date='2026-01-06',payable_date=pay,amount='1')]


class NAVPeriodTests(unittest.TestCase):
    def test_pending_cash_is_not_reinvested_before_payment(self):
        source=run()
        result=period_return(source,schedule(),'2026-01-05','2026-01-07')
        self.assertEqual(Decimal(result['growth_ratio']),Decimal('1.02'))
        self.assertEqual(result['trace'][-1]['units'],'1')
        self.assertEqual(result['trace'][-1]['receivable'],'1')
        self.assertFalse(result['uses_future_payment_nav'])

    def test_same_day_payment_reinvests_at_that_nav(self):
        result=period_return(run(),schedule('2026-01-06'),'2026-01-05','2026-01-07')
        self.assertAlmostEqual(float(result['growth_ratio']),101/99)
        self.assertEqual(result['pending_entitlements'],0)

    def test_buying_after_ex_date_has_no_old_rights(self):
        result=period_return(run(),schedule(),'2026-01-06','2026-01-07')
        self.assertEqual(result['pending_entitlements'],0)
        self.assertAlmostEqual(float(result['growth_ratio']),101/99)

    def test_future_nav_cannot_change_completed_period(self):
        source=run();before=period_return(source,schedule(),'2026-01-05','2026-01-07')
        changed=copy.deepcopy(source)
        changed['rows'].append(dict(date='2026-01-30',nav='9999999'))
        self.assertEqual(before,period_return(changed,schedule(),'2026-01-05','2026-01-07'))

    def test_missing_payment_nav_and_in_scope_issue_block(self):
        missing=run()
        missing['rows']=[dict(date='2026-01-04',nav='100'),dict(date='2026-01-05',nav='99'),
                         dict(date='2026-01-07',nav='101')]
        cash=[dict(ex_date='2026-01-05',payable_date='2026-01-06',amount='1')]
        with self.assertRaisesRegex(ValueError,'payment NAV'):
            period_return(missing,cash,'2026-01-04','2026-01-07')
        source=run();source['date_issues']=[dict(ex_date='2026-01-06',issue='SYNTHETIC')]
        with self.assertRaisesRegex(ValueError,'metadata'):period_return(source,schedule(),'2026-01-05','2026-01-07')
        source['date_issues'][0]['ex_date']='2006-01-06'
        self.assertEqual(period_return(source,schedule(),'2026-01-05','2026-01-07')['pending_entitlements'],1)

    def test_period_match_does_not_admit_global_source(self):
        n=book('navhist',nav_rows());d=book('dividend',distributions())
        published=[dict(start='2026-01-05',end='2026-01-07',years=0,percent='2.00')]
        result=reconcile_periods(n,hashlib.sha256(n).hexdigest(),d,hashlib.sha256(d).hexdigest(),
                                 'SYNTHETIC','2026-10-29',published)
        self.assertTrue(result['all_periods_reconciled'])
        self.assertFalse(result['source_admitted'])
        self.assertFalse(result['forecast_issued'])
        self.assertFalse(result['market_price_reconstructed'])

    def test_cli_private_exclusive_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);n=book('navhist',nav_rows());d=book('dividend',distributions())
            (root/'n.xlsx').write_bytes(n);(root/'d.xlsx').write_bytes(d)
            raw=json.dumps([dict(start='2026-01-05',end='2026-01-07',years=0,percent='2')]).encode()
            (root/'p.json').write_bytes(raw);out=root/'r.json'
            cmd=[sys.executable,str(Path(__file__).with_name('etf_nav_period.py')),
                 '--nav',str(root/'n.xlsx'),'--nav-sha256',hashlib.sha256(n).hexdigest(),
                 '--distributions',str(root/'d.xlsx'),'--distributions-sha256',hashlib.sha256(d).hexdigest(),
                 '--published-returns',str(root/'p.json'),'--published-returns-sha256',hashlib.sha256(raw).hexdigest(),
                 '--ticker','SYNTHETIC','--captured-on','2026-10-29','--output',str(out)]
            result=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(os.stat(out).st_mode & 0o777,0o600)
            before=out.read_bytes()
            self.assertNotEqual(subprocess.run(cmd,capture_output=True).returncode,0)
            self.assertEqual(before,out.read_bytes())


if __name__=='__main__':unittest.main()
