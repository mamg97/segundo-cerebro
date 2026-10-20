import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css=readFileSync(new URL("./travels.css",import.meta.url),"utf8");
const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const travels=readFileSync(new URL("./travels.js",import.meta.url),"utf8");

test("Viajes uses the viewport rather than the shared 920px modal limit",()=>{
  const begin=css.indexOf(".detail-dialog.travels-dialog[open]{");
  assert.ok(begin>=0,"fullscreen selector present");
  const block=css.slice(begin,css.indexOf("}",begin)+1);
  for(const rule of ["width:100vw;","height:100dvh;","max-width:none;","max-height:none;","display:flex;","flex-direction:column;","overflow:hidden;","margin:0;"]){
    assert.ok(block.includes(rule),rule);
  }
  assert.match(css,/\.detail-dialog\.travels-dialog\[open\] #dialog-body\s*\{[\s\S]*?min-height:0;[\s\S]*?max-height:none;[\s\S]*?overflow-y:auto;/);
  assert.match(index,/href="\.\/travels\.css\?v=0\.3\.0"/);
});
test("map and tasks fill a responsive two-column workspace and avoid nested task scroll",()=>{
  assert.match(css,/\.detail-dialog\.travels-dialog\[open\] \.trv-dash-lead\s*\{[\s\S]*?grid-template-columns:minmax\(0,1\.5fr\) minmax\(360px,1fr\)/);
  assert.match(css,/\.detail-dialog\.travels-dialog\[open\] \.trv-dash-lead #trv-dash-tasks \.trv-tasks\s*\{[\s\S]*?max-height:none;[\s\S]*?overflow:visible;/);
  assert.match(css,/@media\(max-width:960px\)/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/safe-area-inset-top/);
  assert.match(css,/\.trv-map-canvas iframe\s*\{[\s\S]*?height:clamp\(330px,48vh,560px\)/);
});
test("Other workspaces cannot inherit the fullscreen Travel state",()=>{
  assert.match(css,/\.detail-dialog\.travels-dialog\[open\]/);
  assert.match(travels,/dialog\.addEventListener\("close", \(\) => dialog\.classList\.remove\("travels-dialog"\)\)/);
  assert.doesNotMatch(css,/\.detail-dialog\[open\]\s*\{\s*width:100vw/);
});
