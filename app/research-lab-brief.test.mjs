import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {briefingFacts,renderResearchBriefing,POLICY} from "./research-lab-brief.mjs";

const syntheticId=["mock","sheet","alpha","2027"].join("-");
const example={id:"ucdp261-2027-mobile-private-ranking-20261020",
  track:"V2",status:"SHADOW_NO_EMITIDO",metric:"paises_ranqueados_sin_emision",
  value:196,datasetVersion:"UCDP OrganizedViolenceCY 26.1",
  evidence:"https://docs.google.com/spreadsheets/d/"+syntheticId+"/edit"};
const lab=(overrides={})=>({
  experiments:[example],predictions:[],evaluation:{resolved:0},...overrides
});
const before=new Date("2026-10-20T12:00:00Z");
test("first glance shows real shadow, NO predictive skill and clear 2027 meaning",()=>{
  const x=briefingFacts(lab(),before);
  assert.equal(x.countryCount,196);
  assert.equal(x.modelCount,6);
  assert.equal(x.forecastCount,1176);
  assert.equal(x.issued,0);
  assert.equal(x.resolved,0);
  assert.ok(x.remaining>60&&x.remaining<90);
  const html=renderResearchBriefing(lab(),before);
  for(const label of ["Qué sabemos. Qué falta. Qué sigue.","Comentarios estratégicos",
    "2027 ya se puede explorar","Aún sin resultados prospectivos",
    "Ver riesgos de 2027","¿Funcionan los modelos?","Ver mapa del proyecto",
    "No es una predicción del comienzo de una guerra."])
    assert.ok(html.includes(label),label);
  assert.ok(!html.includes(syntheticId));
  assert.ok(!html.includes(example.evidence));
  assert.ok(!html.includes("<script"));
});
test("missing data never invents observed country or model counts",()=>{
  const html=renderResearchBriefing({experiments:[],predictions:[],evaluation:{}},before);
  assert.match(html,/Ranking no disponible/);
  assert.doesNotMatch(html,/2027 ya se puede explorar/);
  const f=briefingFacts(null,before);
  assert.equal(f.forecastCount,0);assert.equal(f.countryCount,0);
});
test("wrong edited version, ambiguous or declared issued shadow is rejected",()=>{
  for(const experiments of [
    [{...example,status:"ISSUED"}],
    [example,example],
    [{...example,value:195}],
    [{...example,evidence:"https://attacker.invalid/sheet"}],
  ]){
    assert.equal(briefingFacts(lab({experiments}),before).shadow,false);
  }
});
test("time horizon is truthful before and after 2027 without fake delivery promise",()=>{
  assert.equal(POLICY.firstScoreYear,2028);
  const html=renderResearchBriefing(lab(),new Date("2027-02-01T00:00:00Z"));
  assert.match(html,/El plazo de emisión anterior a 2027 ya pasó/);
  assert.match(html,/En 2028 \(orientativo\)/);
  assert.match(html,/sin fecha científica/i);
  assert.ok(!html.includes("72 días"));
});
test("dynamic counts do not pretend that emissions prove scientific skill",()=>{
  const html=renderResearchBriefing(lab({predictions:[{status:"EMITIDA"}],evaluation:{resolved:0}}),before);
  assert.match(html,/1 registros de emisión · revisar estado/);
  assert.match(html,/Aún sin resultados prospectivos/);
  assert.match(html,/Estado científico: todavía no validado/);
});
test("integration has a genuinely default quick-start home and wired view buttons",()=>{
  const js=readFileSync(new URL("./research-lab.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("./research-lab.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("./research-lab.css",import.meta.url),"utf8");
  assert.match(js,/let activeView="brief";/);
  assert.match(js,/renderResearchBriefing\(state\.lab\)/);
  assert.match(js,/data-brief-go/);
  assert.match(js,/AVAILABLE_VIEWS\.has\(view\)/);
  assert.match(html,/data-view="brief" class="active">Inicio/);
  assert.match(html,/data-view="shadow2027">Riesgos 2027/);
  assert.match(css,/\.brief-summary-grid/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.doesNotMatch(js,/style\s*=/i);
  assert.match(html,/noindex,nofollow,noarchive/);
});
test("strategic brief uses only fixed non-sensitive text and escapes visible counts",()=>{
  const html=renderResearchBriefing(lab({evaluation:{resolved:1}}),before);
  assert.match(html,/1 resultados evaluables/);
  assert.doesNotMatch(html,/CF-Access-Jwt|Authorization|fakeId|syntheticId/);
});

test("monochrome lab theme remains accessible, responsive and scientifically honest",()=>{
  const html=readFileSync(new URL("./research-lab.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("./research-lab-monochrome.css",import.meta.url),"utf8");
  assert.match(html,/research-lab-monochrome/);
  assert.match(html,/noindex,nofollow,noarchive/);
  assert.match(html,/id="view"/);
  assert.match(html,/id="headline-metrics"/);
  assert.match(html,/class="hero-mark" aria-hidden="true"/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/overflow-x:auto/);
  assert.match(css,/@media/);
  assert.match(css,/--base:#05070a/);
  assert.doesNotMatch(css,/@import/);
  assert.doesNotMatch(html,/style=/);
  assert.ok(!html.includes("PsicoPredicciones"));
});

test("laboratory uses the full viewport while preserving mobile and chart layouts",()=>{
  const html=readFileSync(new URL("./research-lab.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("./research-lab-monochrome.css",import.meta.url),"utf8");
  assert.match(html,/research-lab-monochrome\.css\?v=0\.5\.22/);
  assert.match(css,/\.app-frame\{width:100%;max-width:none;margin:0/);
  assert.match(css,/main,#view\{min-width:0;width:100%\}/);
  assert.match(css,/grid-template-columns:minmax\(0,1\.9fr\) minmax\(210px,\.65fr\)/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/display:block;min-height:175px/);
  assert.doesNotMatch(css,/\.app-frame\{max-width:1540px/);
  assert.doesNotMatch(css,/@import|url\(https?:/);
});

const annualFixture=()=>({progress:{status:'ok',phases:[{fase_id:'MAD-05',estado:'COMPLETADA',criterio_superado:'SI'}]},predictions:Array.from({length:196},(_,country)=>Array.from({length:6},(_,model)=>({id:`synthetic-${country}-${model}`,region:`synthetic-country-${country}`,modelVersion:`ucdp261-2027-synthetic-${model}`,horizon:'Calendar year 2027',status:'EMITIDA_EXPERIMENTAL',probability:0.2,issuedAt:'2026-10-27',asOf:'2026-10-26'}))).flat()});
test('complete registered cohort changes next action without claiming skill, including after deadline',()=>{
  for(const now of [before,new Date('2027-02-01')]){
    const html=renderResearchBriefing(lab(annualFixture()),now);
    assert.match(html,/Evaluar la cohorte 2027/);
    assert.match(html,/Preservar la cohorte emitida/);
    assert.doesNotMatch(html,/Congelar las predicciones|Emisión antes de 2027|El plazo de emisión anterior/);
    assert.match(html,/todavía no validado/);
  }
});
test('phase alone, unrelated macro, duplicates, partial grid, invalid chronology and stale phase fail closed',()=>{
  const variants=[x=>x.predictions.pop(),x=>x.predictions[1]=x.predictions[0],x=>x.predictions[0].issuedAt='2027-01-01',x=>x.predictions[0].asOf='2026-12-01',x=>x.progress.phases[0].criterio_superado='NO',x=>x.progress.status='error',x=>x.predictions=[{id:'synthetic-macro',status:'EMITIDA_EXPERIMENTAL'}],x=>x.predictions=[]];
  for(const mutate of variants){const x=annualFixture();mutate(x);assert.equal(briefingFacts(lab(x),before).annualRecorded,false);}
});

test('resolved annual rows keep the historical registration state',()=>{const x=annualFixture();x.predictions.forEach(p=>p.status='RESUELTA');assert.equal(briefingFacts(lab(x),before).annualRecorded,true);});
