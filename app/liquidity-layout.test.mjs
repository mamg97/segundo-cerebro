import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");

assert.match(app, /const denseLegend = leaderLayout\.length > 6/);
assert.match(app, /has-variable-legend/);
assert.match(app, /is-variable-height/);

assert.match(styles, /\.liquidity-account-chart\.has-variable-legend \.liquidity-leader-layer\s*\{[^}]*display:\s*none/s);
assert.match(styles, /\.liquidity-account-legend\.is-variable-height\s*\{[^}]*height:\s*auto/s);
assert.match(styles, /grid-auto-rows:\s*minmax\(38px,\s*auto\)/);

assert.match(audit, /liquidity-account-legend: texto fila/);
assert.match(audit, /querySelectorAll\("\.liquidity-account-legend"\)/);
