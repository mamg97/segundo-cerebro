// Geometry for the private wedding floor plan; no guest data or network calls.
// Saved positions are centers in [0, 100] percent of the full canvas.
const percent=value=>Number.isFinite(value)?value:null;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function boundFloorPosition({x,y,stageWidth,stageHeight,tableWidth,tableHeight}){
 if([x,y,stageWidth,stageHeight,tableWidth,tableHeight].some(v=>percent(v)===null)||
    stageWidth<=0||stageHeight<=0||tableWidth<=0||tableHeight<=0)return null;
 // If a table exceeds the floor, retain its center; never create negative bounds.
 const marginX=Math.min(50,100*tableWidth/(2*stageWidth));
 const marginY=Math.min(50,100*tableHeight/(2*stageHeight));
 return {
  x:Number(clamp(x,marginX,100-marginX).toFixed(3)),
  y:Number(clamp(y,marginY,100-marginY).toFixed(3))
 };
}
export function moveFloorPosition(start,dx,dy,dimensions){
 const {stageWidth,stageHeight,tableWidth,tableHeight}=dimensions;
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(start?.x)||!Number.isFinite(start?.y)||
    stageWidth<=0||stageHeight<=0)return null;
 return boundFloorPosition({
  x:start.x+dx/stageWidth*100,
  y:start.y+dy/stageHeight*100,
  stageWidth,stageHeight,tableWidth,tableHeight
 });
}

/** Anchor a seat picker inside the *same dialog* as its seat.
 * All rectangles are in viewport coordinates; result is host-local CSS pixels.
 * This avoids Safari treating fixed descendants of modal dialogs as viewport-fixed.
 */
export function floorPopoverPlacement(anchor,host,{width=320,height=370,padding=8}={}){
 if(!anchor||!host||![anchor.left,anchor.right,anchor.top,host.left,host.top,host.width,host.height,
    width,height,padding].every(Number.isFinite)||host.width<=0||host.height<=0)return null;
 const actualWidth=Math.min(width,Math.max(0,host.width-2*padding));
 const actualHeight=Math.min(height,Math.max(0,host.height-2*padding));
 const right=anchor.right-host.left+padding;
 const left=anchor.left-host.left-actualWidth-padding;
 return {
  left:Math.round(clamp(right+actualWidth<=host.width-padding?right:left,
    padding,Math.max(padding,host.width-actualWidth-padding))),
  top:Math.round(clamp(anchor.top-host.top,padding,
    Math.max(padding,host.height-actualHeight-padding))),
  width:actualWidth
 };
}

export function floorDragStart(tile,stage,event){
 const stageRect=stage.getBoundingClientRect(),tileRect=tile.getBoundingClientRect();
 const x=Number.parseFloat(tile.style.left),y=Number.parseFloat(tile.style.top);
 if(!Number.isFinite(x)||!Number.isFinite(y)||!stageRect.width||!stageRect.height)return null;
 return {pointerId:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,
  start:{x,y},previous:{x,y},stageWidth:stageRect.width,stageHeight:stageRect.height,
  tableWidth:tileRect.width,tableHeight:tileRect.height,moved:false};
}
export function floorDragUpdate(drag,event){
 return moveFloorPosition(drag.start,event.clientX-drag.startClientX,event.clientY-drag.startClientY,drag);
}
