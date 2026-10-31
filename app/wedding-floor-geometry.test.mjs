import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {boundFloorPosition,moveFloorPosition,floorDragStart,floorDragUpdate} from "./wedding-floor-geometry.mjs";
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
test("drag handler verifies API write and avoids offset-based coordinates",()=>{
 const script=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
 assert.match(script,/floorDragStart\(tile,stage,event\)/);
 assert.match(script,/floorDragUpdate\(drag,event\)/);
 assert.match(script,/positionX:point\.x,positionY:point\.y/);
 assert.match(script,/POSITION_NOT_SAVED/);
 assert.doesNotMatch(script,/tile\.offsetLeft|tile\.offsetTop/);
 assert.match(script,/pointercancel/);
 assert.match(script,/setPointerCapture/);
});
