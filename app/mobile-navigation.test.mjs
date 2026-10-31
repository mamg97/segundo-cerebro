import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MOBILE_AREAS,mobileSections,mobileHasSectionChoices,mobileCurrentLabel,mobileRememberedRoute,MOBILE_DEFAULT_SHORTCUTS,MOBILE_SHORTCUT_GROUPS,normalizeMobileShortcuts,swapMobileShortcut,mobileReleaseFromScript} from "./mobile-navigation.mjs";
import {hrefForArea,hrefForPantryTab,routeFromHash} from "./area-routes.mjs";
const parse=hash=>routeFromHash(hash);
test("mobile primary dock has five areas and More holds all remaining areas",()=>{
 assert.deepEqual(MOBILE_AREAS.slice(0,5).map(x=>x[0]),["area-general","area-finance","area-calendar","area-health","area-partner"]);
 assert.equal(MOBILE_AREAS.length,13);
 assert.ok(MOBILE_AREAS.some(x=>x[0]==="area-partner"&&x[1]==="Boda"));
 assert.equal(new Set(MOBILE_AREAS.map(x=>x[0])).size,13);
 assert.ok(MOBILE_AREAS.some(x=>x[0]==="area-pantry"&&x[1]==="Despensa"));
 for(const x of MOBILE_AREAS)assert.equal(parse(hrefForArea(x[0])).areaId,x[0]);
});
test("context selector only offers actually implemented and shareable sections",()=>{
 assert.deepEqual(mobileSections(parse("#/pareja")).map(x=>x.href),["#/pareja/boda"]);
 assert.deepEqual(mobileSections(parse("#/salud")).map(x=>x.href),["#/salud/overview","#/salud/medical","#/salud/vision","#/salud/gym","#/salud/nutrition","#/salud/recipes","#/salud/menu"]);
 assert.deepEqual(mobileSections(parse("#/hobbies")).map(x=>x.href),["#/hobbies/peliculas","#/hobbies/series","#/hobbies/libros","#/hobbies/vinos","#/hobbies/rutas-moto"]);
 assert.deepEqual(mobileSections(parse("#/despensa")).map(x=>x.href),["#/despensa/inventario","#/despensa/compra","#/despensa/tickets"]);
 for(const id of MOBILE_AREAS.map(x=>x[0])){
  for(const section of mobileSections(parse(hrefForArea(id))))assert.ok(parse(section.href),"Invalid "+section.href);
 }
});
test("header and dock reflect the current deep link",()=>{
 assert.equal(mobileCurrentLabel(parse("#/pareja/boda"),"#/pareja/boda").section,"Boda");
 assert.equal(mobileCurrentLabel(parse("#/salud/nutrition"),"#/salud/nutrition").section,"Nutrición");
 assert.equal(mobileCurrentLabel(parse("#/hobbies/libros"),"#/hobbies/libros").tab,"more");
 assert.equal(mobileCurrentLabel(parse("#/agenda"),"#/agenda").tab,"area-calendar");
 assert.equal(mobileCurrentLabel(parse("#/despensa/compra"),"#/despensa/compra").section,"Lista de la compra");
});
test("remembered last section is constrained to same area",()=>{
 assert.equal(mobileRememberedRoute("area-partner",{"area-partner":"#/pareja/boda"}),"#/pareja/boda");
 assert.equal(mobileRememberedRoute("area-partner",{"area-partner":"#/pareja"}),"#/pareja/boda");
 assert.equal(mobileRememberedRoute("area-partner",{}),"#/pareja/boda");
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
 assert.match(index,/mobile-navigation\.css\?v=0\.1\.7/);
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
 assert.match(index,/<link rel="stylesheet" href="\.\/area-routes\.css\?v=0\.1\.6">/);
 assert.match(index,/<link rel="stylesheet" href="\.\/mobile-navigation\.css\?v=0\.1\.7">/);
 assert.match(css,/--mobile-toolbar-height:calc\(58px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
});

test("mobile refresh calls real refresh, gives feedback and compact bars avoid fixed 258px",()=>{
 const script=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 assert.match(script,/onRefresh:refreshHandler/);
 assert.match(script,/const result=await onRefresh\?\.\(\)/);
 assert.doesNotMatch(script,/refresh-app"\)\?\.click/);
 assert.match(script,/Actualización parcial o fallida/);
 assert.match(app,/onRefresh: refreshApp/);
 assert.match(app,/await fetchFinanceBankWorkspace\(12000\)/);
 assert.match(app,/scroller\.scrollTop=top/);
 assert.match(css,/\.liquidity-stacked-bar-2d\{[\s\S]*?flex-direction:row/);
 assert.match(css,/\.liquidity-account-legend,.liquidity-account-legend\.is-variable-height\{/);
 assert.match(css,/\.bank-holds-block:has\(\.bank-holds-empty\)/);
});

test("mobile refresh shows one circular arrow rather than two opposing arrows",()=>{
 const source=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 const icon=source.match(/refresh:'([^']+)'/)?.[1];
 assert.ok(icon,"Refresh icon exists");
 assert.equal((icon.match(/<path /g)||[]).length,2);
 assert.match(icon,/M21 3v5h-5/);
 assert.doesNotMatch(icon,/M4 17v-5h5|M20 7v5h-5/);
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 assert.match(app,/mobile-navigation\.mjs\?v=0\.1\.\d+/);
 assert.match(index,/app\.js\?v=0\.44\.\d+/);
});

test("mobile secondary panels keep a visible, reachable close at any scroll position",()=>{
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.doesNotMatch(css,/body\.route-area-active #detail-dialog\[open\]>#close-dialog,\s*body\.route-area-active #detail-dialog\[open\]>#copy-area-link\{display:none!important\}/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)>#close-dialog\{[\s\S]*?display:grid!important/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)>#close-dialog\{[\s\S]*?min-height:44px!important/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)>#close-dialog\{[\s\S]*?z-index:12!important/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)\{[\s\S]*?overflow:hidden!important/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\) #dialog-body\{[\s\S]*?overflow-y:auto/);
 assert.match(index,/id="close-dialog"[^>]*aria-label="Cerrar"/);
 assert.match(app,/document\.querySelector\("#close-dialog"\)\.addEventListener\("click", \(\) => dialog\.close\(\)\)/);
 assert.match(css,/#midas-dialog\[open\]>#close-midas-dialog\{/);
});


test("mobile wealth modal retains its inset width instead of secondary fullscreen styling",()=>{
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 const base=readFileSync(new URL("./styles.css",import.meta.url),"utf8");
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)\{[\s\S]*?width:100vw!important/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)::before\{/);
 assert.match(css,/#detail-dialog\[open\]:not\(\.wealth-dialog\)>#close-dialog\{/);
 assert.match(base,/\.detail-dialog\.wealth-dialog\s*\{[\s\S]*?width: calc\(100% - 20px\)/);
});

test("mobile has a single dock: Inicio + four configurable slots + Más",()=>{
 assert.deepEqual(MOBILE_DEFAULT_SHORTCUTS,["#/finanzas","#/pareja/boda","#/salud/gym","#/salud/menu"]);
 const nav=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 assert.match(nav,/id="mobile-bottom-nav"/);
 assert.match(nav,/selectedShortcuts\.map\(shortcutMarkup\)/);
 assert.match(nav,/data-mobile-shortcut/);
 assert.match(nav,/data-mobile-select-shortcut/);
 assert.match(nav,/data-mobile-customize/);
 assert.match(nav,/SHORTCUT_STORAGE_KEY/);
 assert.match(nav,/localStorage\.setItem/);
 assert.doesNotMatch(nav,/id="mobile-quick-dock"/);
 assert.match(css,/--mobile-dock-height:var\(--mobile-bottom-height\)/);
 assert.doesNotMatch(css,/\.mobile-quick-dock\{/);
 assert.match(css,/\.mobile-bottom-nav\{/);
 assert.match(css,/\.mobile-catalog-group>summary/);
 assert.match(index,/mobile-navigation\.css\?v=0\.1\.7/);
 assert.deepEqual(routeFromHash(hrefForPantryTab("compra")),{areaId:"area-pantry",detailId:"compra"});
});

test("catalog exposes real blocks and subblocks, with user preferences safely whitelisted",()=>{
 const hrefs=MOBILE_SHORTCUT_GROUPS.flatMap(g=>g.links.map(x=>x.href));
 for(const href of hrefs)assert.ok(routeFromHash(href),href);
 assert.ok(hrefs.includes("#/salud/menu"),"weekly menu can be pinned");
 assert.ok(hrefs.includes("#/despensa/compra"),"shopping list can be pinned");
 assert.ok(hrefs.includes("#/pareja/boda"),"wedding can be pinned");
 assert.ok(hrefs.includes("#/finanzas/movimientos"),"finance movements can be pinned");
 assert.deepEqual(normalizeMobileShortcuts(null),MOBILE_DEFAULT_SHORTCUTS);
 assert.deepEqual(normalizeMobileShortcuts(["#/salud/menu","#/salud/menu","#/invalid"]),
  ["#/salud/menu","#/finanzas","#/pareja/boda","#/salud/gym"]);
 assert.deepEqual(normalizeMobileShortcuts(["#/salud/gym","#/salud/menu","#/despensa/compra","#/viajes","#/finanzas"]),
  ["#/salud/gym","#/salud/menu","#/despensa/compra","#/viajes"]);
 const switched=swapMobileShortcut([...MOBILE_DEFAULT_SHORTCUTS],0,"#/salud/menu");
 assert.deepEqual(switched,["#/salud/menu","#/pareja/boda","#/salud/gym","#/finanzas"]);
 assert.deepEqual(swapMobileShortcut(MOBILE_DEFAULT_SHORTCUTS,2,"#/despensa/compra"),
  ["#/finanzas","#/pareja/boda","#/despensa/compra","#/salud/menu"]);
 assert.deepEqual(swapMobileShortcut(MOBILE_DEFAULT_SHORTCUTS,1,"#/foo"),MOBILE_DEFAULT_SHORTCUTS);
});

test("Boda uses the diamond ring icon rather than heart, Home scroll is clipped below toolbar",()=>{
 const nav=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 assert.match(nav,/\["area-partner","Boda","ring"\]/);
 assert.match(nav,/ring:'<path/);
 assert.ok(MOBILE_SHORTCUT_GROUPS.some(g=>g.areaId==="area-partner"&&g.icon==="ring"));
 assert.match(css,/body:not\(\.route-area-active\) \.main-content\{/);
 assert.match(css,/inset:var\(--mobile-toolbar-height\) 0 var\(--mobile-dock-height\) 0/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/body:not\(\.route-area-active\)\{height:100dvh;overflow:hidden\}/);
});
test("Gym quick access uses a recognisable, symmetric dumbbell rather than crossed lines",()=>{
  const nav=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
  const path=nav.match(/dumbbell:'([^']+)'/)?.[1]||"";
  assert.match(path,/m6\.5 6\.5 11 11/);
  assert.match(path,/M18 22l4-4/);
  assert.match(path,/M2 6l4-4/);
  assert.match(path,/M3 10l7-7/);
  assert.match(path,/M14 21l7-7/);
});

test("one-subsection areas navigate directly without a redundant dropdown",()=>{
 assert.equal(mobileHasSectionChoices(parse("#/viajes")),false);
 assert.equal(mobileHasSectionChoices(parse("#/pareja/boda")),false);
 assert.equal(mobileHasSectionChoices(parse("#/salud/menu")),true);
 assert.equal(mobileCurrentLabel(parse("#/viajes"),"#/viajes").section,"Viajes");
 const nav=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 assert.match(nav,/group\.links\.length===1/);
 assert.match(nav,/context\.disabled=!hasChoices/);
 assert.match(nav,/mobile-catalog-single/);
});


test("mobile exposes a traceable frontend fingerprint and a safe full-interface reload",()=>{
 assert.equal(mobileReleaseFromScript("./app.js?v=0123456789abcdef"),"01234567");
 assert.equal(mobileReleaseFromScript("./app.js?v=0.44.122"),"sin identificar");
 const nav=readFileSync(new URL("./mobile-navigation.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 assert.match(nav,/data-mobile-force-update/);
 assert.match(nav,/getRegistrations\(\)/);
 assert.match(nav,/segun-public-static-/);
 assert.match(nav,/new URL\(window\.location\.href\)/);
 assert.match(nav,/next\.searchParams\.set\("segun_reload"/);
 assert.match(nav,/window\.confirm\(/);
 assert.doesNotMatch(nav,/localStorage\.clear\(|localStorage\.removeItem\(/);
 assert.match(css,/\.mobile-release-panel\{/);
});
