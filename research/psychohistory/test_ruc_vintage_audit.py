"""Adversarial checks for the public macro vintage source gate."""

import hashlib
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ruc_vintage_audit import audit  # noqa: E402


def fixture(path: Path, *, future=False, gap=False, text=False) -> str:
    months = ["2025:01", "2025:02", "2025:03", "2025:04"]
    if gap:
        months[1] = "2025:03"
    strings = ["DATE", "RUC25Q1", "RUC25Q2", *months]
    shared = "<sst xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'>"
    shared += "".join(f"<si><t>{s}</t></si>" for s in strings) + "</sst>"
    rows = ["<row r='1'><c r='A1' t='s'><v>0</v></c><c r='B1' t='s'><v>1</v></c><c r='C1' t='s'><v>2</v></c></row>"]
    for i in range(4):
        row = i + 2
        b = f"<c r='B{row}'><v>4.1</v></c>" if i == (1 if future else 0) else ""
        c = f"<c r='C{row}' t='s'><v>1</v></c>" if text and i == 3 else f"<c r='C{row}'><v>4.2</v></c>" if i == 3 else ""
        rows.append(f"<row r='{row}'><c r='A{row}' t='s'><v>{i+3}</v></c>{b}{c}</row>")
    sheet = "<worksheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'><sheetData>" + "".join(rows) + "</sheetData></worksheet>"
    with zipfile.ZipFile(path, "w") as book:
        book.writestr("xl/sharedStrings.xml", shared)
        book.writestr("xl/worksheets/sheet1.xml", sheet)
    return hashlib.sha256(path.read_bytes()).hexdigest()


class RucAuditTests(unittest.TestCase):
    def test_pinned_source_and_negative_admission_flags(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ruc.xlsx"
            sha = fixture(path)
            report = audit(path, sha)
            self.assertEqual((report["vintage_count"], report["numeric_cell_count"]), (2, 2))
            self.assertFalse(report["exact_historical_release_times_verified"])
            self.assertFalse(report["predictive_skill_demonstrated"])
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                audit(path, "0" * 64)

    def test_future_or_ambiguous_cells_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ruc.xlsx"
            for options, expected in [({"future": True}, "future observation"),
                                      ({"gap": True}, "consecutive"),
                                      ({"text": True}, "Non-numeric observation")]:
                sha = fixture(path, **options)
                with self.assertRaisesRegex(ValueError, expected):
                    audit(path, sha)


if __name__ == "__main__":
    unittest.main()
