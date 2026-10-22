"""Audit the Philadelphia Fed RUC real-time workbook without forecasting.

The workbook is public, but its observed bytes belong in the private source
archive. This audit emits aggregate structure only and never promotes a
historical vintage label into independently witnessed availability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
HEADER = re.compile(r"RUC(\d{2})Q([1-4])\Z")
MONTH = re.compile(r"(\d{4}):(0[1-9]|1[0-2])\Z")
CELL = re.compile(r"([A-Z]+)([1-9]\d*)\Z")
MAX_FILE_BYTES = 5_000_000
MAX_MEMBER_BYTES = 50_000_000


def _column_number(address: str) -> tuple[int, int]:
    match = CELL.fullmatch(address)
    if not match:
        raise ValueError("Invalid spreadsheet cell address")
    number = 0
    for character in match.group(1):
        number = number * 26 + ord(character) - ord("A") + 1
    return number, int(match.group(2))


def _month_after(year: int, month: int) -> tuple[int, int]:
    return (year + 1, 1) if month == 12 else (year, month + 1)


def _read_xml(book: zipfile.ZipFile, name: str) -> ET.Element:
    info = book.getinfo(name)
    if info.file_size > MAX_MEMBER_BYTES:
        raise ValueError("Oversized workbook member")
    return ET.fromstring(book.read(name))


def _shared_strings(book: zipfile.ZipFile) -> list[str]:
    root = _read_xml(book, "xl/sharedStrings.xml")
    return ["".join(node.itertext()) for node in root.findall(f"{NS}si")]


def _cells(book: zipfile.ZipFile) -> dict[tuple[int, int], str | float | None]:
    strings = _shared_strings(book)
    root = _read_xml(book, "xl/worksheets/sheet1.xml")
    sheet_data = root.find(f"{NS}sheetData")
    if sheet_data is None:
        raise ValueError("Workbook has no sheet data")
    result: dict[tuple[int, int], str | float | None] = {}
    for row in sheet_data.findall(f"{NS}row"):
        for cell in row.findall(f"{NS}c"):
            key = _column_number(cell.attrib.get("r", ""))
            if key in result or cell.find(f"{NS}f") is not None:
                raise ValueError("Duplicate cell or formula in source workbook")
            raw = cell.findtext(f"{NS}v")
            kind = cell.attrib.get("t", "n")
            if kind == "s":
                if raw is None or not raw.isdigit() or int(raw) >= len(strings):
                    raise ValueError("Invalid shared string reference")
                value: str | float | None = strings[int(raw)]
            elif kind == "inlineStr":
                value = "".join(cell.find(f"{NS}is").itertext())
            elif kind == "e" and raw == "#N/A":
                value = None
            elif kind == "n" and raw is not None:
                value = float(raw)
                if not (0 <= value <= 100):
                    raise ValueError("Invalid unemployment rate")
            elif kind == "n" and raw is None:
                value = None
            else:
                raise ValueError("Unexpected workbook cell type")
            if key[0] > 1 and key[1] > 1 and value == "#N/A":
                value = None
            result[key] = value
    return result


def audit(path: Path, expected_sha256: str) -> dict:
    if not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
        raise ValueError("A complete SHA-256 pin is required")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("Oversized source workbook")
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected_sha256:
        raise ValueError("Source workbook SHA-256 mismatch")
    with zipfile.ZipFile(path) as book:
        names = set(book.namelist())
        if not {"xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"} <= names:
            raise ValueError("Unexpected workbook layout")
        cells = _cells(book)

    header_indices = sorted(column for column, row in cells if row == 1)
    if not header_indices or header_indices != list(range(1, max(header_indices) + 1)):
        raise ValueError("Missing workbook header cells")
    if cells[1, 1] != "DATE":
        raise ValueError("Unexpected observation column")
    vintages = []
    for column in header_indices[1:]:
        value = cells[column, 1]
        match = HEADER.fullmatch(value) if isinstance(value, str) else None
        if match is None:
            raise ValueError("Unexpected vintage header")
        yy, quarter = int(match.group(1)), int(match.group(2))
        year = 1900 + yy if yy >= 65 else 2000 + yy
        vintages.append((year, quarter))
    if not vintages or vintages != sorted(set(vintages)):
        raise ValueError("Vintages must be unique and ordered")

    row_indices = sorted(row for column, row in cells if column == 1 and row > 1)
    if not row_indices or row_indices != list(range(2, max(row_indices) + 1)):
        raise ValueError("Missing observation months")
    months = []
    for row in row_indices:
        value = cells[1, row]
        match = MONTH.fullmatch(value) if isinstance(value, str) else None
        if match is None:
            raise ValueError("Invalid observation month")
        month = int(match.group(1)), int(match.group(2))
        if months and month != _month_after(*months[-1]):
            raise ValueError("Observation months must be consecutive")
        months.append(month)

    numeric = 0
    nonempty_by_vintage = [0] * len(vintages)
    for (column, row), value in cells.items():
        if column == 1 or row == 1 or value is None:
            continue
        if column > len(vintages) + 1 or row > len(months) + 1:
            raise ValueError("Data outside the declared table")
        if not isinstance(value, float):
            raise ValueError("Non-numeric observation")
        year, quarter = vintages[column - 2]
        if months[row - 2] > (year, quarter * 3):
            raise ValueError("Vintage contains a future observation")
        numeric += 1
        nonempty_by_vintage[column - 2] += 1
    if min(nonempty_by_vintage) == 0:
        raise ValueError("An empty vintage is not admissible")
    return {
        "schema": "psychohistory.ruc_vintage_source_audit.v1",
        "source_sha256": expected_sha256,
        "vintage_count": len(vintages),
        "observation_month_count": len(months),
        "numeric_cell_count": numeric,
        "first_vintage": f"{vintages[0][0]}Q{vintages[0][1]}",
        "last_vintage": f"{vintages[-1][0]}Q{vintages[-1][1]}",
        "first_observation_month": f"{months[0][0]:04d}-{months[0][1]:02d}",
        "last_observation_month": f"{months[-1][0]:04d}-{months[-1][1]:02d}",
        "exact_historical_release_times_verified": False,
        "forecast_issued": False,
        "predictive_skill_demonstrated": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", required=True, type=Path)
    parser.add_argument("--sha256", required=True)
    arguments = parser.parse_args()
    print(json.dumps(audit(arguments.workbook, arguments.sha256), sort_keys=True))


if __name__ == "__main__":
    main()
