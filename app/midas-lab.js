import { compareMidasSortValues } from "./midas-thesis-table.js";

const BOOTSTRAP_LABELS = {
  lgbm_return: "LightGBM Return",
  lgbm_direction: "LightGBM Direction",
  lgbm_ranker: "LightGBM Ranker",
  mlp_return: "MLP",
  lstm_return: "LSTM",
  arima_return: "ARIMA",
  ensemble_consensus: "Ensemble",
  benchmark_spy: "SPY",
  benchmark_rsp: "RSP"
};

const MIDAS_LAB_GROUPS = [
  ["weekly_ml_demo", "Weekly ML"],
  ["capital_cycle_demo", "Capital Cycle"],
  ["buy_the_dip_demo", "Buy The Dip"],
  ["tfg_demo_adaptado", "TFG"],
  ["paper_nuevo", "Estrategias diarias"],
  ["tfm_demo_adaptado", "TFM"],
  ["diario_heredado", "Genético original"]
];

const MIDAS_LAB_COLUMNS = [
  ["algorithm", "Algoritmo"],
  ["group", "Bloque"],
  ["activity", "Actividad actual"],
  ["assets", "Activos"],
  ["return", "Rent. acum."],
  ["sessions", "Sesiones"],
  ["date", "Último cierre"],
  ["dd", "DD"]
];

function midasLabGroupTitle(group) {
  return MIDAS_LAB_GROUPS.find(([id]) => id === group)?.[1] || group || "Sin bloque";
}

export function renderMidasVisualLab(dashboard, lab = null) {
  const active = activeMidasRows(dashboard, lab);
  if (!active.length) return "";
  const weekly = active.filter((row) => row.group === "weekly_ml_demo");
  const hasLiveWeeklyDaily = weekly.some((row) => row.daily_mode === true);
  const weeklyNote = !weekly.length ? "" :
    '<p class="midas-lab-group-note"><strong>Weekly ML:</strong> ' +
      (hasLiveWeeklyDaily
        ? 'Señales los viernes; compra paper en la primera apertura siguiente, valoración diaria al cierre y liquidación semanal. No se reconstruyen compras de semanas anteriores.'
        : 'Señales congeladas el viernes; liquidación simulada al cierre de la semana siguiente. Esta variante no registra compras ni rentabilidad diaria antes de liquidar.') +
    '</p>';

  return '<section class="midas-lab">' +
    '<div class="midas-lab-heading">' +
      '<div><span class="eyebrow">COMPETICIÓN</span><h3>Comportamiento de los algoritmos</h3>' +
      '<p>Todos los bloques en una tabla. Ordena por cualquier columna y pulsa un algoritmo para consultar su ficha completa.</p></div>' +
      '<div class="midas-lab-legend"><span><i class="is-positive"></i>positivo</span><span><i class="is-negative"></i>negativo</span><span><i class="is-neutral"></i>esperando</span></div>' +
    '</div>' +
    '<div class="midas-lab-mobile-sort"><label for="midas-lab-sort-select">Ordenar por</label>' +
      '<select id="midas-lab-sort-select" data-midas-lab-mobile-sort aria-label="Columna de ordenación">' +
        MIDAS_LAB_COLUMNS.map(([key, title]) =>
          '<option value="' + key + '"' + (key === "return" ? ' selected' : '') + '>' + escapeHtml(title) + '</option>').join("") +
      '</select><button type="button" data-midas-lab-mobile-direction aria-label="Cambiar sentido de ordenación">↓</button></div>' +
    '<div class="midas-lab-table-wrap"><table class="midas-lab-table">' +
      '<thead><tr>' +
        MIDAS_LAB_COLUMNS.map(([key, title]) =>
          '<th scope="col" aria-sort="' + (key === "return" ? "descending" : "none") + '">' +
          '<button type="button" class="midas-lab-sort" data-midas-lab-sort-key="' + key + '" aria-label="Ordenar por ' + escapeHtml(title) + '">' +
          escapeHtml(title) + ' <span data-midas-lab-sort-indicator aria-hidden="true">' +
          (key === "return" ? "↓" : "↕") + '</span></button></th>').join("") +
      '</tr></thead>' +
      '<tbody>' + active.map(renderMidasLabRow).join("") + '</tbody>' +
    '</table></div>' + weeklyNote +
  '</section>';
}

export function compareMidasLabRows(a, b, key, direction = "asc") {
  const numeric = new Set(["return", "sessions", "dd"]).has(key);
  const date = key === "date";
  const get = (item) => item?.[key] ?? "";
  return compareMidasSortValues(get(a), get(b), { numeric, direction: date ? direction : direction }) ||
    compareMidasSortValues(a?.algorithm, b?.algorithm);
}

