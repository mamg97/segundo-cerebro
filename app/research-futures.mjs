// The browser renders server-calculated probabilities. It never fits a model.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value, digits = 3) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('es-ES', {maximumFractionDigits: digits}) : 'Sin datos';
const pct = value => fmt(value * 100, 2) + ' %';
const COLORS = ['#69c5f6', '#ff9b45', '#84d9bd', '#bdabff'];
const SHORT = ['Bajo → bajo', 'Entrada', 'Salida', 'Persistencia'];
const option = (value, label, selected) => '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
const point = (level, state) => ({x: 76 + level * 126, y: level ? 90 + state * 83 : 215});
const curve = (from, to) => 'M' + from.x + ' ' + from.y + ' C' + (from.x + 60) + ' ' + from.y + ' ' + (to.x - 60) + ' ' + to.y + ' ' + to.x + ' ' + to.y;

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
    for (let i = 1; i < states.length; i++) if (states[i] !== null && states[i - 1] !== null) svg += '<path class="future-observed" d="' + curve(point(i - 1, states[i - 1]), point(i, states[i])) + '" fill="none" stroke="#fff5df" stroke-width="2.5" stroke-dasharray="7 5"><title>Recorrido observado posteriormente en la release revisada</title></path>';
  }
  levels.forEach((level, i) => level.distribution.forEach((mass, state) => {
    if (!i && state !== result.initial) return;
    const p = point(i, state), selected = selection?.kind === 'node' && selection.level === i && selection.state === state;
    svg += '<g class="future-node' + (selected ? ' selected' : '') + '" tabindex="0" role="button" data-fnode="' + i + ':' + state + '" aria-label="' + level.year + ', ' + esc(SHORT[state]) + ', probabilidad marginal ' + pct(mass) + '">';
    svg += '<rect x="' + (p.x-42) + '" y="' + (p.y-25) + '" width="84" height="80" fill="transparent"/>';
    if (!i) svg += '<circle class="future-core-glow" cx="' + p.x + '" cy="' + p.y + '" r="44" fill="url(#future-core)"/>';
    svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (i ? Math.max(4, 20 * Math.sqrt(mass)) : 15) + '" fill="' + (i ? COLORS[state] : '#ffba78') + '" fill-opacity="' + (mass ? '.85' : '.12') + '" stroke="' + (selected ? '#fff' : COLORS[state]) + '" stroke-width="' + (selected ? 3 : 1) + '"/>' +
      '<text x="' + p.x + '" y="' + (p.y + 33) + '" text-anchor="middle" class="future-node-label">' + (i ? pct(mass) : 'ESTADO CONOCIDO') + '</text>' +
      (!i ? '<text x="' + p.x + '" y="' + (p.y + 50) + '" text-anchor="middle" class="future-year-note">' + esc(SHORT[state]) + '</text>' : '') + '</g>';
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

// Revealing an outcome is a UI choice, not an independently sealed prospective trial.
export function historicalCasePanel(result, horizon, revealed = false) {
  const caseResult = result.caseEvaluations?.[horizon - 1];
  if (!caseResult) return '';
  let html = '<section class="panel top-gap future-case-evaluation"><div class="panel-head"><h3>¿Qué ocurrió realmente?</h3><span>' +
    esc(result.country.name) + ' · ' + caseResult.endYear + '</span></div>' +
    '<p class="legend-note">Caso histórico sobre una fuente revisada. Probabilidades calculadas con el corte ' + result.cutoff +
    '; solo después se consulta el desenlace. No es predicción prospectiva ni acredita disponibilidad histórica as-of.</p>';
  if (!caseResult.available) return html +
    '<p class="subtext">Este país y horizonte no tienen una secuencia observada completa y no se puntúan. No se transforman los datos ausentes en ausencia de conflicto.</p></section>';
  html += '<button type="button" class="future-calculate" data-case-reveal aria-pressed="' + revealed + '">' +
    (revealed ? 'Ocultar desenlace histórico' : 'Revelar desenlace y evaluar modelos') + '</button>';
  if (!revealed) return html + '<p class="chart-note">Puedes explorar primero las trayectorias sin revelar el resultado histórico. El dataset retrospectivo ya incluye el desenlace; no es un ensayo ciego sellado.</p></section>';
  const selected = caseResult.models[result.model];
  html += '<p class="subtext">Estado registrado al final: <strong>' + esc(caseResult.actualLabel) +
    '</strong>. Probabilidad que asignaba el modelo elegido: <strong>' + pct(selected.probabilityActual) +
    '</strong>. Brier individual: <strong>' + fmt(selected.brier, 5) +
    '</strong> (escala 0–2).</p><div class="scroll-x"><table><thead><tr><th>Modelo</th><th>P(estado real)</th><th>Brier individual ↓</th><th>Log-loss individual ↓</th></tr></thead><tbody>' +
    Object.entries(caseResult.models).map(([model, scores]) =>
      '<tr' + (model === result.model ? ' class="future-current-model"' : '') + '><td>' + esc(scores.label) +
      '</td><td>' + pct(scores.probabilityActual) + '</td><td>' + fmt(scores.brier, 5) +
      '</td><td>' + fmt(scores.logLoss, 5) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<p class="chart-note">Los cinco modelos comparten el mismo país, origen, horizonte y resultado. Un Brier menor en un caso no demuestra superioridad ni calibración: compara las muestras agregadas en Investigador.</p>';
  return html + '</section>';
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

export function mountFutureExplorer(container, catalogs, {onTrack = () => {}} = {}) {
  if (!catalogs?.length) {
    container.innerHTML = '<section class="panel empty"><strong>Futures Engine · Sin datos auditados</strong><p>El registro privado aún no contiene un catálogo de transiciones válido. No se dibujan probabilidades de ejemplo.</p></section>';
    return () => {};
  }
  container.setAttribute('aria-live','off');
  let catalog = catalogs[0], country = catalog.countries[0].id, model = 'markov', horizon = Math.min(3, catalog.maxHorizon);
  let payload = null, selection = null, mode = 'explorer', paused = false, playing = false, observed = false, caseRevealed = false, speed = 1;
  let error = '', loading = false, disposed = false, request = 0, abort = null, timer = null, inView = true;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clearTimer = () => { if (timer !== null) window.clearTimeout(timer); timer = null; };
  function schedule() {
    clearTimer();
    if (!playing || disposed || document.hidden || !inView || media.matches || !payload) return;
    timer = window.setTimeout(() => {timer = null; horizon = horizon >= catalog.maxHorizon ? 1 : horizon + 1; selection = null; const focus = document.activeElement?.hasAttribute('data-play') ? '[data-play]' : null; render(focus);}, 1600 / speed);
  }
  function syncMotion() {
    container.dataset.motion = paused || media.matches || document.hidden || !inView ? 'paused' : 'running';
    schedule();
  }
  function render(focus = null) {
    if (disposed) return;
    const previousScroll = container.querySelector('.future-graph-scroll')?.scrollLeft || 0;
    const result = payload?.result, snapshot = result?.snapshots[horizon - 1];
    container.innerHTML = '<div class="section-heading"><div><span class="eyebrow">FUTURES ENGINE / ' + esc(catalog.version) + '</span><h2>Un presente. Futuros posibles.</h2></div><p>Transiciones observables · evidencia retrospectiva</p></div>' +
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
        distribution(result, snapshot) + '<p class="chart-note">IP = intervalo paramétrico condicionado al modelo; no es un intervalo de precisión real ni tiene cobertura empírica acreditada. Distribución puntual suma ' + pct(snapshot.distribution.reduce((a,b) => a+b,0)) + '.</p>' +
         historicalCasePanel(result, horizon, caseRevealed) +
        '<div class="future-legend">' + SHORT.map((name,i) => '<span data-state="' + i + '"><i></i>' + esc(name) + '</span>').join('') + '</div>' +
        (mode === 'explorer' ? '<div class="future-explorer"><section class="panel future-network"><div class="panel-head"><h3>Red de transiciones</h3><label class="future-observed-toggle"><input type="checkbox" name="observed"' + (observed ? ' checked' : '') + '> Ver recorrido observado después</label></div><div class="future-graph-scroll">' + futureGraph(result, horizon, selection, observed) + '</div><p class="chart-note">Desliza horizontalmente para recorrer los años. Grosor = 0,5 + 14 × flujo agregado; área de nodos proporcional a masa con radio mínimo de 4 px. Los pulsos son decorativos; su velocidad no tiene unidad social.</p></section><aside class="panel future-detail" aria-live="polite">' + detail(result, horizon, selection) + '</aside></div>' +
        '<section class="panel top-gap"><div class="panel-head"><h3>Historias individuales retenidas</h3><span>Sin renormalizar</span></div><div class="future-paths">' + snapshot.paths.map((path,i) => '<button type="button" data-fpath="' + i + '" aria-pressed="' + (selection?.kind === 'path' && selection.index === i) + '"><span>Camino ' + (i+1) + '</span><span>' + path.states.slice(1).map(s => ['00','01','10','11'][s]).join(' → ') + '</span><strong>' + pct(path.probability) + '</strong></button>').join('') + '</div><p class="future-mass">Masa representada: <strong>' + pct(snapshot.representedMass) + '</strong> · Otras historias: <strong>' + pct(snapshot.residualMass) + '</strong></p><p class="chart-note">Beam de ' + snapshot.beam + ' prefijos; hasta 12 historias mostradas. La masa residual incluye todas las historias omitidas. El grafo agregado superior conserva el 100 % de la masa y no depende de esta poda. Códigos: dos años consecutivos, 0 bajo el umbral y 1 por encima.</p></section>' : research(result, payload.metrics, horizon)) +
        '<div class="future-methods" aria-label="Vertientes conectadas al núcleo">' + ['V1','V2','V3','V4'].map(id => '<button type="button" data-ftrack="' + id + '"><span class="orb-sphere"><span>' + id + '</span></span><strong>' + ({V1:'Memoria e hipótesis',V2:'Probabilidades',V3:'Mecanismos sintéticos',V4:'Evidencia y versiones'}[id]) + '</strong></button>').join('') + '</div>');
    container.querySelector('form').addEventListener('submit', e => {e.preventDefault(); load();});
    container.querySelectorAll('.future-controls select').forEach(select => select.addEventListener('change', () => {
      if (select.name === 'catalog') {
        catalog = catalogs.find(c => c.id === select.value);
        if (!catalog.countries.some(c => String(c.id) === String(country))) country = catalog.countries[0].id;
        horizon = Math.min(horizon, catalog.maxHorizon);
      } else if (select.name === 'country') country = Number(select.value); else model = select.value;
      abort?.abort(); request++; loading = false; payload = null; playing = false; caseRevealed = false; error = ''; render('[name="'+select.name+'"]');
    }));
    container.querySelector('[name="horizon"]')?.addEventListener('change', e => {horizon = Number(e.target.value); selection = null; playing = false; render('[name="horizon"]');});
    container.querySelector('[name="speed"]')?.addEventListener('change', e => {speed = Number(e.target.value); schedule();});
    container.querySelector('[name="observed"]')?.addEventListener('change', e => {observed = e.target.checked; render('[name="observed"]');});
    container.querySelector('[data-case-reveal]')?.addEventListener('click', () => {caseRevealed = !caseRevealed; render('[data-case-reveal]');});
    container.querySelector('[data-play]')?.addEventListener('click', () => {playing = !playing; render('[data-play]');});
    container.querySelector('[data-fpause]')?.addEventListener('click', () => {paused = !paused; render('[data-fpause]');});
    container.querySelectorAll('[data-fmode]').forEach(b => b.addEventListener('click', () => {mode = b.dataset.fmode; playing = false; render('[data-fmode="'+mode+'"]');}));
    container.querySelectorAll('[data-ftrack]').forEach(b => b.addEventListener('click', () => onTrack(b.dataset.ftrack)));
    container.querySelectorAll('[data-fnode],[data-fedge],[data-fpath]').forEach(element => {
      const select = () => {
        playing = false;
        if (element.dataset.fnode) {const [level,state] = element.dataset.fnode.split(':').map(Number); selection = {kind:'node',level,state};}
        else if (element.dataset.fedge) {const [level,index] = element.dataset.fedge.split(':').map(Number); selection = {kind:'edge',level,index};}
        else selection = {kind:'path',index:Number(element.dataset.fpath)};
        const name = element.hasAttribute('data-fnode') ? 'data-fnode' : element.hasAttribute('data-fedge') ? 'data-fedge' : 'data-fpath';
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
    } catch (e) {if (mine === request && !disposed && e.name !== 'AbortError') error = 'No se ha podido calcular. Vuelve a intentarlo con el botón; no se muestran valores de sustitución.';}
    finally {if (mine === request && !disposed) {loading = false; render();}}
  }
  function lifecycle() {syncMotion();}
  function motionChange(){if(media.matches)playing=false;render();}
  const observer = new IntersectionObserver(entries => {inView = entries.some(e => e.isIntersecting); syncMotion();});
  observer.observe(container); document.addEventListener('visibilitychange', lifecycle); media.addEventListener('change', motionChange);
  render(); load();
  return () => {disposed = true; request++; abort?.abort(); clearTimer(); observer.disconnect(); document.removeEventListener('visibilitychange',lifecycle); media.removeEventListener('change',motionChange);};
}
