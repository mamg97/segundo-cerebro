import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");
const home = readFileSync(new URL("../../app/index.html", import.meta.url), "utf8");

test("Home DOM keeps weekly menu immediately after Agenda and before footer", () => {
  assert.match(home, /<section class="workbench" aria-label="Agenda semanal">[\s\S]*?<\/section>\s*<section id="home-weekly-menu-panel"/);
  assert.match(home, /<section id="home-weekly-menu-panel"[\s\S]*?<\/section>\s*<footer>/);
});

test("production audit checks actual Home DOM order rather than legacy second grid card", () => {
  assert.match(audit, /const menuAfterAgenda = await page\.evaluate/);
  assert.match(audit, /agenda\.nextElementSibling === menu/);
  assert.match(audit, /menu\.nextElementSibling === footer/);
  assert.match(audit, /assertCheck\(menuAfterAgenda, "Home · menú aparece tras Agenda y antes del pie"\)/);
  assert.doesNotMatch(audit, /const menuSecondCard = await page\.evaluate/);
});
