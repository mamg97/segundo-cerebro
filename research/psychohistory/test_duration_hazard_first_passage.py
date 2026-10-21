import unittest,copy
from test_release_separated_holdout import make_version
from duration_hazard_first_passage import age_bin,fit_duration,first_change_by_duration,evaluate
from futures import prepare

class DurationHazardTests(unittest.TestCase):
 def test_duration_bins_are_stable_and_mass_is_absorbed(self):
    self.assertEqual([age_bin(x) for x in (1,2,3,4,7,8,20)],[0,1,1,2,2,3,3])
    rates=[[.2,.3,.4,.5],[.1,.2,.3,.4]]
    p=first_change_by_duration(1,1,rates)
    self.assertAlmostEqual(p[0],.1)
    self.assertAlmostEqual(p[1],.9*.2)
    self.assertAlmostEqual(p[2],.9*.8)
    self.assertAlmostEqual(sum(p),1)
 def test_fit_excludes_future_changes_and_is_insensitive_to_later_rows(self):
    early=make_version("24.1",2023)
    newer=make_version("26.1",2025)
    a=evaluate(early,newer,2023)
    b=copy.deepcopy(newer)
    for row in b:
        if int(row["year"])<=2023:row["sb_total_deaths_best"]="999"
    after=evaluate(early,b,2023)
    self.assertEqual(a["models"],after["models"])
    self.assertEqual(a["durationSpecification"],after["durationSpecification"])
    self.assertFalse(a["prospectiveSkillProven"])
    self.assertFalse(a["prespecifiedBeforeInspectedHoldout"])
    self.assertEqual(a["countryN"],8)
    self.assertEqual(a["countryN"],sum([a["firstChangesTotal"],a["noChange"]]))
 def test_target_changes_affect_evaluation_not_training_statistics(self):
    old=make_version("24.1",2023)
    later=make_version("26.1",2025)
    a=evaluate(old,later,2023)
    changed=copy.deepcopy(later)
    for row in changed:
        if row["year"]=="2024" and row["country_id"]=="2":
            row["sb_total_deaths_best"]="0" if row["sb_total_deaths_best"]!="0" else "999"
    after=evaluate(old,changed,2023)
    self.assertEqual(a["durationSpecification"],after["durationSpecification"])
    self.assertNotEqual(a["models"],after["models"])
 def test_censor_and_invalid_training_cutoff_fail_closed(self):
    earlier=make_version("24.1",2023)
    later=make_version("26.1",2025)
    removed=[x for x in later if not(x["year"]=="2025" and x["country_id"]=="1")]
    result=evaluate(earlier,removed,2023)
    self.assertEqual(result["countryN"],7)
    self.assertEqual(result["missingLaterLabels"],1)
    with self.assertRaises(ValueError):evaluate(earlier,later,2022)
    with self.assertRaises(ValueError):first_change_by_duration(1,0,[[.1]*4,[.1]*4])
 def test_duration_training_uses_only_contiguous_prior_years(self):
    rows=make_version("24.1",2023)
    historical=prepare(rows,{"threshold_deaths":25})
    full=fit_duration(historical,2023)
    changed=copy.deepcopy(rows)
    for row in changed:
        if int(row["year"])==2023:row["sb_total_deaths_best"]="999"
    modified=fit_duration(prepare(changed,{"threshold_deaths":25}),2023)
    self.assertNotEqual(full["counts"],modified["counts"])
    self.assertEqual(sum(sum(sum(group) for group in reg) for reg in full["counts"]),
      sum(sum(sum(group) for group in reg) for reg in modified["counts"]))

if __name__=="__main__":unittest.main()