// Same interaction model as the MIDAS thesis table: click to reverse the selected
// column, use a stable algorithm-name tie-breaker, leave unknown metrics last.
export function bindMidasLabSorting(root) {
  const table = root.querySelector(".midas-lab-table");
  if (!table?.tBodies[0]) return;
  const tbody = table.tBodies[0];
  const rows = [...tbody.rows];
  const buttons = [...table.querySelectorAll("[data-midas-lab-sort-key]")];
  const mobileSort = root.querySelector("[data-midas-lab-mobile-sort]");
  const mobileDirection = root.querySelector("[data-midas-lab-mobile-direction]");
  let activeKey = "return";
  let direction = "desc";

  function sort(key, nextDirection) {
    const value = (row) => ({
      algorithm: row.getAttribute("data-midas-lab-sort-algorithm"),
      group: row.getAttribute("data-midas-lab-sort-group"),
      activity: row.getAttribute("data-midas-lab-sort-activity"),
      assets: row.getAttribute("data-midas-lab-sort-assets"),
      return: row.getAttribute("data-midas-lab-sort-return"),
      sessions: row.getAttribute("data-midas-lab-sort-sessions"),
      date: row.getAttribute("data-midas-lab-sort-date"),
      dd: row.getAttribute("data-midas-lab-sort-dd")
    });
    rows.sort((a, b) => compareMidasLabRows(value(a), value(b), key, nextDirection));
    const fragment = document.createDocumentFragment();
    rows.forEach((row) => fragment.appendChild(row));
    tbody.appendChild(fragment);
    activeKey = key;
    direction = nextDirection;
    for (const button of buttons) {
      const selected = button.dataset.midasLabSortKey === key;
      button.closest("th")?.setAttribute("aria-sort", selected ?
        (direction === "desc" ? "descending" : "ascending") : "none");
      const indicator = button.querySelector("[data-midas-lab-sort-indicator]");
      if (indicator) indicator.textContent = selected ? (direction === "desc" ? "↓" : "↑") : "↕";
    }
    if (mobileSort) mobileSort.value = key;
    if (mobileDirection) {
      mobileDirection.textContent = direction === "desc" ? "↓" : "↑";
      mobileDirection.setAttribute("aria-label", direction === "desc" ? "Orden descendente; cambiar a ascendente" : "Orden ascendente; cambiar a descendente");
    }
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.midasLabSortKey;
    const next = key === activeKey ? (direction === "desc" ? "asc" : "desc") :
      (["algorithm", "group", "activity", "assets"].includes(key) ? "asc" : "desc");
    sort(key, next);
  }));
  mobileSort?.addEventListener("change", () => {
    const key = mobileSort.value;
    sort(key, ["algorithm", "group", "activity", "assets"].includes(key) ? "asc" : "desc");
  });
  mobileDirection?.addEventListener("click", () => sort(activeKey, direction === "desc" ? "asc" : "desc"));
  sort("return", "desc");
}

