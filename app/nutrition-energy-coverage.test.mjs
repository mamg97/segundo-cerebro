import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./app.js", import.meta.url), "utf8");

test("Nutrition panel refuses to present a partial Watch snapshot as a final balance", () => {
  const begin = source.indexOf("function renderNutritionPanel(data)");
  const end = source.indexOf("function bindNutritionInteractions(", begin);
  assert.ok(begin >= 0 && end > begin);
  const panel = source.slice(begin, end);
  assert.match(panel, /const coverageQuality = String\(energy\?\.coverageQuality \|\| "unknown"\)/);
  assert.match(panel, /const energyComparable = \["full", "live"\]\.includes\(coverageQuality\)/);
  assert.match(panel, /const totalBurn = energyComparable \? nullableNumber\(summary\.totalBurn\) : null/);
  assert.match(panel, /const balance = energyComparable \? nullableNumber\(summary\.balanceKcal\) : null/);
  assert.match(panel, /cobertura parcial o sin confirmar/);
  assert.match(panel, /Balance no fiable: falta el cierre energético/);
  assert.match(panel, /nutrition-source-dot \$\{energyComparable \? "connected" : ""\}/);
});
