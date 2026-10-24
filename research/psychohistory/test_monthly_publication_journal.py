"""Synthetic storage/crash tests; upstream crypto is tested separately."""
import datetime as dt
import fcntl
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import monthly_publication_journal as journal


class JournalTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='SYNTHETIC_MONTHLY_JOURNAL_')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)/'journal'
        self.proof=dict(targetMonth='2026-11-01',entrySha256='a'*64,prospectiveEligible=False)
        self.args=dict(target='2026-11-01',entry_sha256='a'*64)
        p=patch.object(journal,'verify_monthly_preflight',return_value=self.proof)
        self.verify=p.start();self.addCleanup(p.stop)
        p=patch.object(journal,'datetime');self.clock=p.start();self.addCleanup(p.stop)
        self.clock.now.return_value=dt.datetime(2026,10,26,1,tzinfo=dt.timezone.utc)

    def record(self):
        return journal.record_precommitment(self.root,**self.args)

    def test_idempotent_retry_never_relabels_as_issued(self):
        first=self.record();second=self.record()
        self.assertEqual(first['sha256'],second['sha256'])
        self.assertTrue(second['replayed']);self.assertFalse(second['revalidated'])
        self.assertFalse(first['forecastIssued']);self.assertFalse(first['prospectiveEligible'])
        self.assertEqual(len(journal.scan(self.root)),1)
        self.verify.assert_called_once_with(**self.args)

    def test_conflicting_target_rejected(self):
        self.record();self.args['entry_sha256']='b'*64
        with self.assertRaisesRegex(ValueError,'different immutable'):
            self.record()

    def test_crash_before_commit_does_not_leave_partial_entry(self):
        with patch.object(journal.os,'link',side_effect=OSError('SYNTHETIC interrupted commit')):
            with self.assertRaises(OSError):self.record()
        self.assertEqual(journal.scan(self.root),[])
        self.assertFalse(self.record()['replayed'])

    def test_retry_after_committed_write_error_recovers_same_entry(self):
        original=journal.scan
        with patch.object(journal,'scan',side_effect=[[],OSError('SYNTHETIC after commit')]):
            with self.assertRaises(OSError):self.record()
        self.assertEqual(len(original(self.root)),1)
        self.assertTrue(self.record()['replayed'])

    def test_writer_lock_prevents_competing_mutation(self):
        self.root.mkdir()
        with (self.root/'.writer.lock').open('w') as lock:
            fcntl.flock(lock.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):self.record()
        self.verify.assert_not_called()
        self.assertFalse(self.record()['replayed'])

    def test_window_closing_during_verification_blocks_write(self):
        self.clock.now.return_value=dt.datetime(2026,10,26,12,0,1,tzinfo=dt.timezone.utc)
        with self.assertRaisesRegex(ValueError,'Window closed'):self.record()
        self.assertEqual(journal.scan(self.root),[])

    def test_altered_file_rejected(self):
        self.record()
        p=next((self.root/'entries').glob('*.json'));p.write_bytes(p.read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError,'integrity'):journal.scan(self.root)

    def test_late_write_preserves_pending_record_without_authorization(self):
        self.clock.now.side_effect=[dt.datetime(2026,10,26,11,59,59,tzinfo=dt.timezone.utc),
                                    dt.datetime(2026,10,26,12,0,1,tzinfo=dt.timezone.utc)]
        with self.assertRaisesRegex(ValueError,'closed during write'):self.record()
        replay=self.record()
        self.assertTrue(replay['replayed']);self.assertFalse(replay['revalidated'])
        self.assertFalse(replay['forecastIssued'])


if __name__=='__main__':unittest.main()
