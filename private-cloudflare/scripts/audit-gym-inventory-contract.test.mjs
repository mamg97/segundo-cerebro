import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const app = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");
const audit = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

test("Gym audit checks the actual curated animation inventory, not a stale fixed count", () => {
  const start = app.indexOf("const GYM_CUSTOM_ANIMATIONS = [");
  const end = app.indexOf("];\nlet gymLibraryState", start);
  assert.ok(start >= 0 && end > start, "curated GIF source exists");
  const animations = vm.runInNewContext(
    app.slice(start, end + 2) + "\nGYM_CUSTOM_ANIMATIONS.map((x) => ({ key: x.key, gif: x.animationUrl }))"
  );
  const expected = audit.match(/const EXPECTED_CURATED_GYM_GIFS = (\d+);/);
  assert.ok(expected, "auditor declares its inventory contract");
  assert.equal(animations.length, Number(expected[1]), "auditor must change when new GIFs are reviewed");
  assert.equal(new Set(animations.map((x) => x.key)).size, animations.length);
  assert.equal(new Set(animations.map((x) => x.gif)).size, animations.length);
  assert.ok(animations.every((x) => x.gif.endsWith(".gif")));
  assert.equal((audit.match(/=== EXPECTED_CURATED_GYM_GIFS/g) || []).length, 3);
  assert.doesNotMatch(audit, /doce GIF|doce ejercicios|size === 12/);
});

test("Gym detail audit counts only the primary hero, not verified supplemental video", () => {
  assert.match(app, /customAnimation && !isOwnIllustration \? gymRealVideoMarkup\(exercise, customAnimation\)/);
  assert.match(audit, /\.gym-exercise-detail-card \.gym-exercise-detail-media > \.gym-exercise-hero-animation/);
  assert.match(audit, /\.gym-exercise-detail-card \.gym-exercise-detail-media > \.gym-exercise-hero-media/);
  assert.match(audit, /detailMediaCount === 1/);
  assert.doesNotMatch(audit, /panel\.locator\("\.gym-exercise-hero-media,\.gym-exercise-hero-empty,\.gym-exercise-hero-animation"\)/);
});

test("Health-to-Home Gym audit compares refreshed visible indicator", () => {
  assert.match(audit, /const homeValue = key === "gym"/);
  assert.match(audit, /#home-health-gym-main/);
  assert.match(audit, /detailValue === homeValue/);
});
