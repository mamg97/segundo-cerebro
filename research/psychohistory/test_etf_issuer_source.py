"""Synthetic XLSX fixtures; no issuer originals or real NAV values."""
from decimal import Decimal
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

from etf_issuer_source import intake, workbook, reconcile, DIST_HEADERS, NS, REL


def book(name, rows, *, formula=False, external=False, sparse=False):
    w = ET.Element(NS+'workbook')
    sheets = ET.SubElement(w,NS+'sheets')
    ET.SubElement(sheets,NS+'sheet',{'name':name,'sheetId':'1',REL:'rId1'})
    links = ET.Element('Relationships')
    ET.SubElement(links,'Relationship',{'Id':'rId1','Target':'worksheets/sheet1.xml',
                                      'TargetMode':'External' if external else 'Internal'})
    sheet = ET.Element(NS+'worksheet'); data = ET.SubElement(sheet,NS+'sheetData')
    for i, values in enumerate(rows,1):
        if sparse and not values:
            continue
        row = ET.SubElement(data,NS+'row',{'r':str(i)})
        for j,value in enumerate(values):
            c = ET.SubElement(row,NS+'c',{'r':chr(65+j)+str(i),'t':'inlineStr'})
            if formula and i==5 and j==1:
                ET.SubElement(c,NS+'f').text='1+1'
            ET.SubElement(ET.SubElement(c,NS+'is'),NS+'t').text=str(value)
    result = io.BytesIO()
    with zipfile.ZipFile(result,'w') as z:
        for path,xml in [('xl/workbook.xml',w),('xl/_rels/workbook.xml.rels',links),
                         ('xl/worksheets/sheet1.xml',sheet)]:
            z.writestr(path,ET.tostring(xml))
    return result.getvalue()


def nav_rows():
    return [['Fund Name:','SYNTHETIC FUND'],['Ticker Symbol:','SYNTHETIC'],[],
            ['Date','NAV','Shares Outstanding','Total Net Assets'],
            ['07-Jan-2026','101','10','1010'],['06-Jan-2026','99','10','990'],
            ['05-Jan-2026','100','10','1000'],[],['SYNTHETIC FOOTNOTE']]


def distributions():
    return [DIST_HEADERS,['SYNTHETIC FUND','SYNTHETIC','FAKE','01/06/2026',
                         '01/06/2026','01/30/2026','1','','','Quarterly']]


def run(nav=None, dist=None, **kwargs):
    n = book('navhist',nav or nav_rows(),**kwargs)
    d = book('dividend',dist or distributions())
    return intake(n,hashlib.sha256(n).hexdigest(),d,hashlib.sha256(d).hexdigest(),
                  'SYNTHETIC','2026-10-29')


class IssuerSourceTests(unittest.TestCase):
    def test_cash_distribution_is_not_counted_as_economic_drop(self):
        result = run()
        self.assertEqual(Decimal(result['rows'][1]['wealth_proxy']),100)
        self.assertEqual(Decimal(result['rows'][1]['nav']),99)
        self.assertEqual(result['status'],'CANDIDATE_SOURCE_ONLY')
        for field in ('source_admitted','historical_asof_verified','corporate_action_history_verified',
                      'issuer_performance_reconciled','forecast_issued','current_risk_estimated'):
            self.assertIs(result[field],False)

    def test_hash_external_links_and_formulas_fail(self):
        raw = book('navhist',nav_rows())
        with self.assertRaises(ValueError):workbook(raw,'0'*64,'navhist')
        for kwargs in ({'formula':True},{'external':True}):
            with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):run(**kwargs)

    def test_omitted_blank_xlsx_row_preserves_header_coordinates(self):
        self.assertEqual(run(sparse=True)['rows'],run()['rows'])

    def test_wrong_fund_header_order_date_and_value_fail(self):
        for change in ('fund','header','date','duplicate','negative','nan','split','future'):
            rows = nav_rows()
            if change=='fund':rows[1][1]='OTHER_FAKE'
            elif change=='header':rows[3][1]='Adjusted Close'
            elif change=='date':rows[4][0]='2026-01-07'
            elif change=='duplicate':rows[5][0]=rows[4][0]
            elif change=='negative':rows[5][1]='-1'
            elif change=='nan':rows[5][1]='NaN'
            elif change=='split':rows[4][1]='50'
            elif change=='future':rows[4][0]='07-Jan-2027'
            with self.subTest(change=change),self.assertRaises(ValueError):run(nav=rows)

    def test_distribution_needs_real_nav_date_and_unique_exdate(self):
        rows = nav_rows();rows.pop(5)
        with self.assertRaisesRegex(ValueError,'session'):run(nav=rows)
        dist = distributions();dist.append(dist[1][:])
        with self.assertRaisesRegex(ValueError,'Duplicate'):run(dist=dist)
        dist = distributions();dist[1][5]='01/02/2026'
        result=run(dist=dist)
        self.assertEqual(result['status'],'SOURCE_METADATA_BLOCKED')
        self.assertEqual(result['date_issues'][0]['payable_date'],'2026-01-02')
        self.assertFalse(result['source_admitted'])

    def test_missing_quarter_is_not_filled(self):
        rows=nav_rows()[:4]+[['01-Oct-2025','101','10','1010'],['01-Jan-2025','100','10','1000']]
        dist=distributions();dist[1][3:6]=['01/07/2025','01/08/2025','01/10/2025']
        # Include its NAV date so the missing-quarter gate is reached.
        rows.insert(5,['07-Jan-2025','100','10','1000'])
        with self.assertRaisesRegex(ValueError,'quarter'):run(nav=rows,dist=dist)

    def test_footer_cannot_hide_later_nav_rows(self):
        rows=nav_rows();rows.insert(5,[])
        with self.assertRaises(ValueError):run(nav=rows)

    def test_reconciliation_fixed_tolerance_never_admits(self):
        result=run()
        item=dict(start='2026-01-05',end='2026-01-06',years=0,percent='0.03')
        compared=reconcile(result,[item])
        self.assertTrue(compared['issuer_performance_reconciled'])
        self.assertFalse(compared['source_admitted'])
        item['percent']='0.03001'
        compared=reconcile(result,[item])
        self.assertFalse(compared['issuer_performance_reconciled'])
        self.assertEqual(compared['status'],'SOURCE_PERFORMANCE_BLOCKED')
        with self.assertRaises(ValueError):reconcile(result,[item,item])
        item['years']=True
        with self.assertRaises(ValueError):reconcile(result,[item])

    def test_cli_private_create_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);n=book('navhist',nav_rows());d=book('dividend',distributions())
            (root/'nav.xlsx').write_bytes(n);(root/'dist.xlsx').write_bytes(d)
            target=root/'report.json'
            cmd=[sys.executable,str(Path(__file__).with_name('etf_issuer_source.py')),
                 '--nav',str(root/'nav.xlsx'),'--nav-sha256',hashlib.sha256(n).hexdigest(),
                 '--distributions',str(root/'dist.xlsx'),'--distributions-sha256',hashlib.sha256(d).hexdigest(),
                 '--ticker','SYNTHETIC','--captured-on','2026-10-29','--output',str(target)]
            first=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(first.returncode,0,first.stderr)
            self.assertEqual(os.stat(target).st_mode & 0o777,0o600)
            self.assertFalse(json.loads(target.read_text())['source_admitted'])
            original=target.read_bytes()
            self.assertNotEqual(subprocess.run(cmd,capture_output=True).returncode,0)
            self.assertEqual(target.read_bytes(),original)


if __name__=='__main__':unittest.main()
