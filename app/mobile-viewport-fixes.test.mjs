import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name)=>readFileSync(new URL(name,import.meta.url),"utf8");

test("iOS mobile: viewport stylesheet is last and main bundle is cache-busted",()=>{
 const html=read("./index.html");
 assert.match(html,/mobile-viewport-fixes\.css\?v=0\.1\.0/);
 assert.ok(html.indexOf("organizador25-ui.css")<html.indexOf("mobile-viewport-fixes.css"));
 const stylesVersion=html.match(/styles\.css\?v=(0\.44\.\d+)/)?.[1];
 const scriptVersion=html.match(/app\.js\?v=(0\.44\.\d+)/)?.[1];
 assert.ok(stylesVersion);
 assert.equal(scriptVersion,stylesVersion);
 assert.match(read("./app.js"),/mobile-navigation\.mjs\?v=0\.1\.10/);
});

test("iOS: no duplicate Travel header, close button only in one fixed toolbar",()=>{
 const css=read("./mobile-viewport-fixes.css");
 const nav=read("./mobile-navigation.mjs");
 assert.match(css,/@media \(max-width:760px\)/);
 assert.match(css,/#detail-dialog\.travels-dialog\[open\]::before\{[\s\S]*?display:none!important/);
 assert.match(css,/#detail-dialog\.travels-dialog\[open\]>#close-dialog,[\s\S]*?display:none!important/);
 assert.match(css,/#detail-dialog\.travels-dialog\[open\] #dialog-body\{[\s\S]*?padding:12px 0 18px!important/);
 assert.match(nav,/id="mobile-route-back"/);
 assert.match(nav,/mobile-route-back"\)\.hidden=route\.areaId!=="area-travels"/);
 assert.match(nav,/mobile-route-back"\)\.addEventListener\("click",\(\)=>navigate\("#\/inicio"\)\)/);
});

test("iOS bottom safe area is not double-counted and is visually filled",()=>{
 const css=read("./mobile-viewport-fixes.css");
 assert.match(css,/--mobile-dock-height:var\(--mobile-bottom-height\)/);
 assert.match(css,/bottom:0;/);
 assert.match(css,/padding:2px max\(8px,env\(safe-area-inset-right,0px\)\) calc\(2px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/body:not\(\.route-area-active\) \.main-content \{[\s\S]*?top:var\(--mobile-toolbar-height\);[\s\S]*?bottom:var\(--mobile-dock-height\)/);
});

test("travel gallery and opened itinerary compact without modifying desktop",()=>{
 const css=read("./mobile-viewport-fixes.css");
 assert.doesNotMatch(css,/trv-horizontal-gallery/);
 assert.match(read("./travels-mobile-compact.css"),/trv-grid\.trv-responsive-gallery/);
 assert.match(css,/\.trv-map-canvas iframe\{height:210px!important\}/);
 assert.match(css,/\.trv-dash-lead,[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/\.trv-intro,[\s\S]*?display:none!important/);
 assert.doesNotMatch(css,/@media\s*\(min-width:/);
});


test("iOS standalone removes deprecated black-translucent shell and matches nav paint",()=>{
 const build=read("../private-cloudflare/scripts/build.mjs");
 const meta=read("./index.html");
 const manifest=JSON.parse(read("./manifest.webmanifest"));
 const pwa=read("./pwa-register.mjs");
 assert.doesNotMatch(build,/apple-mobile-web-app-status-bar-style.*black-translucent/);
 assert.match(build,/apple-mobile-web-app-capable/);
 assert.match(meta,/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
 assert.match(meta,/<meta name="theme-color" content="#0b1728">/);
 assert.equal(manifest.theme_color,"#0b1728");
 assert.equal(manifest.background_color,"#0b1728");
 assert.match(pwa,/installPrivateShellTheme\(\)/);
 assert.match(pwa,/attributeFilter: \["data-theme"\]/);
});

test("iOS mobile Home has three compact Health metrics per row and 2 by 2 pantry",()=>{
 const css=read("./mobile-viewport-fixes.css");
 assert.match(css,/#home-health-card \.home-health-metrics \{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/#home-health-card \.home-health-metric \{[\s\S]*?min-height:65px/);
 assert.match(css,/#home-health-card \.home-health-links \{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/#home-pantry-card \.pantry-home-grid \{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/#home-pantry-card \.pantry-home-grid > span \{[\s\S]*?grid-column:auto/);
 assert.doesNotMatch(css,/display:none!important;.*home-health|home-health-metric[^\n]*display:none/);
});
