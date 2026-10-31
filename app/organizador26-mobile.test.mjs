import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("mobile menu route reuses and restores same editable photo matrix",()=>{
 const app=read("./app.js"),html=read("./index.html");
 for(const marker of ["function openHomeWeeklyMenuRoute()","function returnHomeWeeklyMenuPortal()",
  "body.replaceChildren(panel)","marker.replaceWith(panel)","routedHealthTabId === \"menu\"",
  "renderHomeWeeklyMenuMatrixCell(rows, false, day.date, moment.label)"])assert.ok(app.includes(marker),marker);
 assert.match(html,/organizador26-mobile\.css\?v=0\.1\.0/);
});
test("iPhone menu fits photos, actions and seven-day table inside one scroller",()=>{
 const css=read("./organizador26-mobile.css");
 for(const s of [".home-weekly-menu-table-scroll",".home-menu-recipe-thumb",
   ".home-menu-item-actions",".home-menu-add-action"])assert.ok(css.includes(s));
 assert.match(css,/grid-template-columns:48px repeat\(7,132px\)/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test("Shopping list shows product image and quantity, remove, exact linking",()=>{
 const ui=read("./pantry.js"),css=read("./organizador26-mobile.css");
 assert.match(ui,/pantryProductThumbnailMarkup\(item\)/);
 assert.match(ui,/const details = \[target, String\(item\.reason/);
 for(const key of ["data-shopping-remove","data-shopping-link","data-shopping-updated"])assert.ok(ui.includes(key));
 assert.match(css,/\.pantry-shopping-remove/);
 assert.match(css,/\.pantry-product-thumb/);
});
