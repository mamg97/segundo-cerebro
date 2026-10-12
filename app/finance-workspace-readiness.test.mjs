import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { financeAccountWorkspaceIncomplete, financeBankWorkspaceReady } from "./finance-workspace-readiness.js";

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
  assert.match(app, /const bankReadNeedsVerification = canReadPrivateFinanceBankWorkspace\(\) &&/);
  assert.match(app, /finance\.bankWorkspaceReadVerified !== true/);
  assert.match(app, /if \(bankReadNeedsVerification && !options\.skipRefresh && !financeBudgetRefreshInFlight\)/);
  assert.match(app, /if \(state\.financeSummary\?\.bankWorkspaceReadVerified !== true\)/);
  assert.match(app, /refreshFinanceAccountWorkspace\(dialog\)/);
  assert.match(app, /await fetchFinanceBankWorkspace\(12000\)/);
  assert.match(app, /openBudgetDetail\(\{ skipRefresh: true \}\)/);
  assert.match(app, /data-finance-workspace-status="unavailable"/);
  assert.doesNotMatch(app, /console\.warn\("Finance workspace on-demand load failed", String\(/);
});

test("interactive bank tabs are unavailable until both ranges are complete or directly verified", () => {
  assert.equal(financeBankWorkspaceReady({
    monthlyBudget: { liquidityAccounts: [{ id: "source-account" }] },
    accountTransactions: []
  }), false);
  assert.equal(financeBankWorkspaceReady({
    monthlyBudget: { liquidityAccounts: [] },
    accountTransactions: [{ id: "synthetic" }]
  }), false);
  assert.equal(financeBankWorkspaceReady({
    monthlyBudget: { liquidityAccounts: [{ id: "source-account" }] },
    accountTransactions: [{ id: "synthetic" }]
  }), true);
  assert.equal(financeBankWorkspaceReady({
    monthlyBudget: { liquidityAccounts: [] },
    accountTransactions: [],
    bankWorkspaceAccounts: [{ id: "source-account" }],
    bankWorkspaceReadVerified: true
  }), true);
  assert.match(app, /const bankTabsReady = financeBankWorkspaceReady\(finance\)/);
  assert.match(app, /bankTabsReady \? renderAccountTransactionsWorkspace\(accountTransactions, workspaceAccounts, currency\) : ""/);
});

test("private Finance fetches verified bank ranges regardless of optional budget completeness", () => {
  const completeOptional = {
    monthlyBudget: { liquidityAccounts: [{ id: "synthetic-bank" }] },
    accountTransactions: [{ id: "synthetic-transaction", accountId: "synthetic-bank" }],
    bankWorkspaceAccounts: [{ id: "synthetic-bank" }]
  };
  assert.equal(financeAccountWorkspaceIncomplete(completeOptional), false,
    "optional ranges can already look complete");
  assert.notEqual(completeOptional.bankWorkspaceReadVerified, true,
    "only the dedicated canonical reader can confirm completeness");
  assert.match(app, /const bankReadNeedsVerification = canReadPrivateFinanceBankWorkspace\(\) &&\s+finance\.bankWorkspaceReadVerified !== true/);
  assert.match(app, /if \(bankReadNeedsVerification && !options\.skipRefresh && !financeBudgetRefreshInFlight\) \{\s+refreshFinanceAccountWorkspace\(dialog\)/);
  assert.match(app, /if \(bankReadNeedsVerification && !options\.skipRefresh && !financeBudgetRefreshInFlight\) \{\s+refreshFinanceAccountWorkspace\(dialog, \{ replaceMissingView: true \}\)/);
  assert.match(app, /if \(state\.financeSummary\?\.bankWorkspaceReadVerified !== true\) \{\s+const workspace = await fetchFinanceBankWorkspace\(12000\)/);
  assert.match(app, /if \(!canReadPrivateFinanceBankWorkspace\(\) \|\| financeBudgetRefreshInFlight\) return/);
  assert.match(app, /bankWorkspaceReadVerified: true/);
});
