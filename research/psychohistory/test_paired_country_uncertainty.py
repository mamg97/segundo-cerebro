import random,unittest
from paired_country_uncertainty import descriptive_paired_ci,compare_to_references
def fixture(year=2025):
 return [{"country":i,"year":year,"target":int(i%5==0),
          "frequency":.15,"persistence":float(i%5==0),
          "markov":.45,"interaction_table":.28,
          "v2_logistic":float(i%5==0)} for i in range(1,51)]
class PairedCountryTests(unittest.TestCase):
 def test_reproducible_and_independent_of_input_row_order(self):
  a=fixture();b=list(reversed(a))
  self.assertEqual(descriptive_paired_ci(a),descriptive_paired_ci(b))
  self.assertEqual(descriptive_paired_ci(a)["ci95_descriptive_country_resample"],
                   descriptive_paired_ci(a)["ci95_descriptive_country_resample"])
  self.assertFalse(descriptive_paired_ci(a)["prospective_skill_demonstrated"])
  self.assertLess(descriptive_paired_ci(a)["mean_brier_difference_challenger_minus_comparator"],0)
 def test_exact_equal_model_predictions_give_zero_interval(self):
  a=fixture()
  for r in a:r["markov"]=r["v2_logistic"]
  r=descriptive_paired_ci(a)
  self.assertEqual(r["ci95_descriptive_country_resample"],[0,0])
  self.assertEqual(r["mean_brier_difference_challenger_minus_comparator"],0)
 def test_paired_inputs_reject_mismatched_and_bad_data(self):
  a=fixture()
  cases=[a+a[:1], a[:-1]+[{**a[-1],"target":None}],
         a[:-1]+[{**a[-1],"markov":float("nan")}],
         a[:-1]+[{**a[-1],"year":2024}]]
  for rows in cases:
   with self.subTest(rows=rows[-1]),self.assertRaises(ValueError):
    descriptive_paired_ci(rows)
  with self.assertRaises(ValueError):descriptive_paired_ci(a,comparison="some_tuned_model")
  with self.assertRaises(ValueError):descriptive_paired_ci(a,repetitions=2)
 def test_every_baseline_is_paired_on_same_test_cases(self):
  reports=compare_to_references(fixture())
  self.assertEqual(set(reports),{"frequency","persistence","markov","interaction_table"})
  self.assertTrue(all(v["n_countries"]==50 and v["test_year"]==2025 for v in reports.values()))
if __name__=="__main__":unittest.main()
