import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { financeAccountWorkspaceIncomplete } from "./finance-workspace-readiness.js";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("a failed monthly budget read must not suppress isolated canonical bank recovery", () => {
  const start = app.indexOf("function refreshFinanceAccountWorkspace(");
  const end = app.indexOf("function openBudgetDetail(", start);
  const code = app.slice(start, end);
  assert.doesNotMatch(code, /fetchStateScope\("finance", 12000\)/);
  assert.match(code, /if \(financeAccountWorkspaceIncomplete\(state\.financeSummary\)\)/);
  assert.match(code, /await fetchFinanceBankWorkspace\(12000\)/);
  assert.match(code, /bankWorkspaceReadVerified: true/);
  assert.equal(financeAccountWorkspaceIncomplete({}), true);
});

test("verified bank ranges display without fabricating a monthly budget", () => {
  const start = app.indexOf("function openBudgetDetail(");
  const end = app.indexOf("function renderBudgetGroup(", start);
  const code = app.slice(start, end);
  assert.match(code, /if \(!monthly && finance\.bankWorkspaceReadVerified === true\) \{/);
  assert.match(code, /renderAccountTransactionsWorkspace\(bankHistory, bankCatalog, "EUR"\)/);
  assert.match(code, /Presupuesto temporalmente no disponible/);
  assert.match(code, /initializeAccountTransactionTabs\(document\.querySelector\("#dialog-body"\)\)/);
  assert.match(code, /bankCatalog\.length\)\s*\?/);
  assert.match(code, /accountTransactions\.length \|\| bankCatalog\.length/);
  assert.doesNotMatch(code, /bankHistory\.map\([^)]*balanceAfter[^)]*\)\s*\/\//);
});

test("banking-only recovery is read-only and front end versions stay aligned", () => {
  assert.match(app, /fetch\("\/api\/finance\/accounts", \{/);
  assert.match(app, /method: "GET"/);
  assert.match(html, /\.\/app\.js\?v=0\.44\.20/);
  assert.match(html, /\.\/styles\.css\?v=0\.44\.20/);
  assert.match(app, /finance-workspace-readiness\.js\?v=0\.44\.20/);
});
