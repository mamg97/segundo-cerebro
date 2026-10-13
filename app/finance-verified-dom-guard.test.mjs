import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Execute the actual guard (not a copied implementation) against a minimal
// synthetic DOM, to reproduce a late async body replacement.
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = app.indexOf("let financeWorkspaceObserver = null;");
const end = app.indexOf("function refreshFinanceAccountWorkspace(", start);
assert.ok(start > 0 && end > start, "live frontend guard exists");
const guardCode = app.slice(start, end);

function harness() {
  let callback;
  let created = 0;
  let restorationCount = 0;
  let observedTarget;
  let observedOptions;
  const body = {
    hasBankSection: false,
    querySelector(selector) {
      if (selector === ".account-transactions-section") return this.hasBankSection ? {} : null;
      return null;
    }
  };
  const dialog = {
    open: true,
    classList: { finance: true, contains(value) { return value === "budget-dialog" && this.finance; } }
  };
  const document = {
    querySelector(selector) {
      if (selector === "#dialog-body") return body;
      if (selector === "#detail-dialog") return dialog;
      return null;
    }
  };
  class SyntheticMutationObserver {
    constructor(fn) { callback = fn; created++; }
    observe(target, options) { observedTarget = target; observedOptions = options; }
  }
  const restore = () => {
    restorationCount++;
    body.hasBankSection = true;
    return true;
  };
  const instance = new Function("document", "MutationObserver",
    "ensureVerifiedFinanceBankSection", 
    "let verifiedFinanceBankWorkspace = null;\n" + guardCode +
    "\nreturn {start: observeVerifiedFinanceBankSection," +
    "setVerified(value) { verifiedFinanceBankWorkspace = value; }};"
  )(document, SyntheticMutationObserver, restore);
  return {
    body, dialog, instance,
    fire: () => callback(),
    counts: () => ({ created, restorationCount, observedTarget, observedOptions })
  };
}

test("verified bank workspace is restored once when the dialog body is replaced", () => {
  const t = harness();
  t.instance.start();
  t.instance.start();
  assert.equal(t.counts().created, 1);
  assert.strictEqual(t.counts().observedTarget, t.body);
  assert.deepEqual(t.counts().observedOptions, { childList: true });
  t.fire();
  assert.equal(t.counts().restorationCount, 0, "never invent banking records");

  t.instance.setVerified({ accounts: [{ id: "fixture" }], transactions: [] });
  t.fire();
  assert.equal(t.counts().restorationCount, 1);
  t.fire();
  assert.equal(t.counts().restorationCount, 1, "no duplicate section");

  t.body.hasBankSection = false; // asynchronous replacement
  t.fire();
  assert.equal(t.counts().restorationCount, 2,
    "the canonical section is restored after a subsequent redraw");
});

test("closed and non-Finance dialogs never receive banking content", () => {
  const t = harness();
  t.instance.start();
  t.instance.setVerified({ accounts: [{ id: "fixture" }], transactions: [] });
  t.dialog.open = false;
  t.fire();
  t.dialog.open = true;
  t.dialog.classList.finance = false;
  t.fire();
  assert.equal(t.counts().restorationCount, 0);
});

test("restoration reads only the verified in-memory snapshot, not optional ranges", () => {
  const from = app.indexOf("function ensureVerifiedFinanceBankSection(");
  const until = app.indexOf("let financeWorkspaceObserver = null;", from);
  const recovery = app.slice(from, until);
  assert.match(recovery, /mergeVerifiedFinanceBankWorkspace\(\s*state\.financeSummary, verifiedFinanceBankWorkspace/);
  assert.match(recovery, /finance\?\.bankWorkspaceReadVerified !== true/);
  assert.match(recovery, /renderAccountTransactionsWorkspace\(transactions, accounts, "EUR"\)/);
  assert.match(app, /observeVerifiedFinanceBankSection\(\);\s*initDemoMode\(\)/);
  assert.doesNotMatch(guardCode, /localStorage|sessionStorage|caches\.default|console\.log/);
});
