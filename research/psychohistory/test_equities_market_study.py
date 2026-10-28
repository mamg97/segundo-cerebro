"""Synthetic-only source, target and temporal leakage regressions."""
import copy
from datetime import date, timedelta
from decimal import Decimal
import hashlib
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

from equities_market_study import read_archive, matrix, study, metrics, MEMBER, MODELS
from test_equities_drawdown_research import synthetic_prices
from equities_drawdown_research import features


def archive(lines=None, member=MEMBER):
    body = lines or ['This file was created by using the 202609 CRSP database.', '',
                     ',Mkt-RF,SMB,HML,RF', '20000103,1.00,0.00,0.00,0.10',
                     '20000104,-5.10,0.00,0.00,0.10', 'Copyright SYNTHETIC']
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr(member, '\n'.join(body))
    return buf.getvalue()


def load(raw):
    return read_archive(raw, hashlib.sha256(raw).hexdigest(), '2026-10-29')


class MarketStudyTests(unittest.TestCase):
    def test_total_return_adds_rf_and_exact_chaining(self):
        prices, source = load(archive())
        self.assertEqual(prices[0][1], Decimal('101.100'))
        self.assertEqual(prices[1][1] / prices[0][1], Decimal('.95'))
        self.assertEqual(source['selected_sessions'], 2)
        self.assertFalse(source['historical_asof_verified'])
        self.assertFalse(source['redistributed'])

    def test_cli_real_format_private_create_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            rows = synthetic_prices(3100)
            lines = ['This file was created by using the 202609 CRSP database.',
                     ',Mkt-RF,SMB,HML,RF']
            prior = 100.
            day = date(2000, 1, 1)
            for _, price in rows:
                day += timedelta(days=1)
                while day.weekday() >= 5:
                    day += timedelta(days=1)
                lines.append(f'{day:%Y%m%d},{(price/prior-1)*100:.8f},0,0,0')
                prior = price
            lines.append('Copyright SYNTHETIC')
            raw = archive(lines)
            source, output = root/'input.zip', root/'output.json'
            source.write_bytes(raw)
            command = [sys.executable, str(Path(__file__).with_name('equities_market_study.py')),
                       '--archive', str(source), '--sha256', hashlib.sha256(raw).hexdigest(),
                       '--source-asof', '2026-10-29', '--output', str(output)]
            result = subprocess.run(command, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(os.stat(output).st_mode & 0o777, 0o600)
            self.assertFalse(json.loads(output.read_text())['forecast_issued'])
            before = output.read_bytes()
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
            self.assertEqual(output.read_bytes(), before)

    def test_reject_hash_and_archive_member(self):
        raw = archive()
        with self.assertRaisesRegex(ValueError, 'SHA'):
            read_archive(raw, '0'*64, '2026-10-29')
        with self.assertRaises(ValueError):
            load(archive(member='../unexpected.csv'))

    def test_bad_rows_footer_header_and_vintage(self):
        base = ['This file was created by using the 202609 CRSP database.',
                ',Mkt-RF,SMB,HML,RF', '20000103,1.00,0.00,0.00,0.10',
                '20000104,-5.10,0.00,0.00,0.10', 'Copyright SYNTHETIC']
        variants = []
        for value in ('-99.99', '-999', 'NaN', 'Infinity', 'bad', '-100.10'):
            row = copy.deepcopy(base)
            row[3] = f'20000104,{value},0.00,0.00,0.10'
            variants.append(row)
        variants += [base[:3]+[base[2]]+base[4:], base[:2]+[base[3],base[2]]+base[4:],
                     base[:-1], base+[base[2]], base[:2]+[base[1]]+base[2:],
                     ['This file was created by using the 202701 CRSP database.']+base[1:],
                     base[:3]+['20271004,1,0,0,.1']+base[4:]]
        for lines in variants:
            with self.subTest(lines=lines), self.assertRaises(ValueError):
                load(archive(lines))

    def test_cached_features_match_existing_pilot(self):
        rows = synthetic_prices(390)
        cached = matrix(rows)
        for i in (60, 61, 100, 389):
            self.assertEqual(cached[i], features(rows, i))

    def test_future_mutation_preserves_all_past_estimates(self):
        rows = synthetic_prices(480)
        source = {'synthetic': True}
        test_from = rows[350][0].isoformat()
        before = study(rows, source, test_from)
        changed = rows[:]
        for i in range(391, len(rows)):
            changed[i] = (rows[i][0], rows[i][1]*(.1 if i % 2 else 5))
        after = study(changed, source, test_from)
        for a, b in zip(before['rows'], after['rows']):
            if a['origin_date'] <= rows[390][0].isoformat():
                for model in MODELS:
                    self.assertEqual(a[model], b[model])
                self.assertEqual(a['training_rows'], b['training_rows'])
        self.assertTrue(all(r['last_training_label_date'] <= r['origin_date'] for r in before['rows']))
        self.assertFalse(before['forecast_issued'])
        self.assertFalse(before['model_admitted'])
        self.assertFalse(before['current_market_risk_estimated'])
        self.assertEqual(before['decision'], 'DISCARDED_BY_FROZEN_SCREEN')

    def test_no_classes_never_fabricates_model(self):
        rows = [(date(2018, 1, 1)+timedelta(days=i), 100+i) for i in range(400)]
        result = study(rows, {'synthetic': True}, rows[350][0].isoformat())
        self.assertEqual(result['rows'], [])
        self.assertGreater(result['one_class_exclusions'], 0)
        self.assertIsNone(result['metrics'][MODELS[0]]['brier'])
        self.assertFalse(result['sufficient_screen_sample'])

    def test_metrics_paired_values_and_empty_alert_denominators(self):
        rows = [{'outcome':0, 'm':.1}, {'outcome':1, 'm':.3}, {'outcome':1, 'm':1.0}]
        result = metrics(rows, 'm')
        self.assertAlmostEqual(result['brier'], .5/3)
        self.assertEqual(sum(b['n'] for b in result['bins']), 3)
        self.assertEqual(result['alerts']['precision'], 1)
        self.assertEqual(result['alerts']['recall'], 1)
        self.assertIsNone(metrics([{'outcome':0,'m':.1}], 'm')['alerts']['precision'])


if __name__ == '__main__':
    unittest.main()
