import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HOBBY_CATEGORIES,hrefForArea,hrefForHobby,hrefForTravel,hrefForWedding,hrefForHealthTab,HEALTH_SECTION_IDS,hrefForPantryTab,PANTRY_SECTION_IDS,routeFromHash} from "./area-routes.mjs";

test("main areas have independent, stable URLs and a home route",()=>{
  assert.equal(hrefForArea("area-general"),"#/inicio");
  for(const id of ["area-career","area-finance","area-calendar","area-partner","area-family","area-health","area-objects","area-wealth","area-projects","area-travels","area-hobbies","area-pantry"]){
    const route=routeFromHash(hrefForArea(id));
    assert.equal(route.areaId,id);
    assert.equal(route.detailId,null);
  }
  assert.equal(routeFromHash("#overview").areaId,"area-general");
  assert.equal(routeFromHash("#/desconocido"),null);
});
test("trip details have shareable URLs, reject invalid paths",()=>{
  const href=hrefForTravel("example-id-2027-06-12");
  assert.equal(routeFromHash(href).detailId,"example-id-2027-06-12");
  assert.equal(routeFromHash("#/viajes/extra/part"),null);
  assert.equal(routeFromHash("#/finanzas/private-id"),null);
  assert.equal(routeFromHash("#/viajes/%"),null);
  assert.equal(routeFromHash("#/viajes/%2F"),null);
});
test("top navbar remains independently available in every route, no authorization bypass",()=>{
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("./area-routes.css",import.meta.url),"utf8");
  const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
  assert.match(app,/window\.addEventListener\("hashchange"/);
  assert.match(app,/window\.addEventListener\("popstate"/);
  assert.match(app,/hrefForArea\(area\.id\)/);
  assert.match(app,/window\.addEventListener\("area-route-synced"/);
  assert.match(css,/body\.route-area-active \.sidebar\s*\{[\s\S]*?position:fixed/);
  assert.match(css,/z-index:5000/);
  assert.match(index,/id="copy-area-link"/);
  assert.match(index,/href="\.\/area-routes\.css\?v=0\.1\.4"/);
  assert.doesNotMatch(index,/Cloudflare-Access-Jwt-Assertion|client_secret|private_token/);
});

test("routed areas expose only one vertical scrollbar and preserve horizontal itinerary scrolling",()=>{
  const css=readFileSync(new URL("./area-routes.css",import.meta.url),"utf8");
  const travels=readFileSync(new URL("./travels.css",import.meta.url),"utf8");
  assert.match(css,/html:has\(> body\.route-area-active\)\s*\{[^}]*overflow-y:hidden;/);
  assert.match(css,/body\.route-area-active\s*\{[^}]*height:100dvh;[^}]*overflow:hidden;/);
  assert.match(css,/body\.route-area-active #detail-dialog\[open\] #dialog-body\s*\{[^}]*overflow-y:auto;/);
  assert.match(travels,/\.trv-timetable-scroll\s*\{[^}]*overflow-x:auto;[^}]*max-height:none;/);
});

test("Hobbies has five independent and validated shareable category routes",()=>{
 assert.equal(hrefForArea("area-hobbies"),"#/hobbies");
 assert.deepEqual(HOBBY_CATEGORIES.map(x=>x.id),["peliculas","series","libros","vinos","rutas-moto"]);
 for(const category of HOBBY_CATEGORIES){
   assert.deepEqual(routeFromHash(hrefForHobby(category.id)),{areaId:"area-hobbies",detailId:category.id});
 }
 assert.equal(routeFromHash("#/hobbies").detailId,null);
 for(const invalid of ["#/hobbies/otro","#/hobbies/%2F","#/hobbies/%","#/hobbies/peliculas/extra"]){
   assert.equal(routeFromHash(invalid),null);
 }
 assert.equal(hrefForHobby("desconocido"),"#/hobbies");
});

test("Pareja contains a shareable Boda route with restricted subpaths",()=>{
 assert.equal(hrefForWedding(),"#/pareja/boda");
 assert.deepEqual(routeFromHash("#/pareja/boda"),{areaId:"area-partner",detailId:"boda"});
 assert.equal(routeFromHash("#/pareja").detailId,null);
 for(const path of ["#/pareja/otro","#/pareja/%","#/pareja/%2F","#/pareja/boda/ideas"])assert.equal(routeFromHash(path),null);
});

test("mobile wedding header stays below the fixed two-row navbar without overlapping Share/Close",()=>{
 const css=readFileSync(new URL("./area-routes.css",import.meta.url),"utf8");
 const wedding=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(css,/:root\{--route-nav-height:60px\}/);
 assert.match(css,/height:var\(--route-nav-height\)/);
 assert.match(css,/top:var\(--route-nav-height,64px\)/);
 assert.match(css,/#detail-dialog\.wedding-dialog\[open\]:has\(#dialog-body > :is\(/);
 assert.match(css,/#dialog-context\{\s*display:none;/);
 assert.match(css,/#dialog-title\{[\s\S]*?min-height:44px;/);
 assert.match(wedding,/dialog\.classList\.add\("wedding-dialog"\)/);
});

test("health subroutes are shareable and deny invalid sections",()=>{
 for(const id of HEALTH_SECTION_IDS)assert.deepEqual(routeFromHash(hrefForHealthTab(id)),{areaId:"area-health",detailId:id});
 assert.equal(routeFromHash("#/salud/unknown"),null);
 assert.equal(routeFromHash("#/salud/%2f"),null);
 assert.equal(hrefForHealthTab("invalid"),"#/salud");
});

test("Despensa and its shopping-list subroute are directly addressable without bypassing Access",()=>{
 assert.equal(hrefForArea("area-pantry"),"#/despensa");
 assert.deepEqual(PANTRY_SECTION_IDS,["inventario","compra","tickets"]);
 for(const tab of PANTRY_SECTION_IDS){
   assert.deepEqual(routeFromHash(hrefForPantryTab(tab)),{areaId:"area-pantry",detailId:tab});
 }
 for(const invalid of ["#/despensa/mis-datos","#/despensa/%","#/despensa/%2f","#/despensa/compra/extra"]){
   assert.equal(routeFromHash(invalid),null);
 }
 assert.equal(hrefForPantryTab("invalid"),"#/despensa");
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.match(app,/routedPantryTabId=route\.areaId==="area-pantry"/);
 assert.match(app,/hrefForPantryTab\(tab\)/);
 assert.match(app,/openPantryDetail\(routedPantryTabId==="compra"\?"shopping"/);
});
