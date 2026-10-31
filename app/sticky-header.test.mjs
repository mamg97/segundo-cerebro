import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js",import.meta.url),"utf8");
const styles = readFileSync(new URL("./styles.css",import.meta.url),"utf8");
const html = readFileSync(new URL("./index.html",import.meta.url),"utf8");
const desktop = readFileSync(new URL("./desktop-unified-header.css",import.meta.url),"utf8");

test("desktop has one sticky header and no stacked action toolbar",()=>{
 const aside=html.slice(html.indexOf('<aside class="sidebar"'),html.indexOf("</aside>"));
 const main=html.slice(html.indexOf('<main id="main-content"'),html.indexOf('id="overview"'));
 assert.match(aside,/<header class="topbar">/);
 assert.doesNotMatch(main,/<header class="topbar">/);
 assert.match(desktop,/@media \(min-width: 761px\)/);
 assert.match(desktop,/\.app-shell > \.sidebar > \.topbar \{[\s\S]*?position: static/);
 assert.match(desktop,/grid-template-columns: auto minmax\(0, 1fr\) auto/);
 assert.match(desktop,/--sc-desktop-unified-header-height: 64px/);
 assert.match(styles,/\.sidebar\s*\{[\s\S]*?position:\s*sticky/);
});
test("refresh, orb, greeting, Demo and Theme keep the existing ids and events",()=>{
 const sidebar=html.slice(html.indexOf('<aside class="sidebar"'),html.indexOf('</aside>'));
 const header=html.slice(html.indexOf('<header class="topbar">'),html.indexOf("</header>",html.indexOf('<header class="topbar">')));
 const ids=["system-orb","greeting","current-date","desktop-area-refresh","refresh-app","demo-mode-toggle","theme-toggle"];
 for(const id of ids)assert.match(sidebar,new RegExp('id="'+id+'"'));
 assert.ok(sidebar.indexOf('id="system-orb"')<sidebar.indexOf('id="area-nav"'));
 assert.ok(header.indexOf('id="desktop-area-refresh"')<header.indexOf('id="demo-mode-toggle"'));
 assert.match(desktop,/\.desktop-brand-group #system-orb \{/);
 assert.match(desktop,/#system-orb > canvas \{/);
 assert.match(app,/toggleTheme/);
 assert.match(app,/toggleDemoMode/);
 assert.doesNotMatch(app,/installStickyTopbar|style\.setProperty\("--sc-fixed-navigation-height"/);
});
test("mobile retains its dedicated toolbar and normal scroll offsets",()=>{
 const mobile=readFileSync(new URL("./mobile-navigation.css",import.meta.url),"utf8");
 assert.match(mobile,/@media\(max-width:760px\)/);
 assert.match(mobile,/\.mobile-app-header\{/);
 assert.match(mobile,/body \.main-content>\.topbar\{display:none\}/);
 assert.doesNotMatch(desktop,/@media \(max-width:760px\)/);
});
test("recipe photos stay contained above their labels",()=>{
 assert.match(styles,/\.home-weekly-menu-table-cell \.home-menu-recipe-thumb img\s*\{[^}]*object-fit:\s*contain;/);
 assert.match(styles,/\.recipe-photo img\s*\{[^}]*object-fit:\s*contain;/);
 assert.match(styles,/\.home-weekly-menu-table-cell \.home-weekly-menu-recipe-link\s*\{[^}]*flex-direction:\s*column;/);
});
