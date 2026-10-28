import test from 'node:test';
import assert from 'node:assert/strict';
import {pairedEvaluations,renderPairedEvaluations} from './research-paired-evaluations.mjs';

function row(overrides={}){
  const meta={schema:'psychohistory.paired-evaluation.v1',runType:'adaptive_historical_screen',
    forecastIssued:false,skillDemonstrated:false,n:40,decision:'rejected',
    criterion:'Mejorar ambas referencias un 5 %.',references:[{label:'Frecuencia',value:.2},{label:'Persistencia',value:0}]};
  return {id:'SYNTHETIC-01',date:'2020-01-01',hypothesis:'Ejemplo ficticio',modelVersion:'Modelo sintético',metric:'brier',value:.199,baseline:.2,
    evidence:'https://example.com/evidence',notes:JSON.stringify(meta),...overrides};
}
test('preserves the registered multi-gate rejection even when first reference is improved',()=>{
  const result=pairedEvaluations([row()]);assert.equal(result[0].decision,'rejected');
  const html=renderPairedEvaluations({experiments:[row()]});assert.match(html,/Descartado/);assert.match(html,/Persistencia/);
  assert.doesNotMatch(html,/style=/);
  assert.match(html,/0,000/);assert.doesNotMatch(html,/NaN|Infinity|% de acierto/);
});
test('no comparison is inferred from legacy notes, incomplete or contradictory metadata',()=>{
  for(const change of [{notes:'invalid'},{notes:'{}'},{value:null},{value:NaN},{value:1.5},{baseline:.3}])assert.equal(pairedEvaluations([row(change)]).length,0);
  const r=row(),n=JSON.parse(r.notes);n.skillDemonstrated=true;
  assert.deepEqual(pairedEvaluations([{...r,notes:JSON.stringify(n)}]),[]);
});
test('numeric units remain separate, duplicate IDs are excluded, and sample sizes are explicit',()=>{
  const a=row(),b=row({id:'SYNTHETIC-02',metric:'rmse',value:2,baseline:.2});
  assert.equal(pairedEvaluations([a,a,b]).length,1);
  const html=renderPairedEvaluations({experiments:[b]});assert.match(html,/RMSE en puntos porcentuales/);assert.match(html,/40 casos pareados/);
});
test('escapes all canonical text and rejects active evidence URLs',()=>{
  const r=row({hypothesis:'<script>bad</script>',modelVersion:'<img onerror=bad>',evidence:'javascript:alert(1)'});
  const n=JSON.parse(r.notes);n.references[0].label='<svg onload=bad>';n.criterion='<button>bad</button>';r.notes=JSON.stringify(n);
  const html=renderPairedEvaluations({experiments:[r]});assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<img|<svg onload|javascript:/);
});
test('sorts newest first, limits summary without dropping complete science view, and keeps no-data state honest',()=>{
  const rows=[row(),row({id:'SYNTHETIC-02',date:'2020-02-01'})];
  assert.equal(pairedEvaluations(rows)[0].id,'SYNTHETIC-02');
  assert.equal((renderPairedEvaluations({experiments:rows},{limit:1}).match(/class="paired-trial"/g)||[]).length,1);
  assert.match(renderPairedEvaluations({experiments:rows},{limit:1}),/Ver los 2 ensayos/);
  assert.equal(renderPairedEvaluations({experiments:[]}), '');
});
