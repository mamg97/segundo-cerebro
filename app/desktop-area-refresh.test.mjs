import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=name=>readFileSync(new URL("./"+name,import.meta.url),"utf8");
test("desktop route refresh is inside non-scrolling dialog header, right of content",()=>{
 const html=read("index.html"),css=read("area-routes.css"),js=read("app.js");
 const header=html.slice(html.indexOf('<dialog id="detail-dialog"'),html.indexOf('<div id="dialog-body"'));
 assert.match(header,/id="desktop-area-refresh"/);
 assert.match(header,/id="copy-area-link"/);
 assert.match(header,/id="close-dialog"/);
 assert.ok(header.indexOf('id="desktop-area-refresh"')<header.indexOf('id="copy-area-link"'));
 assert.match(css,/right:238px/);
 assert.match(css,/position:absolute;top:13px/);
 assert.match(css,/@media \(min-width:761px\)/);
 assert.match(css,/@media \(max-width:760px\)/);
 assert.match(css,/#desktop-area-refresh\{display:none!important\}/);
 assert.match(js,/desktopRefresh\.hidden=home/);
 assert.match(js,/desktop-area-refresh"\)\?\.addEventListener\("click"/);
 assert.match(js,/await refreshApp\(\)/);
 assert.match(js,/openArea\(route\.areaId\)/);
 assert.match(js,/window\.location\.hash!==requestedHash/);
});
test("wedding uses its existing refresh without a second desktop button",()=>{
 const css=read("area-routes.css"),js=read("app.js");
 assert.match(js,/weddingButton\.click\(\)/);
 assert.match(js,/route\.detailId==="boda"/);
 assert.match(css,/wedding-dialog\[open\] > #wed-main-refresh:not\(\[hidden\]\)\{\s*display:none!important/);
});
test("privacy badge removed without disabling backend authentication",()=>{
 const html=read("index.html"),js=read("app.js");
 assert.doesNotMatch(html,/class="privacy-note"|id="privacy-mode-title"|id="privacy-mode-detail"/);
 assert.doesNotMatch(js,/querySelector\("#privacy-mode-title"\)|querySelector\("#privacy-mode-detail"\)/);
 assert.match(js,/privateModeKind = "remote"/);
 assert.match(js,/credentials: "same-origin"/);
 assert.match(html,/id="refresh-app"/);
});
