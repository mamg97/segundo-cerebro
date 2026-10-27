// Private 2027 shadow-view navigation. No country-level predictions are bundled.
// The real Google Sheets URL comes exclusively from an authenticated
// PsicoExperimentos record returned by /api/research-lab.
const OBSERVATORY_ID = 'ucdp261-2027-mobile-private-ranking-20261020';
const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function approvedPrivateRankingLink(experiments = []) {
  if (!Array.isArray(experiments)) return null;
  const matches = experiments.filter(row =>
    row?.id === OBSERVATORY_ID &&
    row.track === 'V2' &&
    row.status === 'SHADOW_NO_EMITIDO' &&
    row.metric === 'paises_ranqueados_sin_emision' &&
    row.value === 196 &&
    row.datasetVersion === 'UCDP OrganizedViolenceCY 26.1');
  // No ambiguous duplicate records. Never fall back to an arbitrary evidence URL.
  if (matches.length !== 1) return null;
  try {
    const url = new URL(matches[0].evidence);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' ||
        url.username || url.password || url.port ||
        !/^\/spreadsheets\/d\/[a-zA-Z0-9_-]{20,}\/edit\/?$/.test(url.pathname) ||
        (url.search && url.search !== '?usp=drivesdk') ||
        (url.hash && !/^#gid=\d+$/.test(url.hash))) return null;
    return url.href;
  } catch {
    return null;
  }
}

// Presentation consistency only; this does not verify cryptographic receipts.
export function annual2027Registration(predictions = [], progress = {}) {
  const rows = (Array.isArray(predictions) ? predictions : []).filter(p =>
    /^ucdp261-2027-/.test(p?.modelVersion || '') && p.horizon === 'Calendar year 2027');
  const phases = progress?.status === 'ok' && Array.isArray(progress.phases)
    ? progress.phases.filter(p => p.fase_id === 'MAD-05') : [];
  const cells = new Set(rows.map(p => p.region + '|' + p.modelVersion));
  const countries = new Set(rows.map(p => p.region));
  const models = new Set(rows.map(p => p.modelVersion));
  const complete = rows.length === 1176 && cells.size === 1176 && countries.size === 196 && models.size === 6
    && new Set(rows.map(p => p.id)).size === rows.length
    && rows.every(p => p.id && p.region && ['EMITIDA_EXPERIMENTAL','RESUELTA'].includes(p.status)
      && Number.isFinite(p.probability) && p.probability >= 0 && p.probability <= 1
      && Number.isFinite(Date.parse(p.asOf)) && Number.isFinite(Date.parse(p.issuedAt))
      && Date.parse(p.asOf) <= Date.parse(p.issuedAt)
      && Date.parse(p.issuedAt) < Date.parse('2027-01-01T00:00:00Z'));
  return {count:rows.length, recorded:complete && phases.length === 1
    && phases[0].estado === 'COMPLETADA' && phases[0].criterio_superado === 'SI'};
}

export function shadow2027Section(experiments, predictions = [], progress = {}) {
  const registration = annual2027Registration(predictions, progress);
  const link = approvedPrivateRankingLink(experiments);
  const issued = Array.isArray(predictions) ? predictions.length : 0;
  const action = link
    ? '<p><a class="shadow-2027-action" href="' + htmlEscape(link) +
        '" target="_blank" rel="noopener noreferrer">Abrir ranking privado 2027 ↗</a></p>' +
      '<p class="subtext">Se abrirá Google Sheets. Puede solicitar iniciar sesión en la cuenta autorizada.</p>'
    : '<p class="subtext">El ranking todavía no tiene una fuente privada verificada en el registro. No se sustituye por datos de ejemplo ni se publica una URL.</p>';
  return '<section class="panel top-gap" aria-label="Observatorio 2027 experimental">' +
    '<div class="panel-head"><h3>Observatorio de riesgo 2027</h3>' +
    '<span>' + (registration.recorded ? 'EMITIDA · EXPERIMENTAL' : 'EXPERIMENTAL · EMISIÓN NO ACREDITADA') + '</span></div>' +
    '<p class="subtext">Probabilidad de alcanzar 25 o más muertes por violencia estatal ' +
    'durante TODO el año 2027 en el territorio de un país. ' +
    'No representa inicio de guerra, conflicto nuevo, golpe de Estado o aviso de seguridad.</p>' +
    '<div class="kpi-list">' +
    '<div class="kpi"><div><strong>196 países · 6 modelos</strong>' +
    '<small>1.176 probabilidades en una cohorte privada sin reentrenamiento</small></div>' +
    '<b>' + (registration.recorded ? 'REGISTRADA' : 'SHADOW') + '</b></div>' +
    '<div class="kpi"><div><strong>Filas de PsicoPredicciones</strong>' +
    '<small>Registro general; ' + registration.count + ' filas corresponden a la cohorte anual. No son resultados independientes.</small></div>' +
    '<b>' + String(issued) + '</b></div></div>' +
    action +
    '<div class="top-gap"><button type="button" data-shadow2027-load class="refresh">Ver países y modelos aquí (requiere Access verificado)</button><div data-shadow2027-content role="status" aria-live="polite"></div></div>' +
    '<p class="legend-note"><strong>Validez científica:</strong> resultados exploratorios ' +
    'de una fuente histórica revisada. La evaluación del año completo 2027 ' +
    'solo será posible cuando se publiquen los datos oficiales, previsiblemente en 2028. ' +
    'Los resultados no deben utilizarse para decisiones de seguridad ni de inversión.</p>' +
    '</section>';
}
