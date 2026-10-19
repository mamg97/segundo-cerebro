"""Fictional CDX fixture tests: no real country, event or forecast rows."""
import base64
from hashlib import sha1
import json
import unittest
from onset_archive_witness import check_capture_index, parse_cdx


def sample(body=b'Invented harmless bytes', timestamp='20190601120000',
           original='https://ucdp.uu.se/downloads/ged/ged191-csv.zip',
           status='200', mimetype='application/zip', digest=None):
    digest = digest or base64.b32encode(sha1(body).digest()).decode().rstrip('=')
    return json.dumps([
        ['urlkey','timestamp','original','mimetype','statuscode','digest','length'],
        ['uu,ucdp)/downloads/ged/ged191-csv.zip', timestamp, original, mimetype,
         status, digest, str(len(body))]
    ]).encode()


class OnsetArchiveWitnessTests(unittest.TestCase):
    def test_prior_archive_bytes_sha1_match_not_historical_authorization(self):
        body=b'Imaginary archive binary artifact'
        r=check_capture_index(sample(body), 'ucdp_ged_19_1',
                              '2020-01-01T00:00:00Z',body)
        self.assertTrue(r['archive_index_asserts_prior_capture'])
        self.assertTrue(r['archived_bytes_match_index_digest'])
        for key in ('historical_binary_availability_proven','source_asof_verified',
                    'independent_cryptographically_authenticated_capture_time',
                    'backtest_authorized','models_scored','forecast_issued'):
            self.assertFalse(r[key])
        self.assertNotIn('digest',r)

    def test_archive_index_only_does_not_prove_binary(self):
        r=check_capture_index(sample(), 'ucdp_ged_19_1','2020-01-01T00:00:00Z')
        self.assertEqual(r['n_valid_preissue_capture_claims'],1)
        self.assertFalse(r['archived_bytes_compared_with_index_digest'])
        self.assertFalse(r['archived_bytes_match_index_digest'])

    def test_replaced_binary_rejected_as_nonmatch(self):
        r=check_capture_index(sample(), 'ucdp_ged_19_1',
                              '2020-01-01T00:00:00Z',b'Different payload')
        self.assertFalse(r['archived_bytes_match_index_digest'])
        self.assertFalse(r['backtest_authorized'])

    def test_later_capture_and_same_instant_excluded(self):
        for clock in ('20200101000000','20200101100000','20210701100000'):
            with self.subTest(clock=clock):
                r=check_capture_index(sample(timestamp=clock),'ucdp_ged_19_1',
                                      '2020-01-01T00:00:00Z')
                self.assertEqual(r['n_valid_preissue_capture_claims'],0)

    def test_invalid_origin_and_times_fail(self):
        for origin in ('2020-01-01','2020-01-01T00:00:00+01:00',
                       '2020-02-01T00:00:00Z','2020-01-01T00:00:01Z',
                       '2025-01-01T00:00:00Z'):
            with self.subTest(origin=origin),self.assertRaises(ValueError):
                check_capture_index(sample(),'ucdp_ged_19_1',origin)
        with self.assertRaises(ValueError):
            check_capture_index(sample(timestamp='20201301100000'), 'ucdp_ged_19_1',
                                '2020-01-01T00:00:00Z')

    def test_wrong_source_html_errors_and_fake_digest_rejected(self):
        for kw in ({'original':'https://evil.example/ged/ged191-csv.zip'},
                   {'status':'404'}, {'mimetype':'text/html'}):
            with self.subTest(kw=kw):
                raw=sample(**kw)
                if 'original' in kw:
                    with self.assertRaises(ValueError):
                        check_capture_index(raw,'ucdp_ged_19_1','2020-01-01T00:00:00Z')
                else:
                    r=check_capture_index(raw,'ucdp_ged_19_1','2020-01-01T00:00:00Z')
                    self.assertEqual(r['n_valid_preissue_capture_claims'],0)
        with self.assertRaises(ValueError):
            parse_cdx(sample(digest='0123456789abcdef'))
        with self.assertRaises(ValueError):
            parse_cdx(b'{"test": "not index"}')
        with self.assertRaises(ValueError):
            check_capture_index(sample(),'ucdp_candidate_20_0_10',
                                '2020-01-01T00:00:00Z')
        with self.assertRaises(ValueError):
            check_capture_index(b'', 'ucdp_ged_19_1',
                                '2020-01-01T00:00:00Z')


if __name__ == '__main__':
    unittest.main()
