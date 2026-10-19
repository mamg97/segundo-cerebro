"""Inspect the official COW System2024 ZIP without exposing country rows.

Archive bytes are downloaded only in an ephemeral GitHub Actions runner.
This pilot reports structural metadata, NEVER approves an as-of vintage.
"""
from __future__ import annotations
import argparse
import hashlib
import csv
import io
import json
from pathlib import Path
from zipfile import ZipFile, BadZipFile

MAX_ARCHIVE = 5_000_000
MAX_MEMBERS = 20
MAX_MEMBER_SIZE = 20_000_000


def inspect(raw):
    if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_ARCHIVE:
        raise ValueError("Official archive missing or too large")
    try:
        with ZipFile(io.BytesIO(raw)) as archive:
            members = archive.infolist()
            if not 1 <= len(members) <= MAX_MEMBERS:
                raise ValueError("Unexpected number of archive members")
            files = []
            for entry in members:
                path = entry.filename.replace("\\", "/")
                components = path.split("/")
                if (not path or path.startswith("/") or ".." in components
                        or (entry.external_attr >> 16) & 0o170000 == 0o120000):
                    raise ValueError("ZIP unsafe member path/type")
                if entry.file_size > MAX_MEMBER_SIZE:
                    raise ValueError("ZIP member too large")
                if not entry.is_dir():
                    files.append({
                        "member_name": path,
                        "uncompressed_bytes": entry.file_size,
                        "filename_extension": path.rsplit(".", 1)[-1].lower(),
                    })
            if not files:
                raise ValueError("Official archive has no files")
            official = [e for e in members if e.filename == "System2024/system2024.csv"]
            if len(official) != 1 or official[0].file_size > 2_000_000:
                raise ValueError("Expected a unique bounded official system2024.csv")
            csv_bytes = archive.read(official[0])
            try:
                sample = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig"), newline=""))
                columns = sample.fieldnames
                n_rows = sum(1 for _ in sample)
            except (UnicodeError, csv.Error) as exc:
                raise ValueError("Invalid CSV in official archive") from exc
            if not columns or len(set(columns)) != len(columns) or not 5_000 <= n_rows <= 100_000:
                raise ValueError("Official dataset schema or row count unexpected")
    except (BadZipFile, OSError) as exc:
        raise ValueError("Not a valid ZIP archive") from exc
    return {
        "schema": "psychohistory.cow_official_system2024_zip_probe.v1",
        "source_url": "https://correlatesofwar.org/wp-content/uploads/System2024.zip",
        "archive_sha256_observed_now": hashlib.sha256(raw).hexdigest(),
        "files": files,
        "official_csv_header": columns,
        "official_csv_rows": n_rows,
        "official_csv_sha256_observed_now": hashlib.sha256(csv_bytes).hexdigest(),
        "downloaded_in_current_runner": True,
        "source_as_of_verified": False,
        "official_country_year_rows_verified": False,
        "historical_byte_timestamp_verified": False,
        "backtest_authorized": False,
        "models_scored": False,
        "forecast_issued": False,
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive", type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(inspect(args.archive.read_bytes()), sort_keys=True))
