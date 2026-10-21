"""Synthetic source-admission tests. No real countries or source records."""
import csv
import hashlib
import io
import unittest
from unittest.mock import patch
import candidate_current_snapshot_audit as mod


def source(events):
    text=io.StringIO();wr=csv.writer(text)
    wr.writerow(['id','country_id','type_of_violence','date_start','date_end','date_prec'])
    wr.writerows(events)
    return text.getvalue().encode()


class CurrentSourceTests(unittest.TestCase):
    def synthetic(self,events):
        raw=source(events);pdf=b'%PDF- SYNTHETIC CODEBOOK, NOT A REAL DOCUMENT'
        with patch.object(mod,'SOURCE_SHA',hashlib.sha256(raw).hexdigest()),\
             patch.object(mod,'CODEBOOK_SHA',hashlib.sha256(pdf).hexdigest()),\
             patch.object(mod,'CODEBOOK_BYTES',len(pdf)):
            return mod.audit(raw,pdf)

    def test_source_month_mismatch_is_counted_and_blocks_all_replay(self):
        r=self.synthetic([[1,1,1,'2026-09-04','2026-09-04',1],
                          [2,2,1,'2026-08-20','2026-08-20',1]])
        self.assertEqual(r['nSourceEvents'],2)
        self.assertEqual(r['temporalQualityCounts']['entireIntervalBeforeMonth'],1)
        self.assertEqual(r['status'],'SOURCE_QUALITY_BLOCKED')
        self.assertEqual(r['rowsSilentlyDropped'],0)
        self.assertFalse(r['backtestAuthorized']);self.assertFalse(r['forecastIssued'])
        self.assertNotIn('country_id',str(r))

    def test_cross_month_interval_with_one_endpoint_is_not_automatically_future_leakage(self):
        r=self.synthetic([[1,1,1,'2026-09-30','2026-10-02',2]])
        self.assertEqual(r['temporalQualityCounts']['neitherEndpointInMonth'],0)
        self.assertEqual(r['nExactDayRecordsWithinExportMonth'],0)
        self.assertEqual(r['status'],'QUALITY_INTACT_OTHER_ADMISSION_GATES_PENDING')
        self.assertFalse(r['backtestAuthorized'])

    def test_undocumented_zero_and_false_exact_day_block(self):
        r=self.synthetic([[1,1,1,'2026-09-02','2026-09-03',1],
                          [2,1,1,'2026-09-04','2026-09-04',0]])
        self.assertEqual(r['temporalQualityCounts']['undocumentedPrecision'],1)
        self.assertEqual(r['temporalQualityCounts']['exactDayContradiction'],1)
        self.assertEqual(r['status'],'SOURCE_QUALITY_BLOCKED')

    def test_both_pins_required_and_ragged_rows_rejected(self):
        with self.assertRaisesRegex(ValueError,'codebook'):mod.audit(b'x',b'%PDF-X')
        pdf=b'%PDF-X'
        with patch.object(mod,'CODEBOOK_SHA',hashlib.sha256(pdf).hexdigest()),\
             patch.object(mod,'CODEBOOK_BYTES',len(pdf)):
            with self.assertRaisesRegex(ValueError,'changed'):mod.audit(source([[1,1,1,'2026-09-04','2026-09-04',1]]),pdf)
        with self.assertRaisesRegex(ValueError,'Ragged'):
            self.synthetic([[1,1,1,'2026-09-04','2026-09-04',1,'EXTRA']])

if __name__=='__main__':unittest.main()
