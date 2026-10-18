"""Entirely synthetic ZIP fixtures. No UCDP data embedded in this repository."""
import csv
import hashlib
import io
from pathlib import Path
import tempfile
import unittest
import zipfile

from source_release_intake import inspect


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fixture_rows():
    return [{
        'country': 'SYNTHETIC_COUNTRY', 'country_id': '123',
        'year': str(year), 'Version': '26.1', 'region': 'FICTIONAL REGION',
        'sb_total_deaths_best': str(year % 3), 'sb_total_deaths_low': '0',
        'sb_total_deaths_high': str(year % 4), 'ns_total_deaths_best': '0',
        'os_total_deaths_best': '0'
    } for year in range(1989, 2026)]


class SourceReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.folder = Path(self.tmp.name)
        self.protocol = {
            'dataset_version': '26.1',
            'archive_url': 'https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip',
            'codebook_url': 'https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_261.pdf',
            'raw_years': [1989, 2025], 'expected_raw_rows': 37,
            'expected_countries': 1,
        }
        self.rows = fixture_rows()
        (self.folder / 'codebook.pdf').write_bytes(b'%PDF-1.4 SYNTHETIC NOT AN ACTUAL CODEBOOK')
        self.generate()

    def tearDown(self):
        self.tmp.cleanup()

    def generate(self, path='FAKE_TABLE.csv'):
        memory = io.StringIO()
        writer = csv.DictWriter(memory, fieldnames=list(self.rows[0]))
        writer.writeheader()
        writer.writerows(self.rows)
        with zipfile.ZipFile(self.folder / 'ucdp.zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr(path, memory.getvalue().encode('utf-8'))
        self.protocol['archive_sha256'] = sha((self.folder / 'ucdp.zip').read_bytes())
        self.protocol['codebook_sha256'] = sha((self.folder / 'codebook.pdf').read_bytes())

    def test_pinned_synthetic_source_passes_but_never_becomes_prospective(self):
        result = inspect(self.folder, self.protocol)
        self.assertEqual((result['sourceRows'], result['sourceCountries']), (37, 1))
        self.assertEqual(result['yearRange'], [1989, 2025])
        self.assertTrue(result['schemaValidated'])
        self.assertFalse(result['historicalAsOfVerified'])
        self.assertFalse(result['independentPublicationEvidenceVerified'])
        self.assertFalse(result['prospectiveEligible'])
        self.assertFalse(result['modelTrained'])
        self.assertNotIn('country', str(result['annualCountryCounts']))

    def test_wrong_bytes_and_codebook_fail_closed(self):
        (self.folder / 'ucdp.zip').write_bytes(b'TAMPERED')
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            inspect(self.folder, self.protocol)
        self.generate()
        (self.folder / 'codebook.pdf').write_bytes(b'TAMPERED')
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            inspect(self.folder, self.protocol)

    def test_duplicate_missing_gap_and_changed_version_fail_even_if_rehashed(self):
        for mutate in ['duplicate', 'gap', 'version', 'bad_count']:
            self.rows = fixture_rows()
            if mutate == 'duplicate': self.rows[1]['year'] = '1989'
            if mutate == 'gap': self.rows[1]['year'] = '2026'
            if mutate == 'version': self.rows[1]['Version'] = '25.1'
            if mutate == 'bad_count': self.rows[1]['sb_total_deaths_best'] = 'nan'
            self.generate()
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                inspect(self.folder, self.protocol)

    def test_zip_slip_and_extra_archive_members_fail_closed(self):
        self.generate('../ESCAPE.csv')
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            inspect(self.folder, self.protocol)
        self.generate()
        with zipfile.ZipFile(self.folder / 'ucdp.zip', 'a') as z:
            z.writestr('unexpected.csv', 'FAKE')
        self.protocol['archive_sha256'] = sha((self.folder / 'ucdp.zip').read_bytes())
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            inspect(self.folder, self.protocol)

    def test_non_official_or_unpinned_protocol_fails(self):
        for k, val in [('archive_url', 'https://example.invalid/fake.zip'),
                       ('dataset_version', '25.1'), ('archive_sha256', ''),
                       ('raw_years', [1990, 2025])]:
            p = {**self.protocol, k: val}
            with self.subTest(field=k), self.assertRaises(ValueError):
                inspect(self.folder, p)


if __name__ == '__main__':
    unittest.main()
