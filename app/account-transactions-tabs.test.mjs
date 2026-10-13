import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");

assert.match(app, /function renderAccountTransactionsWorkspace\(/);
assert.match(app, /<th>Concepto bancario<\/th><th>Interpretación<\/th>/);
assert.match(app, /account-transaction-interpretation/);
assert.match(app, /data-account-transactions-tab=/);
assert.match(app, /data-account-transactions-panel=/);
assert.match(app, /function initializeAccountTransactionTabs\(/);
assert.match(app, /ArrowLeft/);
assert.match(app, /ArrowRight/);
// Bank tabs use the canonical account catalogue even when balances are unknown.
assert.match(app, /const workspaceAccounts = bankCatalog\.length \? bankCatalog : liquidityAccounts/);
assert.match(app, /renderAccountTransactionsWorkspace\(accountTransactions, workspaceAccounts, currency\)/);
assert.doesNotMatch(app, /\.map\(\(account\) => renderAccountTransactions\(/);

assert.match(styles, /\.account-transactions-tabs\s*\{/);
assert.match(styles, /overflow-x:\s*auto/);
assert.match(styles, /\.account-transactions-panel\[hidden\]/);

assert.match(audit, /Finanzas · movimientos por cuenta/);
assert.match(audit, /\[data-account-transactions-tab\]/);
assert.match(audit, /data-account-transactions-panel/);

assert.doesNotMatch(app, /document\.documentElement\.dataset\.accountTransactionsTab/);
assert.match(audit, /\.account-transactions-tabs \[data-account-transactions-tab\]/);
