import {onsetSummaryPanel,parseOnsetSummaries} from './research-onset.mjs?v=0.5.8';
import {gedIncidentPreviewPanel} from './research-ged-reemergence.mjs?v=0.5.8';
// The browser renders server-calculated probabilities. It never fits a model.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value, digits = 3) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('es-ES', {maximumFractionDigits: digits}) : 'Sin datos';
const pct = value => fmt(value * 100, 2) + ' %';
const COLORS = ['#69c5f6', '#ff9b45', '#84d9bd', '#bdabff'];
const SHORT = ['Bajo → bajo', 'Entrada', 'Salida', 'Persistencia'];
const CODES = ['00','01','10','11'];
const REAL_EVENTS = [
  'Actividad estatal registrada por debajo del umbral de 25 muertes en ambos años; no implica paz ni ausencia de violencia.',
  'Entrada en episodio agregado: el año actual alcanza al menos 25 muertes estatales registradas tras un año bajo el umbral.',
  'Salida del episodio agregado: el año actual desciende por debajo del umbral tras un año que lo superó.',
  'Persistencia del episodio agregado: ambos años alcanzan al menos 25 muertes estatales registradas.'
];
const validObservedState = s => Number.isInteger(s) && s >= 0 && s <= 3;
export const observedCaseAvailable = (result, horizon) =>
  result?.caseEvaluations?.[horizon - 1]?.available === true;

const option = (value, label, selected) => '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
const point = (level, state) => ({x: 76 + level * 126, y: level ? 90 + state * 83 : 215});
const curve = (from, to) => 'M' + from.x + ' ' + from.y + ' C' + (from.x + 60) + ' ' + from.y + ' ' + (to.x - 60) + ' ' + to.y + ' ' + to.x + ' ' + to.y;


