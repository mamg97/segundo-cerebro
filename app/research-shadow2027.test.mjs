import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedPrivateRankingLink, shadow2027Section} from './research-shadow2027.mjs';

const key = 'ucdp261-2027-mobile-private-ranking-20261020';
const safeUrl = 'https://docs.google.com/spreadsheets/d/SomePrivateSheetIDAlphaNumeric123/edit';
function fixture(overrides = {}) {
  return {
    id:key, track:'V2', status:'SHADOW_NO_EMITIDO',
    metric:'paises_ranqueados_sin_emision', value:196,
    datasetVersion:'UCDP OrganizedViolenceCY 26.1',
    evidence:safeUrl, ...overrides
  };
}

test('authorized registry record supplies a link but no model probabilities', () => {
  assert.equal(approvedPrivateRankingLink([fixture()]),safeUrl);
  const html=shadow2027Section([fixture()],[]);
  assert.match(html,/Abrir ranking privado 2027/);
  assert.match(html,/NO EMITIDO/);
  assert.match(html,/No representa inicio de guerra/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.match(html,/Filas de PsicoPredicciones/);
  assert.doesNotMatch(html,/0\.9876|credential|tokenSecret/);
});

test('missing, ambiguous or downgraded evidence fails closed', () => {
  assert.equal(approvedPrivateRankingLink([]),null);
  assert.equal(approvedPrivateRankingLink([fixture(),fixture()]),null);
  for(const item of [
    {id:'different'}, {track:'V4'}, {status:'ISSUED'},
    {metric:'probabilidad'}, {value:195},
    {datasetVersion:'UCDP OrganizedViolenceCY 25.1'}
  ]) {
    assert.equal(approvedPrivateRankingLink([fixture(item)]),null);
  }
  const html=shadow2027Section([],[]);
  assert.match(html,/todavía no tiene una fuente privada verificada/);
  assert.doesNotMatch(html,/href=/);
});

test('untrusted locations and HTML-looking fragments never become hrefs', () => {
  for(const link of [
    'https://docs.google.com.evil.test/spreadsheets/d/somefakeidentifer12345678/edit',
    'http://docs.google.com/spreadsheets/d/somefakeidentifer12345678/edit',
    'https://docs.google.com@evil.test/spreadsheets/d/somefakeidentifer12345678/edit',
    'https://docs.google.com/spreadsheets/d/somefakeidentifer12345678/export',
    'https://docs.google.com/spreadsheets/d/somefakeidentifer12345678/edit?token=secret',
    'javascript:alert(1)',
    'https://docs.google.com/spreadsheets/d/a/edit',
    'https://docs.google.com/spreadsheets/d/somefakeidentifer12345678/edit#bad',
  ]) assert.equal(approvedPrivateRankingLink([fixture({evidence:link})]),null,link);
});

test('unrelated experiment evidence never acts as fallback', () => {
  const wrong={id:'other',track:'V2',status:'SHADOW_NO_EMITIDO',metric:'paises_ranqueados_sin_emision',
    value:196,datasetVersion:'UCDP OrganizedViolenceCY 26.1',evidence:safeUrl};
  assert.equal(approvedPrivateRankingLink([wrong]),null);
});
