import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WEDDING_ASSIGNEES,weddingAssigneeLabel} from "./wedding-assignees.js";
import {renderAgenda} from "./wedding-planner-ui.js";
import {filteredWeddingItems} from "./wedding.js";
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
test("wedding owner labels are stable, visible in agenda, and searchable",()=>{
 assert.deepEqual(WEDDING_ASSIGNEES.map(x=>x[0]),["","miguel","andrea","otro"]);
 assert.equal(weddingAssigneeLabel({}),"Sin asignar");
 assert.equal(weddingAssigneeLabel({assigneeKind:"miguel"}),"Miguel");
 assert.equal(weddingAssigneeLabel({assigneeKind:"andrea"}),"Andrea");
 assert.equal(weddingAssigneeLabel({assigneeKind:"otro",assigneeName:"Amigo de prueba"}),"Amigo de prueba");
 const tasks=[
  {id:"1",title:"Llamar al fotógrafo",category:"tareas",status:"pendiente",assigneeKind:"miguel"},
  {id:"2",title:"Probar catering",category:"tareas",status:"pendiente",assigneeKind:"otro",assigneeName:"Amigo de prueba"}];
 assert.match(renderAgenda(tasks,esc),/Responsable: Miguel/);
 assert.match(renderAgenda(tasks,esc),/Responsable: Amigo de prueba/);
 assert.deepEqual(filteredWeddingItems(tasks,"all","Miguel").map(i=>i.id),["1"]);
});
test("editor persists assignee; status moves keep it without erasing responsible person",()=>{
 assert.match(source,/name="assigneeKind"/);
 assert.match(source,/name="assigneeName"/);
 assert.match(source,/assigneeChoice\.value==="otro"/);
 assert.match(source,/otherInput\.required=isOther/);
 assert.match(source,/assigneeKind:data\.get\("assigneeKind"\)\|\|""/);
 assert.match(source,/assigneeName:data\.get\("assigneeKind"\)==="otro"/);
 assert.match(source,/assigneeKind:item\.assigneeKind\|\|""/);
 assert.match(source,/assigneeName:item\.assigneeName\|\|""/);
 assert.match(source,/weddingAssigneeLabel\(item\)/);
 assert.match(css,/\.wed-assignee/);
 assert.match(css,/\.wed-form-grid \[hidden\]\{display:none!important\}/);
});
test("refresh belongs to the persistent Boda header beside Share, not scrollable tabs",()=>{
 const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.match(source,/async function refreshWedding\(/);
 assert.match(source,/id="wed-download-sheet"/);
 assert.match(source,/state\.editing\?editor\(\):home\(\)/);
 assert.doesNotMatch(source,/function weddingToolbar\(|wed-dialog-controls/);
 const start=html.indexOf('<dialog id="detail-dialog"');
 const finish=html.indexOf('<div id="dialog-body"',start);
 assert.ok(start>=0&&finish>start);
 const header=html.slice(start,finish);
 assert.ok(header.indexOf('id="wed-main-refresh"')>=0);
 assert.ok(header.indexOf('id="wed-main-refresh"')<header.indexOf('id="copy-area-link"'));
 assert.equal((html.match(/id="wed-main-refresh"/g)||[]).length,1);
 assert.match(source,/refreshButton\.onclick=\(\)=>void refreshWedding\(\)/);
 assert.match(app,/if\(weddingRefresh\)weddingRefresh\.hidden=true/);
 assert.match(css,/#wed-main-refresh\[hidden\]\{display:none!important\}/);
 assert.match(css,/body\.route-area-active #detail-dialog\.wedding-dialog\[open\] > #wed-main-refresh:not\(\[hidden\]\)\{/);
 assert.match(css,/position:absolute;top:13px;right:260px/);
});
test("all cards including supplier and inspiration show unassigned responsibility",()=>{
 assert.match(source,/'<span class="wed-assignee" aria-label="Responsable: '\+esc\(weddingAssigneeLabel\(item\)\)/);
 assert.match(source,/'<span class="wed-assignee">Responsable: '\+esc\(weddingAssigneeLabel\(i\)\)/);
 assert.doesNotMatch(source,/item\.assigneeKind\|\|item\.category==="tareas"\?/);
 assert.doesNotMatch(source,/i\.assigneeKind\|\|i\.category==="tareas"\?/);
});
test("Kanban moves cards by grabbing title, not controls on the whole card",()=>{
 assert.match(source,/class="wed-kanban-drag-handle" draggable="true" data-wed-drag=/);
 assert.match(source,/data-wed-card/);
 assert.match(source,/event\.dataTransfer\.setData\("text\/plain",handle\.dataset\.wedDrag\)/);
 assert.match(source,/column\.addEventListener\("drop"/);
 assert.match(source,/board\.scrollLeft\+=18/);
 assert.doesNotMatch(source,/class="wed-kanban-card" draggable="true"/);
 assert.match(css,/\.wed-kanban-drag-handle\{/);
 assert.match(css,/\.wed-kanban-card\.wed-dragging\{/);
});
