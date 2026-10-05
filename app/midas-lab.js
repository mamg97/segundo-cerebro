export function renderMidasVisualLab(dashboard, lab = null) {
  const rows = Array.isArray(dashboard?.tracks) ? dashboard.tracks : [];
  const liveWeekly = rows.some((row) => row.group === "weekly_ml_demo" && row.status === "demo_con_diario");
  const bootstrapRows = liveWeekly ? [] : bootstrapMidasLabRows(lab);
  const active = [...bootstrapRows, ...rows.filter((row) => row.group !== "historica_pendiente")];
  if (!active.length) return "";

  const groups = [
    ["weekly_ml_demo", "Weekly ML"],
    ["capital_cycle_demo", "Capital Cycle"],
    ["buy_the_dip_demo", "Buy The Dip"],
    ["tfg_demo_adaptado", "TFG"],
    ["paper_nuevo", "Estrategias diarias"],
    ["tfm_demo_adaptado", "TFM"],
    ["diario_heredado", "Genético original"]
  ];

  return '<section class="midas-lab">' +
    '<div class="midas-lab-heading">' +
      '<div><span class="eyebrow">LABORATORIO VIVO</span><h3>Comportamiento de los algoritmos</h3>' +
      '<p>Las curvas se dibujan al abrir MIDAS y avanzan con cada cierre registrado. El movimiento es visual; los datos siguen siendo los del diario.</p></div>' +
      '<div class="midas-lab-legend"><span><i class="is-positive"></i>positivo</span><span><i class="is-negative"></i>negativo</span><span><i class="is-neutral"></i>esperando</span></div>' +
    '</div>' +
    groups.map(([group, title]) => {
      const groupRows = active.filter((row) => row.group === group);
      if (!groupRows.length) return "";
      return '<div class="midas-lab-group"><div class="midas-lab-group-title"><strong>' + escapeHtml(title) + '</strong><span>' + groupRows.length + ' algoritmos</span></div>' +
        '<div class="midas-lab-table-wrap"><table class="midas-lab-table">' +
          '<thead><tr>' +
            '<th>Algoritmo</th><th>Actividad actual</th><th>Activos</th><th>Rent. acum.</th>' +
            '<th>Sesiones</th><th>Último cierre</th><th>DD</th><th>Evolución</th>' +
          '</tr></thead>' +
          '<tbody>' + groupRows.map(renderMidasLabRow).join("") + '</tbody>' +
        '</table></div></div>';
    }).join("") +
  '</section>';
}

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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return (value > 0 ? "+" : "") + value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
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

function renderTickerChips(tickers) {
  const values = (Array.isArray(tickers) ? tickers : []).filter(Boolean);
  if (!values.length) return '<span class="midas-lab-empty">—</span>';
  const visible = values.slice(0, 6);
  const rest = values.length - visible.length;
  return '<div class="midas-lab-table-tickers">' +
    visible.map((ticker) => '<b>' + escapeHtml(ticker) + '</b>').join("") +
    (rest > 0 ? '<span>+' + rest + '</span>' : '') +
  '</div>';
}

function renderMidasLabRow(item) {
  const history = Array.isArray(item.equity_history) ? item.equity_history : [];
  const returnPct = typeof item.return_pct === "number" ? item.return_pct : null;
  const latestDate = item.last_session || item.mark_date || null;
  const positions = Array.isArray(item.positions) ? item.positions : [];
  const fallbackTickers = positions.map((position) => position.ticker).filter(Boolean);
  const activityTickers = (Array.isArray(item.activity_tickers) && item.activity_tickers.length
    ? item.activity_tickers : fallbackTickers).filter(Boolean);
  const activityLabel = item.activity_label ||
    (fallbackTickers.length
      ? fallbackTickers.length + (fallbackTickers.length === 1 ? " posición" : " posiciones")
      : item.status === "demo_con_diario" ? "Sin compras · en efectivo" : "Esperando actividad");
  const status = item.bootstrap ? "Bootstrap técnico" : statusLabel(item.status);
  const sessions = history.length;
  const drawdown = typeof item.max_drawdown_pct === "number" && Number.isFinite(item.max_drawdown_pct)
    ? formatPercent(item.max_drawdown_pct) : "—";
  return '<tr class="midas-lab-row is-' + tone(returnPct) + (item.bootstrap ? ' is-bootstrap' : '') + '">' +
    '<td class="midas-lab-col-algorithm"><strong>' + escapeHtml(item.label) + '</strong>' +
      '<span class="midas-lab-table-state"><i></i>' + escapeHtml(status) + '</span>' +
      (item.bootstrap ? '<small>Prueba retrospectiva · no cuenta en forward</small>' : '') +
    '</td>' +
    '<td class="midas-lab-col-activity"><strong>' + escapeHtml(activityLabel) + '</strong></td>' +
    '<td class="midas-lab-col-assets">' + renderTickerChips(activityTickers) + '</td>' +
    '<td class="midas-lab-col-return"><strong class="midas-lab-return">' + formatPercent(returnPct) + '</strong></td>' +
    '<td class="midas-lab-col-sessions">' + (sessions || "—") + '</td>' +
    '<td class="midas-lab-col-date">' + escapeHtml(formatDate(latestDate)) + '</td>' +
    '<td class="midas-lab-col-dd">' + escapeHtml(drawdown) + '</td>' +
    '<td class="midas-lab-col-chart"><div class="midas-lab-mini-chart">' + renderSparkline(history, item.label, returnPct) + '</div></td>' +
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