export function renderMidasAlgorithmDetail(dashboard, lab, algorithmId) {
  const item = activeMidasRows(dashboard, lab).find((row) => String(row.id) === String(algorithmId));
  if (!item) {
    return '<div class="midas-algorithm-detail"><button type="button" class="midas-algorithm-back" data-midas-algorithm-back>← Volver a la competición</button><p class="midas-lab-empty">No se ha encontrado el algoritmo.</p></div>';
  }

  const meta = algorithmMeta(item);
  const positions = Array.isArray(item.positions) ? item.positions : [];
  const provenance = item.provenance || "";
  const note = item.note || "";
  const equity = typeof item.last_equity === "number" && Number.isFinite(item.last_equity)
    ? formatMoney(item.last_equity, item.currency)
    : "—";
  const volatility = formatPercent(item.annualized_volatility_pct);
  const sharpe = typeof item.sharpe_0rf === "number" && Number.isFinite(item.sharpe_0rf)
    ? item.sharpe_0rf.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

  return '<article class="midas-algorithm-detail">' +
    '<button type="button" class="midas-algorithm-back" data-midas-algorithm-back>← Volver a la competición</button>' +
    '<header class="midas-algorithm-detail-head">' +
      '<div><span class="eyebrow">DETALLE DEL ALGORITMO</span><h3>' + escapeHtml(item.label) + '</h3>' +
      '<p><span class="midas-lab-table-state"><i></i>' + escapeHtml(meta.status) + '</span>' +
      (provenance ? '<small>Origen: ' + escapeHtml(provenance) + '</small>' : '') + '</p></div>' +
      '<strong class="midas-algorithm-detail-return is-' + tone(meta.returnPct) + '">' + formatPercent(meta.returnPct) + '</strong>' +
    '</header>' +
    '<div class="midas-algorithm-detail-metrics">' +
      metric("Rentabilidad acumulada", formatPercent(meta.returnPct)) +
      metric("Rentabilidad día", formatPercent(item.day_return_pct)) +
      metric("Volatilidad anual.", volatility) +
      metric("Máx. drawdown", meta.drawdown) +
      metric("Sharpe 0rf", sharpe) +
      metric("Sesiones", meta.sessions || "—") +
      metric("Último cierre", formatDate(meta.latestDate)) +
      metric("Capital demo", equity) +
    '</div>' +
    '<div class="midas-algorithm-detail-grid">' +
      '<section><small>Actividad actual</small><strong>' + escapeHtml(meta.activityLabel) + '</strong>' +
        '<div class="midas-algorithm-detail-assets">' + renderTickerChips(meta.activityTickers, 12) + '</div></section>' +
      '<section><small>Posiciones / señales</small>' +
        (positions.length ? '<div class="midas-algorithm-position-list">' + positions.slice(0, 12).map(renderPosition).join("") + '</div>' : '<strong>Sin posiciones detalladas</strong>') +
      '</section>' +
    '</div>' +
    '<section class="midas-algorithm-chart-card"><div><strong>Evolución</strong><small>Patrimonio ficticio · datos del diario</small></div>' +
      '<div class="midas-algorithm-chart">' + renderSparkline(meta.history, item.label, meta.returnPct) + '</div></section>' +
    (item.group === "weekly_ml_demo" && !item.bootstrap
      ? '<p class="midas-algorithm-note is-warning">' +
        (item.daily_mode
          ? 'Modo paper diario prospectivo: compras simuladas tras señal semanal, NAV a cada cierre; no es operativa real ni reconstrucción retroactiva.'
          : 'Liquidación semanal diferida: esta versión no registra entradas efectivas ni NAV diarios de lunes a jueves. Las señales no son posiciones abiertas.') +
        '</p>' : '') +
    (note ? '<p class="midas-algorithm-note">' + escapeHtml(note) + '</p>' : '') +
    (item.bootstrap ? '<p class="midas-algorithm-note is-warning">Bootstrap técnico retrospectivo: no cuenta como resultado forward.</p>' : '') +
  '</article>';
}

function activeMidasRows(dashboard, lab) {
  const rows = Array.isArray(dashboard?.tracks) ? dashboard.tracks : [];
  const liveWeekly = rows.some((row) => row.group === "weekly_ml_demo" && row.status === "demo_con_diario");
  const bootstrapRows = liveWeekly ? [] : bootstrapMidasLabRows(lab);
  return [...bootstrapRows, ...rows.filter((row) => row.group !== "historica_pendiente")];
}

function algorithmMeta(item) {
  const history = Array.isArray(item.equity_history) ? item.equity_history : [];
  const hasUnsettledWeeklySignal = item.group === "weekly_ml_demo" && !item.bootstrap &&
    history.length === 1 && Array.isArray(item.activity_tickers) && item.activity_tickers.length > 0;
  const returnPct = hasUnsettledWeeklySignal ? null :
    (typeof item.return_pct === "number" && Number.isFinite(item.return_pct) ? item.return_pct : null);
  const latestDate = item.last_session || item.mark_date || null;
  const positions = Array.isArray(item.positions) ? item.positions : [];
  const fallbackTickers = positions.map((position) => position.ticker).filter(Boolean);
  const activityTickers = (Array.isArray(item.activity_tickers) && item.activity_tickers.length
    ? item.activity_tickers : fallbackTickers).filter(Boolean);
  const staleWeeklyBuyLabel = item.group === "weekly_ml_demo" && !item.bootstrap &&
    /compras? para próxima apertura/i.test(String(item.activity_label || ""));
  const activityLabel = staleWeeklyBuyLabel
    ? (activityTickers.length || Number(item.pending_orders_count) || 0) +
        " señales congeladas · liquidación semanal pendiente"
    : (item.activity_label ||
      (fallbackTickers.length
        ? fallbackTickers.length + (fallbackTickers.length === 1 ? " posición" : " posiciones")
        : item.status === "demo_con_diario" ? "Sin compras · en efectivo" : "Esperando actividad"));
  const status = item.bootstrap ? "Bootstrap técnico" :
    (hasUnsettledWeeklySignal ? "Señal sin liquidar" : statusLabel(item.status));
  const drawdown = typeof item.max_drawdown_pct === "number" && Number.isFinite(item.max_drawdown_pct)
    ? formatPercent(item.max_drawdown_pct) : "—";
  return { history, returnPct, latestDate, activityTickers, activityLabel, status, sessions: history.length, drawdown };
}

