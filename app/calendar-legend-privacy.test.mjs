import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("calendar legend uses generic labels in public markup", () => {
  const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.match(html, /calendar-legend-dot partner"><\/i>Compartido<\/span>/);
  assert.match(html, /calendar-legend-dot gemini"><\/i>Asistente<\/span>/);
});
