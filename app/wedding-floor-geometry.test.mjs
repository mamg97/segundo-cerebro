import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {boundFloorPosition,moveFloorPosition,floorDragStart,floorDragUpdate,floorPopoverPlacement} from "./wedding-floor-geometry.mjs";
const dimensions={stageWidth:1200,stageHeight:550,tableWidth:352,tableHeight:368};

test("dragging a centered table never jumps to the top-left corner",()=>{
 const start={x:50,y:50};
 assert.deepEqual(moveFloorPosition(start,0,0,dimensions),start);
 assert.deepEqual(moveFloorPosition(start,240,0,dimensions),{x:70,y:50});
 assert.deepEqual(moveFloorPosition(start,0,50,dimensions),{x:50,y:59.091});
});
test("simulated pointer drag saves the same center after reload, independent of CSS transform",()=>{
 const tile={
  style:{left:"50.000%",top:"50.000%"},
  get offsetLeft(){throw new Error("offsetLeft must not be used for transformed center");},
  get offsetTop(){throw new Error("offsetTop must not be used for transformed center");},
  getBoundingClientRect:()=>({width:352,height:368,left:424,top:91})
 };
 const stage={getBoundingClientRect:()=>({width:1200,height:550,left:100,top:50})};
 const down=floorDragStart(tile,stage,{pointerId:7,clientX:620,clientY:260});
 assert.equal(down.pointerId,7);
 const position=floorDragUpdate(down,{clientX:860,clientY:260});
 assert.deepEqual(position,{x:70,y:50});
 const afterReload=boundFloorPosition({...dimensions,...position});
 assert.deepEqual(afterReload,position);
});
test("boundary clamps are centered and scale to actual table size",()=>{
 const start={x:50,y:50};
 const left=moveFloorPosition(start,-2000,-2000,dimensions);
 assert.deepEqual(left,{x:14.667,y:33.455});
 const right=moveFloorPosition(start,2000,2000,dimensions);
 assert.deepEqual(right,{x:85.333,y:66.545});
 const atDifferentScale=moveFloorPosition(start,120,55,{...dimensions,stageWidth:600,stageHeight:275,tableWidth:176,tableHeight:184});
 assert.deepEqual(atDifferentScale,{x:70,y:66.545});
 assert.equal(moveFloorPosition(start,20,20,{...dimensions,stageWidth:0}),null);
 assert.equal(moveFloorPosition({x:NaN,y:50},20,20,dimensions),null);
});
test("seat picker is positioned in dialog-local coordinates and clamped on both axes",()=>{
 const host={left:120,top:64,width:1160,height:730};
 const rightSeat={left:1210,right:1235,top:760};
 assert.deepEqual(floorPopoverPlacement(rightSeat,host),{left:762,top:352,width:320});
 const leftSeat={left:170,right:190,top:100};
 assert.deepEqual(floorPopoverPlacement(leftSeat,host),{left:78,top:36,width:320});
 const narrow={left:0,top:0,width:280,height:420};
 assert.deepEqual(floorPopoverPlacement({left:250,right:275,top:370},narrow),
  {left:8,top:42,width:264});
 assert.equal(floorPopoverPlacement(leftSeat,{...host,width:0}),null);
});
test("table selection is non-destructive and Safari pointer moves are frame-coalesced",()=>{
 const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 const select=source.match(/const select=id=>\\{([\\s\\S]*?)\\n \\};/)?.[1]||"";
 assert.doesNotMatch(select,/show\(\)/);
 assert.match(source,/const scheduleDrag=\(\)=>/);
 assert.match(source,/if\(drag\?\.dimensions\)return drag\.dimensions/);
 assert.match(source,/suppressClickUntil=performance\.now\(\)\+550/);
 const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
 assert.match(css,/\.wed-table-inspector\{[\s\S]*?position:absolute/);
 assert.match(css,/\.wed-seat-popover\{[\s\S]*?position:absolute/);
});
test("drag handler verifies API write and avoids offset-based coordinates",()=>{
 const script=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(script,/tile\.style\.transform="none"/);
 assert.match(script,/moveFloorPosition\(drag\.start,dx,dy,dimensions\(\)\)/);
 assert.match(script,/positionX:point\.x,positionY:point\.y/);
 assert.match(script,/POSITION_NOT_SAVED/);
 assert.doesNotMatch(script,/tile\.offsetLeft|tile\.offsetTop/);
 assert.match(script,/pointercancel/);
 assert.match(script,/setPointerCapture/);
});

test("expanded wedding work surface allows distant table placement without changing data schema",()=>{
 const old={stageWidth:1980,stageHeight:390,tableWidth:640,tableHeight:330};
 const large={stageWidth:3600,stageHeight:2200,tableWidth:640,tableHeight:330};
 const start={x:50,y:50};
 const before=moveFloorPosition(start,0,780,old);
 const after=moveFloorPosition(start,0,780,large);
 assert.ok(before.y<60,"short canvas previously prevented movement far downward");
 assert.ok(after.y>80,"expanded canvas permits movement far downward");
 assert.deepEqual(moveFloorPosition(start,850,0,large),{x:73.611,y:50});
 assert.deepEqual(boundFloorPosition({...large,x:80,y:80}),{x:80,y:80});
 const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
 assert.match(css,/Wedding floor v10: fixed logical workspace/);
 assert.match(css,/min-width:max\(3600px,calc\(var\(--wed-floor-columns,1\)\*780px\)\)/);
 assert.match(css,/min-height:2200px !important/);
 assert.match(css,/overflow-y:auto !important/);
 const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(source,/const stepAutoPan=\(\)=>/);
 assert.match(source,/scroll\.scrollLeft\+=sx;scroll\.scrollTop\+=sy/);
 assert.match(source,/startStageLeft:rect\.left,startStageTop:rect\.top/);
 assert.match(source,/drag\.startStageLeft-rect\.left/);
 assert.match(source,/100\*zoom/);
 assert.match(source,/viewport\.scrollLeft\+=tr\.left/);
 assert.match(source,/cancelAnimationFrame\(complete\.panFrame\)/);
 assert.doesNotMatch(source,/const zoom=Math\.max\(\.5,Math\.min\(1\.6/);
});
