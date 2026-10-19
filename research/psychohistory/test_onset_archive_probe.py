"""Best-effort probe never upgrades inaccessible external metadata to negatives."""
import io
import unittest
from urllib.error import HTTPError

from onset_archive_probe import probe
from test_onset_archive_witness import sample


class Response:
    def __init__(self, content): self.data=io.BytesIO(content)
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def geturl(self): return 'https://web.archive.org/cdx/search/cdx?url=test'
    def read(self,n): return self.data.read(n)


class ArchiveProbeTests(unittest.TestCase):
    def test_synthetic_capture_is_never_certification(self):
        r=probe(lambda req,timeout: Response(sample()))
        self.assertEqual(r['n_preissue_capture_claims_when_index_accessible'],1)
        self.assertFalse(r['source_asof_verified'])
        self.assertFalse(r['forecast_issued'])
    def test_http_403_does_not_mean_no_archive(self):
        def forbidden(req,timeout):
            raise HTTPError('https://web.archive.org/',403,'Forbidden',None,None)
        r=probe(forbidden)
        self.assertIsNone(r['n_preissue_capture_claims_when_index_accessible'])
        self.assertIn('UNAVAILABLE',r['status'])
    def test_bad_html_not_archive(self):
        r=probe(lambda req,timeout: Response(b'<html>blocked</html>'))
        self.assertIsNone(r['n_preissue_capture_claims_when_index_accessible'])


if __name__=='__main__': unittest.main()