function observedFact(result, level) {
  const state = result.observedStates?.[level];
  if (!validObservedState(state)) return null;
  const year = result.cutoff + level;
  const evidence = result.observedEvidence?.find(e => e?.year === year && Number.isInteger(e?.sbDeathsBest) && e.sbDeathsBest >= 0);
  const names = Array.isArray(evidence?.dyadNames) ? evidence.dyadNames.filter(n => typeof n === 'string' && n.length <= 320).slice(0,2) : [];
  return {year,state,title:SHORT[state],description:REAL_EVENTS[state],
    deaths:evidence?.sbDeathsBest,dyadCount:evidence?.sbDyadCount,names,
    source:evidence?.sourceUrl || 'https://ucdp.uu.se/downloads/'};
}
export function historicalEventCards(result,horizon) {
  if(!Array.isArray(result.observedStates))return '';
  const cards=[];
  for(let i=1;i<=horizon+1;i++) {
    const year=result.cutoff+i,fact=observedFact(result,i);
    if(!fact){cards.push('<article class="future-event-card"><small>'+year+' · NO EVALUABLE</small><strong>Sin observación válida para este año</strong></article>');continue;}
    const mortality=fact.deaths===undefined?
      (result.observedEvidenceStatus==='source_temporarily_unavailable'?'Detalle numérico de UCDP no disponible temporalmente':
      'Consultando datos oficiales UCDP…') :
      fmt(fact.deaths,0)+' muertes estatales · mejor estimación UCDP';
    const dyad=fact.deaths===undefined ?
      '<span class="future-dyad">Detalle de actores pendientes de verificar con UCDP</span>' :
      fact.names.length ? '<span class="future-dyad">Díadas registradas: '+fact.names.map(esc).join(' · ')+
      (fact.dyadCount>fact.names.length?' · y otras '+(fact.dyadCount-fact.names.length):'')+'</span>':
      '<span class="future-dyad">Ninguna díada estatal registrada en este país-año</span>';
    cards.push('<button type="button" class="future-event-card" data-fevent="'+i+'" aria-label="Inspeccionar acontecimiento UCDP '+
      fact.year+'"><small>'+fact.year+(i===1?' · PUENTE EX POST':' · AÑO OBJETIVO')+
      '</small><strong>'+CODES[fact.state]+' · '+esc(fact.title)+'</strong><span>'+
      esc(fact.description)+'</span><em>'+esc(mortality)+'</em>'+dyad+'</button>');
  }
  return '<div class="future-event-heading"><strong>Acontecimientos documentados en el recorrido real</strong><span>Datos conocidos después · Pulsa un año para inspeccionar</span></div>'+
    '<div class="future-event-cards">'+cards.join('')+'</div>'+
    '<p class="chart-note">Las díadas indican partes enfrentadas reportadas por UCDP; no son incidentes puntuales ni demuestran causalidad. El estado 00 no implica paz ni ausencia de otras violencias. Fuente: OrganizedViolenceCY 26.1, CC BY 4.0.</p>';
}
export function futureGraph(result, horizon, selection = null, observed = false) {
  const levels = result.levels.slice(0, horizon + 2), width = 152 + (levels.length - 1) * 126;
  let svg = '<svg class="future-graph" viewBox="0 0 ' + width + ' 420" width="' + width + '" height="420" aria-label="Grafo temporal agregado de probabilidades. Las historias individuales se detallan debajo.">' +
    '<defs><radialGradient id="future-core"><stop stop-color="#fff3dd"/><stop offset=".16" stop-color="#ffbd7e"/><stop offset=".6" stop-color="#ff8a2855"/><stop offset="1" stop-color="#ff8a2800"/></radialGradient></defs>';
  levels.forEach((level, i) => {
    svg += '<text class="future-year" x="' + point(i, 0).x + '" y="25" text-anchor="middle">' + level.year + '</text>' +
      '<text class="future-year-note" x="' + point(i, 0).x + '" y="43" text-anchor="middle">' + (i === 0 ? 'último dato' : i === 1 ? 'puente no observado' : 'horizonte ' + (i - 1)) + '</text>';
    if (!i) return;
    level.flows.forEach((edge, index) => {
      if (edge.mass <= 0) return;
      const path = selection?.kind === 'path' ? result.snapshots[horizon-1].paths[selection.index] : null;
      const selected = (selection?.kind === 'edge' && selection.level === i && selection.index === index) || (path && path.states[i-1] === edge.from && path.states[i] === edge.to);
      const d = curve(point(i - 1, edge.from), point(i, edge.to));
      const from = point(i-1,edge.from), to = point(i,edge.to);
      svg += '<g class="future-edge" tabindex="0" role="button" data-fedge="' + i + ':' + index + '" aria-label="' + level.year + ', ' + esc(SHORT[edge.from]) + ' a ' + esc(SHORT[edge.to]) + '; condicional ' + pct(edge.conditional) + '; flujo ' + pct(edge.mass) + '"><title>Condicional ' + pct(edge.conditional) + ' · flujo agregado ' + pct(edge.mass) + '</title><path class="future-flow' + (selected ? ' selected' : '') + '" d="' + d + '" fill="none" stroke="' + COLORS[edge.to] + '" stroke-opacity="' + (selected ? '.95' : '.3') + '" stroke-width="' + (.5 + edge.mass * 14) + '"/><path d="'+d+'" fill="none" stroke="transparent" stroke-width="14"/><circle cx="'+((from.x+to.x)/2)+'" cy="'+((from.y+to.y)/2)+'" r="7" fill="transparent"/></g>';
      svg += '<path class="future-pulse" d="' + d + '" fill="none" stroke="' + COLORS[edge.to] + '" stroke-opacity=".8" stroke-width="1.6" stroke-dasharray="2 42" aria-hidden="true"/>';
    });
  });
  if (observed && result.observedStates?.length) {
    const states = result.observedStates.slice(0, levels.length);
    for (let i = 1; i < states.length; i++) if (validObservedState(states[i]) && validObservedState(states[i - 1])) {
      const d = curve(point(i - 1, states[i - 1]), point(i, states[i]));
      svg += '<path class="future-observed-halo" d="' + d + '" fill="none" stroke="#ffb35d" stroke-width="9" stroke-opacity=".23" aria-hidden="true"/>' +
        '<path class="future-observed" d="' + d + '" fill="none" stroke="#ffe4a8" stroke-width="3.7" stroke-dasharray="9 5"><title>Recorrido realmente observado después en la edición revisada UCDP</title></path>';
    }
  }
  levels.forEach((level, i) => level.distribution.forEach((mass, state) => {
    if (!i && state !== result.initial) return;
    const p = point(i, state), selected = selection?.kind === 'node' && selection.level === i && selection.state === state;
    svg += '<g class="future-node' + (selected ? ' selected' : '') + '" tabindex="0" role="button" data-fnode="' + i + ':' + state + '" aria-label="' + level.year + ', ' + esc(SHORT[state]) + ', probabilidad marginal ' + pct(mass) + '">';
    svg += '<rect x="' + (p.x-42) + '" y="' + (p.y-25) + '" width="84" height="80" fill="transparent"/>';
    if (!i) svg += '<circle class="future-core-glow" cx="' + p.x + '" cy="' + p.y + '" r="44" fill="url(#future-core)"/>';
    const realHere = observed && validObservedState(result.observedStates?.[i]) && result.observedStates[i] === state;
    if (realHere && i > 0) svg += '<circle class="future-real-ring" cx="' + p.x + '" cy="' + p.y +
      '" r="' + Math.max(15, Math.max(4, 20 * Math.sqrt(mass)) + 8) + '" fill="none" stroke="#ffdb9b" stroke-width="3" stroke-dasharray="4 3"><title>Estado observado después: ' +
      esc(SHORT[state]) + '</title></circle>';
    svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (i ? Math.max(4, 20 * Math.sqrt(mass)) : 15) + '" fill="' + (i ? COLORS[state] : '#ffba78') + '" fill-opacity="' + (mass ? '.85' : '.12') + '" stroke="' + (selected ? '#fff' : COLORS[state]) + '" stroke-width="' + (selected ? 3 : 1) + '"/>' +
      '<text x="' + p.x + '" y="' + (p.y + 33) + '" text-anchor="middle" class="future-node-label">' + (i ? pct(mass) : 'ESTADO CONOCIDO') + '</text>' +
      (!i ? '<text x="' + p.x + '" y="' + (p.y + 50) + '" text-anchor="middle" class="future-year-note">' + esc(SHORT[state]) + '</text>' :
        realHere ? '<text x="' + p.x + '" y="' + (p.y - 33) + '" text-anchor="middle" class="future-real-label">' +
          (i === horizon + 1 ? 'REAL · FINAL' : 'REAL') + '</text>' : '') + '</g>';
    if (realHere && i > 0) {
      const fact = observedFact(result,i);
      svg += '<g class="future-event-marker" tabindex="0" role="button" data-fevent="'+i+
        '" aria-label="Evento real UCDP '+fact.year+': '+esc(fact.title)+'"><title>'+
        esc(fact.year+' · '+fact.description+(fact.deaths===undefined?'':'; '+fact.deaths+' muertes estatales estimadas'))+
        '</title><circle cx="'+(p.x+28)+'" cy="'+(p.y-20)+'" r="10" fill="#ffc182" stroke="#fff0d1" stroke-width="1"/>'+
        '<text x="'+(p.x+28)+'" y="'+(p.y-16)+'" text-anchor="middle" fill="#102439" font-size="12" font-weight="700">i</text></g>';
    }
  }));
  return svg + '</svg>';
}

function distribution(result, snapshot) {
  return '<div class="future-distribution">' + snapshot.distribution.map((mass, state) =>
    '<article data-state="' + state + '"><small>' + esc(SHORT[state]) + '</small><strong>' + pct(mass) + '</strong>' +
    '<svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="4" fill="#243b51"/><rect width="' + (mass * 100) + '" height="4" fill="' + COLORS[state] + '"/></svg>' +
    '<span>' + (snapshot.interval95 ? 'IP 95 %: ' + snapshot.interval95[state].map(pct).join(' – ') : 'Sin intervalo paramétrico') + '</span></article>').join('') + '</div>';
}

