import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {weddingTotals,weddingEntryCard,WEDDING_TYPES} from "./wedding.js";
import {routeFromHash} from "./area-routes.mjs";
test("wedding is a Pareja sub-block, not a separate top-level area",()=>{
 assert.equal(routeFromHash("#/pareja/boda").areaId,"area-partner");
 assert.match(weddingEntryCard(),/href="#\/pareja\/boda"/);
 assert.ok(WEDDING_TYPES.some(x=>x[0]==="finca"));
 assert.ok(WEDDING_TYPES.some(x=>x[0]==="catering"));
 const source=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.match(source,/openWeddingDetail\(privateModeKind === "remote"\)/);
 assert.match(source,/weddingEntryCard\(\)/);
});
test("budget math does not double count paid and excluded entries",()=>{
 const s=weddingTotals([{status:"idea",estimateCents:30000,contractedCents:null,paidCents:0},
   {status:"reservado",estimateCents:70000,contractedCents:65000,paidCents:10000},
   {status:"descartado",estimateCents:999999,contractedCents:null,paidCents:0}]);
 assert.equal(s.total,2);assert.equal(s.planned,95000);
 assert.equal(s.committed,65000);assert.equal(s.paid,10000);
});
test("wedding has private API and responsive separate stylesheet",()=>{
 const app=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const style=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
 assert.match(app,/wedding\.css\?v=0\.1\.0/);
 assert.match(style,/\.wed-grid/);
 assert.doesNotMatch(style,/overflow-y:auto/);
});
