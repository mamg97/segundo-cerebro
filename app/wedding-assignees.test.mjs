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
test("wedding refresh is inside sticky main section navigation, including editor mode",()=>{
 assert.match(source,/function weddingToolbar\(/);
 assert.match(source,/weddingToolbar\(\)\+\(state\.editing\?editor\(\):home\(\)\)/);
 assert.match(source,/id="wed-main-refresh"/);
 assert.match(source,/class="wed-dialog-controls"/);
 assert.doesNotMatch(source,/function refreshBar\(|wed-fixed-actions/);
 assert.match(css,/\.wedding-dialog \.wed-dialog-controls\{[\s\S]*?position:sticky;top:0/);
 assert.match(css,/\.wedding-dialog \.wed-dialog-controls \.wed-view-tabs\{/);
 assert.match(css,/\.wedding-dialog \.wed-main-refresh\{/);
 assert.match(source,/clearQuickFiles\(\);state\.view=button\.dataset\.wedView/);
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
