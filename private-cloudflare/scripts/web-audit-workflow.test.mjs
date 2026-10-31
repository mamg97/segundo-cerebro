import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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
  const auditJob = workflow.slice(workflow.indexOf("jobs:\n  audit:"));
  assert.ok(auditJob.startsWith("jobs:\n  audit:"), "audit job must exist");
  const minutes = Number(auditJob.split("timeout-minutes: ")[1]?.split("\n")[0]);
  assert.ok(Number.isInteger(minutes) && minutes >= 20 && minutes <= 30,
    "allow slow Ubuntu mirrors without permitting unbounded runner consumption");
  assert.ok(auditJob.includes("npx playwright install --with-deps chromium"));
  assert.ok(auditJob.includes("run: node scripts/web-audit.mjs"));
});

import { isExternalAuditImageSource, isVerifiedAuditVisualImage } from "./audit-visual-image-policy.mjs";

test("cross-origin images require browser load, decode and positive dimensions", () => {
  const origin = "https://private.example.invalid";
  const external = "https://images.example.invalid/products/fixture.jpg";
  assert.equal(isExternalAuditImageSource(external, origin), true);
  assert.equal(isExternalAuditImageSource("/api/health/recipes/fixture/image", origin), false);
  assert.equal(isExternalAuditImageSource("data:image/png;base64,AAAA", origin), false);
  assert.equal(isVerifiedAuditVisualImage({
    ok: true, decoded: true, verification: "BROWSER_IMAGE_LOAD",
    status: 0, width: 160, height: 90
  }, external, origin), true);
  for (const probe of [
    { ok: false, decoded: false, verification: "BROWSER_IMAGE_LOAD", width: 0, height: 0 },
    { ok: true, decoded: false, verification: "BROWSER_IMAGE_LOAD", width: 160, height: 90 },
    { ok: true, decoded: true, verification: "BROWSER_IMAGE_LOAD", width: 0, height: 90 },
    { ok: true, decoded: true, status: 200, contentType: "image/jpeg", width: 160, height: 90 }
  ]) assert.equal(isVerifiedAuditVisualImage(probe, external, origin), false);
});

test("private images cannot pass via browser-only external image probe", () => {
  const origin = "https://private.example.invalid";
  const privateSrc = "/api/health/recipes/fixture/image";
  const good = { ok: true, status: 200, contentType: "image/jpeg", decoded: true };
  assert.equal(isVerifiedAuditVisualImage(good, privateSrc, origin), true);
  assert.equal(isVerifiedAuditVisualImage({ ...good, status: 502 }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({ ...good, status: 206 }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({ ...good, contentType: "text/html" }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({ ...good, decoded: false }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({
    ok: true, decoded: true, verification: "BROWSER_IMAGE_LOAD", width: 200, height: 100
  }, privateSrc, origin), false);
});

test("visual image probe uses real browser decode only for external resources", () => {
  const source = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");
  assert.match(source, /isVerifiedAuditVisualImage\(probe, item\.src, auditOrigin\)/);
  assert.match(source, /new Image\(\)/);
  assert.match(source, /await image\.decode\(\)/);
  assert.match(source, /verification: "BROWSER_IMAGE_LOAD"/);
  assert.match(source, /credentials: "same-origin"/);
});

test("nutrition preflight logs only technical results, never private daily meal counts", () => {
  const source = readFileSync(new URL("./audit-nutrition-live-parity.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /rowsPerDay|plannedPerDay|rowCounts|planCounts/);
  assert.doesNotMatch(source, /console\.log\([^\n]*weeklyMenu\.length/);
  assert.match(source, /\[NUTRITION_PARITY\] LIGHT_READ_OK/);
  assert.match(source, /\[NUTRITION_PARITY\] FULL_READ_OK/);
  assert.match(source, /auditMultisetDifferenceCount\(lightSignatures, fullSignatures\)/);
  assert.match(source, /auditMultisetDifferenceCount\(fullSignatures, lightSignatures\)/);
  assert.match(source, /if \(lightOnly \|\| fullOnly\) process\.exitCode = 2/);
});

test("recipe thumbnail audit decodes the real foreground, never the blurred backdrop", () => {
  const source = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");
  const app = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");
  assert.match(app, /home-menu-thumb-backdrop/);
  assert.match(app, /home-menu-thumb-primary/);
  assert.match(source, /const firstThumb = page\.locator\("#home-weekly-menu-content \.home-menu-recipe-thumb img:not\(\.home-menu-thumb-backdrop\)"\)\.first\(\)/);
  assert.match(source, /await img\.decode\(\)/);
  assert.match(source, /getComputedStyle\(img\)\.objectFit === "contain"/);
});


test("backup slot recognizes completed failed Chromium without masking short aborts", () => {
  const start = workflow.indexOf("function completedChromiumAudit(");
  const end = workflow.indexOf("\n          async function main()", start);
  assert.ok(start >= 0 && end > start, "cadence decision helper must be in the workflow");
  const fn = runInNewContext(
    workflow.slice(start, end) + "\ncompletedChromiumAudit"
  );
  const full = { conclusion: "failure", started_at: "2026-10-30T23:13:30Z",
    completed_at: "2026-10-30T23:17:27Z" };
  assert.equal(fn({ status: "completed" }, full), true);
  assert.equal(fn({ status: "completed" }, { ...full, completed_at: "2026-10-30T23:13:40Z" }), false);
  assert.equal(fn({ status: "completed" }, { conclusion: "failure" }), false);
  assert.equal(fn({ status: "completed" }, { conclusion: "skipped" }), false);
  assert.equal(fn({ status: "completed" }, { conclusion: "success" }), true);
  assert.equal(fn({ status: "in_progress" }, full), false);
  assert.equal(fn({ status: "cancelled" }, full), false);
  assert.ok(workflow.includes("if (completedChromiumAudit(run, chromiumStep))"));
});
