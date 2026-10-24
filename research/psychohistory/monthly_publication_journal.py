"""Private durable precommitment journal, pending actual canonical registration.

No ISSUED transition. Reads prove local chain integrity only. A cached retry does
not renew an expired verification or authorize publication outside its window.
"""
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

from monthly_issue_preflight import verify_monthly_preflight, window
from prospective_draft_ledger import canonical, private_root

SCHEMA = 'psychohistory.monthly_publication_journal.v1'
STAGE = 'VERIFIED_PRECOMMITMENT_PENDING_CANONICAL'
NAME = re.compile(r'^(\d{8})-([a-f0-9]{64})\.json$')


def scan(directory):
    root = private_root(Path(directory))
    entries = root/'entries'
    if not entries.exists():
        return []
    if entries.is_symlink() or not entries.is_dir():
        raise ValueError('Unsafe journal entries directory')
    result, previous, targets = [], '0'*64, set()
    for seq, path in enumerate(sorted(entries.iterdir()), 1):
        match = NAME.fullmatch(path.name)
        if not match or path.is_symlink() or not path.is_file():
            raise ValueError('Unexpected journal file')
        raw = path.read_bytes()
        record = json.loads(raw)
        digest = hashlib.sha256(raw).hexdigest()
        if (int(match[1]) != seq or match[2] != digest or canonical(record) != raw or
                record.get('schema') != SCHEMA or record.get('sequence') != seq or
                record.get('previousSha256') != previous or record.get('stage') != STAGE or
                record.get('forecastIssued') is not False or record.get('prospectiveEligible') is not False or
                record.get('localTimeIsIndependentSeal') is not False):
            raise ValueError('Journal integrity or stage violation')
        target = record['targetMonth']
        window(target)
        if target in targets or record['preflight']['targetMonth'] != target:
            raise ValueError('Duplicate or mismatched target')
        targets.add(target)
        result.append(dict(sha256=digest, record=record))
        previous = digest
    return result


def record_precommitment(directory, **preflight_args):
    root = private_root(Path(directory))
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    entries = root/'entries'
    entries.mkdir(mode=0o700, exist_ok=True)
    lock_fd = os.open(root/'.writer.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        # OS releases this lock on crash; an existing lock file is not a stale lock.
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        chain = scan(root)
        for item in chain:
            if item['record']['targetMonth'] == preflight_args['target']:
                if item['record']['preflight']['entrySha256'] != preflight_args['entry_sha256']:
                    raise ValueError('Target already bound to a different immutable draft')
                return dict(sha256=item['sha256'], stage=STAGE, replayed=True,
                            revalidated=False, forecastIssued=False, prospectiveEligible=False)
        proof = verify_monthly_preflight(**preflight_args)
        times = window(preflight_args['target'])
        now = datetime.now(timezone.utc)
        if not times['start'] <= now <= times['deadline']:
            raise ValueError('Window closed before durable registration')
        record = dict(schema=SCHEMA, sequence=len(chain)+1,
                      previousSha256=chain[-1]['sha256'] if chain else '0'*64,
                      targetMonth=preflight_args['target'], stage=STAGE,
                      createdLocallyAtUtc=now.isoformat(), localTimeIsIndependentSeal=False,
                      preflight=proof, forecastIssued=False, prospectiveEligible=False)
        raw = canonical(record)
        digest = hashlib.sha256(raw).hexdigest()
        destination = entries/f'{len(chain)+1:08d}-{digest}.json'
        # A partial write never appears among committed entries. link() is
        # atomic and refuses replacement; fsync persists file and directory.
        with tempfile.TemporaryDirectory(prefix='.pending-', dir=root) as temporary:
            pending = Path(temporary)/'entry'
            fd = os.open(pending, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(fd, 'wb') as f:
                f.write(raw); f.flush(); os.fsync(f.fileno())
            os.link(pending, destination)
            directory_fd = os.open(entries, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        if scan(root)[-1]['sha256'] != digest:
            raise ValueError('Post-write journal verification failed')
        if datetime.now(timezone.utc) > times['deadline']:
            # Keep the immutable pending record for recovery, never backdate it.
            raise ValueError('Window closed during write; pending entry is not an issuance')
        return dict(sha256=digest, stage=STAGE, replayed=False, revalidated=True,
                    forecastIssued=False, prospectiveEligible=False)
    finally:
        os.close(lock_fd)
