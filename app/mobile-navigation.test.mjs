import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MOBILE_AREAS,mobileSections,mobileCurrentLabel,mobileRememberedRoute} from "./mobile-navigation.mjs";
import {hrefForArea,routeFromHash} from "./area-routes.mjs";
const parse=hash=>routeFromHash(hash);
test("mobile primary dock has five areas and More holds all remaining areas",()=>{
 assert.deepEqual(MOBILE_AREAS.slice(0,5).map(x=>x[0]),["area-general","area-finance","area-calendar","area-health","area-partner"]);
 assert.equal(MOBILE_AREAS.length,12);
 assert.equal(new Set(MOBILE_AREAS.map(x=>x[0])).size,12);
 for(const x of MOBILE_AREAS)assert.equal(parse(hrefForArea(x[0])).areaId,x[0]);
});
test("context selector only offers actually implemented and shareable sections",()=>{
 assert.deepEqual(mobileSections(parse("#/pareja")).map(x=>x.href),["#/pareja","#/pareja/boda"]);
 assert.deepEqual(mobileSections(parse("#/salud")).map(x=>x.href),["#/salud/overview","#/salud/medical","#/salud/vision","#/salud/gym","#/salud/nutrition","#/salud/recipes","#/salud/menu"]);
 assert.deepEqual(mobileSections(parse("#/hobbies")).map(x=>x.href),["#/hobbies/peliculas","#/hobbies/series","#/hobbies/libros","#/hobbies/vinos","#/hobbies/rutas-moto"]);
 for(const id of MOBILE_AREAS.map(x=>x[0])){
  for(const section of mobileSections(parse(hrefForArea(id))))assert.ok(parse(section.href),"Invalid "+section.href);
 }
});
test("header and dock reflect the current deep link",()=>{
 assert.equal(mobileCurrentLabel(parse("#/pareja/boda"),"#/pareja/boda").section,"Boda");
 assert.equal(mobileCurrentLabel(parse("#/salud/nutrition"),"#/salud/nutrition").section,"Nutrición");
 assert.equal(mobileCurrentLabel(parse("#/hobbies/libros"),"#/hobbies/libros").tab,"more");
 assert.equal(mobileCurrentLabel(parse("#/agenda"),"#/agenda").tab,"area-calendar");
});
test("remembered last section is constrained to same area",()=>{
 assert.equal(mobileRememberedRoute("area-partner",{"area-partner":"#/pareja/boda"}),"#/pareja/boda");
 assert.equal(mobileRememberedRoute("area-health",{"area-health":"#/pareja/boda"}),"#/salud");
 assert.equal(mobileRememberedRoute("area-health",{"area-health":"#/salud/fake"}),"#/salud");
 assert.equal(mobileRememberedRoute("bad-area",{}),"#/inicio");
});
test("mobile-only single-scroller layout preserves native desktop and browser history",()=>{
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 const module=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 assert.match(app,/initializeMobileNavigation\(/);
 assert.match(app,/syncMobileNavigation\(route,hash\)/);
 assert.match(app,/routedHealthTabId/);
 assert.match(app,/hrefForHealthTab/);
 assert.match(index,/mobile-navigation\.css\?v=0\.1\.1/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(min-width:761px\)/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/body\.route-area-active #detail-dialog\[open\] #dialog-body\{/);
 assert.match(css,/overflow-y:auto/);
 assert.doesNotMatch(css,/height:88px/);
 assert.match(module,/aria-modal="true"/);
 assert.match(module,/aria-current="page"/);
});

test("HTML links to both navigation stylesheets and respects iOS safe areas",()=>{
 const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 assert.match(index,/<link rel="stylesheet" href="\.\/area-routes\.css\?v=0\.1\.4">/);
 assert.match(index,/<link rel="stylesheet" href="\.\/mobile-navigation\.css\?v=0\.1\.1">/);
 assert.match(css,/--mobile-toolbar-height:calc\(58px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
});
