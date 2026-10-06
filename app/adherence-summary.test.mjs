import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adherence = await readFile(new URL("./adherence.js", import.meta.url), "utf8");

test("Adherence exposes a compact Health Summary surface", () => {
  assert.match(adherence, /export async function loadHealthAdherenceOverview\(month\)/);
  assert.match(adherence, /#health-overview-adherence/);
  assert.match(adherence, /health-adherence-overview-ring/);
  assert.match(adherence, /Adherencia del mes/);
  assert.match(adherence, /Cumplidos/);
  assert.match(adherence, /Parciales/);
  assert.match(adherence, /No cumplidos/);
  assert.match(adherence, /Racha actual/);
  assert.match(adherence, /data-adherence-expand/);
  assert.match(adherence, /Ver mes completo/);
});

test("Adherence full month expands inline without a second source", () => {
  assert.match(adherence, /currentPayload && currentPayload\.month === requestedMonth/);
  assert.match(adherence, /render\(currentPayload \|\| payload\)/);
  assert.match(adherence, /detail\.hidden = !willOpen/);
  assert.match(adherence, /id="adherence-overview-retry"/);
});
