// Finite-state mathematics. No I/O, country defaults or operational results.
export const FUTURES_VERSION = 'ucdp-futures-v1';
export const FUTURE_STATES = ['Bajo → bajo', 'Entrada al episodio', 'Salida del episodio', 'Persistencia del episodio'];
export const FUTURE_MODELS = Object.freeze({frequency: 'Frecuencia constante', persistence: 'Persistencia',
  markov: 'Markov global', country_shrinkage: 'Markov por país regularizado', memory2: 'Memoria de dos estados'});
const integer = x => Number.isInteger(x) && x >= 0;
const probability = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const hash = x => /^[a-f0-9]{64}$/.test(x || '');
const countPair = x => Array.isArray(x) && x.length === 2 && x.every(v => integer(v) && v <= 1e7);
const countRows = (x, n) => Array.isArray(x) && x.length === n && x.every(countPair);
const sum = x => x.reduce((a, b) => a + b, 0);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const interval = x => x === null || (Array.isArray(x) && x.length === 2 && x.every(finite) && x[0] <= x[1]);

// Select a *demonstration* with observable historical changes, never by model score.
// This must NEVER be called prospective sampling or scientific model evaluation.
export function suggestedIllustrativeCountry(catalog) {
  const ranked=(catalog?.countries || []).map(country => {
    const series=country.observedStates?.slice(2) || [];
    if(!series.length || series.some(s=>!Number.isInteger(s)||s<0||s>3))return null;
    const entries=series.filter(s=>s===1).length;
    const exits=series.filter(s=>s===2).length;
    const persists=series.filter(s=>s===3).length;
    const changes=series.slice(1).filter((s,i)=>s!==series[i]).length;
    const score=20*Number(entries>0&&exits>0) + 8*(entries+exits) +
      3*changes + Math.min(5,persists);
    return {id:country.id,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.id-b.id);
  return ranked[0]?.id ?? catalog?.countries?.[0]?.id ?? null;
}

export function parseFutureCatalogs(experiments = []) {
  const accepted = [], rejected = [];
  for (const row of experiments) {
    let d; try { d = JSON.parse(row.notes); } catch { continue; }
    if (d?.schema !== 'psychohistory.futures.catalog.v1') continue;
    const valid = d.version === FUTURES_VERSION && d.runType === 'retrospective_revised_release' &&
      d.vintageVerified === false && d.prospectiveEligible === false && hash(d.runId) && hash(d.protocolSha256) && hash(d.codeSha256) &&
      integer(d.origin) && d.origin >= 1990 && d.origin <= 2100 && d.cutoff === d.origin - 2 && integer(d.observedThrough) &&
      integer(d.maxHorizon) && d.maxHorizon > 0 && d.maxHorizon <= 10 && d.origin + d.maxHorizon - 1 <= d.observedThrough &&
      countPair(d.global?.frequency) && sum(d.global.frequency) > 0 && countRows(d.global?.transitions, 2) && countRows(d.global?.memory, 4) &&
      d.priorStrength === 20 && d.seed === 54117 && Array.isArray(d.countries) && d.countries.length > 0 && d.countries.length <= 300 &&
      new Set(d.countries.map(c => c.id)).size === d.countries.length && d.countries.every(c =>
        integer(c.id) && typeof c.name === 'string' && c.name.length > 0 && c.name.length <= 120 &&
        integer(c.initial) && c.initial < 4 && countRows(c.counts, 2) &&
        (!c.observedStates || (Array.isArray(c.observedStates) && c.observedStates.length === d.maxHorizon + 2 &&
          c.observedStates[0] === c.initial && c.observedStates.every((s, i, all) => s === null || (integer(s) && s < 4 &&
            (!i || all[i - 1] === null || (s >> 1) === all[i - 1] % 2))))));
    if (!valid) { rejected.push(row.id); continue; }
    accepted.push({...d, id: row.id, evidence: row.evidence});
  }
  return {accepted, rejected};
}

export function parseFutureMetrics(experiments = []) {
  const accepted = [], rejected = [];
  for (const row of experiments) {
    let d; try { d = JSON.parse(row.notes); } catch { continue; }
    if (d?.schema !== 'psychohistory.futures.metrics.v1') continue;
    const valid = d.version === FUTURES_VERSION && d.runType === 'retrospective_revised_release' &&
      d.vintageVerified === false && d.prospectiveEligible === false && d.partition === 'test' &&
      hash(d.runId) && hash(d.protocolSha256) && hash(d.sampleSha256) && Object.hasOwn(FUTURE_MODELS, d.model) &&
      [1, 3, 5, 10].includes(d.horizon) && integer(d.n) && d.n > 0 && integer(d.origins) && d.origins > 0 &&
      Array.isArray(d.stateCounts) && d.stateCounts.length === 4 && d.stateCounts.every(integer) && sum(d.stateCounts) === d.n &&
      finite(d.brier) && probability(d.brier / 2) && finite(d.logLoss) && d.logLoss >= 0 && probability(d.ece) &&
      finite(d.sequenceLogLoss) && d.sequenceLogLoss >= 0 && probability(d.riskBrier) &&
      finite(row.value) && Math.abs(row.value - d.brier) < 1e-9 &&
      d.comparisons && ['frequency','persistence','markov'].every(key=>finite(d.comparisons[key]?.skill) &&
        d.comparisons[key].skill <= 1 && interval(d.comparisons[key].skill95) &&
        (d.origins >= 2 * Math.max(2,d.horizon) || d.comparisons[key].skill95 === null)) &&
      Array.isArray(d.yearly) && d.yearly.length === d.origins && d.yearly.every(y => integer(y.origin) && integer(y.n) && y.n > 0 && probability(y.brier / 2)) &&
      sum(d.yearly.map(y => y.n)) === d.n && Math.abs(sum(d.yearly.map(y => y.n * y.brier)) / d.n - d.brier) < 1e-8 &&
      Array.isArray(d.windows) && d.windows.length === 2 && d.windows.every(w=>integer(w.n) &&
        (w.n ? finite(w.brier) && probability(w.brier/2) : w.brier === null)) &&
      Array.isArray(d.calibration) && d.calibration.length === 4 && d.calibration.every((c, i) => c.state === i &&
        Array.isArray(c.bins) && c.bins.length === 5 && sum(c.bins.map(b => b.count)) === d.n &&
        c.bins.every(b => integer(b.count) && (!b.count || (probability(b.meanProbability) && probability(b.eventRate)))));
    if (!valid) { rejected.push(row.id); continue; }
    accepted.push({...d, id: row.id});
  }
  return {accepted, rejected};
}

export function transitionMatrix(catalog, country, model) {
  const params = parameterRows(catalog, country, model);
  return matrixFromRates(params.map(p => p.fixed ?? p.ones / (p.ones + p.zeros)));
}
function parameterRows(catalog, country, model) {
  if (!Object.hasOwn(FUTURE_MODELS, model)) throw new Error('UNKNOWN_MODEL');
  const global = catalog.global;
  return Array.from({length: 4}, (_, state) => {
    const last = state % 2;
    if (model === 'persistence') return {fixed: last, group: last};
    if (model === 'country_shrinkage') {
      const count = country.counts[last], g = global.transitions[last];
      const rate = (g[1] + 1) / (sum(g) + 2), n = catalog.priorStrength;
      return {ones: count[1] + n * rate, zeros: count[0] + n * (1 - rate), group: last};
    }
    const count = model === 'frequency' ? global.frequency : model === 'markov' ? global.transitions[last] : global.memory[state];
    return {ones: count[1] + 1, zeros: count[0] + 1, group: model === 'frequency' ? 0 : model === 'markov' ? last : state};
  });
}
function matrixFromRates(rates) {
  return rates.map((rate, state) => Array.from({length: 4}, (_, next) => (next >> 1) === state % 2 ? (next % 2 ? rate : 1 - rate) : 0));
}
export function validateMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 4 || matrix.some((row, state) =>
    !Array.isArray(row) || row.length !== 4 || row.some((p, next) => !probability(p) || ((next >> 1) !== state % 2 && p !== 0)) || Math.abs(sum(row) - 1) > 1e-10)) throw new Error('INVALID_TRANSITION_MATRIX');
}
export function forward(initial, matrix, steps) {
  validateMatrix(matrix);
  if (!integer(initial) || initial > 3 || !integer(steps) || steps > 11) throw new Error('INVALID_HORIZON');
  const levels = [{distribution: [0, 1, 2, 3].map(s => Number(s === initial)), flows: []}];
  for (let step = 0; step < steps; step++) {
    const previous = levels.at(-1).distribution, flows = [];
    const distribution = [0, 0, 0, 0];
    matrix.forEach((row, from) => row.forEach((conditional, to) => {
      const mass = previous[from] * conditional;
      distribution[to] += mass;
      if (conditional > 0) flows.push({from, to, conditional, mass});
    }));
    if (Math.abs(sum(distribution) - 1) > 1e-9) throw new Error('PROBABILITY_MASS_LOST');
    levels.push({distribution, flows});
  }
  return levels;
}
export function retainedPaths(initial, matrix, steps, keep = 12, beam = 64) {
  validateMatrix(matrix);
  if (!integer(steps) || steps > 11 || steps < 1 || !integer(keep) || keep < 1 || keep > 64 || !integer(beam) || beam < keep || beam > 128 || !integer(initial) || initial > 3) throw new Error('INVALID_PATH_REQUEST');
  return beamLevels(initial, matrix, steps, keep, beam).at(-1);
}
function beamLevels(initial, matrix, steps, keep = 12, beam = 64) {
  let paths = [{states: [initial], probability: 1, key: String(initial)}];
  const levels = [];
  for (let i = 0; i < steps; i++) {
    paths = paths.flatMap(path => matrix[path.states.at(-1)].flatMap((p, next) => p > 0 ?
      [{states: [...path.states, next], probability: path.probability * p, key: path.key + next}] : []))
      .sort((a, b) => b.probability - a.probability || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).slice(0, beam);
    const shown = paths.slice(0, keep).map(({states,probability})=>({states,probability})), representedMass = sum(shown.map(p => p.probability));
    levels.push({paths: shown, representedMass, residualMass: Math.max(0, 1 - representedMass), beam,
      method: 'beam search; retained histories, not a guarantee of globally highest paths'});
  }
  return levels;
}
function generator(seed) {
  let value = seed >>> 0 || 1;
  return () => {value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return ((value >>> 0) + .5) / 4294967296;};
}
function gamma(shape, random) {
  if (shape < 1) return gamma(shape + 1, random) * random() ** (1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const normal = Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
    const factor = 1 + c * normal;
    if (factor <= 0) continue;
    const v = factor ** 3, u = random();
    if (u < 1 - .0331 * normal ** 4 || Math.log(u) < .5 * normal ** 2 + d * (1 - v + Math.log(v))) return d * v;
  }
  throw new Error('PARAMETER_SAMPLER_FAILED');
}
const quantile = (values, q) => {
  const ordered = [...values].sort((a, b) => a - b), index = (ordered.length - 1) * q;
  const low = Math.floor(index), high = Math.ceil(index);
  return ordered[low] + (ordered[high] - ordered[low]) * (index - low);
};
function uncertainty(catalog, country, model, steps, replicates = 128) {
  if (model === 'persistence') return null;
  const parameters = parameterRows(catalog, country, model), random = generator(catalog.seed + country.id * 31 + catalog.origin);
  const samples = Array.from({length: steps + 1}, () => Array.from({length: 4}, () => []));
  for (let r = 0; r < replicates; r++) {
    const groups = new Map();
    const rates = parameters.map(p => {
      if (!groups.has(p.group)) {const a = gamma(p.ones, random), b = gamma(p.zeros, random); groups.set(p.group, a / (a + b));}
      return groups.get(p.group);
    });
    const matrix = matrixFromRates(rates);
    let distribution = [0, 1, 2, 3].map(s => Number(s === country.initial));
    // A single sampled stationary kernel is shared across all steps.
    for (let step = 0; step <= steps; step++) {
      distribution.forEach((p, state) => samples[step][state].push(p));
      distribution = [0, 1, 2, 3].map(next => matrix.reduce((p, row, state) => p + distribution[state] * row[next], 0));
    }
  }
  return samples.map(level => level.map(values => [quantile(values, .025), quantile(values, .975)]));
}