function metric(label, value) {
  return '<span><small>' + escapeHtml(label) + '</small><strong>' + escapeHtml(value) + '</strong></span>';
}

function renderPosition(position) {
  const ticker = position?.ticker || position?.symbol || "Activo";
  const details = [];
  for (const [label, value] of [["peso", position?.weight], ["acciones", position?.shares], ["valor", position?.market_value]]) {
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) {
      const formatted = label === "peso"
        ? (Number(value) * (Math.abs(Number(value)) <= 1 ? 100 : 1)).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + "%"
        : Number(value).toLocaleString("es-ES", { maximumFractionDigits: 2 });
      details.push(label + " " + formatted);
    }
  }
  return '<span><strong>' + escapeHtml(ticker) + '</strong>' + (details.length ? '<small>' + escapeHtml(details.join(" · ")) + '</small>' : '') + '</span>';
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return (value > 0 ? "+" : "") + value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
}

function formatMoney(value, currency) {
  if (!Number.isFinite(Number(value))) return "—";
  if (!currency) return Number(value).toLocaleString("es-ES", { maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return Number(value).toLocaleString("es-ES", { maximumFractionDigits: 2 }) + " " + currency;
  }
}

function formatDate(value) {
  if (!value) return "Sin cierre";
  const raw = String(value);
  const date = new Date(raw.length <= 10 ? raw + "T12:00:00" : raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "");
}

function tone(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) < 0.000001) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function renderSparkline(history, label, returnPct) {
  const rows = (Array.isArray(history) ? history : []).map((item) => ({ date: item?.date, nav: Number(item?.nav) }))
    .filter((item) => item.date && Number.isFinite(item.nav) && item.nav >= 0).slice(-120);
  const width = 220, height = 76, left = 8, right = 8, top = 9, bottom = 9;
  const className = "is-" + tone(returnPct);
  if (!rows.length) {
    return '<div class="midas-lab-spark is-waiting" aria-label="' + escapeHtml(label) + ' sin histórico todavía"><span class="midas-lab-wait-line"></span><span class="midas-lab-wait-dot"></span></div>';
  }
  if (rows.length === 1) {
    return '<svg class="midas-lab-spark ' + className + '" viewBox="0 0 220 76" role="img" aria-label="' + escapeHtml(label) + ': una sesión registrada">' +
      '<line class="midas-lab-baseline" x1="8" y1="38" x2="212" y2="38"></line><circle class="midas-lab-endpoint" cx="212" cy="38" r="4"></circle></svg>';
  }
  let min = Math.min(...rows.map((item) => item.nav));
  let max = Math.max(...rows.map((item) => item.nav));
  if (min === max) {
    const delta = Math.max(1, Math.abs(min) * 0.005);
    min -= delta; max += delta;
  } else {
    const pad = (max - min) * 0.12; min -= pad; max += pad;
  }
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const points = rows.map((item, index) => {
    const x = left + (index / (rows.length - 1)) * plotWidth;
    const y = top + ((max - item.nav) / (max - min)) * plotHeight;
    return [x, y];
  });
  const serialized = points.map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join(" ");
  const last = points.at(-1);
  return '<svg class="midas-lab-spark ' + className + '" viewBox="0 0 220 76" role="img" aria-label="' + escapeHtml(label) + ': ' + rows.length + ' sesiones">' +
    '<line class="midas-lab-baseline" x1="8" y1="38" x2="212" y2="38"></line>' +
    '<polyline class="midas-lab-path" points="' + serialized + '"></polyline>' +
    '<circle class="midas-lab-endpoint" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4"></circle></svg>';
}

function renderTickerChips(tickers, limit = 6) {
  const values = (Array.isArray(tickers) ? tickers : []).filter(Boolean);
  if (!values.length) return '<span class="midas-lab-empty">—</span>';
  const visible = values.slice(0, limit);
  const rest = values.length - visible.length;
  return '<div class="midas-lab-table-tickers">' +
    visible.map((ticker) => '<b>' + escapeHtml(ticker) + '</b>').join("") +
    (rest > 0 ? '<span>+' + rest + '</span>' : '') +
  '</div>';
}

