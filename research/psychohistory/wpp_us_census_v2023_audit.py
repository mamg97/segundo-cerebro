"""Compare source definitions and values; do not score WPP as a forecast."""

import argparse
import csv
from decimal import Decimal
import gzip
from hashlib import sha256
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile


EXPECTED_SHA = {
    "wpp22": "3e57e009e4bc6bcd00e7c51f6ba84dba36337a611f7138b7993550c7345088e5",
    "wpp24": "286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc",
    "census": "aec49456a006a06bdaba1ec90f032e0412617da40cdda26709074fbc6bb528e6",
}
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def checked(path, key):
    raw = path.read_bytes()
    if sha256(raw).hexdigest() != EXPECTED_SHA[key]:
        raise ValueError(f"source SHA mismatch: {key}")
    return raw


def wpp_usa(raw, compressed):
    import io
    stream = gzip.GzipFile(fileobj=io.BytesIO(raw)) if compressed else io.BytesIO(raw)
    with io.TextIOWrapper(stream, encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        matches = [row for row in reader if row["ISO3_code"] == "USA"
                   and row["LocTypeID"] == "4" and row["Variant"] == "Medium"
                   and row["Time"] == "2023"]
    if len(matches) != 1:
        raise ValueError("WPP USA/2023 row ambiguous")
    return int(Decimal(matches[0]["TPopulation1July"]) * 1000)


def census_usa(raw):
    import io
    with ZipFile(io.BytesIO(raw)) as archive:
        if sum(item.file_size for item in archive.infolist()) > 5_000_000:
            raise ValueError("unexpected Census workbook size")
        shared = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        strings = ["".join(t.text or "" for t in si.findall(".//x:t", NS))
                   for si in shared.findall("x:si", NS)]
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    cells = {cell.attrib["r"]: cell for cell in sheet.findall(".//x:sheetData/x:row/x:c", NS)}
    def value(address):
        cell = cells[address]
        raw_value = cell.find("x:v", NS).text
        return strings[int(raw_value)] if cell.attrib.get("t") == "s" else raw_value
    if value("A5") != "United States" or value("F4") != "2023":
        raise ValueError("unexpected Census geography or year")
    return int(value("F5"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wpp22", type=Path)
    parser.add_argument("wpp24", type=Path)
    parser.add_argument("census_v2023", type=Path)
    args = parser.parse_args()
    a = wpp_usa(checked(args.wpp22, "wpp22"), False)
    b = wpp_usa(checked(args.wpp24, "wpp24"), True)
    c = census_usa(checked(args.census_v2023, "census"))
    print(json.dumps({"wpp2022_2023_usa": a,
                      "wpp2024_2023_usa": b,
                      "census_v2023_2023_usa_resident": c,
                      "wpp2022_minus_census_descriptive_gap": a-c,
                      "wpp2024_minus_census_descriptive_gap": b-c,
                      "forecast_skill_or_error_measured": False}, indent=2))


if __name__ == "__main__":
    main()