// Outcome labels only enter the scoring stage, never the fitted transition kernel.
// A single historical case is an illustration, NOT a statistical skill estimate.
export function scoreHistoricalCases(catalog, country) {
  const observed = country.observedStates;
  if (!Array.isArray(observed) || observed.length !== catalog.maxHorizon + 2) return [];
  const predictions = Object.fromEntries(Object.keys(FUTURE_MODELS).map(model =>
    [model, forward(country.initial, transitionMatrix(catalog, country, model), catalog.maxHorizon + 1)]));
  return Array.from({length: catalog.maxHorizon}, (_, index) => {
    const horizon = index + 1, endYear = catalog.origin + index;
    const actual = observed[index + 2];
    // Complete-case denominator matches the retrospective research protocol.
    if (!observed.slice(1, index + 3).every(s => Number.isInteger(s) && s >= 0 && s < 4)) {
      return {horizon, endYear, available: false, reason: 'INCOMPLETE_OBSERVED_SEQUENCE'};
    }
    const models = Object.fromEntries(Object.entries(predictions).map(([model, levels]) => {
      const distribution = levels[index + 2].distribution;
      const probabilityActual = distribution[actual];
      return [model, {label: FUTURE_MODELS[model], probabilityActual,
        brier: distribution.reduce((total, p, state) => total + (p - Number(state === actual)) ** 2, 0),
        logLoss: -Math.log(Math.max(1e-12, probabilityActual))}];
    }));
    return {horizon, endYear, available: true, actualState: actual, actualLabel: FUTURE_STATES[actual],
      models, evaluation: 'retrospective_revised_release_single_observation'};
  });
}

