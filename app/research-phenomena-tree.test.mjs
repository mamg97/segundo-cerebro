import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FUTURE_PHENOMENA,phenomenaAvailability,phenomenaTree,phenomenonDetails,private2027Entry,validPhenomenon} from './research-phenomena-tree.mjs';

const exhibit=(overrides={})=>({
  id:'FICTIONAL-EXPERIMENT',status:'SHADOW_NO_EMITIDO',
  evidence:'https://drive.google.com/file/d/SYNTHETIC_PRIVATE_ID/view',
  notes:JSON.stringify({
    schema:'psychohistory.private_2027_risk_observatory.v1',
    targetYear:2027,countries:196,models:6,
    forecastIssued:false,prospectiveEligible:false,
    outcomesKnown:false,asOfVerified:false,
  }),...overrides,
});

test('tree separates six truly different target definitions and does not fabricate probabilities',()=>{
  assert.equal(FUTURE_PHENOMENA.length,6);
  assert.equal(new Set(FUTURE_PHENOMENA.map(x=>x.id)).size,6);
  for(const p of FUTURE_PHENOMENA)assert.equal(validPhenomenon(p.id),true);
  assert.equal(validPhenomenon('stocks'),false);
  const s=phenomenaAvailability([],true);
  assert.deepEqual(s,{aggregate:'retrospective',intrastate:'unavailable',
    interstate:'unavailable',reemergence:'unavailable',cohort2027:'unavailable',
    expansion:'planned'});
  const html=phenomenaTree([],'aggregate',true);
  assert.equal((html.match(/data-phenomenon="/g)||[]).length,6);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/SIN DATOS ADMITIDOS/);
  assert.match(html,/PENDIENTE DE MODELO/);
  assert.doesNotMatch(html,/P\(2027\)=|100 % de acierto|sello certificado/);
});

test('2027 experiment link is admitted only from fully consistent private SHADOW envelope',()=>{
  const good=exhibit();
  assert.ok(private2027Entry([good]));
  assert.equal(phenomenaAvailability([good],true).cohort2027,'unissued');
  const html=phenomenonDetails([good],'cohort2027');
  assert.match(html,/196 países · seis modelos/);
  assert.match(html,/Abrir observatorio privado 2027/);
  assert.match(html,/SYNTHETIC_PRIVATE_ID/);
  assert.match(html,/no emitida/i);
  for(const bad of [
    exhibit({status:'ISSUED'}),
    exhibit({evidence:'javascript:alert(1)'}),
    exhibit({evidence:'https://untrusted.example/file'}),
    exhibit({notes:'{malformed'}),
    exhibit({notes:JSON.stringify({
      schema:'psychohistory.private_2027_risk_observatory.v1',
      targetYear:2027,countries:196,models:6,
      forecastIssued:true,prospectiveEligible:false,outcomesKnown:false,asOfVerified:false,
    })}),
  ]) {
    assert.equal(private2027Entry([bad]),null);
    assert.match(phenomenonDetails([bad],'cohort2027'),/No se carga una muestra pública/);
  }
});

test('branches with missing source reports render no fake war, deaths or confidence',()=>{
  for(const branch of ['intrastate','interstate','reemergence','expansion']) {
    const html=phenomenonDetails([],branch);
    assert.match(html,/Ninguna rama tiene habilidad prospectiva demostrada/);
    assert.doesNotMatch(html,/data-fevent|data-fnode|probabilityActual|0\.5\b/);
  }
  assert.match(phenomenonDetails([],'intrastate'),/No hay evaluación admisible/);
  assert.match(phenomenonDetails([],'interstate'),/No hay evaluación admisible/);
  assert.match(phenomenonDetails([],'reemergence'),/Inspección GED no disponible/);
  assert.match(phenomenonDetails([],'expansion'),/Sin predicciones para esta rama/);
  assert.equal(phenomenonDetails([],'aggregate'),'');
});

test('UI mounts a branch selector and keeps legacy annual scientific network independently',()=>{
  const source=readFileSync(new URL('./research-futures.mjs',import.meta.url),'utf8');
  const css=readFileSync(new URL('./research-lab.css',import.meta.url),'utf8');
  assert.match(source,/selectedPhenomenon = 'aggregate'/);
  assert.match(source,/phenomenaTree\(onsetExperiments,selectedPhenomenon,true\)/);
  assert.match(source,/selectedPhenomenon === 'aggregate'/);
  assert.match(source,/phenomenonDetails\(onsetExperiments,selectedPhenomenon\)/);
  assert.match(source,/container\.querySelectorAll\('\[data-phenomenon\]'\)/);
  assert.match(source,/observed = observedCaseAvailable\(data\.result,horizon\)/);
  assert.match(source,/container\.querySelector\('form'\)\?\.addEventListener/);
  assert.match(css,/\.phenomena-tree-grid/);
  assert.match(css,/@media\(max-width:640px\)/);
});
