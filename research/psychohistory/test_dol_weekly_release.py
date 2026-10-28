"""Invented report fragments/values only, never pilot outcomes."""
import contextlib,hashlib,io,json,sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import dol_weekly_release as dol


def fixture():
    return ['''SYNTHETIC REPORT
8:30 A.M. (Eastern) Thursday, January 7, 2027
UNEMPLOYMENT INSURANCE WEEKLY CLAIMS
SEASONALLY ADJUSTED DATA
In the week ending January 2, the advance figure for seasonally adjusted initial claims was 123,000, a decrease of
5,000 from the previous week's revised level of 128,000.
The 4-week moving average was 999,999.
The advance number for seasonally adjusted insured unemployment was 8,000,000.
''','UNADJUSTED DATA\nActual claims 99,999','SYNTHETIC FOOTNOTES','''
UNEMPLOYMENT INSURANCE DATA FOR REGULAR STATE PROGRAMS
WEEK ENDING January 2 December 26 Change December 19 Prior Year1
Initial Claims (SA) 123,000 128,000 -5,000 130,000 140,000
Initial Claims (NSA) 99,999 98,888 +1,111 97,777 96,666
4-Wk Moving Average (SA) 999,999 999,999 0 999,999 999,999
''']


class DolReleaseTests(unittest.TestCase):
    def extract(self,pages=None):
        return dol.extract(fixture() if pages is None else pages,target='2027-01-02',release_date='2027-01-07')

    def test_advance_not_revised_unadjusted_average_or_insured_new_year(self):
        r=self.extract();self.assertEqual(r['advance_initial_claims_sa'],123000)
        self.assertEqual(r['previous_week_revised_sa'],128000)
        self.assertEqual(r['nominal_embargo_utc'],'2027-01-07T13:30:00+00:00')
        self.assertEqual(r['table_page'],4)
        self.assertFalse(r['evaluation_eligible']);self.assertFalse(r['source_first_edition_verified'])

    def test_disagreement_duplicate_missing_sa_dates_or_layout_fail(self):
        for kind in ('different','nsa','duplicate','dates','delta','narrative','short','columns'):
            p=fixture()
            if kind=='different':p[3]=p[3].replace('123,000 128,000','124,000 128,000')
            if kind=='nsa':p[3]=p[3].replace('Initial Claims (SA)','Initial Claims (NSA)')
            if kind=='duplicate':p.append(p[3])
            if kind=='dates':p[3]=p[3].replace('January 2','January 9')
            if kind=='delta':p[3]=p[3].replace('-5,000','+5,000')
            if kind=='narrative':p[0]+=p[0]
            if kind=='short':p.pop()
            if kind=='columns':p[3]=p[3].replace('140,000','140,000 150,000')
            with self.subTest(kind=kind),self.assertRaises(ValueError):self.extract(p)

    def test_target_release_weekday_must_match_no_stale_substitution(self):
        for target,release in (('2027-01-09','2027-01-07'),('2026-01-03','2027-01-07'),('2027-01-01','2027-01-07'),('2027-01-02','2027-01-14')):
            with self.subTest(target=target),self.assertRaises(ValueError):dol.extract(fixture(),target=target,release_date=release)
        p=fixture();p[0]=p[0].replace('Thursday','Friday')
        with self.assertRaises(ValueError):self.extract(p)

    def test_dst_is_derived_from_release_date_not_fixed_utc_hour(self):
        p=fixture();p[0]=p[0].replace('January 7, 2027','July 8, 2027').replace('January 2','July 3')
        p[3]=p[3].replace('January 2 December 26 Change December 19','July 3 June 26 Change June 19')
        r=dol.extract(p,target='2027-07-03',release_date='2027-07-08')
        self.assertEqual(r['nominal_embargo_utc'],'2027-07-08T12:30:00+00:00')

    def test_zero_positive_change_and_noncanonical_counts(self):
        p=fixture();p[0]=p[0].replace('123,000','0');p[3]=p[3].replace('123,000 128,000 -5,000','0 128,000 -128,000')
        self.assertEqual(self.extract(p)['advance_initial_claims_sa'],0)
        p=fixture();p[0]=p[0].replace('123,000','133,000');p[3]=p[3].replace('123,000 128,000 -5,000','133,000 128,000 +5,000')
        self.assertEqual(self.extract(p)['change_from_revised'],5000)
        for number in ('12,30','123000','NaN','-123,000','123,000.0'):
            p=fixture();p[0]=p[0].replace('123,000',number)
            with self.subTest(number=number),self.assertRaises(ValueError):self.extract(p)

    def test_pdf_hash_binding_cli_private_and_no_overwrite(self):
        raw=b'%PDF-SYNTHETIC-NOT-A-REAL-PDF';digest=hashlib.sha256(raw).hexdigest()
        fake=SimpleNamespace(__version__='SYNTHETIC',open=lambda _:contextlib.nullcontext(SimpleNamespace(pages=[SimpleNamespace(extract_text=lambda p=p:p) for p in fixture()])))
        with patch.dict(sys.modules,{'pdfplumber':fake}):
            with self.assertRaises(ValueError):dol.inspect_pdf(raw,expected_sha256='0'*64,target='2027-01-02',release_date='2027-01-07')
            with tempfile.TemporaryDirectory(prefix='SYNTHETIC_DOL_') as name:
                root=Path(name);pdf=root/'source.pdf';pdf.write_bytes(raw);out=root/'result.json'
                argv=['dol','--pdf',str(pdf),'--sha256',digest,'--target','2027-01-02','--release-date','2027-01-07','--out',str(out)]
                with patch.object(sys,'argv',argv),contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
                    dol.main();self.assertEqual(json.loads(out.read_text())['source_pdf_sha256'],digest)
                    self.assertEqual(out.stat().st_mode & 0o777,0o600)
                    with self.assertRaises(SystemExit):dol.main()
                self.assertEqual(pdf.read_bytes(),raw)

    def test_candidate_uses_frozen_threshold_without_admitting_plan(self):
        plan=dict(target_week='2027-01-02',frozen_threshold=123000,issue_window_end='2027-01-06T12:00:00Z',rows=[['SYNTHETIC-ID']+['']*6+[.25]])
        with patch.object(dol,'inspect_pdf',return_value=self.extract()):
            r=dol.candidate_from_pdf(plan,b'%PDF-SYNTHETIC',expected_sha256='1'*64,release_at='2027-01-07T13:30:00Z',captured_at='2027-01-07T13:31:00Z')
            self.assertEqual(r['outcome'],1);self.assertEqual(r['scores'],{'SYNTHETIC-ID':.5625})
            self.assertFalse(r['forecast_issued']);self.assertFalse(r['evaluation_eligible'])
            for release,capture in (('2027-01-07T13:29:59Z','2027-01-07T13:31:00Z'),('2027-01-07T13:30:00Z','2027-01-09T13:30:01Z')):
                with self.subTest(release=release),self.assertRaises(ValueError):dol.candidate_from_pdf(plan,b'%PDF-SYNTHETIC',expected_sha256='1'*64,release_at=release,captured_at=capture)


if __name__=='__main__':unittest.main()
