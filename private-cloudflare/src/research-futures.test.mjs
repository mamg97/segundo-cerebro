import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {parseFutureCatalogs, parseFutureMetrics, transitionMatrix, forward, retainedPaths, scoreHistoricalCases, suggestedIllustrativeCountry, buildFutures} from './research-futures-engine.mjs';
import {researchFuturesResponse} from './research-futures.js';

function fixture() {return {schema: 'psychohistory.futures.catalog.v1', version: 'ucdp-futures-v1',
  runType: 'retrospective_revised_release', vintageVerified: false, prospectiveEligible: false,
  runId: 'a'.repeat(64), protocolSha256: 'b'.repeat(64), codeSha256: 'c'.repeat(64),
  datasetVersion: 'SYNTHETIC ONLY', origin: 2010, cutoff: 2008, observedThrough: 2020, maxHorizon: 10,
  priorStrength: 20, seed: 54117,
  global: {frequency: [80, 20], transitions: [[70, 10], [5, 15]], memory: [[60, 5], [3, 7], [10, 5], [2, 8]]},
  countries: [{id: 1, name: 'SYNTHETIC COUNTRY', initial: 0, counts: [[12, 2], [1, 3]]}]};}
const rowFor = d => ({id: 'SYNTHETIC-CATALOG', notes: JSON.stringify(d)});

test('catalog fails closed on unsupported evidence, malformed counts and missing bridge lag', () => {
  const d = fixture(); assert.equal(parseFutureCatalogs([rowFor(d)]).accepted.length, 1);
  for (const changed of [{vintageVerified: true}, {prospectiveEligible: true}, {cutoff: 2009}, {maxHorizon: 11},
    {countries: [d.countries[0], d.countries[0]]}, {global: {...d.global, transitions: [[-1, 3], [1, 1]]}}]) {
    const parsed = parseFutureCatalogs([rowFor({...d, ...changed})]);
    assert.equal(parsed.accepted.length, 0); assert.equal(parsed.rejected.length, 1);
  }
});

test('forward flows conserve every node and layer, with impossible transitions fixed to zero', () => {
  const d = fixture();
  for (const model of ['frequency', 'persistence', 'markov', 'country_shrinkage', 'memory2']) {
    const matrix = transitionMatrix(d, d.countries[0], model), levels = forward(0, matrix, 11);
    for (let step = 1; step < levels.length; step++) {
      assert.ok(Math.abs(levels[step].distribution.reduce((a, b) => a + b, 0) - 1) < 1e-10);
      for (let node = 0; node < 4; node++) {
        assert.ok(Math.abs(levels[step].flows.filter(e => e.to === node).reduce((s, e) => s + e.mass, 0) - levels[step].distribution[node]) < 1e-10);
        assert.ok(Math.abs(levels[step].flows.filter(e => e.from === node).reduce((s, e) => s + e.mass, 0) - levels[step - 1].distribution[node]) < 1e-10);
      }
      for (const e of levels[step].flows) assert.equal(e.to >> 1, e.from % 2);
    }
  }
});

test('full history products and explicit residual account for pruning without renormalizing', () => {
  const d = fixture(), matrix = transitionMatrix(d, d.countries[0], 'memory2');
  const full = retainedPaths(0, matrix, 5, 32, 32);
  assert.equal(full.paths.length, 32); assert.ok(full.residualMass < 1e-12);
  const pruned = retainedPaths(0, matrix, 11, 8, 16);
  assert.equal(pruned.paths.length, 8); assert.ok(pruned.residualMass > 0);
  assert.ok(Math.abs(pruned.representedMass + pruned.residualMass - 1) < 1e-12);
  for (const path of pruned.paths) assert.equal(path.probability, path.states.slice(1).reduce((p, state, i) => p * matrix[path.states[i]][state], 1));
});

test('parameter bands are reproducible, bounded, and absent for the deterministic baseline', () => {
  const d = fixture(), a = buildFutures(d, 1, 'markov'), b = buildFutures(d, 1, 'markov');
  assert.deepEqual(a, b); assert.equal(a.levels[1].bridge, true);
  assert.equal(a.snapshots[0].endYear, d.origin); assert.equal(a.snapshots[9].endYear, d.origin + 9);
  for (const snap of a.snapshots) for (const [lo, hi] of snap.interval95) assert.ok(0 <= lo && lo <= hi && hi <= 1);
  assert.equal(buildFutures(d, 1, 'persistence').snapshots[0].interval95, null);
  d.countries[0].observedStates = [0, 1, 3, 2, 0, 0, 1, 3, 3, 3, 2, 0];
  assert.deepEqual(buildFutures(d, 1, 'markov').snapshots, a.snapshots, 'later observed path is never a predictor');
});

