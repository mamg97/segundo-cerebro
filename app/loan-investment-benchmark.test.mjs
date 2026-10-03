import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");
const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");

assert.match(worker, /PrestamoVsInversion!A1:X200/);
assert.match(worker, /const loanInvestmentBenchmarks = parseTableRows\(loanInvestmentBenchmarkRows\)/);
assert.match(worker, /loanInvestmentBenchmarks\s*\n\s*};/);

assert.match(app, /function renderLoanInvestmentBenchmarkCards\(/);
assert.match(app, /function openLoanInvestmentBenchmarkDetail\(/);
assert.match(app, /data-loan-investment-benchmark-id=/);
assert.match(app, /renderLoanInvestmentBenchmarkCards\(wealth, true\)/);
assert.match(app, /renderLoanInvestmentBenchmarkCards\(wealth, false\)/);
assert.match(app, /Ventaja neta inversión − banco/);
assert.match(app, /Cálculo provisional/);

assert.match(styles, /\.loan-benchmark-card\s*\{/);
assert.match(styles, /\.loan-benchmark-detail-grid\s*,/);
assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.loan-benchmark-detail-hero/);

assert.match(audit, /benchmark préstamo vs inversión visible en Home/);
assert.match(audit, /benchmark abre detalle/);

for (const source of [app, styles, worker, audit]) {
  assert.doesNotMatch(source, /32500|44017|6000\.00|22\.32|3\.25%|6\.4839/);
}
