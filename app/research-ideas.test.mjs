import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ideaGraph,renderIdeaNetwork} from "./research-ideas.mjs";
const base={id:"prj-psicohistoria"};
const example={id:"test-applied-1",parentId:base.id,type:"Aplicación de investigación",name:"Prueba <script>insegura</script>",
 status:"ACTIVO",summary:'<img src=x onerror=alert(1)>',docsStatus:"PARCIAL",
 nextAction:"Validar as-of",docsUrl:"javascript:alert(1)"};
test("only canonically registered applied children, never invented results",()=>{
 const x=ideaGraph({projects:[base,example,{...example,id:"subV2",type:"Modelo estructural"}]});
 assert.equal(x.branches.length,1);
 assert.match(renderIdeaNetwork({projects:[base,example]}),/Validar as-of/);
 assert.doesNotMatch(renderIdeaNetwork({projects:[base,example]}),/<script>|<img|href="javascript/);
});
test("without private API data, explicitly fail closed",()=>{
 const html=renderIdeaNetwork(null);
 assert.match(html,/Sin líneas de aplicación registradas/);
 assert.doesNotMatch(html,/65 %|Probabilidad estimada/);
});
test("synergies must reference catalogued projects and be HTML escaped",()=>{
 const other={id:"sub-2",name:"V2 research"};
 const graph=ideaGraph({projects:[base,example,other],relations:[{
 sourceProjectId:example.id,target:other.id,targetType:"PROYECTO",type:"REUTILIZA_METODO_DE",
 description:"<b>ficticio</b>"},{sourceProjectId:"missing",target:other.id,targetType:"PROYECTO",type:"foo"}]});
 assert.equal(graph.edges.length,1);
 const h=renderIdeaNetwork({projects:[base,example,other],relations:[{
 sourceProjectId:example.id,target:other.id,targetType:"PROYECTO",type:"REUTILIZA_METODO_DE",description:"<b>ficticio</b>"}]});
 assert.match(h,/&lt;b&gt;ficticio&lt;\/b&gt;/);
 assert.doesNotMatch(h,/<b>ficticio<\/b>/);
});
test("link allowlist and integration with real private tab",()=>{
 const a={...example,docsUrl:"https://github.com/example/repo/blob/main/README.md"};
 assert.match(renderIdeaNetwork({projects:[base,a]}),/rel="noopener noreferrer"/);
 const html=readFileSync(new URL("./research-lab.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("./research-lab.js",import.meta.url),"utf8");
 assert.match(html,/data-view="ideas">Ideas y sinergias/);
 assert.match(js,/renderIdeaNetwork\(state\)/);
 assert.match(js,/relations:projectsPayload\.relations/);
 assert.match(js,/AVAILABLE_VIEWS/);
});
