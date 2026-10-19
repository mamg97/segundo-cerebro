"""Fully synthetic state-system membership; independent of any events."""
import hashlib
import unittest

from independent_gw_roster import audit_months, parse_intervals, GW_SCHEMA


HEADER = "statenumber\tstateid\tcountryname\tstart\tend\n"


def raw(*rows):
    return (HEADER + "".join("\t".join(map(str, r)) + "\n" for r in rows)).encode()


def sample():
    return raw(
        (123, "FAK", "Fictionia", "2010-01-01", "2020-12-31"),
        (456, "SIM", "Simuland", "2019-12-12", "2020-12-31"),
        (789, "OLD", "Old Republic", "1900-01-01", "2010-01-01"),
    )


class IndependentGwRosterTests(unittest.TestCase):
    def test_month_roster_contains_all_members_without_event_data(self):
        source = sample()
        digest = hashlib.sha256(source).hexdigest()
        result = audit_months(parse_intervals(source, digest),
                              ["2019-11", "2019-12", "2020-12", "2021-01", "2024-12"])
        self.assertEqual(result["schema"], GW_SCHEMA)
        self.assertEqual([m["n_members_full_month"] for m in result["months"]],
                         [1, 1, 2, None, None])
        self.assertEqual(result["months"][1]["n_part_month_members"], 1)
        self.assertEqual(result["months"][2]["n_part_month_members"], 0)
        self.assertEqual(result["months"][4]["status"], "NO_EVALUABLE_SOURCE_CENSORED_2020")
        self.assertFalse(result["absence_of_events_means_zero_target"])
        self.assertFalse(result["ucdp_coverage_including_zero_event_states_verified"])
        self.assertFalse(result["vintage_correct_backtest"])
        self.assertFalse(result["source_as_of_verified"])
        self.assertFalse(result["forecast_issued"])
        self.assertNotIn("country_id", result)
        self.assertNotIn("countries", result)
        self.assertTrue(result["source_bytes_pinned_to_prior_observation"])

    def test_reject_overlapping_or_tampered_state_history(self):
        with self.assertRaises(ValueError):
            parse_intervals(raw(
                (123,"FAK","Fictionia","2010-01-01","2020-01-01"),
                (123,"FAK","Fictionia","2020-01-01","2020-12-31")))
        with self.assertRaises(ValueError):
            parse_intervals(sample(), "f" * 64)
        with self.assertRaises(ValueError):
            parse_intervals(raw(
                (123,"FAK","Fictionia","2010-01-01","2021-01-01"),
                (456,"SIM","Simuland","2019-01-01","2020-12-31")))
        with self.assertRaises(ValueError):
            parse_intervals(raw(
                (123,"FAK","Fictionia","2020-01-02","2020-01-01"),
                (456,"SIM","Simuland","2019-01-01","2020-12-31")))

    def test_legacy_state_names_decode_but_original_bytes_stay_hashed(self):
        source = (
            "statenumber\\tstateid\\tcountryname\\tstart\\tend\\n"
            "123\\tFAK\\tFicci\u00f3nia\\t2010-01-01\\t2020-12-31\\n"
            "456\\tSIM\\tSimuland\\t2011-01-01\\t2020-12-31\\n"
        ).replace("\\t", "\t").replace("\\n", "\n").encode("cp1252")
        result = parse_intervals(source)
        self.assertEqual(result["hash_observed_now"], hashlib.sha256(source).hexdigest())
        self.assertEqual(audit_months(result, ["2020-12"])["months"][0]["n_members_full_month"], 2)

    def test_roster_rejects_unordered_months_and_missing_country_codes(self):
        source = parse_intervals(sample())
        for months in (["2020-01","2019-01"], ["2020-01","2020-01"], ["2020-00"], [],["2040-13"]):
            with self.subTest(months=months), self.assertRaises(ValueError):
                audit_months(source, months)
        with self.assertRaises(ValueError):
            parse_intervals(raw(
                ("abc","FAK","Fictionia","2019-01-01","2020-12-31"),
                (456,"SIM","Simuland","2019-01-01","2020-12-31")))
        with self.assertRaises(ValueError):
            parse_intervals(b"country,id,date\n1,x,2020-01-01\n")

    def test_no_forecast_cannot_become_label_from_country_count(self):
        result = audit_months(parse_intervals(sample()),["2020-12"])
        self.assertEqual(result["months"][0]["status"],"DESCRIPTIVE_GW_ROSTER_NOT_UCDP_TARGET")
        for key in ("target_geography_compatible_with_ucdp_verified",
                    "source_byte_hash_independently_timestamped_before_historical_issue",
                    "state_system_is_all_sovereign_countries_including_microstates"):
            self.assertFalse(result[key])


if __name__ == "__main__":
    unittest.main()
