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
 assert.match(compact,/\.trv-grid\.trv-responsive-gallery \{/);
 assert.match(compact,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(compact,/padding:1px 0 7px;overflow:visible/);
 assert.doesNotMatch(compact,/trv-horizontal-gallery|scroll-snap-type:x/);
});

test("phone shell is owned by viewport CSS; travel density cannot override it",()=>{
 const viewport=readFileSync(new URL("./mobile-viewport-fixes.css",import.meta.url),"utf8");
 assert.match(viewport,/--mobile-bottom-height:calc\(58px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(viewport,/--mobile-dock-height:var\(--mobile-bottom-height\)/);
 assert.match(viewport,/#detail-dialog\.travels-dialog\[open\]::before/);
 assert.match(viewport,/>#close-dialog,/);
 assert.doesNotMatch(compact,/--mobile-bottom-height|\.mobile-bottom-nav|padding:42px 10px 0!important/);
 assert.doesNotMatch(compact,/body\.route-area-active #detail-dialog\.travels-dialog\[open\]::before/);
});


test("mobile itinerary has one readable day width, wrapped activities and a local horizontal scroll",()=>{
 assert.match(timetable,/class="trv-day-col"/);
 assert.match(timetable,/class="trv-time-col"/);
 assert.match(compact,/width:clamp\(216px,calc\(100vw - 126px\),380px\)/);
 assert.match(compact,/\.trv-timetable \{[\s\S]*?width:max-content;min-width:0;table-layout:fixed/);
 assert.match(compact,/grid-template-areas:"category" "description" "status"/);
 assert.match(compact,/white-space:normal;overflow-wrap:anywhere;word-break:normal/);
 assert.match(compact,/-webkit-text-size-adjust:100%/);
 assert.doesNotMatch(compact,/min-width:740px/);
 assert.match(compact,/position:sticky;top:0;z-index:5;[\s\S]*?background:var\(--surface\)/);
});
