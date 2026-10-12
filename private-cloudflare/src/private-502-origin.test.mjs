import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safePrivate502Origin } from "./private-502-origin.js";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const audit = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");

test("only closed 5xx origin codes can appear in public audit logs", () => {
  assert.equal(safePrivate502Origin("application/json; charset=utf-8", {
    ok: false, code: "OBJECTS_IMAGE_FAILED", diagnostic: "D1_READ_FAILED"
  }), "D1_READ_FAILED");
  assert.equal(safePrivate502Origin("application/json", {
    code: "HEALTH_OVERVIEW_READ_FAILED", diagnostic: "SOURCE_UPSTREAM_TEMPORARY"
  }), "SOURCE_UPSTREAM_TEMPORARY");
  assert.equal(safePrivate502Origin("application/json", {
    diagnostic: "sensitive asset id=123; token=secret"
  }), "JSON_UNCLASSIFIED_5XX");
  assert.equal(safePrivate502Origin("text/html", {
    diagnostic: "D1_READ_FAILED"
  }), "NON_JSON_5XX");
  assert.equal(safePrivate502Origin("application/json", null), "JSON_UNCLASSIFIED_5XX");
});

test("Worker sends closed diagnostics for affected 502 routes", () => {
  assert.match(worker, /code: "OBJECTS_IMAGE_FAILED", diagnostic: safePrivateReadDiagnostic\(error\)/);
  assert.match(worker, /code: "OBJECTS_LOOK_IMAGE_FAILED", diagnostic: safePrivateReadDiagnostic\(error\)/);
  assert.match(worker, /code: "HEALTH_OVERVIEW_READ_FAILED", diagnostic: safePrivateReadDiagnostic\(error\)/);
});

test("Chromium does not log raw 5xx JSON or URL identifiers", () => {
  assert.match(audit, /safePrivate502Origin\(contentType, payload\)/);
  assert.match(audit, /\[AUDIT_BACKEND_DIAG\]/);
  assert.match(audit, /await settleAuditDiagnostics\(private502DiagnosticsPending\)/);
  assert.doesNotMatch(audit, /\[AUDIT_BACKEND_DIAG\].*response\.url/);
  assert.doesNotMatch(audit, /console\.error\("\[AUDIT_BACKEND_DIAG\] " \+ JSON\.stringify/);
});
