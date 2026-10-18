"""Fail-closed verifier for an existing PRIVATE UCDP reproduction package.

Never publish the package, individual predictions, probabilities or scores.
Reads the complete package internally to verify its MANIFEST.json and pinned
original-source bytes, but prints only aggregate source/provenance results.
An archive manifest proves internal integrity, not its independent timestamp.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import stat
import tempfile
import zipfile

from source_release_intake import inspect, validate_pinned_protocol

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA = "psychohistory.private_reproduction_archive_intake.v1"
SHA256 = re.compile(r"^[a-f0-9]{64}$")
MAX_ARCHIVE_BYTES = 60_000_000
MAX_MEMBER_BYTES = 80_000_000
MAX_TOTAL_BYTES = 125_000_000
SOURCE_MEMBERS = {"sources/ucdp.zip", "sources/codebook.pdf", "sources/sources.json",
                  "code/protocol.json", "MANIFEST.json"}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verified_input(path):
    target = Path(path).absolute()
    if (target.is_symlink() or not target.is_file() or
            target.resolve().is_relative_to(REPO_ROOT) or
            target.stat().st_size > MAX_ARCHIVE_BYTES):
        raise ValueError("Expected a bounded private regular archive outside Git")
    return target


def secure_members(archive):
    records = archive.infolist()
    names = [member.filename for member in records]
    if len(names) != len(set(names)) or not SOURCE_MEMBERS.issubset(names):
        raise ValueError("Missing original sources/manifest or duplicate archive entries")
    total = 0
    for m in records:
        parts = m.filename.split("/")
        if (m.is_dir() or not m.filename or m.filename.startswith("/") or
                "\\" in m.filename or any(part in ("", ".", "..") for part in parts) or
                (m.flag_bits & 1) or m.file_size > MAX_MEMBER_BYTES or
                stat.S_IFMT(m.external_attr >> 16) not in (0, stat.S_IFREG)):
            raise ValueError("Unsafe or unexpected archive member")
        total += m.file_size
        if total > MAX_TOTAL_BYTES or m.file_size > max(1, m.compress_size) * 500:
            raise ValueError("Oversized or suspicious archive payload")
    return set(names)


def verify_private_archive(path, protocol):
    """Validate archived sources with the SAME strict gate as official direct files."""
    validate_pinned_protocol(protocol)
    source = verified_input(path)
    outer_hash = hashlib.sha256()
    with source.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            outer_hash.update(block)
    with zipfile.ZipFile(source) as archive:
        members = secure_members(archive)
        try:
            manifest = json.loads(archive.read("MANIFEST.json"))
            archived_protocol = json.loads(archive.read("code/protocol.json"))
            source_manifest = json.loads(archive.read("sources/sources.json"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("Invalid package metadata") from exc
        if (not isinstance(manifest, dict) or set(manifest) != members - {"MANIFEST.json"} or
                any(not isinstance(v, str) or not SHA256.fullmatch(v)
                    for v in manifest.values())):
            raise ValueError("Package MANIFEST.json does not cover exact members")
        for name, expected in manifest.items():
            # Some members are private predictions; read only to check hashes.
            # Never print content, names of individual events, scores or metrics.
            if sha256(archive.read(name)) != expected:
                raise ValueError("Archive internal content hash mismatch")
        if archived_protocol != protocol:
            raise ValueError("Archived protocol is not the currently pinned protocol")
        entries = source_manifest.get("inputs") if isinstance(source_manifest, dict) else None
        if (source_manifest.get("datasetVersion") != protocol["dataset_version"] or
                not isinstance(entries, list) or len(entries) != 2):
            raise ValueError("Source provenance manifest is incomplete")
        expected_sources = {
            "ucdp.zip": (protocol["archive_url"], protocol["archive_sha256"]),
            "codebook.pdf": (protocol["codebook_url"], protocol["codebook_sha256"]),
        }
        by_name = {entry.get("name"): entry for entry in entries
                   if isinstance(entry, dict)}
        if set(by_name) != set(expected_sources):
            raise ValueError("Source provenance manifest has missing or duplicate entries")
        for name, (url, digest) in expected_sources.items():
            data = archive.read("sources/" + name)
            item = by_name[name]
            if (item.get("url") != url or item.get("sha256") != digest or
                    item.get("bytes") != len(data) or sha256(data) != digest):
                raise ValueError("Archived original source does not match pinned bytes")

        with tempfile.TemporaryDirectory(prefix="private-psychohistory-") as folder:
            directory = Path(folder)
            (directory / "ucdp.zip").write_bytes(archive.read("sources/ucdp.zip"))
            (directory / "codebook.pdf").write_bytes(archive.read("sources/codebook.pdf"))
            intake = inspect(directory, protocol)

    return {
        "schema": SCHEMA,
        "status": "PRIVATE_ARCHIVE_SOURCE_BYTES_VERIFIED",
        "archiveSha256": outer_hash.hexdigest(),
        "manifestEntriesVerified": len(manifest),
        "archiveOriginalsPreserved": True,
        "archiveOfficialZipSha256": protocol["archive_sha256"],
        "archiveOfficialCodebookSha256": protocol["codebook_sha256"],
        "sourceRows": intake["sourceRows"],
        "sourceCountries": intake["sourceCountries"],
        "sourceYearRange": intake["yearRange"],
        "sourceChecksumMatchesPinnedProtocol": True,
        "sourcePublicationAsOfVerified": False,
        "independentTimestampReceiptVerified": False,
        "prospectiveForecastIssued": False,
        "prospectiveEligible": False,
        "outcomeKnown": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    args = parser.parse_args()
    protocol = json.loads((Path(__file__).with_name("protocol.json")).read_text())
    result = verify_private_archive(args.archive, protocol)
    result["inspectedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
    # Print aggregate metadata only: no raw records or forecasts.
    print(json.dumps(result, sort_keys=True, ensure_ascii=False))


if __name__ == "__main__":
    main()
