import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("./styles.css",import.meta.url),"utf8");
const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");

const mobile=css.slice(css.lastIndexOf("/* Mobile Home weekly menu: more days"));

test("Home weekly menu mobile grid is denser and confined to its own scroller",()=>{
  assert.ok(mobile.startsWith("/* Mobile Home weekly menu: more days"));
  assert.match(mobile,/@media \(max-width: 560px\)/);
  assert.match(mobile,/\.home-weekly-menu-table\s*\{[\s\S]*?grid-template-columns:\s*64px repeat\(7, 128px\)/);
  assert.match(mobile,/\.home-weekly-menu-table-scroll\s*\{[\s\S]*?overscroll-behavior-inline:\s*contain/);
  assert.match(mobile,/\.home-weekly-menu-corner,[\s\S]*?\.home-weekly-menu-row-label\s*\{[\s\S]*?left:\s*0/);
  assert.match(app,/class="home-weekly-menu-table-scroll" role="region"/);
  assert.match(app,/class="home-weekly-menu-row-label"/);
});

test("Mobile recipe cards show shorter thumbnails and smaller text without hiding content",()=>{
  assert.match(mobile,/\.home-weekly-menu-table-cell \.home-menu-recipe-thumb\s*\{[\s\S]*?max-height:\s*62px/);
  assert.match(mobile,/\.home-weekly-menu-table-cell \.home-menu-recipe-title strong,[\s\S]*?font-size:\s*9\.75px/);
  assert.doesNotMatch(mobile,/display:\s*none/);
  assert.doesNotMatch(mobile,/line-clamp|text-overflow:\s*ellipsis/);
  assert.match(app,/data-home-menu-recipe-open=/);
});

test("Consumed, change, and add remain visible and tappable on narrow phones",()=>{
  assert.match(mobile,/\.home-weekly-menu-table-cell \.home-menu-item-actions button\s*\{[\s\S]*?min-height:\s*32px/);
  assert.match(mobile,/\.home-weekly-menu-table-cell \.home-menu-add-action\s*\{[\s\S]*?min-height:\s*34px/);
  assert.match(app,/data-home-menu-change=/);
  assert.match(app,/data-home-menu-add-date=/);
  assert.match(app,/home-menu-consumed-label/);
});

test("Compact layout is explicitly mobile scoped; asset versions are consistent",()=>{
  assert.match(mobile,/^\/\* Mobile Home weekly menu: more days[\s\S]*?@media \(max-width: 560px\)/);
  assert.equal(html.includes("styles.css?v=0.44.66"),true);
  assert.equal(html.includes("app.js?v=0.44.66"),true);
  assert.match(css,/\.home-weekly-menu-table\s*\{[\s\S]*?grid-template-columns: 118px repeat\(7, minmax\(160px, 1fr\)\)/);
});