function detail(result, horizon, selection) {
  const snapshot = result.snapshots[horizon - 1];
  if (selection?.kind === 'event') {
    const fact=observedFact(result,selection.level);
    if (!fact) return '<h4>Sin evento verificable</h4><p>No consta una observación completa para este año.</p>';
    return '<span class="eyebrow">EVIDENCIA HISTÓRICA · UCDP 26.1</span><h4>'+fact.year+' · '+esc(fact.title)+'</h4>'+
      '<p>'+esc(fact.description)+'</p>'+
      (fact.deaths===undefined ? '<p>Falta adjuntar el conteo oficial de muertes para este año.</p>' :
        '<div class="kpi"><span>Muertes estatales (estimación UCDP)</span><b>'+fmt(fact.deaths,0)+'</b></div>')+
      (fact.deaths===undefined ? '<p>Los nombres de las díadas aún no están verificados en este registro.</p>' :
       fact.names.length ? '<p>Díadas registradas: '+fact.names.map(esc).join('; ')+'</p>':
         '<p>El conjunto oficial no registra díadas estatales para este país-año.</p>')+
      '<p class="chart-note">Una díada de conflicto no es un incidente individual; fuente retrospectiva revisada. '+
      'El desenlace no interviene en las probabilidades.</p><a href="'+esc(fact.source)+'" rel="noopener noreferrer" target="_blank">Consultar UCDP ↗</a>';
  }
  if (selection?.kind === 'edge') {
    const edge = result.levels[selection.level].flows[selection.index];
    return '<span class="eyebrow">TRANSICIÓN / ' + result.levels[selection.level].year + '</span><h4>' + esc(SHORT[edge.from]) + ' → ' + esc(SHORT[edge.to]) + '</h4>' +
      '<dl><dt>Probabilidad condicional</dt><dd>' + pct(edge.conditional) + '</dd><dt>Flujo agregado</dt><dd>' + pct(edge.mass) + '</dd></dl><p>Flujo = probabilidad del nodo de origen × probabilidad condicional. Reúne varias historias; no es la probabilidad de un único camino.</p>';
  }
  if (selection?.kind === 'path') {
    const path = snapshot.paths[selection.index];
    return '<span class="eyebrow">HISTORIA INDIVIDUAL</span><h4>Trayectoria retenida ' + (selection.index + 1) + '</h4><strong class="future-big">' + pct(path.probability) + '</strong><p>Producto de las probabilidades condicionales del camino completo, incluido el año puente.</p><ol class="future-history">' + path.states.map((state, i) => '<li>' + (result.cutoff + i) + ' · ' + esc(SHORT[state]) + '</li>').join('') + '</ol>';
  }
  if (selection?.kind === 'node') {
    const level = result.levels[selection.level], mass = level.distribution[selection.state];
    const interval = selection.level >= 2 ? result.snapshots[selection.level - 2].interval95?.[selection.state] : null;
    return '<span class="eyebrow">ESTADO / ' + level.year + '</span><h4>' + esc(result.states[selection.state]) + '</h4><strong class="future-big">' + pct(mass) + '</strong>' +
      '<p>Probabilidad marginal: suma de todas las historias que llegan aquí.</p><p>' + (interval ? 'IP 95 %: ' + interval.map(pct).join(' – ') : 'Sin intervalo paramétrico en este nodo.') + '</p>' +
      '<dl><dt>Flujos entrantes con masa</dt><dd>' + level.flows.filter(e => e.to === selection.state && e.mass > 0).length + '</dd><dt>Flujos salientes con masa</dt><dd>' + (result.levels[selection.level + 1]?.flows.filter(e => e.from === selection.state && e.mass > 0).length ?? '—') + '</dd></dl>';
  }
  return '<span class="eyebrow">INSPECCIÓN CIENTÍFICA</span><h4>Cada bifurcación tiene un significado</h4><p>Toca un nodo para ver su probabilidad marginal o una conexión para separar probabilidad condicional y flujo agregado.</p><p>Debajo puedes seleccionar historias completas. Varias historias pueden terminar en el mismo nodo.</p>';
}

// An observed historical outcome is available to the retrospective reader by default.
// Capability labels are not model scores; new objectives stay inert until
// official sources have been ingested and retrospectively evaluated.
export function phenomenaScopePanel(experiments = []) {
  const verifiedReports = parseOnsetSummaries(experiments).accepted;
  const hasIntra = verifiedReports.some(r => r.kind === 'intrastate_country');
  const hasInter = verifiedReports.some(r => r.kind === 'interstate_country');
  return '<section class="panel future-phenomena" aria-label="Qué fenómenos se pueden predecir">' +
    '<div class="panel-head"><h3>¿Qué acontecimiento intentamos anticipar?</h3>' +
    '<span>Objetivos definidos por fuentes oficiales</span></div>' +
    '<div class="future-phenomena-grid">' +
      '<article class="future-phenomenon active"><small>DISPONIBLE · RETROSPECTIVO</small>' +
      '<h4>Episodio agregado de violencia estatal</h4>' +
      '<p>Probabilidad anual de entrar, salir o permanecer por encima de 25 muertes estatales dentro de un país. ' +
      'Es lo que representa la red anterior, no una guerra nueva.</p></article>' +
      '<article class="future-phenomenon '+(hasIntra?'active':'pending')+'"><small>' +
      (hasIntra?'RESULTADOS RETROSPECTIVOS · NO PROSPECTIVOS':'PROTOCOLO Y TESTS · SIN PROBABILIDADES REALES TODAVÍA')+
      '</small><h4>Inicio de conflicto armado interno</h4><p>Nuevo inicio o reanudación según el objetivo UCDP Onset 25.1 por país-año. '+
      (hasIntra?'Abajo se muestran las métricas de dos comparadores con datos históricos revisados; no son avisos actuales.':
        'El modelo está implementado; la evaluación oficial sigue pendiente de registro.')+'</p></article>' +
      '<article class="future-phenomenon '+(hasInter?'active':'pending')+'"><small>' +
      (hasInter?'RESULTADOS RETROSPECTIVOS · NO PROSPECTIVOS':'PROTOCOLO Y TESTS · SIN PROBABILIDADES REALES TODAVÍA')+
      '</small><h4>Inicio de conflicto entre Estados</h4><p>Objetivo interestatal por país-año, separado del interno. '+
      (hasInter?'Abajo figura el contraste retrospectivo con el baseline; esto no predice una invasión concreta.':
        'No implica pronosticar una invasión; todavía no existen métricas oficiales registradas.')+'</p></article>' +
    '</div><p class="chart-note">Datos: UCDP OrganizedViolenceCY 26.1 (red actual), ' +
    '<a href="https://ucdp.uu.se/downloads/" target="_blank" rel="noopener noreferrer">UCDP Onset 25.1</a> (objetivos nuevos). ' +
    'Todas las evaluaciones son retrospectivas sobre versiones revisadas, no predicciones prospectivas verificadas.</p></section>';
}

