import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../../.github/workflows/web-audit.yml", import.meta.url), "utf8");

test("nutrition preflight failure cannot suppress Chromium or turn audit green", () => {
  const preflight = workflow.indexOf("- name: Check live weekly nutrition source parity");
  const browser = workflow.indexOf("- name: Navigate and audit production");
  const failureGate = workflow.indexOf("- name: Preserve nutrition parity failure");
  assert.ok(preflight >= 0 && browser > preflight && failureGate > browser);

  const preflightStep = workflow.slice(preflight, browser);
  assert.match(preflightStep, /id: nutrition_parity/);
  assert.match(preflightStep, /continue-on-error: true/);
  assert.match(preflightStep, /run: node scripts\/audit-nutrition-live-parity\.mjs/);

  const failureStep = workflow.slice(failureGate);
  assert.match(failureStep, /if: \$\{\{ always\(\) && steps\.cadence\.outputs\.run_audit == 'true' && steps\.nutrition_parity\.outcome == 'failure' \}\}/);
  assert.match(failureStep, /run: exit 1/);
  assert.match(workflow.slice(browser, failureGate), /run: node scripts\/web-audit\.mjs/);
});
