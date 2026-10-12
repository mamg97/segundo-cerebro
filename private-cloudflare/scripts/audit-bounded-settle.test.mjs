import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settleAuditDiagnostics } from "./audit-bounded-settle.mjs";

const script = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

test("settled diagnostic reads finish without delay", async () => {
  assert.deepEqual(await settleAuditDiagnostics([], 20), { timedOut: false });
  assert.deepEqual(await settleAuditDiagnostics([Promise.resolve(200), Promise.reject(new Error("synthetic"))], 20), { timedOut: false });
});

test("unresolved 5xx body read cannot hang browser audit", async () => {
  const pending = new Promise(() => {});
  const start = Date.now();
  assert.deepEqual(await settleAuditDiagnostics([pending], 20), { timedOut: true });
  assert.ok(Date.now() - start < 350, "diagnostic timeout must be bounded");
});

test("Chromium marks incomplete diagnostics and retains real network failures", () => {
  assert.match(script, /settleAuditDiagnostics\(private502DiagnosticsPending\)/);
  assert.match(script, /DIAGNOSTICS_INCOMPLETE count=1/);
  assert.match(script, /assertCheck\(networkFailures\.length === 0, "Sin respuestas 5xx ni fallos de red"/);
  assert.doesNotMatch(script, /await Promise\.allSettled\(private502DiagnosticsPending\)/);
});
