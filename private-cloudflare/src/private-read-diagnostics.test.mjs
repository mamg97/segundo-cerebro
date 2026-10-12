import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safePrivateReadDiagnostic } from "./private-read-diagnostics.js";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");

test("runtime diagnostics never echo raw private context", () => {
  const message = "D1_ERROR: account=example-sensitive-id; token=example-secret; url=https://private.invalid";
  assert.equal(safePrivateReadDiagnostic({ name: "D1_ERROR", message }), "D1_READ_FAILED");
  assert.equal(safePrivateReadDiagnostic({ message: "unknown look example-sensitive-id" }), "SOURCE_READ_FAILED");
  assert.equal(safePrivateReadDiagnostic({ code: "unknown " + message, message }), "D1_READ_FAILED");
});

test("known storage and upstream classes retain fixed, safe diagnoses", () => {
  assert.equal(safePrivateReadDiagnostic({ message: "OBJECTS_MEDIA_CORRUPT" }), "OBJECTS_MEDIA_CORRUPT");
  assert.equal(safePrivateReadDiagnostic({ message: "OBJECTS_MEDIA_DB_NOT_CONFIGURED" }), "OBJECTS_MEDIA_DB_NOT_CONFIGURED");
  assert.equal(safePrivateReadDiagnostic({ code: "IMAGE_NOT_FOUND" }), "IMAGE_NOT_FOUND");
  assert.equal(safePrivateReadDiagnostic({ message: "GOOGLE_SHEETS_503" }), "SOURCE_UPSTREAM_TEMPORARY");
  assert.equal(safePrivateReadDiagnostic({ message: "GOOGLE_SHEETS_403" }), "SOURCE_AUTH_FAILED");
  assert.equal(safePrivateReadDiagnostic({ message: "GOOGLE_SHEETS_503 private id" }), "SOURCE_READ_FAILED");
});

test("image and overview 502 handlers log only sanitized failure categories", () => {
  assert.match(worker, /import \{ safePrivateReadDiagnostic \} from "\.\/private-read-diagnostics\.js"/);
  assert.match(worker, /console\.warn\("Objects image request failed", safePrivateReadDiagnostic\(error\)\)/);
  assert.match(worker, /console\.warn\("Objects look image request failed", safePrivateReadDiagnostic\(error\)\)/);
  assert.match(worker, /console\.warn\("Health overview read failed", safePrivateReadDiagnostic\(error\)\)/);
  assert.doesNotMatch(worker, /console\.warn\("Objects image request failed",\s*\{/);
  assert.doesNotMatch(worker, /console\.warn\("Objects look image request failed",\s*\{/);
  assert.doesNotMatch(worker, /console\.warn\("Health overview read failed", String\(/);
});
