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
 assert.match(app,/wedding\.css\?v=0\.1\.2/);
 assert.match(style,/\.wed-grid/);
 assert.doesNotMatch(style,/overflow-y:auto/);
});

test("wedding shows budget dashboard directly without the decorative introduction",()=>{
 const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
 assert.match(source,/<div class="wed-stats">/);
 assert.match(source,/<div class="wed-toolbar">/);
 assert.doesNotMatch(source,/wed-hero|Una boda a nuestra manera|NUESTRO PROYECTO EN COMÚN/);
 assert.doesNotMatch(css,/\.wed-hero/);
});

test("Pinterest links are recognized without trusting lookalike domains",()=>{
 const {isPinterestLink}=await import("./wedding.js");
 assert.equal(isPinterestLink("https://www.pinterest.com/pin/1234/"),true);
 assert.equal(isPinterestLink("https://pin.it/example"),true);
 assert.equal(isPinterestLink("https://pinterest.com.evil.example/pin/1"),false);
 assert.equal(isPinterestLink("https://example.com/pinterest.com"),false);
 assert.equal(isPinterestLink("javascript:alert(1)"),false);
});
test("moodboard excludes discarded ideas, filters categories, and preserves existing planning",async()=>{
 const {inspirationItems}=await import("./wedding.js");
 const items=[
  {id:"1",title:"Flores silvestres",description:"centros",category:"decoracion",status:"idea",photoUrl:"/api/wedding/items/a/photo"},
  {id:"2",title:"Banquete",description:"",category:"catering",status:"pendiente",url:"https://www.pinterest.com/pin/1"},
  {id:"3",title:"Descartada",category:"decoracion",status:"descartado",photoUrl:"/photo"},
  {id:"4",title:"Lista de invitados",category:"invitados",status:"idea",photoUrl:"/photo"},
  {id:"5",title:"Precio finca",category:"finca",status:"presupuestado",estimateCents:12000}
 ];
 assert.deepEqual(inspirationItems(items).map(x=>x.id),["1","2"]);
 assert.deepEqual(inspirationItems(items,"decoracion","Flores").map(x=>x.id),["1"]);
 assert.deepEqual(inspirationItems(items,"catering").map(x=>x.id),["2"]);
 const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(source,/class="wed-masonry"/);
 assert.match(source,/data-wed-view="inspiracion"/);
 assert.match(source,/data-wed-view="planificacion"/);
 assert.match(source,/sendPhoto\(result\.item\.id,photo\)/);
 assert.match(source,/wed-stats/);
 assert.doesNotMatch(source,/api\.pinterest\.com|PINAR_TOKEN|PINTEREST_CLIENT_SECRET/);
 const style=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
 assert.match(style,/\.wed-masonry/);
 assert.doesNotMatch(style,/overflow-y:auto/);
});
