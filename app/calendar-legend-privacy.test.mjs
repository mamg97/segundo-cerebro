import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("public calendar legend uses generic source labels", () => {
  const legend = html.match(/<div class="calendar-legend" aria-label="Calendarios">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(legend, "calendar legend must exist");

  for (const [sourceClass, expectedLabel] of [
    ["partner", "Compartido"],
    ["gemini", "Asistente"]
  ]) {
    const label = legend.match(new RegExp(`<i class="calendar-legend-dot ${sourceClass}"></i>([^<]+)</span>`))?.[1];
    assert.equal(label, expectedLabel, `${sourceClass} must not expose an identifying label`);
  }

  assert.doesNotMatch(legend, /[a-z0-9]+_[a-z0-9]+/i, "no source identifiers in public legend");
});