function renderMidasLabRow(item) {
  const meta = algorithmMeta(item);
  const group = midasLabGroupTitle(item.group);
  const ddValue = typeof item.max_drawdown_pct === "number" && Number.isFinite(item.max_drawdown_pct)
    ? item.max_drawdown_pct : null;
  const attrs = {
    algorithm: item.label,
    group,
    activity: meta.activityLabel,
    assets: meta.activityTickers.join(", "),
    return: meta.returnPct,
    sessions: meta.sessions || 0,
    date: meta.latestDate,
    dd: ddValue
  };
  const sortAttrs = Object.entries(attrs).map(([key, value]) =>
    ' data-midas-lab-sort-' + key + '="' + escapeHtml(value == null ? "" : value) + '"').join("");
  return '<tr class="midas-lab-row is-' + tone(meta.returnPct) + (item.bootstrap ? ' is-bootstrap' : '') + '" ' +
    'data-midas-algorithm-id="' + escapeHtml(item.id) + '"' + sortAttrs +
    ' tabindex="0" role="button" aria-label="Abrir detalle de ' + escapeHtml(item.label) + '">' +
    '<td class="midas-lab-col-algorithm" data-label="Algoritmo"><strong title="' + escapeHtml(item.label) + '">' + escapeHtml(item.label) + '</strong>' +
      '<span class="midas-lab-table-state"><i></i>' + escapeHtml(meta.status) + '</span>' +
      (item.bootstrap ? '<small>Prueba retrospectiva · no cuenta en forward</small>' : '') +
    '</td>' +
    '<td class="midas-lab-col-group" data-label="Bloque"><span>' + escapeHtml(group) + '</span></td>' +
    '<td class="midas-lab-col-activity" data-label="Actividad" title="' + escapeHtml(meta.activityLabel) + '"><strong>' + escapeHtml(meta.activityLabel) + '</strong></td>' +
    '<td class="midas-lab-col-assets" data-label="Activos" title="' + escapeHtml(meta.activityTickers.join(", ")) + '">' + renderTickerChips(meta.activityTickers, 3) + '</td>' +
    '<td class="midas-lab-col-return" data-label="Rent. acum."><strong class="midas-lab-return">' + formatPercent(meta.returnPct) + '</strong></td>' +
    '<td class="midas-lab-col-sessions" data-label="Sesiones">' + (meta.sessions || "—") + '</td>' +
    '<td class="midas-lab-col-date" data-label="Último cierre">' + escapeHtml(formatDate(meta.latestDate)) + '</td>' +
    '<td class="midas-lab-col-dd" data-label="DD">' + escapeHtml(meta.drawdown) + '</td>' +
  '</tr>';
}

function statusLabel(status) {
  const labels = {
    demo_con_diario: "Demo con diario",
    programada_sin_diario: "Esperando primera sesión",
    pendiente_modelo: "Modelo pendiente",
    sin_diario_disponible: "Diario no enlazado",
    diario_heredado_observado: "Histórico simulado",
    sin_ejecucion_comparable: "Pendiente de adaptación"
  };
  return labels[status] || status || "Preparado";
}

function bootstrapMidasLabRows(lab) {
  const bootstrap = lab?.weeklyBootstrap;
  if (!bootstrap || bootstrap.status !== "bootstrap_only" || !bootstrap.strategies) return [];
  return Object.entries(bootstrap.strategies).map(([id, strategy]) => {
    const nav = Number(strategy.mark_to_market_nav);
    const ret = Number(strategy.mark_to_market_return_pct);
    const safeReturn = Number.isFinite(ret) ? ret : null;
    const initial = Number.isFinite(nav) && safeReturn !== null ? nav / (1 + safeReturn / 100) : null;
    const history = Number.isFinite(initial) && Number.isFinite(nav) ? [
      { date: bootstrap.signal_asof, nav: initial },
      { date: bootstrap.mark_date, nav }
    ].filter((point) => point.date) : [];
    return {
      id: "bootstrap_" + id,
      label: BOOTSTRAP_LABELS[id] || id,
      group: "weekly_ml_demo",
      status: "demo_con_diario",
      bootstrap: true,
      return_pct: safeReturn,
      last_session: bootstrap.mark_date,
      mark_date: bootstrap.mark_date,
      equity_history: history,
      positions: Array.isArray(strategy.positions) ? strategy.positions : []
    };
  });
}
