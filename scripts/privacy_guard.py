#!/usr/bin/env python3
"""Fail CI on common secrets, private photos and sensitive attachments in Git diffs.
Diagnostic output contains only path/line/rule; never the matching value.
"""
import argparse, re, subprocess, sys
from pathlib import PurePosixPath

PRIVATE_DIRS = {"private", ".private", "personal", "uploads", "backups", "backup",
                "family-photos", "gym-photos", "progress-photos",
                "wardrobe-photos", "armario-fotos"}
BLOCK_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".tsv",
             ".sqlite", ".db", ".p12", ".pfx", ".pem", ".key", ".heic", ".heif", ".zip", ".7z"}
MEDIA_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".tif", ".tiff"}
ART_DIRS = ("app/assets/gym-animations/", "design/gym-animations/")
ART_FILES = {"app/brain-logo.png"}
RULES = (
    ("PRIVATE_KEY", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("GITHUB_TOKEN", re.compile(r"\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}")),
    ("OPENAI_KEY", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}")),
    ("GOOGLE_API_KEY", re.compile(r"\bAIza[A-Za-z0-9_-]{30,}")),
    ("JWT_TOKEN", re.compile(r"\beyJ[A-Za-z0-9_-]{35,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+")),
    ("DRIVE_ID", re.compile(r"https?://(?:docs|drive)\.google\.com/(?:spreadsheets/d/|document/d/|file/d/|drive/folders/)[A-Za-z0-9_-]{20,}")),
    ("IBAN", re.compile(r"\bES\d{22}\b")),
    ("DNI", re.compile(r"(?<!\w)\d{8}[A-Z](?!\w)")),
    ("PRIVATE_EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo|icloud|protonmail)\.[A-Za-z.]{2,}\b", re.I)),
)

def path_findings(path):
    p = PurePosixPath(path)
    result = []
    if any(x.lower() in PRIVATE_DIRS for x in p.parts[:-1]):
        result.append("PRIVATE_DIRECTORY")
    n = p.name.lower()
    if n == ".env" or n.startswith(".env.") or n.endswith((".secret", ".secrets")):
        result.append("SECRET_FILE")
    if p.suffix.lower() in BLOCK_EXT:
        result.append("PRIVATE_ATTACHMENT")
    if p.suffix.lower() in MEDIA_EXT and path not in ART_FILES and not path.startswith(ART_DIRS):
        result.append("UNREVIEWED_MEDIA")
    return result

def findings(patch, changed_paths=()):
    out = {(p, 0, rule) for p in changed_paths for rule in path_findings(p)}
    path = ""
    number = 0
    for line in patch.splitlines():
        if line.startswith("+++ b/"):
            path = line[6:]
        elif line.startswith("@@ "):
            m = re.search(r"\+(\d+)", line)
            if m:
                number = int(m.group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            for rule, rx in RULES:
                if rx.search(line[1:]):
                    out.add((path, number, rule))
            number += 1
        elif line.startswith(" "):
            number += 1
    return sorted(out)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("base")
    parser.add_argument("head")
    args = parser.parse_args()
    for rev in (args.base, args.head):
        if not re.fullmatch(r"[0-9a-fA-F]{40}", rev):
            parser.error("SHA must be 40 hex characters")
    cmd = ["git", "diff", "--no-renames", args.base, args.head, "--"]
    names = subprocess.run(cmd[:2] + ["--name-only", "-z"] + cmd[2:],
                           check=True, stdout=subprocess.PIPE).stdout
    paths = [x for x in names.decode("utf-8", "replace").split("\0") if x]
    patch = subprocess.run(cmd[:2] + ["--unified=0", "--binary"] + cmd[2:],
                           check=True, stdout=subprocess.PIPE).stdout.decode("utf-8", "replace")
    issues = findings(patch, paths)
    if issues:
        print(f"Privacy guard: {len(issues)} finding(s); values redacted")
        for path, line, rule in issues:
            print(f"- {path}:{line} [{rule}]")
        return 1
    print("Privacy guard: no recognized private additions")
    return 0

if __name__ == "__main__":
    sys.exit(main())