export function historicalCaseSummary(result, horizon) {
  const observed = result.caseEvaluations?.[horizon - 1];
  const year = result.origin + horizon - 1;
  let html = '<section class="panel future-case-primary" aria-label="Resultado del caso histórico">' +
    '<div class="future-case-title"><span class="eyebrow">CASO HISTÓRICO · FUENTE REVISADA</span><h3>' + esc(result.country?.name) +
    ' · ' + year + '</h3><p>Origen ' + result.origin + ' · Horizonte ' + horizon +
    ' ' + (horizon === 1 ? 'año' : 'años') + ' · ' + esc(result.modelLabel || result.model) + '</p></div>';
  if (!observed?.available) {
    return html + '<div class="future-real-empty"><strong>' + (observed ? 'Sin secuencia observada completa' : 'Pronóstico sin desenlace verificable') +
      '</strong><p>No se puede puntuar este horizonte. No se atribuyen probabilidades al desenlace ni se interpretan datos ausentes como ausencia de violencia.</p></div>' +
      '<p class="future-epistemic">Se conservan las probabilidades del modelo, pero sin evidencia observada completa no hay evaluación individual.</p></section>';
  }
  const scores = observed.models?.[result.model];
  if (!scores) return html + '<p>Evaluación no disponible para el modelo elegido.</p></section>';
  return html + '<div class="future-real-outcome"><span class="future-real-marker">● ESTADO REAL REGISTRADO</span><h4>' +
    esc(CODES[observed.actualState]) + ' · ' + esc(observed.actualLabel) +
    '</h4><p>' + esc(REAL_EVENTS[observed.actualState]) + '</p></div>' +
    '<div class="future-case-kpis"><div><small>Probabilidad asignada al estado real</small><strong>' +
    pct(scores.probabilityActual) + '</strong></div><div><small>Error Brier individual (0–2) ↓</small><strong>' +
    fmt(scores.brier,5) + '</strong></div><div><small>Log-loss individual ↓</small><strong>' +
    fmt(scores.logLoss,5) + '</strong></div></div>' +
    '<p class="future-epistemic">Evaluación retrospectiva exploratoria: el desenlace se obtuvo después del origen usando una publicación UCDP revisada. ' +
    'No acredita disponibilidad histórica as-of, habilidad predictiva prospectiva ni victoria estadística de un modelo.</p></section>';
}

// The per-year history reports observable UCDP threshold events, NOT named political events.
export function historicalObservedTimeline(result, horizon) {
  const states = result.observedStates || [], complete = observedCaseAvailable(result,horizon);
  let html = '<section class="panel future-observed-timeline"><div class="panel-head"><h3>Cronología: predicción frente a realidad</h3>' +
    '<span>' + (complete ? 'Estados observados a posteriori' : 'Observaciones parciales o ausentes') + '</span></div>' +
    '<div class="future-real-years">';
  for (let i=0; i<=horizon+1; i++) {
    const year = result.cutoff+i;
    const state = states[i];
    const known = validObservedState(state);
    const stage = i===0 ? 'CORTE INFORMATIVO' : i===1 ? 'AÑO PUENTE' : 'AÑO OBJETIVO';
    const label = !known ? 'No consta observación' : i===0 ?
      'Último estado conocido en el corte' : i===1 ?
      'No conocido al emitir; observado después' : 'Estado observado posteriormente';
    html += '<article class="future-real-year' + (i===horizon+1 ? ' final' : '') +
      (known ? ' has-outcome' : '') + '"><small>' + stage + '</small><strong>' + year +
      '</strong><span>' + esc(label) + '</span><b>' +
      (known ? esc(CODES[state] + ' · ' + SHORT[state]) : 'Sin datos') + '</b>' +
      (known ? '<p>' + esc(REAL_EVENTS[state]) + '</p>' : '') + '</article>';
  }
  return html + '</div><p class="chart-note">El puente se integra sin observarlo al emitir; sus etiquetas se muestran aquí solo porque estamos revisando el caso después. ' +
    'Cada estado es un par de años y no identifica por sí solo una guerra o un evento político concreto.</p></section>';
}

