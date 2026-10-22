"""Audit saved BLS browser DOM snapshots; never infer release-day bytes."""

import argparse
import calendar
import csv
from datetime import date
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys


class SummaryTable(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.in_row = False
        self.in_cell = False
        self.cell = []
        self.row = []
        self.rows = []
        self.matches = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "table":
            if attrs.get("id") == "cps_empsit_sum":
                self.matches += 1
                if self.matches > 1:
                    raise ValueError("duplicate summary table")
                self.depth = 1
            elif self.depth:
                self.depth += 1
        elif self.depth and tag == "tr":
            self.in_row, self.row = True, []
        elif self.depth and self.in_row and tag in ("td", "th"):
            self.in_cell, self.cell = True, []

    def handle_data(self, data):
        if self.in_cell:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if self.depth and tag in ("td", "th") and self.in_cell:
            self.row.append(" ".join(" ".join(self.cell).split()))
            self.in_cell = False
        elif self.depth and tag == "tr" and self.in_row:
            if self.row:
                self.rows.append(self.row)
            self.in_row = False
        elif self.depth and tag == "table":
            self.depth -= 1


def header_month(value):
    match = re.fullmatch(r"([A-Za-z]+)\.?(?:\s+)(\d{4})", value)
    if not match:
        return None
    name, year = match.groups()
    for month in range(1, 13):
        if name.lower() in {calendar.month_abbr[month].lower(),
                            calendar.month_name[month].lower(),
                            "sept" if month == 9 else ""}:
            return f"{year}-{month:02d}"
    return None


def extract(entry, folder):
    if entry.get("capture_type") != "complete browser DOM serialization" or entry.get("raw_http_response") is not False:
        raise ValueError("unexpected capture type")
    name = entry["file"]
    if Path(name).name != name or not name.endswith(".browser-dom.html"):
        raise ValueError("unsafe snapshot name")
    raw = (folder / name).read_bytes()
    if len(raw) != entry["bytes"] or sha256(raw).hexdigest() != entry["sha256"]:
        raise ValueError(f"snapshot integrity failed: {name}")
    if not raw.rstrip().endswith(b"</html>"):
        raise ValueError(f"incomplete DOM: {name}")
    parser = SummaryTable()
    parser.feed(raw.decode("utf-8"))
    if parser.matches != 1 or not parser.rows:
        raise ValueError(f"summary table missing: {name}")
    target = entry["reference_month"]
    date.fromisoformat(target + "-01")
    headings = parser.rows[0]
    indexes = [i for i, value in enumerate(headings) if header_month(value) == target]
    if len(indexes) != 1:
        raise ValueError(f"reference month column ambiguous: {name}")
    rows = [row for row in parser.rows if row[0] == "Unemployment rate"]
    if len(rows) != 1 or indexes[0] >= len(rows[0]):
        raise ValueError(f"unemployment row ambiguous: {name}")
    rate = rows[0][indexes[0]]
    if not re.fullmatch(r"\d{1,2}\.\d", rate):
        raise ValueError(f"unexpected rate: {name}: {rate}")
    release = date.fromisoformat(entry["release_date"])
    if release <= date.fromisoformat(target + "-01"):
        raise ValueError(f"release before reference month: {name}")
    stamp = release.strftime("%m%d%Y")
    if not entry["url"].startswith("https://www.bls.gov/news.release/archives/empsit_") or stamp not in entry["url"]:
        raise ValueError(f"release URL mismatch: {name}")
    return {"reference_month": target, "release_date": str(release),
            "unemployment_rate_pct": rate, "source_url": entry["url"],
            "capture_utc": entry["capture_utc"], "sha256": entry["sha256"],
            "capture_type": entry["capture_type"]}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("manifest", type=Path)
    args = cli.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    rows = [extract(item, args.manifest.parent) for item in manifest["files"]]
    if len({row["reference_month"] for row in rows}) != len(rows):
        raise ValueError("duplicate reference month")
    out = csv.DictWriter(sys.stdout, fieldnames=rows[0].keys())
    out.writeheader()
    out.writerows(sorted(rows, key=lambda row: row["reference_month"]))


if __name__ == "__main__":
    main()
