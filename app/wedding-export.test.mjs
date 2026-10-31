import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildWeddingExport,createWeddingXlsx,WEDDING_EXPORT_TABS} from "./wedding-export.js";
const source=readFileSync(new URL("./wedding.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./wedding.css",import.meta.url),"utf8");
const apiItems=readFileSync(new URL("../private-cloudflare/src/wedding-store.js",import.meta.url),"utf8");
const apiPlanner=readFileSync(new URL("../private-cloudflare/src/wedding-planner-store.js",import.meta.url),"utf8");

const now=new Date("2026-10-31T12:00:00Z");
const items=[
 {id:"item1",category:"tareas",status:"pendiente",title:"=2+2",description:"No ejecutar fórmula",
  assigneeKind:"andrea",estimateCents:5000,updatedAt:now.toISOString()},
 {id:"item2",category:"fotografia",status:"descartado",title:"Fotógrafo",provider:"Prove&edor",
  contractedCents:100000,paidCents:25000,url:"https://www.bodas.net/foo",photoUrl:"/api/wedding/items/item2/photo"},
 {id:"item3",category:"finca",status:"idea",title:"Una finca",estimateCents:150000},
 {id:"item4",category:"ideas",status:"idea",title:"Decoración",url:"https://example.com/pin"}
];
const guests=[
 {id:"g1",name:"Persona A",groupName:"pareja",rsvp:"confirmado",tableId:"t1",dietaryNotes:"Sin gluten",email:"a@example.test"},
 {id:"g2",name:"Persona B",groupName:"padres_andrea",rsvp:"pendiente",tableId:null},
 {id:"g3",name:"Persona C",groupName:"grupo antiguo",rsvp:"pendiente",tableId:null}
];
const tables=[{id:"t1",name:"Mesa 1",capacity:8,shape:"redonda",revision:1}];
const ctx={origin:"https://segundo.example",now};
const data={items,guests,tables};

function zipFiles(binary){
 const names=new Map(),v=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
 let i=0;
 while(i+4<=binary.length&&v.getUint32(i,true)===0x04034B50){
  const size=v.getUint32(i+18,true),namelen=v.getUint16(i+26,true),extra=v.getUint16(i+28,true);
  const name=new TextDecoder().decode(binary.slice(i+30,i+30+namelen));
  const content=binary.slice(i+30+namelen+extra,i+30+namelen+extra+size);
  names.set(name,new TextDecoder().decode(content));
  i+=30+namelen+extra+size;
 }
 assert.equal(v.getUint32(i,true),0x02014B50,"valid ZIP central directory");
 return names;
}
test("all 8 wedding tabs produce a real XLSX with separate workbook sheets",()=>{
 assert.deepEqual(Object.keys(WEDDING_EXPORT_TABS),[
 "kanban","agenda","proveedores","invitados","mesas","planificacion","inspiracion","bodasnet"]);
 for(const view of Object.keys(WEDDING_EXPORT_TABS)){
  const model=buildWeddingExport(view,data,ctx);
  assert.match(model.filename,/^Boda_[a-z]+_2026-10-31\.xlsx$/);
  assert.ok(model.sheets.length>=2);
  const binary=createWeddingXlsx(model.sheets);
  assert.equal(binary[0],80);assert.equal(binary[1],75);
  const parts=zipFiles(binary);
  assert.ok(parts.has("[Content_Types].xml"));
  assert.ok(parts.has("xl/workbook.xml"));
  assert.ok(parts.has("xl/_rels/workbook.xml.rels"));
  assert.ok(parts.has("xl/styles.xml"));
  assert.ok(parts.has("xl/worksheets/sheet1.xml"));
  assert.match(parts.get("xl/worksheets/sheet1.xml"),/autoFilter/);
  assert.match(parts.get("xl/worksheets/sheet1.xml"),/t="inlineStr"/);
 }
});
test("guest workbook separates 3 families and legacy group, preserving full details",()=>{
 const model=buildWeddingExport("invitados",data,ctx);
 assert.deepEqual(model.sheets.map(x=>x.name),[
  "Todos","Invitados Andrea y Miguel","Invitados padres Miguel",
  "Invitados padres Andrea","Sin clasificar","Información"]);
 assert.equal(model.sheets[0].records.length,3);
 assert.equal(model.sheets[2].records.length,0);
 assert.equal(model.sheets[4].records.length,1);
 const parts=zipFiles(createWeddingXlsx(model.sheets));
 assert.match(parts.get("xl/worksheets/sheet1.xml"),/Sin gluten/);
 assert.match(parts.get("xl/worksheets/sheet1.xml"),/a@example.test/);
 assert.equal(model.sensitive,true);
});
test("budgets use numeric EUR cells without dropping discarded entries",()=>{
 const model=buildWeddingExport("planificacion",data,ctx);
 assert.deepEqual(model.sheets.map(x=>x.name),["Resumen","Partidas","Información"]);
 assert.equal(model.sheets[1].records.length,4);
 assert.deepEqual(model.sheets[0].records[0],["Planificado (contratado o estimado)",{currency:1550}]);
 const parts=zipFiles(createWeddingXlsx(model.sheets));
 assert.match(parts.get("xl/worksheets/sheet1.xml"),/s="2"><v>1550.00<\/v>/);
 assert.match(parts.get("xl/worksheets/sheet2.xml"),/descartado/);
});
test("Excel cannot execute strings beginning with spreadsheet formulas",()=>{
 const sheets=buildWeddingExport("kanban",data,ctx).sheets;
 const contents=zipFiles(createWeddingXlsx(sheets)).get("xl/worksheets/sheet1.xml");
 assert.match(contents,/>=2\+2<\/t>/);
 assert.doesNotMatch(contents,/<f[ >]/);
 assert.match(contents,/Prove&amp;edor/);
 assert.match(contents,/https:\/\/segundo\.example\/api\/wedding\/items\/item2\/photo/);
});
test("export pulls unfiltered complete private pages and handles sensitive data",()=>{
 assert.match(source,/id="wed-download-sheet"/);
 assert.match(source,/async function downloadWeddingSheet\(/);
 assert.match(source,/\?export=1&offset=/);
 assert.match(source,/if\(!page\.hasMore\)return all/);
 assert.match(source,/error\.message==="EXPORT_INCOMPLETE"/);
 assert.match(source,/new Blob\(\[buffer\]/);
 assert.match(source,/window\.confirm\("Este Excel incluye nombres/);
 assert.match(css,/#wed-download-sheet/);
 assert.match(apiItems,/LIMIT 501 OFFSET \?/);
 assert.match(apiPlanner,/LIMIT 501 OFFSET \?/);
 assert.match(apiItems,/url\.searchParams\.get\("export"\)==="1"/);
 assert.match(apiPlanner,/url\.searchParams\.get\("export"\)==="1"/);
});
