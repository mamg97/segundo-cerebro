"""Synthetic source coverage assertions; never actual event records."""
import hashlib
import unittest
from ucdp_candidate_geographic_scope import policy, validate_official_page, event_summary, report

def page():
    x=("<html>version 18.0.X (covers Africa) "
       "version 19.0.X (covers Africa) "
       "version 20.0.X (January-March covers Africa, April-July covers "
       "Africa and Middle East, August-September covers Africa, Asia, "
       "Europe and Middle East, October-December global): "
       "20.0.9 CSV 20.0.10 CSV "
       "version 21.0.X (global) version 24.0.X (global) "
       + "fictional synthetic catalogue " * 50 + "</html>")
    return x.encode()

def events():
    return b"id,country_id\n1,100\n2,100\n3,200\n".replace(b"\\n",b"\n")

class HistoricalScopeTests(unittest.TestCase):
    def test_2020_scope_boundaries(self):
        cases={"19.0.12":"AFRICA_ONLY","20.0.3":"AFRICA_ONLY",
           "20.0.4":"APRIL_2020_CONFLICTING_SCOPE_DESCRIPTIONS",
           "20.0.5":"AFRICA_AND_MIDDLE_EAST",
           "20.0.9":"AFRICA_ASIA_EUROPE_MIDDLE_EAST_NOT_GLOBAL",
           "20.0.10":"GLOBAL_DECLARED","24.0.12":"GLOBAL_DECLARED"}
        for version,scope in cases.items():
            with self.subTest(version=version):
                x=policy(version)
                self.assertEqual(x["scope_status"],scope)
                self.assertFalse(x["global_negative_countries_eligible"])
                self.assertFalse(x["valid_replay_asof"])
    def test_unknown_versions_fail(self):
        for version in ("20.01.20.09","20.0.13","26.0.10","27.0.1","20.0.09"):
            with self.assertRaises(ValueError):
                policy(version)
    def test_catalogue_wording_guard(self):
        self.assertTrue(validate_official_page(page())["official_scope_phrases_confirmed_now"])
        with self.assertRaises(ValueError):
            validate_official_page(page().replace(b"October-December global",b"October-December unknown"))
    def test_no_negative_labels_from_event_only_table(self):
        raw=events()
        out=event_summary(raw,"20.0.9",hashlib.sha256(raw).hexdigest())
        self.assertEqual(out["n_events"],3)
        self.assertEqual(out["n_countries_with_at_least_one_candidate_event"],2)
        self.assertIsNone(out["n_confirmed_zero_event_countries"])
        self.assertFalse(out["zero_event_country_coverage_verified"])
        combined=report(page(),raw,raw)
        self.assertFalse(combined["country_denominator_eligible_from_candidate_events_only"])
        self.assertFalse(combined["absence_of_country_events_proves_zero"])
        self.assertFalse(combined["source_as_of_verified"])
        self.assertFalse(combined["forecast_issued"])
    def test_invalid_csv_and_hash(self):
        with self.assertRaises(ValueError):
            event_summary(b"id,country_id\n1,100\n1,200\n".replace(b"\\n",b"\n"),"20.0.9")
        with self.assertRaises(ValueError):
            event_summary(events(),"20.0.9","f"*64)
        with self.assertRaises(ValueError):
            event_summary(events(),"24.0.12")

if __name__=="__main__":
    unittest.main()
