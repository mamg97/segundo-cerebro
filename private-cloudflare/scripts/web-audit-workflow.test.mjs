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


test("Chromium job has a bounded budget for slow external Playwright dependencies", () => {
  const auditJob = workflow.split(/^  audit:\\s*$/m)[1];
  assert.ok(auditJob, "audit job must exist");
  const minutes = Number(auditJob.match(/^    timeout-minutes: (\\d+)$/m)?.[1]);
  assert.ok(Number.isInteger(minutes) && minutes >= 20 && minutes <= 30,
    "allow slow Ubuntu mirrors without permitting unbounded runner consumption");
  assert.match(auditJob, /npx playwright install --with-deps chromium/);
  assert.match(auditJob, /run: node scripts\\/web-audit\\.mjs/);
});
