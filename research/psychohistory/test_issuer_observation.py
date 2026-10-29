"""Synthetic source responses; no network or actual issuer rows."""
import hashlib,json,stat,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from issuer_observation import capture,download,NoRedirect,URLS
from test_etf_issuer_source import book,nav_rows,distributions

class ObservationTests(unittest.TestCase):
 def fixture(self,url):
  raw=book('navhist',nav_rows()) if url==URLS['nav.xlsx'] else book('dividend',distributions())
  return raw,{'Date':'SYNTHETIC HEADER','Set-Cookie':'MUST NOT ARCHIVE'}
 def test_complete_capture_preserves_bytes_hashes_and_scope(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'new';r=capture(p,downloader=self.fixture,ticker='SYNTHETIC')
   self.assertEqual(r['status'],'LOCAL_OBSERVATION_COMPLETE')
   self.assertEqual(stat.S_IMODE(p.stat().st_mode),0o700)
   for item in r['sources']:
    f=p/item['filename'];self.assertEqual(hashlib.sha256(f.read_bytes()).hexdigest(),item['sha256'])
    self.assertEqual(stat.S_IMODE(f.stat().st_mode),0o600);self.assertNotIn('Set-Cookie',item['response_headers'])
   for key in ['independent_time_verified','first_provider_publication_verified','historical_asof_verified','source_admitted','forecast_issued','model_admitted','current_risk_estimated']:
    self.assertIs(r[key],False)
   before=(p/'MANIFEST.json').read_bytes()
   with self.assertRaises(ValueError):capture(p,downloader=self.fixture,ticker='SYNTHETIC')
   self.assertEqual((p/'MANIFEST.json').read_bytes(),before)
 def test_html_failure_is_quarantined_with_incomplete_manifest(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'bad'
   with self.assertRaises(ValueError):capture(p,downloader=lambda u:(b'<html>error</html>',{}))
   self.assertEqual((p/'nav.xlsx').read_bytes(),b'<html>error</html>')
   r=json.loads((p/'MANIFEST.json').read_text());self.assertEqual(r['status'],'LOCAL_OBSERVATION_INCOMPLETE')
   self.assertFalse((p/'intake.json').exists());self.assertFalse(r['source_admitted'])
 def test_partial_network_failure_retains_the_received_original(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'partial'
   def fail_second(url):
    if url==URLS['distributions.xlsx']:raise TimeoutError('SYNTHETIC')
    return self.fixture(url)
   with self.assertRaises(TimeoutError):capture(p,downloader=fail_second)
   r=json.loads((p/'MANIFEST.json').read_text());self.assertEqual(len(r['sources']),1)
   self.assertEqual(r['status'],'LOCAL_OBSERVATION_INCOMPLETE');self.assertTrue((p/'nav.xlsx').exists())
 def test_real_source_anomaly_is_preserved_instead_of_admitting_the_capture(self):
  with tempfile.TemporaryDirectory() as folder:
   def anomaly(url):
    if url==URLS['nav.xlsx']:return self.fixture(url)
    d=distributions();d[1][5]='01/02/2026';return book('dividend',d),{}
   r=capture(Path(folder)/'blocked',downloader=anomaly,ticker='SYNTHETIC')
   self.assertEqual(r['status'],'LOCAL_OBSERVATION_COMPLETE');self.assertEqual(r['intake_status'],'SOURCE_METADATA_BLOCKED')
   self.assertEqual(len(r['date_issues_preserved']),1);self.assertFalse(r['source_admitted'])
 def test_private_path_allowlist_and_redirect_boundaries(self):
  with self.assertRaises(ValueError):capture(Path(__file__).parent/'SYNTHETIC-MUST-NOT-CREATE')
  with self.assertRaises(ValueError):download('http://localhost/private')
  with self.assertRaises(ValueError):NoRedirect().redirect_request(None,None,None,None,None,None)

if __name__=='__main__':unittest.main()
