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

test("finance transport evidence emits bounded status classes, never private URLs or payloads", () => {
  assert.match(audit, /const bankReadTransport = \{ started: 0, responses: \[\], failed: 0 \}/);
  assert.match(audit, /bankReadTransport\.responses\.push\(status === 200 \? "HTTP_200"/);
  assert.match(audit, /Math\.min\(9, bankReadTransport\.started\)/);
  assert.match(audit, /\[AUDIT_FINANCE_TRANSPORT\]/);
  assert.doesNotMatch(audit, /bankReadTransport\.responses\.push\(response\.url\(/);
});

test("audit derives only finite bank response shapes inside the browser", () => {
  const begin = audit.indexOf("// Audit-only browser probe:");
  const end = audit.indexOf("const bankSourceReadable", begin);
  assert.ok(begin > 0 && end > begin);
  const probe = audit.slice(begin, end);
  assert.match(probe, /globalThis\.__auditFinanceResponseShapes = shapes/);
  assert.match(probe, /response\.clone\(\)\.json\(\)\.then\(\(body\) => \{/);
  assert.match(probe, /body\?\.ok === true && Array\.isArray\(body\.accounts\)/);
  assert.match(probe, /"RECORDS" : "EMPTY"/);
  assert.match(audit, /const allowed = new Set\(\["RECORDS", "EMPTY", "INVALID", "PARSE_FAILED", "CLONE_FAILED"\]\)/);
  assert.match(audit, /\[AUDIT_FINANCE_RESPONSE_SHAPE\]/);
  assert.doesNotMatch(probe, /console\.(?:log|error)\([^)]*body\.accounts/);
  assert.doesNotMatch(probe, /return body/);
});