test('Python and Worker use the same fitted kernels and two-year bridge mathematics', () => {
  const d = fixture();
  const result = spawnSync('python3', ['-c', "import sys,json;sys.path.insert(0,'../research/psychohistory');from futures import matrix_for,endpoint;d=json.load(sys.stdin);p={'beta_prior':[1,1],'country_prior_strength':20};print(json.dumps({m:[matrix_for(d,d['countries'][0],m,p),endpoint(0,matrix_for(d,d['countries'][0],m,p),11)] for m in ['frequency','persistence','markov','country_shrinkage','memory2']}))"], {input: JSON.stringify(d), encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr); const expected = JSON.parse(result.stdout);
  for (const [model, [matrix, distribution]] of Object.entries(expected)) {
    const actual = transitionMatrix(d, d.countries[0], model);
    actual.flat().forEach((v, i) => assert.ok(Math.abs(v - matrix.flat()[i]) < 1e-12));
    forward(0, actual, 11).at(-1).distribution.forEach((v, i) => assert.ok(Math.abs(v - distribution[i]) < 1e-12));
  }
});

test('request only accepts a canonical catalog and country, never user supplied probabilities', () => {
  const row = rowFor(fixture());
  assert.equal(researchFuturesResponse([row], new URLSearchParams('catalog=SYNTHETIC-CATALOG&country=1&model=markov')).status, 200);
  for (const query of ['catalog=missing&country=1&model=markov', 'catalog=SYNTHETIC-CATALOG&country=99&model=markov', 'catalog=SYNTHETIC-CATALOG&country=1&model=unknown'])
    assert.equal(researchFuturesResponse([row], new URLSearchParams(query)).status, 422);
  assert.equal(researchFuturesResponse([row], new URLSearchParams('country=nan')).status, 400);
  assert.equal(parseFutureMetrics([{notes: '{"schema":"psychohistory.futures.metrics.v1","vintageVerified":true}'}]).rejected.length, 1);
});

test('post-hoc historical scores are mathematically exact and never alter fitted kernels', () => {
  const d=fixture(), country=d.countries[0];
  country.observedStates=[0,1,3,2,0,0,1,3,3,3,2,0];
  const first=buildFutures(d,1,'markov');
  assert.equal(first.caseEvaluations.length,10);
  assert.equal(first.caseEvaluations[0].actualState,3);
  assert.equal(first.caseEvaluations[0].endYear,2010);
  for(const [index,row] of first.caseEvaluations.entries()) {
    assert.equal(row.available,true);
    for(const [model,scores] of Object.entries(row.models)) {
      const distribution=forward(0,transitionMatrix(d,country,model),index+2).at(-1).distribution;
      assert.ok(Math.abs(scores.probabilityActual-distribution[row.actualState])<1e-12);
      const brier=distribution.reduce((sum,p,state)=>sum+(p-Number(state===row.actualState))**2,0);
      assert.ok(Math.abs(scores.brier-brier)<1e-12);
      assert.ok(Math.abs(scores.logLoss+Math.log(Math.max(1e-12,distribution[row.actualState])))<1e-12);
    }
  }
  country.observedStates=Array(12).fill(0);
  const second=buildFutures(d,1,'markov');
  assert.deepEqual(first.matrix,second.matrix,'future labels cannot alter fitted transition');
  assert.deepEqual(first.snapshots,second.snapshots,'future labels cannot alter forecast');
  assert.notEqual(first.caseEvaluations[0].actualState,second.caseEvaluations[0].actualState);
  assert.notEqual(first.caseEvaluations[0].models.markov.brier,second.caseEvaluations[0].models.markov.brier);
});

test('incomplete observed trajectory is explicitly not evaluable',()=>{
  const d=fixture();
  d.countries[0].observedStates=[0,null,3,2,0,0,1,3,3,3,2,0];
  const parsed=parseFutureCatalogs([rowFor(d)]);
  assert.equal(parsed.accepted.length,1);
  const actual=buildFutures(parsed.accepted[0],1,'markov');
  assert.equal(actual.caseEvaluations.length,10);
  assert.ok(actual.caseEvaluations.every(row=>row.available===false && row.reason==='INCOMPLETE_OBSERVED_SEQUENCE'));
  assert.deepEqual(scoreHistoricalCases(fixture(),fixture().countries[0]),[]);
});

test('illustrative country is selected by verified historical transitions, not performance',()=>{
  const d=fixture();const original=d.countries[0];
  const entering={...original,id:91,name:'SYNTHETIC ENTER/EXIT',
    observedStates:[0,0,1,3,2,0,1,3,2,0,0,0]};
  const alwaysLow={...original,id:4,name:'SYNTHETIC NO EPISODE',observedStates:Array(12).fill(0)};
  d.countries=[alwaysLow,entering];
  assert.equal(suggestedIllustrativeCountry(d),91);
  assert.equal(suggestedIllustrativeCountry({...d,countries:[alwaysLow]}),4);
  assert.equal(suggestedIllustrativeCountry({countries:[{...entering,observedStates:[null,null]}]}),91);
});
