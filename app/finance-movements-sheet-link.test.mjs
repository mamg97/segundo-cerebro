import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");
const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");

assert.match(app, /class="account-transactions-sheet-link"/);
assert.match(app, /href="\/api\/source-link\?target=finance-records"/);
assert.match(app, /Abrir Sheet ↗/);

assert.match(styles, /\.account-transactions-sheet-link\s*\{/);
assert.match(styles, /\.account-transactions-heading-actions\s*\{/);

assert.match(worker, /target === "finance-records"/);
assert.match(worker, /googleSpreadsheetUrl\(env\.FINANCE_SHEET_ID\)/);
assert.match(worker, /FINANCE_NOT_CONFIGURED/);

assert.match(audit, /Finanzas · enlace al Sheet de movimientos visible/);
assert.match(audit, /\/api\/source-link\?target=finance-records/);
