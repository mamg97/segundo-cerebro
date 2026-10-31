import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=name=>readFileSync(new URL("./"+name,import.meta.url),"utf8");

test("desktop refresh belongs to the sticky area navbar, not each routed view",()=>{
 const html=read("index.html"),css=read("area-routes.css"),js=read("app.js");
 const top=html.slice(html.indexOf('<aside class="sidebar"'),html.indexOf('</aside>'));
 const header=html.slice(html.indexOf('<dialog id="detail-dialog"'),html.indexOf('<div id="dialog-body"'));
 assert.match(top,/id="area-nav"/);
 assert.match(top,/id="desktop-area-refresh"/);
 assert.ok(top.indexOf('id="area-nav"')<top.indexOf('id="desktop-area-refresh"'));
 assert.doesNotMatch(header,/id="desktop-area-refresh"/);
 assert.match(header,/id="copy-area-link"/);
 assert.match(header,/id="close-dialog"/);
 assert.match(css,/\.sidebar > #desktop-area-refresh\{/);
 assert.match(css,/\.sidebar\{grid-template-columns:auto minmax\(0,1fr\) auto\}/);
 assert.match(css,/\.topbar > \.top-actions > #refresh-app\{display:none!important\}/);
 assert.match(css,/@media \(min-width:761px\)/);
 assert.match(css,/@media \(max-width:760px\)/);
 assert.match(css,/\.sidebar > #desktop-area-refresh\{display:none!important\}/);
 assert.match(js,/desktop-area-refresh"\)\?\.addEventListener\("click"/);
 assert.match(js,/await refreshApp\(\)/);
 assert.match(js,/if\(route\.areaId==="area-general"\)return/);
 assert.match(js,/openArea\(route\.areaId\)/);
 assert.match(js,/window\.location\.hash!==requestedHash/);
 assert.doesNotMatch(js,/desktopRefresh\.hidden=home/);
});
test("wedding refresh logic remains intact with no duplicated visible button",()=>{
 const css=read("area-routes.css"),js=read("app.js"),html=read("index.html"),wed=read("wedding.js");
 assert.match(js,/weddingButton\.click\(\)/);
 assert.match(js,/route\.detailId==="boda"/);
 assert.match(wed,/if\(state\.editing&&!window\.confirm\(/);
 assert.match(html,/id="wed-main-refresh"/);
 assert.match(css,/wedding-dialog\[open\] > #wed-main-refresh:not\(\[hidden\]\)\{\s*display:none!important/);
});
test("privacy badge is removed, authentication and mobile refresh remain",()=>{
 const html=read("index.html"),js=read("app.js"),mobile=read("mobile-navigation.mjs");
 assert.doesNotMatch(html,/class="privacy-note"|id="privacy-mode-title"|id="privacy-mode-detail"/);
 assert.doesNotMatch(js,/querySelector\("#privacy-mode-title"\)|querySelector\("#privacy-mode-detail"\)/);
 assert.match(js,/privateModeKind = "remote"/);
 assert.match(js,/credentials: "same-origin"/);
 assert.match(html,/id="refresh-app"/);
 assert.match(mobile,/id="mobile-refresh-action"/);
});
