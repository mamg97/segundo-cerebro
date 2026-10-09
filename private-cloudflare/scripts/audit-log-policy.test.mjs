import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { safeAuditLog } from "./audit-log-policy.mjs";

const auditor = fs.readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

test("public log lines are codes, never DOM text, email, token, URL or private payload", () => {
  const payload = [
    "Finanzas", "persona@example.com", "Bearer verySecretToken",
    "https://some-private-host.invalid?token=secret", "12.345,67 EUR",
    "receta privada", "fecha 2026-10-09", "id-privado-123"
  ].join(" · ");
  for (const kind of ["PASS", "FAIL", "INFO"]) {
    const line = safeAuditLog(kind, 7, payload, payload);
    assert.match(line, /^\[(PASS|FAIL|INFO)\] (FINANCE|OTHER) CHECK-00007$/);
    for (const secret of ["example.com", "verySecretToken", "private-host", "12.345", "receta privada", "id-privado"]) {
      assert.equal(line.includes(secret), false);
    }
  }
});

test("untrusted failure names do not appear even in summary and error paths", () => {
  assert.match(auditor, /safeAuditLog\("PASS"/);
  assert.match(auditor, /safeAuditLog\("FAIL"/);
  assert.match(auditor, /safeAuditLog\("INFO"/);
  assert.doesNotMatch(auditor, /console\.(?:log|error)\(\`\[(?:PASS|FAIL|INFO)\] \$\{name\}/);
  assert.doesNotMatch(auditor, /\[AUDIT_FAILED\].*failures\.map/);
  assert.match(auditor, /\[AUDIT_FAILED\] failures=/);
});
