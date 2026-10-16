import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function cssDeclarations(selector) {
  const needle = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(needle + "\\s*\\{([^}]*)\\}", "g"));
  assert.ok(match?.length, `Missing CSS rule: ${selector}`);
  return match.map((rule) => rule.slice(rule.indexOf("{") + 1, -1));
}

test("recipe hero and catalogue contain entire portrait photos in a 16:9 frame", () => {
  const frame = cssDeclarations(".recipe-photo")[0];
  assert.match(frame, /aspect-ratio:\s*16\s*\/\s*9\s*;/);
  assert.match(frame, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(frame, /grid-template-rows:\s*minmax\(0,\s*1fr\)/);
  assert.match(frame, /min-height:\s*0\s*;/);
  const photo = cssDeclarations(".recipe-photo img")[0];
  assert.match(photo, /object-fit:\s*contain\s*;/);
  assert.match(photo, /object-position:\s*center\s*;/);
  assert.match(photo, /min-height:\s*0\s*;/);
  assert.match(photo, /max-height:\s*100%\s*;/);
  assert.doesNotMatch(photo, /object-fit:\s*cover/);
});

test("weekly menu thumbnails also show complete photos without destructive crop", () => {
  const frames = cssDeclarations(".home-weekly-menu-table-cell .home-menu-recipe-thumb");
  assert.ok(frames.some((declarations) => /aspect-ratio:\s*16\s*\/\s*9/.test(declarations)));
  const thumbs = cssDeclarations(".home-weekly-menu-table-cell .home-menu-recipe-thumb img");
  assert.ok(thumbs.every((declarations) => /object-fit:\s*contain/.test(declarations)));
});
