import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { financeAccountWorkspaceIncomplete } from "./finance-workspace-readiness.js";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("bank account recovery is due even when budget categories loaded", () => {
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { categories: [{ id: "example-category" }], liquidityAccounts: [] },
    accountTransactions: []
  }), true);
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { categories: [{ id: "example-category" }], liquidityAccounts: null },
    accountTransactions: null
  }), true);
  assert.equal(financeAccountWorkspaceIncomplete(null), true);
});

test("partial optional ranges require explicit verification before treating empty history as genuine", () => {
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { liquidityAccounts: [{ id: "example-bank" }] },
    accountTransactions: []
  }), true);
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { liquidityAccounts: [] },
    accountTransactions: [{ accountId: "example-bank" }]
  }), true);
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { liquidityAccounts: [{ id: "example-bank" }] },
    accountTransactions: [{ accountId: "example-bank" }]
  }), false);
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { liquidityAccounts: [{ id: "example-bank" }] },
    accountTransactions: [],
    bankWorkspaceReadVerified: true
  }), false);
  assert.equal(financeAccountWorkspaceIncomplete({
    monthlyBudget: { liquidityAccounts: [] },
    accountTransactions: [],
    bankWorkspaceAccounts: [{ id: "example-bank" }],
    bankWorkspaceReadVerified: true
  }), false);
});

test("partial budget path schedules one bounded canonical refresh and labels absent data", () => {
  assert.match(app, /const accountWorkspaceIncomplete = financeAccountWorkspaceIncomplete\(finance\)/);
  assert.match(app, /if \(accountWorkspaceIncomplete && !options\.skipRefresh && privateModeKind === "remote" && !financeBudgetRefreshInFlight\)/);
  assert.match(app, /refreshFinanceAccountWorkspace\(dialog\)/);
  assert.match(app, /await fetchFinanceBankWorkspace\(12000\)/);
  assert.match(app, /openBudgetDetail\(\{ skipRefresh: true \}\)/);
  assert.match(app, /data-finance-workspace-status="unavailable"/);
  assert.doesNotMatch(app, /console\.warn\("Finance workspace on-demand load failed", String\(/);
});
