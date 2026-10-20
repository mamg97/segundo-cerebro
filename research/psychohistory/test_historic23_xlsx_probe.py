import io,unittest,zipfile
from historic23_xlsx_probe import official_23_xlsx_link,metadata_only
from xml.sax.saxutils import escape
HEAD='<h2>UCDP Country-Year Dataset on Organized Violence within Country Borders</h2>'
ROW='<p>version 23.1: <a href="/downloads/organizedviolencecy/official-231.xlsx">EXCEL</a> | <a href="https://ucdp.uu.se/downloads/organizedviolencecy/Codebook.pdf">Codebook</a></p>'
def fictitious_xlsx(names=["country_id","year","sb_total_deaths_best"]):
    main='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">'+''.join(
        f'<c r="{chr(65+i)}1" t="inlineStr"><is><t>{escape(x)}</t></is></c>' for i,x in enumerate(names)
    )+'</row><row r="2"><c r="A2"><v>999</v></c></row></sheetData></worksheet>'
    book='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="EXAMPLE" sheetId="1"/></sheets></workbook>'
    out=io.BytesIO()
    with zipfile.ZipFile(out,"w") as z:
        z.writestr("xl/workbook.xml",book);z.writestr("xl/worksheets/sheet1.xml",main)
    return out.getvalue()
class ProbeTests(unittest.TestCase):
    def test_restrict_to_official_section_and_label(self):
        self.assertEqual(official_23_xlsx_link('<h2>OTHER</h2><p>version 23.1: fake</p>'+HEAD+ROW),
                         "https://ucdp.uu.se/downloads/organizedviolencecy/official-231.xlsx")
        with self.assertRaises(ValueError):
            official_23_xlsx_link(HEAD+ROW.replace("ucdp.uu.se","fake.example").replace('/downloads/organizedviolencecy/official-231.xlsx','https://fake.example/downloads/organizedviolencecy/official-231.xlsx'))
        with self.assertRaises(ValueError):
            official_23_xlsx_link(HEAD+ROW.replace("EXCEL","OTHER"))
    def test_metadata_does_not_include_country_level_outcome(self):
        m=metadata_only(fictitious_xlsx())
        self.assertEqual(m["first_row_headers"],["country_id","year","sb_total_deaths_best"])
        self.assertEqual(m["sheets"],["EXAMPLE"])
        self.assertNotIn("999",str(m))
        self.assertTrue(m["no_country_values_reported"])
    def test_duplicate_header_rejected(self):
        with self.assertRaisesRegex(ValueError,"Duplicate"):
            metadata_only(fictitious_xlsx(["year","year"]))
    def test_fake_zip_rejected(self):
        with self.assertRaises(ValueError): metadata_only(b"xlsx-not-real")
if __name__=="__main__":unittest.main()
