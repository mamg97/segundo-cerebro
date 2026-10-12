import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("private production bank-only recovery does not require full state bootstrap", () => {
  assert.match(app, /function canReadPrivateFinanceBankWorkspace\(\)/);
  assert.match(app, /globalThis\.__SECOND_BRAIN_REMOTE__ === true && privateModeKind !== "local"/);
  assert.match(app, /if \(!canReadPrivateFinanceBankWorkspace\(\) \|\| financeBudgetRefreshInFlight\) return/);
  assert.match(app, /await fetchFinanceBankWorkspace\(12000\)/);
});

test("remote bootstrap failures clear mock finance values before bank-only display", () => {
  assert.match(app, /if \(globalThis\.__SECOND_BRAIN_REMOTE__ === true &&[\s\S]*?state\.financeSummary\?\.bankWorkspaceReadVerified !== true\)/);
  assert.match(app, /state\.financeSummary = \{\s*monthlyBudget: null,\s*bankWorkspaceAccounts: \[\],\s*accountTransactions: \[\],\s*bankWorkspaceReadVerified: false/);
  assert.match(app, /if \(!monthly && finance\.bankWorkspaceReadVerified === true\)/);
  assert.match(app, /Presupuesto temporalmente no disponible/);
});

test("cache versions stay aligned for verified bank recovery", () => {
  assert.match(html, /\.\/app\.js\?v=0\.44\.19/);
  assert.match(html, /\.\/styles\.css\?v=0\.44\.19/);
  assert.match(app, /finance-workspace-readiness\.js\?v=0\.44\.19/);
});
