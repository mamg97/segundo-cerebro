import test from 'node:test';import assert from 'node:assert/strict';
import {diagnoseRetrospectivePath,retrospectivePathDiagnosticPanel} from './research-futures-diagnostics.mjs';
const mk=(actual,distribution,year,index)=>({
 horizon:index+1,endYear:year,available:true,actualState:actual,
 models:{markov:{label:'Markov global',probabilityActual:distribution[actual],
  brier:distribution.reduce((sum,p,s)=>sum+(p-Number(s===actual))**2,0),logLoss:-Math.log(distribution[actual])},
  persistence:{label:'Persistencia',probabilityActual:0,brier:2,logLoss:30}}
});
const distributions=[[.18,.01,.14,.67],[.32,.01,.12,.55],[.43,.01,.10,.46],[.51,.02,.09,.38],[.75,.02,.04,.19]];
const actuals=[3,2,0,0,0];
function fixture(){
 return {runType:'retrospective_revised_release',country:{name:'SYNTHETIC'},
 snapshots:distributions.map(distribution=>({distribution})),
 caseEvaluations:distributions.map((d,i)=>mk(actuals[i],d,2016+i,i))};
}
test('identify first missed modal year, then recover without conditioning the model',()=>{
 const d=diagnoseRetrospectivePath(fixture());
 assert.equal(d.n,5);assert.equal(d.matched,3);
 assert.deepEqual(d.failed.map(x=>x.year),[2017,2018]);
 assert.equal(d.firstMiss.actual,2);assert.equal(d.firstMiss.modal,3);
 assert.equal(d.firstMiss.probabilityActual,.12);
 assert.ok(Math.abs(d.rows.at(-1).probabilityActual-.75)<1e-12);
 assert.equal(d.usesOutcomesForModelFit,false);
 assert.equal(d.temporalAsOfVerified,false);
 assert.equal(d.prospectiveSkillProven,false);
});
test('disclose retrospective, dependent repeated years and benchmarks without winner claims',()=>{
 const html=retrospectivePathDiagnosticPanel(fixture(),'markov');
 assert.match(html,/Diagnóstico de desviaciones/);
 assert.match(html,/2 de 5 años/);
 assert.match(html,/2017/);assert.match(html,/2018/);
 assert.match(html,/12 %/);
 assert.match(html,/error Brier medio/i);
 assert.match(html,/persistence/);
 assert.match(html,/no son 5 experimentos independientes/);
 assert.match(html,/as-of/);
 assert.doesNotMatch(html,/PREDICCIÓN CORRECTA|predicción garantizada/);
});
test('not shown without valid scored retrospective observations',()=>{
 let s=fixture();s.runType='prospective';assert.equal(diagnoseRetrospectivePath(s),null);
 s=fixture();s.caseEvaluations=[];assert.equal(retrospectivePathDiagnosticPanel(s,'markov'),'');
 s=fixture();s.caseEvaluations[0].available=false;assert.equal(diagnoseRetrospectivePath(s).n,4);
 s=fixture();s.snapshots[1].distribution=[.5,.5,.5,.5];
 assert.equal(diagnoseRetrospectivePath(s).n,4);
 s=fixture();s.caseEvaluations[0].models.markov.probabilityActual=.99;
 assert.equal(diagnoseRetrospectivePath(s).n,4);
});
test('no divergence is not proof of prospective skill',()=>{
 const s=fixture();
 s.caseEvaluations=s.caseEvaluations.slice(3);
 s.snapshots=s.snapshots.map((x,i)=>x);
 const html=retrospectivePathDiagnosticPanel(s,'markov');
 assert.match(html,/Sin divergencias modales/);
 assert.match(html,/no prueba calibración ni habilidad futura/);
});
