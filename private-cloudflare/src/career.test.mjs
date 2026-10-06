import test from "node:test";
import assert from "node:assert/strict";
import { buildCareerPayload } from "./career.js";

test("career payload preserves confirmed facts and labels estimates", () => {
  const payload = buildCareerPayload([
    { values: [["key","value","status","source","updated_at"],["current_employer","Example Corp","confirmed","user","2026-10-01"],["current_role","Data Scientist","confirmed","user","2026-10-01"],["current_fixed_salary_eur",42000,"confirmed","user","2026-10-01"]] },
    { values: [["opportunity_id","organization","role","type","status","location","priority","fit_estimate","comp_min_eur","comp_mid_eur","comp_max_eur","comp_status","next_action","blocker","url","notes","updated_at"],["opp-1","Example Bank","Internal role","internal_move","exploring","Madrid","high","high",48000,50000,52000,"estimate_not_offer","Get formal offer","No offer yet","","","2026-10-02"]] },
    { values: [["person_id","name","role","function","reports_to","relation_to_user","evidence","updated_at"],["me","User","Data Scientist","Risk","","self","user","2026-10-01"]] },
    { values: [["scenario_id","label","fixed_min_eur","fixed_mid_eur","fixed_max_eur","status","interpretation","source","updated_at"],["s1","Current",42000,42000,42000,"confirmed","Current salary","user","2026-10-01"]] },
    { values: [["asset_id","type","label","status","url","next_action","notes","updated_at"],["a1","CV","CV","needs_rework","","Rewrite","","2026-10-01"]] },
    { values: [["goal_id","title","horizon","status","metric","target","next_action","updated_at"],["g1","Next step","90 days","active","Options","2","Compare","2026-10-01"]] },
    { values: [["decision_id","title","status","question","options","current_view","next_action","updated_at"],["d1","Choose","open","Which?","A/B","Pending","Compare","2026-10-01"]] }
  ]);
  assert.equal(payload.summary.currentEmployer,"Example Corp");
  assert.equal(payload.summary.fixedSalary,42000);
  assert.equal(payload.summary.activeOpportunityCount,1);
  assert.equal(payload.summary.openDecisionCount,1);
  assert.equal(payload.summary.blockedAssetCount,1);
  assert.equal(payload.opportunities[0].compensation.status,"estimate_not_offer");
});
