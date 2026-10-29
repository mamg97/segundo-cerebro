import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");
const app = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");

test("failed menu pantry detail remains a FAIL but can return to menu for independent checks", () => {
  assert.match(audit, /await productDetail\.isVisible\(\)\.catch\(\(\) => false\)/);
  assert.match(audit, /const backToMenu = page\.locator\('\[data-health-panel="menu"\] #pantry-back, \[data-health-panel="menu"\] \[data-menu-product-back\]'\)/);
  assert.match(audit, /await backToMenu\.click\(\)/);
  assert.match(audit, /Menú · ficha de Despensa vuelve al menú completo/);
  assert.match(app, /data-menu-product-back/);
  assert.match(audit, /Menú · selector de histórico semanal está visible/);
});
