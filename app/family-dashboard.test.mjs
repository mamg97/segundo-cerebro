import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {familyDashboardTopics,renderFamilyDashboardView,FAMILY_DASH_TOPICS} from "./family-dashboard.mjs";
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("./family-dashboard.css",import.meta.url),"utf8");
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const money=v=>v.toFixed(2)+" €";
test("Family route uses a single guarded authenticated D1 and wealth dashboard instead of generic loops",()=>{
 assert.match(app,/if \(areaId === "area-family" && privateModeKind === "remote"\) \{\s*void openFamilyDashboard\(\)/);
 assert.match(app,/if\(privateModeKind!=="remote"\)return/);
 assert.match(app,/fetch\("\/api\/family\/cases",options\)/);
 assert.match(app,/fetch\("\/api\/family\/wealth",options\)/);
 assert.match(app,/cache:"no-store",credentials:"same-origin"/);
 assert.match(html,/family-dashboard\.css\?v=0\.1\.0/);
});
test("All eight topics exist without embedding private parents records in public source",()=>{
 assert.deepEqual(FAMILY_DASH_TOPICS.map(t=>t.id),["health","disability","retirement","business","property","mortgage","investment","admin"]);
 assert.doesNotMatch(css,/Palomas|Le[oó]n Felipe|eToro|ABANCA|incapacidad permanente/i);
});
test("Data is grouped by real source domain without double-counting, with all scope filters",()=>{
 const cases=[
  {id:"a",personScope:"mother",domain:"disability",title:"Caso A",nextAction:"Seguimiento",status:"WAITING_EXTERNAL",priority:"high"},
  {id:"b",personScope:"father",domain:"business",title:"Caso B",status:"ACTIVE"},
  {id:"c",personScope:"shared",domain:"mortgage",title:"Caso C",status:"DECISION_OPEN"}
 ];
 const wealth=[{id:"w",ownerScope:"shared",category:"property",label:"Inmueble A",amountEur:null,valuationStatus:"pending"}];
 const all=familyDashboardTopics(cases,wealth);
 assert.equal(all.find(t=>t.id==="property").wealthItems.length,1);
 assert.equal(all.reduce((s,t)=>s+t.cases.length,0),3);
 assert.equal(familyDashboardTopics(cases,wealth,"mother").reduce((s,t)=>s+t.cases.length,0),1);
 assert.equal(familyDashboardTopics(cases,wealth,"father").find(t=>t.id==="business").cases.length,1);
 assert.equal(familyDashboardTopics(cases,wealth,"shared").find(t=>t.id==="property").wealthItems.length,1);
 const markup=renderFamilyDashboardView({cases,wealth:{items:wealth,summary:{grossAssets:0,liabilities:0,netKnown:0,incomplete:true}},esc,money});
 assert.match(markup,/Caso A/);
 assert.match(markup,/data-family-dashboard-case="a"/);
 assert.match(markup,/Pendiente de valorar/);
 assert.match(markup,/Ver desglose y editar partidas/);
});
test("Empty and partial failures never pretend unknown wealth is zero or expose unsanitized case labels",()=>{
 const html=renderFamilyDashboardView({cases:[{id:"<unsafe>",personScope:"mother",domain:"health",title:"<sensitive>",status:"ACTIVE"}],
  casesAvailable:false,wealthAvailable:false,esc,money});
 assert.doesNotMatch(html,/<sensitive>|data-family-dashboard-case="<unsafe>"/);
 assert.match(html,/&lt;sensitive&gt;/);
 assert.match(html,/datos de casos no están verificados/i);
 assert.match(html,/No se ha podido consultar el patrimonio/);
 assert.doesNotMatch(html,/0,00 €/);
});
test("Phone CSS shows two cards per row and avoids horizontal overflow",()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.family-dash-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-width:0/);
});
