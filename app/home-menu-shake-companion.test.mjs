import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../private-cloudflare/src/weekly-menu-actions.js", import.meta.url), "utf8");

test("planned yogurt replacement exposes an explicit shake companion classification", () => {
  assert.match(app, /const foodCompanion = Boolean\(item\.foodId/);
  assert.match(app, /const defaultShake = foodCompanion && normalizeWeeklyMenuMoment\(item\.companionType\) === "yogur"/);
  assert.match(app, /data-menu-editor-role/);
  assert.match(app, /Batido como acompañante, sin añadir plato principal/);
  assert.match(app, /Esta comida ya tiene una receta principal/);
  assert.match(app, /roleSelect\?\.addEventListener\("change",updatePreview\)/);
  assert.match(app, /submitHomeMenuEdit\(item,isAdd \? "add" : "replace",selectedRecipe\.id/);
});

test("backend honors only explicitly typed drink companions; main recipe guard remains intact", () => {
  assert.match(worker, /const recipeAsCompanion = originalIsFood &&/);
  assert.match(worker, /newCompanionType === "batido"/);
  assert.match(worker, /if \(originalIsFood && !recipeAsCompanion\)/);
  assert.match(worker, /"PRIMARY_RECIPE_ALREADY_IN_MEAL"/);
  assert.match(worker, /put\(original,"tipo_item", recipeAsCompanion \? "acompanante" : "receta"\)/);
  assert.match(worker, /recipeAsCompanion \? "batido" : ""/);
  assert.match(worker, /"consumido"/);
});

test("history-only drink serving is blocked and mobile role selector fits modal", () => {
  assert.match(worker, /no usar para nuevas/);
  assert.match(app, /no usar para nuevas/);
  assert.match(css, /select\[data-menu-editor-role\]\s*\{[^}]*min-height:\s*42px/);
  const v1 = html.match(/styles\.css\?v=([0-9.]+)/)?.[1];
  const v2 = html.match(/app\.js\?v=([0-9.]+)/)?.[1];
  assert.equal(v1, v2);
  assert.equal(v1, "0.44.63");
});
