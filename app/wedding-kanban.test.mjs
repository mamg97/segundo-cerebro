import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {filteredWeddingItems} from "./wedding.js";

const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");

test("Kanban preserves D1 entries and filters by category and Spanish text",()=>{
 const items=[
  {id:"one",status:"idea",category:"finca",title:"Jardines de ejemplo",provider:"Proveedor A"},
  {id:"two",status:"pendiente",category:"tareas",title:"Llamar a proveedor",description:"Consulta"},
  {id:"three",status:"reservado",category:"catering",title:"Menú elegido"}
 ];
 assert.deepEqual(filteredWeddingItems(items).map(x=>x.id),["one","two","three"]);
 assert.deepEqual(filteredWeddingItems(items,"finca").map(x=>x.id),["one"]);
 assert.deepEqual(filteredWeddingItems(items,"all","proveedor").map(x=>x.id),["one","two"]);
 assert.deepEqual(filteredWeddingItems(items,"catering","menú").map(x=>x.id),["three"]);
 assert.deepEqual(items.map(x=>x.status),["idea","pendiente","reservado"]);
});

test("Kanban is the default shared view and old inspiration and budget tabs remain",()=>{
 assert.match(source,/view:"kanban"/);
 assert.match(source,/state\.view="kanban";state\.draftStatus="idea"/);
 assert.match(source,/\["kanban","Kanban"\]/);
 assert.match(source,/\["inspiracion","Inspiración"\]/);
 assert.match(source,/\["planificacion","Presupuesto"\]/);
 assert.match(source,/function inspirationCards\(/);
 assert.match(source,/function cards\(/);
 assert.match(source,/const all=sortWeddingItems\(filteredWeddingItems\(state\.items,state\.filter,state\.search\)/);
 assert.match(source,/STATUSES\.map\(\(\[status,label\]\)=>/);
});

test("Moving a card writes through existing D1 PATCH with revision and full fields",()=>{
 assert.match(source,/async function moveCard\(id,status\)/);
 assert.match(source,/getJson\("\/api\/wedding\/items\/"\+encodeURIComponent\(id\),"PATCH"/);
 assert.match(source,/revision:item\.revision/);
 assert.match(source,/estimateCents:item\.estimateCents\?\?null/);
 assert.match(source,/data-wed-drag/);
 assert.match(source,/dragstart/);
 assert.match(source,/data-wed-move/);
 assert.match(source,/data-wed-add-status/);
 assert.match(source,/function bindCards\(root\)/);
 assert.match(source,/sendPhoto\(item\.createdId,item\.file\)/);
});

test("Wedding refresh lives in the non-scrolling dialog header with correct asset versions",()=>{
 const header=html.slice(html.indexOf('<dialog id="detail-dialog"'),html.indexOf('<div id="dialog-body"'));
 assert.match(header,/id="wed-main-refresh"/);
 assert.match(header,/id="copy-area-link"/);
 assert.match(source,/async function refreshWedding\(/);
 assert.match(source,/id="wed-download-sheet"/);
 assert.match(source,/state\.editing\?editor\(\):home\(\)/);
 assert.doesNotMatch(source,/wed-dialog-controls|function weddingToolbar\(/);
 assert.match(css,/body\.route-area-active #detail-dialog\.wedding-dialog\[open\] > #wed-main-refresh:not/);
 assert.match(css,/\.wed-kanban\{[\s\S]*?overflow-x:auto/);
 assert.doesNotMatch(css,/overflow-y:auto/);
 assert.match(html,/wedding\.css\?v=0\.2\.12/);
 assert.match(html,/app\.js\?v=\d+\.\d+\.\d+/);
 assert.match(app,/wedding\.js\?v=0\.1\.21/);
});