export function historicalCaseComparison(result, horizon) {
  const item = result.caseEvaluations?.[horizon-1];
  if (!item?.available) return '<section class="panel top-gap future-case-comparison"><h3>Comparación de modelos</h3>' +
    '<p>No evaluable: faltan observaciones para uno o más años del recorrido.</p></section>';
  return '<section class="panel top-gap future-case-comparison"><div class="panel-head"><h3>Los cinco modelos ante el mismo desenlace real</h3>' +
    '<span>' + esc(result.country.name) + ' · ' + item.endYear + '</span></div>' +
    '<div class="scroll-x"><table><thead><tr><th>Modelo</th><th>P(estado registrado)</th><th>Brier ↓</th><th>Log-loss ↓</th></tr></thead><tbody>' +
    Object.entries(item.models).map(([model,score])=>'<tr' + (model===result.model ? ' class="future-current-model"' : '') +
      '><td>' + esc(score.label) + '</td><td>' + pct(score.probabilityActual) + '</td><td>' +
      fmt(score.brier,5) + '</td><td>' + fmt(score.logLoss,5) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<p class="chart-note">Todos los modelos comparten país, origen, horizonte y desenlace. Un error individual no demuestra calibración ni superioridad estadística. ' +
    'La comparación agregada permanece en Investigador.</p></section>';
}

// Kept as a public helper for standalone embedded consumers; the outcome is visible by default.
export function historicalCasePanel(result, horizon, revealed = true) {
  return historicalCaseSummary(result,horizon) + (revealed ? historicalCaseComparison(result,horizon) : '');
}

function research(result, metrics, horizon) {
  const group = metrics.filter(m => m.horizon === horizon);
  const first = group[0], comparable = first ? group.filter(m => m.sampleSha256 === first.sampleSha256 && m.n === first.n) : [];
  const selected = comparable.find(m => m.model === result.model);
  let html = '<section class="panel"><div class="panel-head"><h3>Matriz de transición estimada</h3><span>Filas suman 1</span></div><div class="scroll-x"><table><thead><tr><th>Origen / destino</th>' + SHORT.map(s => '<th>' + esc(s) + '</th>').join('') + '</tr></thead><tbody>' +
    result.matrix.map((row, i) => '<tr><th>' + esc(SHORT[i]) + '</th>' + row.map(p => '<td>' + pct(p) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div><p class="chart-note">Estado = (B del año anterior, B del año actual). B = 1 cuando se registran 25+ muertes estatales. Los ceros estructurales impiden historias incompatibles.</p></section>';
  html += '<section class="panel top-gap"><div class="panel-head"><h3>Benchmark del horizonte</h3><span>' + (first ? first.n + ' país-origen · ' + first.origins + ' orígenes' : 'Sin evaluación para este horizonte') + '</span></div>';
  if (!first) html += '<p class="subtext">El motor calcula este horizonte, pero el protocolo solo evalúa 1, 3, 5 y 10 años. No se atribuye calidad a un horizonte por poder dibujarlo.</p>';
  else html += '<div class="scroll-x"><table><thead><tr><th>Modelo</th><th>Brier 4 ↓</th><th>Skill / Markov</th><th>IC 95 % skill</th><th>Log loss ↓</th><th>ECE ↓</th><th>Log loss secuencia ↓</th></tr></thead><tbody>' + comparable.map(m => '<tr' + (m.model === result.model ? ' class="future-current-model"' : '') + '><td>' + esc(m.model) + '</td><td>' + fmt(m.brier, 5) + '</td><td>' + fmt(m.comparisons?.markov?.skill) + '</td><td>' + (m.comparisons?.markov?.skill95?.map(v => fmt(v)).join(' / ') || 'No estimable') + '</td><td>' + fmt(m.logLoss, 4) + '</td><td>' + fmt(m.ece, 4) + '</td><td>' + fmt(m.sequenceLogLoss, 4) + '</td></tr>').join('') + '</tbody></table></div><p class="chart-note">Evaluación conjunta de países y orígenes: no mide la precisión del país seleccionado. Mismas etiquetas y muestra por modelo. Brier nominal = suma de cuatro errores al cuadrado (0–2). Estados sin orden: no se calcula RPS. IC por bloques max(2,H), condicionado al ajuste; sin IC cuando no hay dos bloques completos.</p>';
  html += '</section>';
  if (selected) {
    let plot = '<svg viewBox="0 0 560 300" role="img" aria-label="Calibración retrospectiva por cada uno de los cuatro estados">';
    plot += '<path d="M45 250 L520 35" stroke="#809fba" stroke-dasharray="5 5"/>';
    for (let i = 0; i <= 4; i++) plot += '<text x="' + (45 + i * 475 / 4) + '" y="275" text-anchor="middle" fill="#a5b8ce" font-size="11">' + i / 4 + '</text>';
    selected.calibration.forEach(c => {
      const usable = c.bins.filter(b => b.count > 0);
      plot += '<polyline points="' + usable.map(b => (45 + b.meanProbability * 475) + ',' + (250 - b.eventRate * 215)).join(' ') + '" fill="none" stroke="' + COLORS[c.state] + '" stroke-width="2"/>';
      usable.forEach(b => { plot += '<circle cx="' + (45 + b.meanProbability * 475) + '" cy="' + (250 - b.eventRate * 215) + '" r="4" fill="' + COLORS[c.state] + '"><title>' + esc(SHORT[c.state]) + ': estimado ' + pct(b.meanProbability) + ', observado ' + pct(b.eventRate) + ', N=' + b.count + '</title></circle>'; });
    });
    html += '<div class="two-col top-gap"><section class="panel"><h3>Calibración retrospectiva</h3>' + plot + '<text x="280" y="298" text-anchor="middle" fill="#a5b8ce" font-size="11">Probabilidad estimada → frecuencia observada</text></svg><p class="chart-note">Cinco bins fijos por estado; colores de la leyenda. Cada estado suma N=' + selected.n + '. No calibra los intervalos paramétricos.</p></section><section class="panel"><h3>Robustez por ventanas</h3>' + selected.windows.map(w => '<div class="kpi"><span>Orígenes ' + w.from + '–' + w.to + ' · N=' + w.n + '</span><b>' + fmt(w.brier, 5) + '</b></div>').join('') + '<p class="chart-note">Brier de cuatro estados del modelo seleccionado. Ventana sin muestra: Sin datos. Los resultados completos por país y región están en el archivo privado de evidencia.</p></section></div>';
  }
  return html + '<details class="panel top-gap future-provenance"><summary>Supuestos, procedencia y reproducción</summary><p>Origen: 1 de enero de ' + result.origin + '. Información admitida hasta ' + result.cutoff + '. Se integra el año ' + (result.origin - 1) + ' sin observar su desenlace. Matriz estacionaria durante toda la trayectoria.</p><p>Modelo: ' + esc(result.modelLabel) + ' · versión ' + esc(result.version) + ' · fuente ' + esc(result.datasetVersion) + '.</p><p>' + esc(result.uncertainty.caveat || 'Persistencia determinista: no hay distribución paramétrica estimada.') + '</p>' + result.caveats.map(c => '<p>' + esc(c) + '</p>').join('') + '<p>Protocolo: ' + esc(result.protocolSha256) + '<br>Código de ajuste: ' + esc(result.codeSha256) + '<br>Run: ' + esc(result.runId) + '</p>' + (result.evidence ? '<a href="' + esc(result.evidence) + '" target="_blank" rel="noopener noreferrer">Archivo privado de reproducción ↗</a>' : '') + '</details>';
}

export function mountFutureExplorer(container, catalogs, {onTrack = () => {}, onsetExperiments = []} = {}) {
  if (!catalogs?.length) {
    container.innerHTML = '<section class="panel empty"><strong>Futures Engine · Sin datos auditados</strong><p>El registro privado aún no contiene un catálogo de transiciones válido. No se dibujan probabilidades de ejemplo.</p></section>';
    return () => {};
  }
  container.setAttribute('aria-live','off');
  let catalog = catalogs[0], country = catalog.countries.some(c => c.id === catalog.suggestedCountryId) ? catalog.suggestedCountryId : catalog.countries[0].id, model = 'markov', horizon = Math.min(3, catalog.maxHorizon);
  let payload = null, selection = null, mode = 'explorer', paused = false, playing = false, observed = false, speed = 1;
  let error = '', loading = false, disposed = false, request = 0, abort = null, timer = null, inView = true;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clearTimer = () => { if (timer !== null) window.clearTimeout(timer); timer = null; };
  function schedule() {
    clearTimer();
    if (!playing || disposed || document.hidden || !inView || media.matches || !payload) return;
    timer = window.setTimeout(() => {timer = null; horizon = horizon >= catalog.maxHorizon ? 1 : horizon + 1; observed = observedCaseAvailable(payload?.result,horizon); selection = null; const focus = document.activeElement?.hasAttribute('data-play') ? '[data-play]' : null; render(focus);}, 1600 / speed);
  }
  function syncMotion() {
    container.dataset.motion = paused || media.matches || document.hidden || !inView ? 'paused' : 'running';
    schedule();
  }
  function render(focus = null) {
    if (disposed) return;
    const previousScroll = container.querySelector('.future-graph-scroll')?.scrollLeft || 0;
    const result = payload?.result, snapshot = result?.snapshots[horizon - 1];
    // MAIN SCREEN: begin with the real-versus-probabilistic network, not controls.
    const graphFirst = result ?
      '<section class="panel future-network future-network-first"><div class="panel-head"><div><span class="eyebrow">PSICOHISTORIA / OBSERVATORIO</span>'+
      '<h2>Futuros posibles frente a hechos reales</h2><p>'+esc(result.country.name)+' · '+snapshot.endYear+' · '+esc(result.modelLabel)+'</p></div>'+
      '<label class="future-observed-toggle"><input type="checkbox" name="observed"'+(observed?' checked':'')+
      (!observedCaseAvailable(result,horizon)?' disabled':'')+'> Mostrar lo que ocurrió</label></div>'+
      '<p class="future-network-key"><span><b>━━ Ámbar:</b> evolución registrada posteriormente</span><span>● Otros colores: probabilidad de cada estado</span>'+
      '<span>ⓘ Inspecciona las marcas y los acontecimientos por año</span></p>'+
      '<div class="future-graph-scroll">'+futureGraph(result,horizon,selection,observed)+'</div>'+
      (observed?historicalEventCards(result,horizon):'<p class="subtext">La trayectoria real está oculta. Activa «Mostrar lo que ocurrió» para consultarla.</p>')+
      '<p class="chart-note">Caso inicial ilustrativo elegido por variedad de transiciones observadas, NO por aciertos de un modelo. Puedes cambiarlo debajo.'+
      ' Las líneas conservan la masa probabilística total; la trayectoria real se superpone a posteriori, nunca modifica el modelo.'+
      ' El puente '+(result.origin-1)+' fue desconocido en el corte '+result.cutoff+'. Datos UCDP retrospectivos revisados.</p></section>' :
      '<section class="panel future-network future-network-first future-network-loading"><h2>Futuros posibles frente a hechos reales</h2><p>'+
      (loading?'Cargando las trayectorias calculadas…':'Esperando selección de datos reales…')+'</p></section>';
    container.innerHTML = graphFirst + phenomenaScopePanel(onsetExperiments) + onsetSummaryPanel(onsetExperiments) + gedIncidentPreviewPanel(onsetExperiments) + '<div class="future-after-network"><div class="section-heading"><div><span class="eyebrow">FUTURES ENGINE / ' + esc(catalog.version) + '</span><h2>Un presente. Futuros posibles.</h2></div><p>Transiciones observables · evidencia retrospectiva</p></div>' +
      '<form class="future-controls"><label>Sociedad<select name="country">' + [...catalog.countries].sort((a,b) => a.name.localeCompare(b.name)).map(c => option(c.id, c.name, country)).join('') + '</select></label>' +
      '<label>Origen retrospectivo<select name="catalog">' + catalogs.map(c => option(c.id, c.origin + ' · información ≤ ' + c.cutoff, catalog.id)).join('') + '</select></label>' +
      '<label>Modelo<select name="model">' + Object.entries(catalog.models).map(([id,name]) => option(id, name, model)).join('') + '</select></label>' +
      '<button type="submit" class="future-calculate"' + (loading ? ' disabled' : '') + '>' + (loading ? 'Calculando…' : 'Calcular trayectorias') + '</button></form>' +
      '<p class="future-warning">BACKTEST EXPLORATORIO · Fuente histórica revisada. No es un pronóstico actual ni acredita información disponible en el origen.</p>' +
      (error ? '<p class="error" role="alert">' + esc(error) + '</p>' : '') +
      (!result ? '<section class="panel empty"><strong>' + (loading ? 'Calculando con los parámetros canónicos…' : 'Selección pendiente de calcular') + '</strong><p>Las probabilidades procederán del motor privado. No se muestran resultados inventados.</p></section>' :
        '<div class="future-toolbar"><div class="filter-row"><button type="button" data-fmode="explorer" aria-pressed="' + (mode === 'explorer') + '">Explorador</button><button type="button" data-fmode="research" aria-pressed="' + (mode === 'research') + '">Investigador</button></div><span>' + esc(result.country.name) + ' · ' + esc(result.modelLabel) + '</span></div>' +
        '<div class="future-timeline"><label>Horizonte <strong>' + horizon + ' ' + (horizon === 1 ? 'año' : 'años') + ' → ' + snapshot.endYear + '</strong><input name="horizon" type="range" min="1" max="' + result.maxHorizon + '" step="1" value="' + horizon + '" aria-label="Horizonte en años"></label>' +
        '<button type="button" data-play aria-pressed="' + playing + '"' + (media.matches ? ' disabled' : '') + '>' + (playing ? 'Ⅱ Pausar tiempo' : '▶ Recorrer años') + '</button><label>Velocidad<select name="speed">' + [0.5,1,2].map(n => option(n,n+'×',speed)).join('') + '</select></label><button type="button" data-fpause aria-pressed="' + (paused || media.matches) + '"' + (media.matches ? ' disabled' : '') + '>' + (media.matches ? 'Movimiento reducido' : paused ? 'Reanudar pulsos' : 'Pausar pulsos') + '</button></div>' +
        historicalCaseSummary(result, horizon) +
        '<div class="future-legend">' + SHORT.map((name,i) => '<span data-state="' + i +
          '"><i></i><b>' + CODES[i] + '</b> ' + esc(name) + '</span>').join('') + '</div>' +
        (mode === 'explorer' ? '<section class="panel top-gap future-event-inspector" aria-live="polite">' + detail(result,horizon,selection) + '</section>' +
        historicalObservedTimeline(result, horizon) + historicalCaseComparison(result,horizon) +
        '<section class="panel top-gap future-state-distribution"><div class="panel-head"><h3>Futuros posibles · probabilidades calculadas</h3><span>Sin condicionar al resultado real</span></div>' +
        distribution(result, snapshot) + '<p class="chart-note">IP = intervalo paramétrico condicionado al modelo, no cobertura empírica acreditada. Masa total: ' +
        pct(snapshot.distribution.reduce((a,b)=>a+b,0)) + '.</p></section>' +
        '<section class="panel top-gap"><div class="panel-head"><h3>Historias individuales retenidas</h3><span>Sin renormalizar</span></div><div class="future-paths">' + snapshot.paths.map((path,i) => '<button type="button" data-fpath="' + i + '" aria-pressed="' + (selection?.kind === 'path' && selection.index === i) + '"><span>Camino ' + (i+1) + '</span><span>' + path.states.slice(1).map(s => ['00','01','10','11'][s]).join(' → ') + '</span><strong>' + pct(path.probability) + '</strong></button>').join('') + '</div><p class="future-mass">Masa representada: <strong>' + pct(snapshot.representedMass) + '</strong> · Otras historias: <strong>' + pct(snapshot.residualMass) + '</strong></p><p class="chart-note">Beam de ' + snapshot.beam + ' prefijos; hasta 12 historias mostradas. La masa residual incluye todas las historias omitidas. El grafo agregado superior conserva el 100 % de la masa y no depende de esta poda. Códigos: dos años consecutivos, 0 bajo el umbral y 1 por encima.</p></section>' : research(result, payload.metrics, horizon)) +
        '<div class="future-methods" aria-label="Vertientes conectadas al núcleo">' + ['V1','V2','V3','V4'].map(id => '<button type="button" data-ftrack="' + id + '"><span class="orb-sphere"><span>' + id + '</span></span><strong>' + ({V1:'Memoria e hipótesis',V2:'Probabilidades',V3:'Mecanismos sintéticos',V4:'Evidencia y versiones'}[id]) + '</strong></button>').join('') + '</div></div>');
    // Filtering changes only the visible historical country-year rows, never source data.
    const caseYear=container.querySelector('[data-onset-case-year]');
    const caseKind=container.querySelector('[data-onset-case-kind]');
    if(caseYear && caseKind){
      const filter=()=>{
        const year=caseYear.value,kind=caseKind.value;
        let count=0;
        container.querySelectorAll('[data-onset-case]').forEach(row=>{
          const visible=(year==='all'||row.dataset.year===year) &&
            (kind==='all'||row.dataset.kind===kind);
          row.hidden=!visible;
          if(visible)count++;
        });
        const state=container.querySelector('[data-onset-case-visible]');
        if(state)state.textContent=count+' casos';
      };
      caseYear.addEventListener('change',filter);
      caseKind.addEventListener('change',filter);
    }
    const gedCountry=container.querySelector('[data-ged-preview-country]');
    const gedYear=container.querySelector('[data-ged-preview-year]');
    if(gedCountry&&gedYear){
      const filterGed=()=>{
        let shown=0;
        container.querySelectorAll('[data-ged-preview-event]').forEach(card=>{
          card.hidden=!( (gedCountry.value==='all'||card.dataset.country===gedCountry.value) &&
            (gedYear.value==='all'||card.dataset.year===gedYear.value));
          if(!card.hidden)shown++;
        });
        container.querySelector('[data-ged-preview-visible]').textContent=shown+' incidentes';
      };
      gedCountry.addEventListener('change',filterGed);
      gedYear.addEventListener('change',filterGed);
    }
    container.querySelector('form').addEventListener('submit', e => {e.preventDefault(); load();});
    container.querySelectorAll('.future-controls select').forEach(select => select.addEventListener('change', () => {
      if (select.name === 'catalog') {
        catalog = catalogs.find(c => c.id === select.value);
        if (!catalog.countries.some(c => String(c.id) === String(country))) country = catalog.countries[0].id;
        horizon = Math.min(horizon, catalog.maxHorizon);
      } else if (select.name === 'country') country = Number(select.value); else model = select.value;
      abort?.abort(); request++; loading = false; payload = null; playing = false; observed = false; error = ''; render('[name="'+select.name+'"]');
    }));
    container.querySelector('[name="horizon"]')?.addEventListener('change', e => {horizon = Number(e.target.value); selection = null; playing = false; observed = observedCaseAvailable(payload?.result,horizon); render('[name="horizon"]');});
    container.querySelector('[name="speed"]')?.addEventListener('change', e => {speed = Number(e.target.value); schedule();});
    container.querySelector('[name="observed"]')?.addEventListener('change', e => {observed = e.target.checked; render('[name="observed"]');});
    container.querySelector('[data-play]')?.addEventListener('click', () => {playing = !playing; render('[data-play]');});
    container.querySelector('[data-fpause]')?.addEventListener('click', () => {paused = !paused; render('[data-fpause]');});
    container.querySelectorAll('[data-fmode]').forEach(b => b.addEventListener('click', () => {mode = b.dataset.fmode; playing = false; render('[data-fmode="'+mode+'"]');}));
    container.querySelectorAll('[data-ftrack]').forEach(b => b.addEventListener('click', () => onTrack(b.dataset.ftrack)));
    container.querySelectorAll('[data-fnode],[data-fedge],[data-fpath],[data-fevent]').forEach(element => {
      const select = () => {
        playing = false;
        if (element.dataset.fnode) {const [level,state] = element.dataset.fnode.split(':').map(Number); selection = {kind:'node',level,state};}
        else if (element.dataset.fedge) {const [level,index] = element.dataset.fedge.split(':').map(Number); selection = {kind:'edge',level,index};}
        else if (element.dataset.fevent) selection = {kind:'event',level:Number(element.dataset.fevent)};
        else selection = {kind:'path',index:Number(element.dataset.fpath)};
        const name = element.hasAttribute('data-fnode') ? 'data-fnode' : element.hasAttribute('data-fedge') ? 'data-fedge' : element.hasAttribute('data-fevent') ? 'data-fevent' : 'data-fpath';
        render('['+name+'="'+element.getAttribute(name)+'"]');
      };
      element.addEventListener('click', select);
      if (element.tagName.toLowerCase() !== 'button') element.addEventListener('keydown', e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); select();}});
    });
    const graphScroll = container.querySelector('.future-graph-scroll');
    if(graphScroll)graphScroll.scrollLeft=previousScroll;
    if (focus) container.querySelector(focus)?.focus({preventScroll:true});
    observer.disconnect(); observer.observe(container.querySelector('.future-network') || container);
    syncMotion();
  }
  async function loadObservedEvidence(mine, catalogId, countryId, signal) {
    const params=new URLSearchParams({catalog:catalogId,country:String(countryId)});
    try {
      const response=await fetch('/api/research-futures-evidence?'+params,{
        credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}});
      const data=await response.json();
      if(mine!==request||disposed||!payload)return;
      if(!response.ok||!data.ok||data.datasetVersion!=='26.1'||!Array.isArray(data.observedEvidence))
        throw new Error('EVIDENCE_UNAVAILABLE');
      payload.result.observedEvidence=data.observedEvidence;
      payload.result.observedEvidenceStatus='verified_public_archive_checksum';
    }catch(e){
      if(mine!==request||disposed||e.name==='AbortError'||!payload)return;
      payload.result.observedEvidenceStatus='source_temporarily_unavailable';
    }
    if(mine===request&&!disposed)render();
  }
  async function load() {
    abort?.abort(); abort = new AbortController(); const mine = ++request;
    loading = true; error = ''; payload = null; selection = null; playing = false; render();
    const params = new URLSearchParams({catalog:catalog.id,country:String(country),model});
    try {
      const response = await fetch('/api/research-futures?' + params, {credentials:'same-origin',cache:'no-store',signal:abort.signal,headers:{Accept:'application/json'}});
      const data = await response.json();
      if (mine !== request || disposed) return;
      if (!response.ok || !data.ok) throw new Error('El motor no dispone de un catálogo válido para esta selección.');
      payload = data;
      observed = observedCaseAvailable(data.result,horizon);
    } catch (e) {if (mine === request && !disposed && e.name !== 'AbortError') error = 'No se ha podido calcular. Vuelve a intentarlo con el botón; no se muestran valores de sustitución.';}
    finally {
      if (mine === request && !disposed) {
        loading = false; render();
        if(payload?.result?.observedStates?.length)
          void loadObservedEvidence(mine,catalog.id,country,abort.signal);
      }
    }
  }
  function lifecycle() {syncMotion();}
  function motionChange(){if(media.matches)playing=false;render();}
  const observer = new IntersectionObserver(entries => {inView = entries.some(e => e.isIntersecting); syncMotion();});
  observer.observe(container); document.addEventListener('visibilitychange', lifecycle); media.addEventListener('change', motionChange);
  render(); load();
  return () => {disposed = true; request++; abort?.abort(); clearTimer(); observer.disconnect(); document.removeEventListener('visibilitychange',lifecycle); media.removeEventListener('change',motionChange);};
}
