"""Read-only 23.1 archive *discovery*; no held-out outcomes or scores.

All source bytes remain ephemeral in CI. Printed results contain only
official link, hash, size, workbook sheet metadata and field headings.
"""
import hashlib
import html as html_entities
import io
import json
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from urllib.request import urlopen
from zipfile import ZipFile, BadZipFile
from xml.etree import ElementTree as ET

INDEX="https://ucdp.uu.se/downloads/olddw.html"
NS={"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
MAX_BYTES=15_000_000
MAX_MEMBER=25_000_000

def official_23_xlsx_link(page: str):
    """Require the correct historical dataset section, not any v23.1 link."""
    if not isinstance(page,str): raise ValueError("HTML required")
    # Work only within the historical Country-Year subsection.
    found=re.search(r"(?is)<h[2-5][^>]*>\s*UCDP Country-Year Dataset on Organized Violence within Country Borders\s*</h[2-5]>",page)
    if not found: raise ValueError("Official OrganizedViolenceCY historical section not located")
    remaining=page[found.end():]
    limit=re.search(r"(?is)<h[2-5]\b",remaining)
    section=remaining[:limit.start()] if limit else remaining[:12000]
    row=re.search(r"(?is)\bversion\s*23\.1\s*:\s*(.{0,1000})",section)
    if not row: raise ValueError("Official OrganizedViolenceCY 23.1 row not found")
    for href, label in re.findall(r'(?is)<a\s+[^>]*href=["\x27]([^"\x27]+)["\x27][^>]*>(.*?)</a>',row.group(1)):
        label=re.sub(r"<[^>]+>","",label).strip().upper()
        if label!="EXCEL":continue
        u=urljoin(INDEX,html_entities.unescape(href))
        p=urlsplit(u)
        if (p.scheme!="https" or p.hostname!="ucdp.uu.se" or p.username or p.password
           or p.query or p.fragment or p.port or "/downloads/organizedviolencecy/" not in p.path.lower()
           or not p.path.lower().endswith((".xlsx",".zip",".xls"))):
            raise ValueError("Historical EXCEL link not an approved UCDP data URL")
        return u
    raise ValueError("No UCDP 23.1 EXCEL anchor in row")

def column_num(address):
    a=re.match(r"^([A-Z]+)\d+$",address or "")
    if not a:return None
    n=0
    for ch in a.group(1):n=n*26+ord(ch)-64
    return n-1

def metadata_only(payload: bytes):
    """Inspect only XLSX headings, NEVER row-level country outcomes."""
    try: z=ZipFile(io.BytesIO(payload))
    except BadZipFile as e: raise ValueError("Not a valid XLSX/ZIP package") from e
    with z:
        entries=z.namelist()
        if "xl/workbook.xml" not in entries:
            nested=[n for n in entries if n.lower().endswith(".xlsx") and not n.startswith("../")]
            if len(nested)!=1 or z.getinfo(nested[0]).file_size>MAX_MEMBER:
                raise ValueError("Not an XLSX workbook (or unique embedded XLSX)")
            return metadata_only(z.read(nested[0]))
        if any(n not in entries for n in ("xl/worksheets/sheet1.xml",)):
            raise ValueError("First worksheet absent")
        for path in ("xl/workbook.xml","xl/worksheets/sheet1.xml"):
            if z.getinfo(path).file_size>MAX_MEMBER:
                raise ValueError("Unsafe decompressed worksheet")
        xml=z.read("xl/workbook.xml")
        workbook=ET.fromstring(xml)
        names=[s.attrib.get("name","")[:120] for s in workbook.findall(".//m:sheets/m:sheet",NS)]
        shared=[]
        if "xl/sharedStrings.xml" in entries:
            if z.getinfo("xl/sharedStrings.xml").file_size>MAX_MEMBER:raise ValueError("Unsafe string table")
            root=ET.fromstring(z.read("xl/sharedStrings.xml"))
            shared=["".join(x.itertext()) for x in root.findall("m:si",NS)]
        sheet=ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        row=sheet.find(".//m:sheetData/m:row",NS)
        if row is None:raise ValueError("Empty first row")
        cells={}
        for c in row.findall("m:c",NS):
            idx=column_num(c.attrib.get("r",""))
            if idx is None or idx>150:raise ValueError("Invalid worksheet first-row address")
            if idx in cells:raise ValueError("Duplicate first-row column")
            typ=c.attrib.get("t")
            v=c.find("m:v",NS)
            if typ=="s" and v is not None:
                i=int(v.text)
                if i<0 or i>=len(shared):raise ValueError("Shared string invalid")
                value=shared[i]
            elif typ=="inlineStr":
                t=c.find("m:is",NS)
                value="".join(t.itertext()) if t is not None else ""
            else:value=v.text if v is not None else ""
            cells[idx]=str(value).strip()
        headers=[cells.get(i,"") for i in range(max(cells)+1)] if cells else []
        if len(headers)!=len(set(x for x in headers if x)):
            raise ValueError("Duplicate official header")
        if len(headers)>120:raise ValueError("Unexpected wide workbook")
        return {"sheets":names,"first_row_headers":headers,"row_count_not_scored":len(sheet.findall(".//m:sheetData/m:row",NS)),
                "format":"xlsx", "no_country_values_reported":True}

def run():
    with urlopen(INDEX,timeout=35) as r:
        page=r.read(3_000_000)
    link=official_23_xlsx_link(page.decode("utf-8"))
    with urlopen(link,timeout=45) as r:
        data=r.read(MAX_BYTES+1)
    if len(data)>MAX_BYTES:raise ValueError("Archive exceeds bounded download")
    meta=metadata_only(data)
    out={"schema":"psychohistory.official_23_1_metadata_probe.v1",
         "source_url":link,"download_sha256_now":hashlib.sha256(data).hexdigest(),
         "bytes":len(data),**meta,
         "as_of_2023_authenticated":False,
         "heldout_labels_loaded":False,
         "predictions_issued":False,
         "models_scored":False}
    print(json.dumps(out,sort_keys=True,ensure_ascii=False))
if __name__=="__main__":run()
