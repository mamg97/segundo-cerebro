import tempfile, unittest, io, csv, hashlib, zipfile, copy
from unittest import mock
from pathlib import Path
import historic23_holdout_2024 as subject

def xlsx_blob(n=7):
    names=[f+"_cy" for f in subject.FEATURES]
    head=''.join(f'<c r="{chr(65+i)}1" t="inlineStr"><is><t>{name}</t></is></c>' for i,name in enumerate(names))
    lines=[]
    for cid in range(1,n+1):
      for yr in range(1989,2023):
        event=int(cid%3==0 and yr%7 in (0,1,2))
        values=[cid,f"SYNTHETIC_{cid}",yr,"SYNTHETIC",
          30*event,30*event,30*event,0,0]
        assert len(values)==len(names)
        j=2+len(lines)
        cells=''.join(f'<c r="{chr(65+i)}{j}"><v>{v}</v></c>' if isinstance(v,int)
                      else f'<c r="{chr(65+i)}{j}" t="inlineStr"><is><t>{v}</t></is></c>'
                      for i,v in enumerate(values))
        lines.append(f'<row r="{j}">{cells}</row>')
    xml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+f'<row r="1">{head}</row>'+''.join(lines)+'</sheetData></worksheet>'
    b=io.BytesIO()
    with zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED) as z:
      z.writestr("xl/workbook.xml","<workbook/>");z.writestr("xl/worksheets/sheet1.xml",xml)
    return b.getvalue()
def outcome_zip(n=7,missing=None,change_hist=False,change_future=False):
    rows=[]
    for cid in range(1,n+1):
      for yr in range(1989,2025):
        event=int(cid%3==0 and yr%7 in (0,1,2))
        if yr==2024 and cid==missing:continue
        if change_hist and yr==2022: event=1-event
        if change_future and yr==2024 and cid==1:event=1-event
        rows.append(dict(country_id=str(cid),country=f"SYNTHETIC_{cid}",year=str(yr),
                         region="SYNTHETIC",sb_total_deaths_best=str(30*event),
                         sb_total_deaths_high=str(30*event),sb_total_deaths_low=str(30*event),
                         ns_total_deaths_best="0",os_total_deaths_best="0"))
    s=io.StringIO()
    writer=csv.DictWriter(s,fieldnames=list(rows[0]))
    writer.writeheader();writer.writerows(rows)
    b=io.BytesIO()
    with zipfile.ZipFile(b,"w") as z:z.writestr("test.csv",s.getvalue())
    return b.getvalue()
class HistoricHoldoutTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.old=Path(self.tmp.name)/"old.xlsx"
        self.new=Path(self.tmp.name)/"new.zip"
        olddata=xlsx_blob()
        self.old.write_bytes(olddata)
        self.pin_old=hashlib.sha256(olddata).hexdigest()
        self.newdata=outcome_zip()
        self.new.write_bytes(self.newdata)
        self.pin_new=hashlib.sha256(self.newdata).hexdigest()
    def test_authenticity_guard(self):
        with self.assertRaisesRegex(ValueError,"not preregistered"):
            subject.rows_23_xlsx(self.old,"0"*64)
        with mock.patch.object(subject,"PIN_231",self.pin_old):
            rows,qa=subject.rows_23_xlsx(self.old,self.pin_old)
            self.assertEqual(qa["years"],[1989,2022])
            self.assertEqual(len(rows),7*34)
            self.old.write_bytes(b"not-a-valid-workbook")
            with self.assertRaisesRegex(ValueError,"bytes changed"):
                subject.rows_23_xlsx(self.old,self.pin_old)
    def test_holdout_invariance_against_outcome_source_revisions(self):
        with mock.patch.object(subject,"PIN_231",self.pin_old),mock.patch.object(subject,"PIN_251",self.pin_new):
            baseline=subject.eval_2024(self.old,self.new)
            self.assertEqual(baseline["train_labels_last_year"],2022)
            self.assertEqual(baseline["scored_identical_countries"],7)
            self.assertFalse(baseline["forecast_issued"])
        mutated=outcome_zip(change_hist=True)
        self.new.write_bytes(mutated)
        with mock.patch.object(subject,"PIN_231",self.pin_old),mock.patch.object(subject,"PIN_251",hashlib.sha256(mutated).hexdigest()):
            changed=subject.eval_2024(self.old,self.new)
            self.assertEqual(baseline["models"],changed["models"])
            self.assertNotEqual(baseline["historic_2022_threshold_revisions"],changed["historic_2022_threshold_revisions"])
    def test_missing_outcome_not_negative(self):
        mutated=outcome_zip(missing=3)
        self.new.write_bytes(mutated)
        with mock.patch.object(subject,"PIN_231",self.pin_old),mock.patch.object(subject,"PIN_251",hashlib.sha256(mutated).hexdigest()):
            report=subject.eval_2024(self.old,self.new)
            self.assertEqual(report["unresolved_outcome"],1)
            self.assertEqual(report["scored_identical_countries"],6)
    def test_no_unpinned_outcome(self):
        with mock.patch.object(subject,"PIN_231",self.pin_old):
            with self.assertRaisesRegex(ValueError,"not yet pinned"):
                subject.eval_2024(self.old,self.new)
if __name__=="__main__": unittest.main()