export function buildFutures(catalog, countryId, model) {
  const country = catalog.countries.find(c => String(c.id) === String(countryId));
  if (!country) throw new Error('UNKNOWN_COUNTRY');
  const matrix = transitionMatrix(catalog, country, model), maxHorizon = catalog.maxHorizon;
  const levels = forward(country.initial, matrix, maxHorizon + 1);
  const bands = uncertainty(catalog, country, model, maxHorizon + 1);
  const paths = beamLevels(country.initial, matrix, maxHorizon + 1);
  const snapshots = Array.from({length: maxHorizon}, (_, i) => ({horizon: i + 1,
    endYear: catalog.origin + i, distribution: levels[i + 2].distribution,
    interval95: bands?.[i + 2] ?? null, ...paths[i + 1]}));
  return {version: FUTURES_VERSION, runId: catalog.runId, protocolSha256: catalog.protocolSha256,
    codeSha256: catalog.codeSha256, datasetVersion: catalog.datasetVersion, evidence: catalog.evidence,
    runType: catalog.runType, vintageVerified: false, prospectiveEligible: false,
    country: {id: country.id, name: country.name}, model, modelLabel: FUTURE_MODELS[model],
    origin: catalog.origin, cutoff: catalog.cutoff, observedThrough: catalog.observedThrough,
    initial: country.initial, maxHorizon, states: FUTURE_STATES, matrix,
    observedStates: country.observedStates || [], caseEvaluations: scoreHistoricalCases(catalog, country),
    trainingCounts: model === 'persistence' ? null : model === 'frequency' ? catalog.global.frequency :
      model === 'country_shrinkage' ? country.counts : model === 'memory2' ? catalog.global.memory : catalog.global.transitions,
    levels: levels.map((level, i) => ({...level, year: catalog.cutoff + i, bridge: i === 1})), snapshots,
    uncertainty: bands ? {kind: 'conditional_parameter_beta', draws: 128, level: .95,
      caveat: 'Intervalos paramétricos condicionados al modelo y a conteos dependientes. No incluyen revisiones, cambios de régimen ni cobertura empírica. País: prior global plug-in.'} : {kind: 'none_deterministic_baseline'},
    caveats: ['Release revisada: no se verificó disponibilidad histórica as-of.',
      'H años termina en origen+H−1; el año puente se integra sin observarlo.',
      'Grafo agregado: cada nodo reúne historias; las trayectorias conservan su historia completa.',
      'Probabilidades calculadas con una matriz fija estimada: estacionariedad y límites explícitos.']};
}
