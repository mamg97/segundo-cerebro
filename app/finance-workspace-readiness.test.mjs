import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { financeAccountWorkspaceIncomplete, financeBankWorkspaceReady, mergeVerifiedFinanceBankWorkspace } from "./finance-workspace-readiness.js";

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
  assert.match(app, /verifiedFinanceBankWorkspace = \{/);
  assert.match(app, /mergeVerifiedFinanceBankWorkspace\(/);
});

test("verified canonical bank snapshot survives out-of-order scoped summary refresh", () => {
  const original = { monthlyBudget: { categories: [{ id: "synthetic-budget-a" }] } };
  const canonical = {
    accounts: [{ id: "synthetic-account" }],
    transactions: [{ id: "synthetic-row", accountId: "synthetic-account" }]
  };
  const restored = mergeVerifiedFinanceBankWorkspace(original, canonical);
  assert.notStrictEqual(restored, original);
  assert.equal(restored.bankWorkspaceReadVerified, true);
  assert.deepEqual(restored.bankWorkspaceAccounts, canonical.accounts);
  assert.deepEqual(restored.accountTransactions, canonical.transactions);

  const newerBudget = { monthlyBudget: { categories: [{ id: "synthetic-budget-b" }] },
    bankWorkspaceAccounts: [], accountTransactions: [], bankWorkspaceReadVerified: false };
  const late = mergeVerifiedFinanceBankWorkspace(newerBudget, canonical);
  assert.deepEqual(late.monthlyBudget, newerBudget.monthlyBudget,
    "latest budget stays authoritative");
  assert.deepEqual(late.bankWorkspaceAccounts, canonical.accounts,
    "late budget scope cannot erase verified bank accounts");
  assert.deepEqual(late.accountTransactions, canonical.transactions,
    "late budget scope cannot erase verified bank movements");
  assert.equal(late.bankWorkspaceReadVerified, true);
  assert.equal(newerBudget.bankWorkspaceReadVerified, false, "source objects are unchanged");

  const unverified = mergeVerifiedFinanceBankWorkspace(newerBudget, null);
  assert.strictEqual(unverified, newerBudget, "no verified source means no synthetic data");
  const malformed = mergeVerifiedFinanceBankWorkspace(newerBudget, { accounts: [], transactions: null });
  assert.strictEqual(malformed, newerBudget);
  const genuineEmpty = mergeVerifiedFinanceBankWorkspace(newerBudget, { accounts: [], transactions: [] });
  assert.equal(genuineEmpty.bankWorkspaceReadVerified, true, "empty must be explicitly verified");
  assert.deepEqual(genuineEmpty.accountTransactions, []);
});

test("real Finance UI preserves verified bank rows when a scoped budget update arrives", () => {
  assert.match(app, /payload\.financeSummary\) \{\s+state\.financeSummary = mergeVerifiedFinanceBankWorkspace\(/);
  assert.match(app, /const financeDialog = document\.querySelector\("#detail-dialog\.budget-dialog\[open\]"\)/);
  assert.match(app, /if \(financeDialog\) openBudgetDetail\(\)/);
  assert.match(app, /verifiedFinanceBankWorkspace = \{\s+accounts: workspace\.accounts,\s+transactions: workspace\.transactions/);
  assert.match(app, /state\.financeSummary = mergeVerifiedFinanceBankWorkspace\(\s+state\.financeSummary, verifiedFinanceBankWorkspace/);
  assert.match(app, /verifiedFinanceBankWorkspace = null;\s+await Promise\.allSettled\(\[/);
});
