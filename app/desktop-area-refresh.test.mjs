import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("./"+name,import.meta.url),"utf8");
test("desktop header is a single navigation surface with refresh, orb and existing controls",()=>{
 const html=read("index.html"),css=read("desktop-unified-header.css"),js=read("app.js");
 const aside=html.slice(html.indexOf('<aside class="sidebar"'),html.indexOf("</aside>"));
 const main=html.slice(html.indexOf('<main id="main-content"'),html.indexOf('id="overview"'));
 const head=aside.slice(aside.indexOf('<header class="topbar">'));
 assert.match(aside,/id="area-nav"/);
 assert.doesNotMatch(main,/class="topbar"/);
 assert.ok(aside.indexOf('id="area-nav"')<aside.indexOf('<header class="topbar">'));
 for(const id of ["system-orb","greeting","current-date","desktop-area-refresh","refresh-app","demo-mode-toggle","theme-toggle"]){
  assert.equal((html.match(new RegExp('id="'+id+'"',"g"))||[]).length,1,"Duplicate/missing "+id);
  assert.ok(head.includes('id="'+id+'"'),"Control not in header: "+id);
 }
 assert.ok(head.indexOf('id="desktop-area-refresh"')<head.indexOf('id="demo-mode-toggle"'));
 assert.ok(head.indexOf('id="demo-mode-toggle"')<head.indexOf('id="theme-toggle"'));
 assert.match(css,/@media \(min-width: 761px\)/);
 assert.match(css,/\.app-shell > \.sidebar > \.topbar \{/);
 assert.match(css,/position: static/);
 assert.match(css,/\.sidebar > \.area-nav \{[\s\S]*?overflow-x: auto/);
 assert.match(css,/\.sidebar > \.topbar #system-orb \{[\s\S]*?pointer-events: auto/);
 assert.match(css,/--sc-desktop-unified-header-height: 64px/);
 assert.match(css,/body\.route-area-active \.app-shell > \.sidebar \{/);
 assert.match(js,/desktop-area-refresh"\)\?\.addEventListener\("click"/);
 assert.match(js,/await refreshApp\(\)/);
 assert.match(js,/if\(route\.areaId==="area-general"\)return/);
 assert.match(js,/openArea\(route\.areaId\)/);
 assert.match(js,/window\.location\.hash!==requestedHash/);
});
test("Demo, Theme and Orb keep their existing event bindings and ids",()=>{
 const html=read("index.html"),js=read("app.js"),css=read("desktop-unified-header.css");
 assert.match(js,/demo-mode-toggle"\)\?\.addEventListener\("click", toggleDemoMode\)/);
 assert.match(js,/theme-toggle"\)\?\.addEventListener\("click", toggleTheme\)/);
 assert.match(js,/document\.querySelector\("#system-orb"\)/);
 assert.match(html,/id="system-orb"[\s\S]*?state="idle"/);
 assert.match(html,/id="refresh-app"/);
 assert.match(css,/#refresh-app \{\s*display: none !important/);
});
test("wedding refresh logic and mobile navigation remain intact",()=>{
 const css=read("desktop-unified-header.css"),routes=read("area-routes.css"),js=read("app.js");
 const mobile=read("mobile-navigation.css"),mobileJs=read("mobile-navigation.mjs");
 assert.match(js,/weddingButton\.click\(\)/);
 assert.match(routes,/wedding-dialog\[open\] > #wed-main-refresh:not\(\[hidden\]\)/);
 assert.match(routes,/@media\(max-width:760px\)/);
 assert.match(mobile,/body \.sidebar,body\.route-area-active \.sidebar\{display:none!important\}/);
 assert.match(mobileJs,/id="mobile-refresh-action"/);
 assert.doesNotMatch(css,/@media \(max-width:/);
});
test("privacy badge is still absent and authentication remains active",()=>{
 const html=read("index.html"),js=read("app.js");
 assert.doesNotMatch(html,/class="privacy-note"|id="privacy-mode-title"|id="privacy-mode-detail"/);
 assert.match(js,/privateModeKind = "remote"/);
 assert.match(js,/credentials: "same-origin"/);
});
