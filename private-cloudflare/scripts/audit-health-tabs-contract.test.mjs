import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");
const auditor = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

function between(source, first, last) {
  const begin = source.indexOf(first);
  assert.notEqual(begin, -1, "Missing expected section start: " + first);
  const end = source.indexOf(last, begin + first.length);
  assert.notEqual(end, -1, "Missing expected section end: " + last);
  return source.slice(begin, end);
}

const actualHealth = between(
  app, "function openHealthDetail(options = {}) {",
  "\nasync function revealHealthAdherenceDetail()"
);
const auditHealth = between(
  auditor, 'const healthLink = page.locator(\'[data-nav-area-id="area-health"]\')',
  "const healthNutritionSnapshot"
);

const healthTabButtons = [...actualHealth.matchAll(/<button\b[^>]*\bdata-health-tab="([^"]+)"/g)].map((match) => match[1]);
const healthTabPanels = [...actualHealth.matchAll(/<section\b[^>]*\bdata-health-panel="([^"]+)"/g)].map((match) => match[1]);

function inspectAuditHealth(section) {
  const countMatches = [...section.matchAll(/document\.querySelectorAll\("\[data-health-tab\]"\)\.length\s*===\s*(\d+)/g)];
  assert.equal(countMatches.length, 1, "Auditor must declare exactly one Health dialog readiness count");
  const tabList = section.match(/const healthTabs\s*=\s*\[([^\]]*)\]/);
  assert.ok(tabList, "Auditor must declare its visited Health tabs");
  const listed = [...tabList[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  return { expectedCount: Number(countMatches[0][1]), listed };
}

function assertHealthContract(section) {
  const { expectedCount, listed } = inspectAuditHealth(section);
  assert.ok(healthTabButtons.length > 0, "No Health tabs were found in the real dialog");
  assert.equal(new Set(healthTabButtons).size, healthTabButtons.length, "Duplicate Health tab");
  assert.deepEqual(healthTabPanels, healthTabButtons, "Dialog tabs and panels differ");
  assert.equal(expectedCount, healthTabButtons.length,
    "Auditor readiness count differs from the number of actual Health tabs");
  assert.deepEqual(listed, healthTabButtons,
    "Auditor must visit every real Health tab exactly once in the rendered order");
}

test("production auditor reads exactly the Health tabs rendered by openHealthDetail", () => {
  assertHealthContract(auditHealth);
  assert.equal(healthTabButtons.length, 7);
  assert.ok(healthTabButtons.includes("vision"), "Visión must be visited");
  assert.equal(healthTabButtons.includes("adherence"), false,
    "Adherencia belongs in Resumen, not a separate top-level tab");
});

test("regression: the previous six-tab readiness condition would be rejected", () => {
  const broken = auditHealth.replace(
    'document.querySelectorAll("[data-health-tab]").length === 7',
    'document.querySelectorAll("[data-health-tab]").length === 6'
  );
  assert.notEqual(broken, auditHealth, "The regression fixture must make a change");
  assert.throws(() => assertHealthContract(broken), { name: "AssertionError" });
});

test("regression: dropping Visión from the visit list would be rejected", () => {
  const broken = auditHealth.replace(
    '"overview", "medical", "vision", "gym"',
    '"overview", "medical", "gym"'
  );
  assert.notEqual(broken, auditHealth, "The regression fixture must make a change");
  assert.throws(() => assertHealthContract(broken), { name: "AssertionError" });
});
