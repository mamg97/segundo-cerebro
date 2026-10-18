#!/usr/bin/env python3
"""Read-only aggregate audit of all reachable public Git refs and historical diffs.

Never print source lines, matched values, filenames, or object identifiers.
This is a heuristic detector: counts need interpretation and zero != a proof of safety.
"""
import collections
import json
import re
import subprocess
import sys
import time
from pathlib import PurePosixPath

MAX_SECONDS = 480
PUBLIC_ART_PREFIXES = ("app/assets/gym-animations/", "design/gym-animations/")
PUBLIC_ART_FILES = {"app/brain-logo.png"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".avif", ".tif", ".tiff"}
ATTACHMENT_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".sqlite", ".db", ".p12", ".pfx", ".pem", ".key"}
RULES = {
    "PRIVATE_KEY": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GITHUB_TOKEN": re.compile(rb"\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}"),
    "OPENAI_KEY": re.compile(rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}"),
    "GOOGLE_API_KEY": re.compile(rb"\bAIza[A-Za-z0-9_-]{30,}"),
    "PRIVATE_DRIVE_REFERENCE": re.compile(
        rb"https?://(?:docs|drive)\.google\.com/(?:spreadsheets/d/|document/d/|file/d/|drive/folders/)[A-Za-z0-9_-]{20,}"),
    "BANK_IBAN": re.compile(rb"\bES[0-9]{22}\b"),
    "PERSONAL_EMAIL": re.compile(
        rb"\b[A-Za-z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo|icloud|protonmail)\.[A-Za-z.]{2,}\b", re.I),
    "EMBEDDED_IMAGE_BYTES": re.compile(rb"data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]{500,}"),
}

def run_bytes(cmd):
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL).stdout

def main():
    started = time.monotonic()
    result = {"scope": "all_reachable_refs", "scan_complete": False}
    branch_refs = run_bytes(["git", "for-each-ref", "--format=%(refname)",
                             "refs/remotes/origin/", "refs/heads/"])
    refs = set(branch_refs.splitlines())
    if len(refs) < 2:
        print(json.dumps({"scan_complete": False, "reason": "REFS_NOT_FETCHED"}))
        return 2
    result["refs_examined"] = len(refs)
    named_objects = run_bytes(["git", "rev-list", "--objects", "--all"])
    image = collections.Counter()
    doc = collections.Counter()
    total = 0
    for raw in named_objects.splitlines():
        _, _, path = raw.partition(b" ")
        if not path:
            continue
        total += 1
        name = path.decode("utf-8", "replace")
        ext = PurePosixPath(name).suffix.lower()
        if ext in IMAGE_EXTS:
            image["assets_all"] += 1
            if not (name in PUBLIC_ART_FILES or name.startswith(PUBLIC_ART_PREFIXES)):
                image["outside_known_generic_art"] += 1
        if ext in ATTACHMENT_EXTS:
            doc["historical_sensitive_attachment_type"] += 1
    result["historical_named_objects"] = total
    result["historical_media"] = dict(image)
    result["historical_attachments"] = dict(doc)

    patterns = collections.Counter()
    added_lines = 0
    p = subprocess.Popen(
        ["git", "log", "--all", "--no-ext-diff", "--no-color",
         "--no-renames", "--unified=0", "--format=%H", "-p"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
    )
    try:
        for line in p.stdout:
            if time.monotonic() - started > MAX_SECONDS:
                p.kill()
                print(json.dumps({"scan_complete": False, "reason": "AUDIT_TIMEOUT"}))
                return 2
            if not line.startswith(b"+") or line.startswith(b"+++"):
                continue
            added_lines += 1
            for label, pattern in RULES.items():
                if pattern.search(line):
                    patterns[label] += 1
        status = p.wait()
    finally:
        if p.poll() is None:
            p.kill()
            p.wait()
    if status != 0:
        print(json.dumps({"scan_complete": False, "reason": "GIT_HISTORY_UNREADABLE"}))
        return 2
    result["added_lines_examined"] = added_lines
    result["potential_sensitive_line_counts"] = dict(patterns)
    result["scan_complete"] = True
    result["review_required"] = bool(patterns or image["outside_known_generic_art"] or doc)
    print(json.dumps(result, sort_keys=True))
    # Candidate matches can be fixtures or generic media; report them for
    # triage without calling them confirmed leaks or stopping unrelated CI.
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        print(json.dumps({"scan_complete": False, "reason": "AUDIT_ERROR_REDACTED"}))
        sys.exit(2)
