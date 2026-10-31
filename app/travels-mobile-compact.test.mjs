import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const compact=readFileSync(new URL("./travels-mobile-compact.css",import.meta.url),"utf8");
const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const timetable=readFileSync(new URL("./travel-timetable.js",import.meta.url),"utf8");

test("compact Viajes styles load after other styles without changing desktop",()=>{
 assert.match(index,/organizador25-ui\.css\?v=0\.1\.1[\s\S]*travels-mobile-compact\.css\?v=0\.1\.0/);
 assert.match(compact,/@media \(max-width:760px\) \{/);
 assert.doesNotMatch(compact,/(?:Krakowskie|Mayordomo|Asturias|Warszawa|Cangas)/);
});

test("travel grid children may shrink and the timetable scroll stays local",()=>{
 assert.match(compact,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(compact,/\.trv-dashboard > \*/);
 assert.match(compact,/\.trv-dash-details > \*/);
 assert.match(compact,/\.trv-timetable-scroll \{/);
 assert.match(compact,/overflow-x:auto;overflow-y:hidden/);
 assert.match(compact,/overflow-x:hidden;overflow-y:auto/);
 assert.match(timetable,/trv-timetable/);
});

test("dashboard uses four compact metrics, five visible anchors and reduced map height",()=>{
 assert.match(compact,/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(compact,/repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(compact,/min-height:190px!important/);
 assert.match(compact,/flex:0 0 min\(44vw,190px\)/);
});

test("phone shell keeps iOS safe-area and avoids a redundant close strip",()=>{
 assert.match(compact,/--mobile-bottom-height:calc\(58px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(compact,/calc\(var\(--mobile-toolbar-height\) \+ 1px\)/);
 assert.match(compact,/height:40px/);
 assert.match(compact,/min-height:34px!important/);
});
