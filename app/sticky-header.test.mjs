import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js",import.meta.url),"utf8");
const styles = readFileSync(new URL("./styles.css",import.meta.url),"utf8");
const html = readFileSync(new URL("./index.html",import.meta.url),"utf8");

test("global navigation and action toolbar use stacked sticky positioning", () => {
  assert.match(styles,/\.topbar\s*\{\s*position: -webkit-sticky;\s*position: sticky;/);
  assert.match(styles,/top: var\(--sc-fixed-navigation-height, 55px\)/);
  assert.match(styles,/:root\s*\{\s*--sc-fixed-navigation-height:\s*55px;\s*\}/);
  assert.match(styles,/@media screen and \(max-width: 760px\)\s*\{\s*:root\s*\{\s*--sc-fixed-navigation-height:\s*83px;\s*\}/);
  assert.match(styles,/#refresh-app\.refresh-app\s*\{\s*position: static !important;/);
});

test("refresh remains next to Demo and Theme and mobile loses independent floating button", () => {
  const tag = html.slice(html.indexOf('<header class="topbar">'),html.indexOf('</header>',html.indexOf('<header class="topbar">')));
  assert.ok(tag.indexOf('id="refresh-app"') < tag.indexOf('id="demo-mode-toggle"'));
  assert.ok(tag.indexOf('id="demo-mode-toggle"') < tag.indexOf('id="theme-toggle"'));
  assert.match(styles,/\.topbar \.top-actions\s*\{\s*display:\s*flex;\s*flex:\s*0 0 auto;/);
  assert.doesNotMatch(app,/installStickyTopbar|style\.setProperty\("--sc-fixed-navigation-height"/);
});

test("recipe photos display with contain and remain above labels",()=>{
  assert.match(styles,/\.home-weekly-menu-table-cell \.home-menu-recipe-thumb img\s*\{[^}]*object-fit:\s*contain;/);
  assert.match(styles,/\.recipe-photo img\s*\{[^}]*object-fit:\s*contain;/);
  assert.match(styles,/\.home-weekly-menu-table-cell \.home-weekly-menu-recipe-link\s*\{[^}]*flex-direction:\s*column;/);
});
