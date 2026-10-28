import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const nav=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
test("in-flight weekly menu requests are reused and only forced reads supersede",()=>{
 assert.match(app,/let homeWeeklyMenuInFlight = null/);
 assert.match(app,/pending\.week===week && \(!options\.force \|\| pending\.force\)/);
 assert.match(app,/return pending\.promise/);
 assert.match(app,/homeWeeklyMenuInFlight===current/);
});
test("cached menu is not mistaken for a successful remote refresh",()=>{
 assert.match(app,/readHomeWeeklyMenuUnshared/);
 assert.match(app,/!options\.force && cached && cached\.expiresAt > Date\.now\(\)/);
 assert.match(app,/Old data may remain visible/);
 assert.match(app,/return false;\s*}\s*async function renderHomeNutritionCard/);
});
test("mobile feedback identifies failed sources",()=>{
 assert.match(app,/extras\[1\]\.value!==true/);
 assert.match(app,/failed\.push\("Menú semanal"\)/);
 assert.match(nav,/Sin actualizar: /);
 assert.match(nav,/result\?\.failed/);
});
