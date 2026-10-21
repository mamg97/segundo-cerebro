import assert from "node:assert/strict";
import test from "node:test";
import { assessAuditDialogGeometry as assess } from "./audit-dialog-geometry.js";

test("route and travel full-screen dialogs fit edge to edge without false alarms", () => {
  for (const viewport of [320,390,768,1440]) {
    const full = assess({width:viewport,left:0,right:viewport,viewportWidth:viewport,intentionalFullscreen:true});
    assert.equal(full.ok,true,String(viewport));
    assert.deepEqual(full.codes,[]);
  }
});

test("a genuine one-pixel overflow still fails an intentional fullscreen", () => {
  const out = assess({width:394,left:0,right:394,viewportWidth:390,intentionalFullscreen:true});
  assert.equal(out.ok,false);
  assert.deepEqual(out.codes,["DIALOG_BOX_TOO_WIDE","DIALOG_RIGHT_OFFSCREEN"]);
});

test("an ordinary dialog must leave its width gutter", () => {
  const full = assess({width:390,left:0,right:390,viewportWidth:390,intentionalFullscreen:false});
  assert.equal(full.ok,false);
  assert.deepEqual(full.codes,["DIALOG_BOX_TOO_WIDE"]);
  const inset = assess({width:374,left:8,right:382,viewportWidth:390,intentionalFullscreen:false});
  assert.equal(inset.ok,true);
});

test("all dialogs reject real off-screen edges and invalid geometry", () => {
  const negative = assess({width:360,left:-8,right:352,viewportWidth:390,intentionalFullscreen:true});
  assert.equal(negative.ok,false);
  assert.ok(negative.codes.includes("DIALOG_LEFT_OFFSCREEN"));
  assert.equal(assess({width:NaN,left:0,right:0,viewportWidth:390}).ok,false);
  assert.equal(assess(null).ok,true);
});
