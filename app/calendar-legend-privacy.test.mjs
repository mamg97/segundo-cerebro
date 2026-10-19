import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const legend = html.match(/<div class="calendar-legend"[^>]*>([\s\S]*?)<\/div>/)?.[1];

test("public calendar legend has no identity-specific labels", () => {
  assert.ok(legend, "calendar legend must exist");
  const labels = [...legend.matchAll(/<span><i class="calendar-legend-dot ([a-z]+)"><\/i>([^<]+)<\/span>/g)];
  assert.equal(labels.length, 5);
  assert.deepEqual(Object.fromEntries(labels.map(([, key, label]) => [key, label])), {
    personal: "Personal",
    work: "Trabajo",
    partner: "Compartido",
    family: "Familia",
    gemini: "Asistente"
  });
});

test("calendar legend does not embed contact details", () => {
  assert.ok(legend);
  assert.doesNotMatch(legend, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
});
