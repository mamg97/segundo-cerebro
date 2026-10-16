import copy
import unittest
from sealing import commitment,validate_payload

class SealingTests(unittest.TestCase):
    def test_canonical_commitment_binds_every_field_and_salt(self):
        p={'id':'SYNTHETIC','probability':.2}
        nonce='a1'*32
        self.assertEqual(commitment(p,nonce),commitment(dict(reversed(list(p.items()))),nonce))
        self.assertNotEqual(commitment(p,nonce),commitment({**p,'probability':.21},nonce))
        self.assertNotEqual(commitment(p,nonce),commitment(p,'b1'*32))
        with self.assertRaises(ValueError):commitment(p,'ab')

    def test_payload_rejects_outcome_future_features_and_missing_timezones(self):
        p=dict(id='SYNTHETIC',phenomenon='SYNTHETIC',region='SYNTHETIC',horizon='1y',
               issuedAt='2027-01-01T00:00:00Z',resolutionAt='2028-01-01T00:00:00Z',
               asOf='2026-10-01T00:00:00Z',probability=.2,baselineProbability=.1,
               modelVersion='SYNTHETIC',datasetVersion='SYNTHETIC')
        validate_payload(p)
        for changes in ({'outcome':0},{'asOf':'2027-02-01T00:00:00Z'},
                        {'issuedAt':'2027-01-01'},{'probability':True}):
            with self.assertRaises(ValueError):validate_payload({**p,**changes})

if __name__=='__main__':unittest.main()
