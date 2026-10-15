import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("./styles.css",import.meta.url),"utf8");
const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const a=app.indexOf("function installStickyTopbar() {");
const b=app.indexOf("function renderMode() {",a);
assert.ok(a>0 && b>a);
const fn=app.slice(a,b);

test("sticky topbar offset tracks real responsive navigation height without polling", () => {
  let height=58,observer;
  const state={css:""};
  const navigation={getBoundingClientRect(){return {height}}};
  const root={style:{setProperty(name,value){assert.equal(name,"--sc-fixed-navigation-height");state.css=value}}};
  class FakeResizeObserver{constructor(cb){this.cb=cb;observer=this}observe(n){assert.equal(n,navigation)}}
  const sandbox={document:{querySelector:q=>q===".app-shell > .sidebar"?navigation:null,documentElement:root},ResizeObserver:FakeResizeObserver,window:{addEventListener(){throw Error("unneeded fallback")}},Math};
  vm.createContext(sandbox);
  vm.runInContext(fn+"installStickyTopbar();",sandbox);
  assert.equal(state.css,"58px");
  height=86;observer.cb();assert.equal(state.css,"86px");
});

test("refresh, theme and demo share pinned header without independent mobile button", () => {
  const content=html.slice(html.indexOf('<header class="topbar">'),html.indexOf('</header>',html.indexOf('<header class="topbar">')));
  assert.ok(content.indexOf('id="refresh-app"')<content.indexOf('id="demo-mode-toggle"'));
  assert.ok(content.indexOf('id="demo-mode-toggle"')<content.indexOf('id="theme-toggle"'));
  assert.match(styles,/\.topbar\s*\{\s*position: -webkit-sticky;\s*position: sticky;/);
  assert.match(styles,/top: var\(--sc-fixed-navigation-height, 58px\)/);
  assert.match(styles,/#refresh-app\.refresh-app\s*\{\s*position: static !important;/);
  assert.match(app,/installStickyTopbar\(\);\s*renderDailyOverview\(\)/);
  assert.doesNotMatch(fn,/setInterval/);
});

test("menu recipe photo is displayed with contain and the original is never cropped in CSS",()=>{
  assert.match(styles,/\.home-weekly-menu-table-cell \.home-menu-recipe-thumb img\s*\{[^}]*object-fit:\s*contain;/);
  assert.match(styles,/\.recipe-photo img\s*\{[^}]*object-fit:\s*contain;/);
  assert.match(styles,/\.home-weekly-menu-table-cell \.home-weekly-menu-recipe-link\s*\{[^}]*flex-direction:\s*column;/);
});
