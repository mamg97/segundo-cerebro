import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const from = source.indexOf("function ensureVerifiedFinanceBankSection(");
const until = source.indexOf("function refreshFinanceAccountWorkspace(", from);
assert.ok(from >= 0 && until > from, "real frontend fallback function exists");
const fn = source.slice(from, until);

function harness(finance) {
  const state = { financeSummary: finance };
  let renders = 0;
  let initializations = 0;
  let removed = 0;
  const body = {
    section: false,
    html: "",
    querySelector(selector) {
      if (selector === ".account-transactions-section") return this.section ? {} : null;
      if (selector === '[data-finance-workspace-status="unavailable"]') {
        return { remove() { removed++; } };
      }
      return null;
    },
    insertAdjacentHTML(where, html) {
      assert.equal(where, "beforeend");
      this.html += html;
      this.section = true;
    }
  };
  const dialog = {
    open: true,
    classList: { contains(value) { return value === "budget-dialog"; } },
    querySelector(value) { return value === "#dialog-body" ? body : null; }
  };
  const render = (transactions, accounts) => {
    renders++;
    if (!accounts.length && !transactions.length) return "";
    return '<section class="account-transactions-section"></section>';
  };
  const initialize = (value) => {
    assert.strictEqual(value, body);
    initializations++;
  };
  const restore = new Function("state", "renderAccountTransactionsWorkspace",
    "initializeAccountTransactionTabs", fn + "return ensureVerifiedFinanceBankSection;")(
      state, render, initialize
    );
  return { state, body, dialog, restore, counts: () => ({ renders, initializations, removed }) };
}

test("verified source restores bank workspace exactly once after budget rerender", () => {
  const t = harness({
    bankWorkspaceReadVerified: true,
    bankWorkspaceAccounts: [{ id: "synthetic-account" }],
    accountTransactions: [{ id: "synthetic-movement", accountId: "synthetic-account" }]
  });
  assert.equal(t.restore(t.dialog), true);
  assert.equal(t.body.section, true);
  assert.deepEqual(t.counts(), { renders: 1, initializations: 1, removed: 1 });
  assert.equal(t.restore(t.dialog), false, "never duplicate the canonical section");
  assert.deepEqual(t.counts(), { renders: 1, initializations: 1, removed: 1 });
  t.body.section = false; // another budget rerender drops the section
  assert.equal(t.restore(t.dialog), true);
  assert.equal(t.counts().initializations, 2);
});

test("neither unverified nor empty source can fabricate a bank workspace", () => {
  const t = harness({ bankWorkspaceReadVerified: false,
    bankWorkspaceAccounts: [{ id: "unverified-account" }], accountTransactions: [] });
  assert.equal(t.restore(t.dialog), false);
  t.state.financeSummary = { bankWorkspaceReadVerified: true,
    bankWorkspaceAccounts: [], accountTransactions: [] };
  assert.equal(t.restore(t.dialog), false);
  assert.equal(t.body.section, false);
  assert.equal(t.counts().initializations, 0);
  t.state.financeSummary = { bankWorkspaceReadVerified: true,
    bankWorkspaceAccounts: [{ id: "synthetic" }], accountTransactions: [] };
  t.dialog.open = false;
  assert.equal(t.restore(t.dialog), false);
});
