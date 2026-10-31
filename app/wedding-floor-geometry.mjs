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
