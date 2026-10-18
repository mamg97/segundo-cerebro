import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const fix = css.slice(css.lastIndexOf("/* 2026-10-16 · Recipe detail ingredients:"));

test("every recipe detail shares the same safe ingredient layout", () => {
  assert.match(app, /function renderRecipeDetail\(panel, data, recipe, options = \{\}\)/);
  assert.match(app, /<article class="recipe-card recipe-detail-card"/);
  assert.match(app, /<section class="recipe-section recipe-ingredients">/);
  assert.match(app, /<button class="recipe-ingredient-link" type="button" data-recipe-ingredient=/);
  assert.ok((app.match(/renderRecipeDetail\(recipesPanel, payload, recipe,/g) || []).length >= 2,
    "Both weekly-menu and recipe-catalog entry points use the same recipe detail renderer");
});

test("a verbose quantity cannot reserve unbounded width beside ingredient name", () => {
  assert.ok(fix.startsWith("/* 2026-10-16"), "scoped fix remains the final recipe override");
  assert.match(fix, /\.recipe-detail-card \.recipe-ingredients li\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s+minmax\(0, 44%\)/);
  assert.match(fix, /\.recipe-detail-card \.recipe-ingredients li > strong\s*\{[^}]*white-space:\s*normal/);
  assert.match(fix, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(fix, /text-overflow:\s*ellipsis|-webkit-line-clamp|overflow:\s*hidden/,
    "Never clip a long ingredient amount or its explanatory note");
});

test("mobile recipes stack the complete name and amount into one readable column", () => {
  assert.match(fix, /@media\s*\(max-width:\s*760px\)/);
  assert.match(fix, /\.recipe-detail-card \.recipe-ingredients li\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(fix, /\.recipe-detail-card \.recipe-ingredients li > strong\s*\{[^}]*justify-self:\s*stretch[^}]*text-align:\s*left/);
  assert.match(fix, /\.recipe-detail-card \.recipe-card-body > header\s*\{[^}]*flex-direction:\s*column/);
  assert.match(fix, /\.recipe-detail-card \.recipe-precision\s*\{[^}]*max-width:\s*100%/);
  assert.match(fix, /\.recipe-detail-card \.recipe-card-body h4\s*\{[^}]*overflow-wrap:\s*break-word/);
});

test("Safari receives the new stylesheet and matching JavaScript bundle revision", () => {
  const styles = index.match(/\.\/styles\.css\?v=([\d.]+)/)?.[1];
  const script = index.match(/\.\/app\.js\?v=([\d.]+)/)?.[1];
  assert.match(styles || "", /^\d+\.\d+\.\d+$/);
  assert.equal(script, styles);
});
