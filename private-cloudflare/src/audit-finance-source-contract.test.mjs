import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const audit = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");

test("audit verifies isolated canonical bank source independently of Delta", () => {
  assert.match(audit, /fetch\("\/api\/finance\/accounts", \{/);
  assert.match(audit, /bankSourceReadable && bankSourcePopulated/);
  assert.match(audit, /Finanzas · workspace bancario conectado al Sheet canónico/);
  assert.match(audit, /const deltaProbe = await probeApi\("\/api\/finance\/delta\?limit=1"/);
});

test("audit only moves bounded booleans across browser boundary", () => {
  assert.match(audit, /readable: valid,/);
  assert.match(audit, /populated: valid && \(body\.accounts\.length > 0 \|\| body\.transactions\.length > 0\)/);
  assert.match(audit, /const bankSourceCode = !bankSourceReadable \? "SOURCE_UNAVAILABLE"/);
  assert.doesNotMatch(audit, /console\.log\(.*bankSourcePayload/);
});

test("a missing bank workspace logs closed DOM state without account identifiers", () => {
  assert.match(audit, /if \(!sheetLinkVisible\) await emitFinanceDomDiagnostic\("", 0\)/);
  assert.match(audit, /options\.htmlDataName === "account-transactions-tab"\) \{/);
  assert.match(audit, /safeAuditFinanceStructureCode\(flags\)/);
});
