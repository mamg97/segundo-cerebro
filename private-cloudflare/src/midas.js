import { evaluateMidasWorkflowRuns } from "./midas-health.js";

const DASHBOARD_URL = "https://raw.githubusercontent.com/mamg97/midas-paper-lab/main/strategy_state/dashboard.json";
const WEEKLY_BOOTSTRAP_URL = "https://raw.githubusercontent.com/mamg97/midas-paper-lab/main/weekly_ml_bootstrap_state/bootstrap_2026-09-25.json";
const CACHE_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;
let weeklyBootstrapCache = { value: null, expiresAt: 0 };
let workflowHealthCache = { value: null, expiresAt: 0 };
let researchCache = { value: null, expiresAt: 0, spreadsheetId: null, spreadsheetIdExpiresAt: 0 };

const GROUPS = new Set(["paper_nuevo", "weekly_ml_demo", "capital_cycle_demo", "buy_the_dip_demo", "tfg_demo_adaptado", "tfm_demo_adaptado", "diario_heredado", "historica_pendiente"]);

function optionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeEquityHistory(value, limit = 520) {
  if (!Array.isArray(value)) return [];
  const points = [];
  for (const point of value.slice(-limit)) {
    const date = typeof point?.date === "string" ? point.date.slice(0, 10) : null;
    const nav = optionalNumber(point?.nav);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || nav === null || nav < 0) continue;
    if (points.length && date <= points.at(-1).date) continue;
    points.push({ date, nav });
  }
  return points;
}

function riskMetricsFromHistory(points) {
  if (!Array.isArray(points) || !points.length) {
    return { annualized_volatility_pct: null, max_drawdown_pct: null, sharpe_0rf: null, risk_observations: 0 };
  }
  const valid = points.filter((point) => point?.date && Number.isFinite(point?.nav) && point.nav >= 0);
  if (!valid.length) {
    return { annualized_volatility_pct: null, max_drawdown_pct: null, sharpe_0rf: null, risk_observations: 0 };
  }
  let peak = valid[0].nav;
  let maxDrawdown = 0;
  const returns = [];
  const gaps = [];
  for (let index = 0; index < valid.length; index += 1) {
    const point = valid[index];
    peak = Math.max(peak, point.nav);
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, point.nav / peak - 1);
    if (index > 0 && valid[index - 1].nav > 0) {
      returns.push(point.nav / valid[index - 1].nav - 1);
      const current = Date.parse(point.date + "T12:00:00Z");
      const previous = Date.parse(valid[index - 1].date + "T12:00:00Z");
      const gap = Math.round((current - previous) / 86400000);
      if (gap > 0) gaps.push(gap);
    }
  }
  let annualizedVolatility = null;
  let sharpe = null;
  if (returns.length >= 2) {
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
    const sd = Math.sqrt(Math.max(variance, 0));
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 1;
    const periods = medianGap <= 3 ? 252 : medianGap <= 10 ? 52 : medianGap <= 40 ? 12 : 4;
    annualizedVolatility = sd * Math.sqrt(periods) * 100;
    if (sd > 1e-15) sharpe = mean / sd * Math.sqrt(periods);
  }
  return {
    annualized_volatility_pct: Number.isFinite(annualizedVolatility) ? annualizedVolatility : null,
    max_drawdown_pct: maxDrawdown * 100,
    sharpe_0rf: Number.isFinite(sharpe) ? sharpe : null,
    risk_observations: valid.length
  };
}

function normalizeDashboard(data) {
  if (data?.schema_version !== 1 || !Array.isArray(data.tracks) || data.tracks.length > 100 ||
      !Number.isFinite(Date.parse(data.generated_at_utc))) {
    throw new Error("MIDAS_INVALID_DASHBOARD");
  }
  const tracks = data.tracks.map((row) => {
    if (!row || typeof row.id !== "string" || typeof row.label !== "string" ||
        !GROUPS.has(row.group) || typeof row.status !== "string") {
      throw new Error("MIDAS_INVALID_TRACK");
    }
    return {
      id: row.id.slice(0, 100), label: row.label.slice(0, 180), group: row.group,
      provenance: typeof row.provenance === "string" ? row.provenance.slice(0, 180) : "",
      status: row.status.slice(0, 80),
      first_session: typeof row.first_session === "string" ? row.first_session.slice(0, 10) : null,
      last_session: typeof row.last_session === "string" ? row.last_session.slice(0, 10) : null,
      currency: row.currency === "EUR" || row.currency === "USD" ? row.currency : null,
      last_equity: optionalNumber(row.last_equity),
      day_return_pct: optionalNumber(row.day_return_pct),
      return_pct: optionalNumber(row.return_pct),
      annualized_volatility_pct: optionalNumber(row.annualized_volatility_pct),
      max_drawdown_pct: optionalNumber(row.max_drawdown_pct),
      sharpe_0rf: optionalNumber(row.sharpe_0rf),
      risk_observations: Number.isInteger(row.risk_observations) && row.risk_observations >= 0
        ? Math.min(row.risk_observations, 100000) : 0,
      equity_history: normalizeEquityHistory(row.equity_history),
      activity_state: ["active", "active_pending", "pending", "cash", "waiting", "unknown"].includes(row.activity_state)
        ? row.activity_state : "unknown",
      activity_label: typeof row.activity_label === "string" ? row.activity_label.slice(0, 180) : "",
      activity_tickers: Array.isArray(row.activity_tickers)
        ? row.activity_tickers.slice(0, 12).map((ticker) => String(ticker || "").slice(0, 20)).filter(Boolean) : [],
      open_positions_count: Number.isInteger(row.open_positions_count) && row.open_positions_count >= 0
        ? Math.min(row.open_positions_count, 1000) : 0,
      pending_orders_count: Number.isInteger(row.pending_orders_count) && row.pending_orders_count >= 0
        ? Math.min(row.pending_orders_count, 1000) : 0,
      note: typeof row.note === "string" ? row.note.slice(0, 500) : ""
    };
  });
  if (new Set(tracks.map((row) => row.id)).size !== tracks.length) throw new Error("MIDAS_DUPLICATE_TRACK");
  return { schema_version: 1, generated_at_utc: data.generated_at_utc, tracks };
}

export async function fetchMidasDashboard(fetcher = fetch, now = Date.now()) {
  if (cached && now - cachedAt < CACHE_MS) return { dashboard: cached, stale: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetcher(DASHBOARD_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`MIDAS_HTTP_${response.status}`);
    const dashboard = normalizeDashboard(await response.json());
    cached = dashboard;
    cachedAt = now;
    return { dashboard, stale: false };
  } catch (error) {
    if (cached) return { dashboard: cached, stale: true };
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const RUNTIME_HEALTH_FILES = [
  "paper_us",
  "tfm_es",
  "capital_cycle",
  "buy_the_dip_strategy",
  "weekly_ml",
  "tfg_ahp"
];

function normalizeRuntimeHealthRecord(data) {
  if (data?.schema_version !== 1 || data?.event !== "schedule" ||
      typeof data.workflow_name !== "string" || typeof data.recorded_at_utc !== "string" ||
      !Number.isFinite(Date.parse(data.recorded_at_utc)) ||
      !["success", "failure", "cancelled", "skipped"].includes(data.outcome)) {
    return null;
  }
  return {
    name: data.workflow_name.slice(0, 120),
    event: "schedule",
    status: "completed",
    conclusion: data.outcome,
    created_at: data.recorded_at_utc,
    run_number: Number.isInteger(data.run_number) ? data.run_number : null
  };
}

export async function fetchMidasWorkflowHealth(fetcher = fetch, now = Date.now()) {
  if (workflowHealthCache.value && workflowHealthCache.expiresAt > now) return workflowHealthCache.value;
  try {
    const records = await Promise.all(RUNTIME_HEALTH_FILES.map(async (key) => {
      const url = "https://raw.githubusercontent.com/mamg97/midas-paper-lab/main/strategy_runtime/" + key + ".json";
      const response = await fetcher(url, { headers: { Accept: "application/json" } });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("MIDAS_RUNTIME_" + response.status);
      const normalized = normalizeRuntimeHealthRecord(await response.json());
      if (!normalized) throw new Error("MIDAS_RUNTIME_INVALID_" + key);
      return normalized;
    }));
    const health = evaluateMidasWorkflowRuns(records.filter(Boolean), now);
    const value = {
      status: "ok",
      source: "strategy_runtime",
      overall: health.ok ? "healthy" : "attention",
      checked_at_utc: new Date(now).toISOString(),
      workflows: health.workflows.map((item) => ({
        name: item.name,
        state: item.state,
        ok: item.ok,
        detail: item.detail || null,
        run_number: Number.isInteger(item.latest?.run_number) ? item.latest.run_number : null,
        created_at: typeof item.latest?.created_at === "string" ? item.latest.created_at : null,
        conclusion: typeof item.latest?.conclusion === "string" ? item.latest.conclusion : null
      }))
    };
    workflowHealthCache = { value, expiresAt: now + 5 * 60_000 };
    return value;
  } catch {
    if (workflowHealthCache.value) return { ...workflowHealthCache.value, stale: true };
    return { status: "unavailable", source: "strategy_runtime", overall: "unknown",
      checked_at_utc: new Date(now).toISOString(), workflows: [] };
  }
}


function normalizeWeeklyBootstrap(data) {
  if (data?.schema_version !== 1 || data?.kind !== "NON_PROSPECTIVE_BOOTSTRAP" ||
      data?.excluded_from_forward_performance !== true || !data?.strategies ||
      typeof data.strategies !== "object") {
    throw new Error("MIDAS_INVALID_WEEKLY_BOOTSTRAP");
  }
  const strategies = {};
  for (const [id, raw] of Object.entries(data.strategies)) {
    if (!raw || typeof raw !== "object") continue;
    const positions = Array.isArray(raw.positions) ? raw.positions.slice(0, 20).map((item) => ({
      ticker: typeof item?.ticker === "string" ? item.ticker.slice(0, 20) : "",
      predicted_return: optionalNumber(item?.predicted_return),
      direction_probability: optionalNumber(item?.direction_probability),
      score: optionalNumber(item?.score),
      buy_price: optionalNumber(item?.buy_price),
      mark_close: optionalNumber(item?.mark_close),
      mtm_pnl: optionalNumber(item?.mtm_pnl)
    })).filter((item) => item.ticker) : [];
    strategies[String(id).slice(0, 80)] = {
      mark_to_market_nav: optionalNumber(raw.mark_to_market_nav),
      mark_to_market_return_pct: optionalNumber(raw.mark_to_market_return_pct),
      positions
    };
  }
  const ensemble = Array.isArray(data.ensemble_top20) ? data.ensemble_top20.slice(0, 20).map((item) => ({
    ticker: typeof item?.ticker === "string" ? item.ticker.slice(0, 20) : "",
    score: optionalNumber(item?.score),
    predicted_return: optionalNumber(item?.predicted_return),
    positive_votes: Number.isInteger(item?.positive_votes) ? item.positive_votes : null,
    rank_dispersion: optionalNumber(item?.rank_dispersion)
  })).filter((item) => item.ticker) : [];
  return {
    status: "bootstrap_only",
    signal_asof: typeof data.signal_asof === "string" ? data.signal_asof.slice(0, 10) : null,
    entry_date: typeof data.entry_date === "string" ? data.entry_date.slice(0, 10) : null,
    mark_date: typeof data.mark_date === "string" ? data.mark_date.slice(0, 10) : null,
    strategies,
    ensemble
  };
}

export async function fetchMidasWeeklyBootstrap(fetcher = fetch, now = Date.now()) {
  if (weeklyBootstrapCache.value && weeklyBootstrapCache.expiresAt > now) {
    return weeklyBootstrapCache.value;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetcher(WEEKLY_BOOTSTRAP_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) return null;
    const value = normalizeWeeklyBootstrap(await response.json());
    weeklyBootstrapCache = { value, expiresAt: now + CACHE_MS };
    return value;
  } catch {
    return weeklyBootstrapCache.value;
  } finally {
    clearTimeout(timeout);
  }
}


function tableRows(values = []) {
  if (!Array.isArray(values) || !values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

async function resolveResearchIdFromPrivateRegistry(env, token, fetcher = fetch) {
  const financeSheetId = String(env?.FINANCE_SHEET_ID || "").trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(financeSheetId)) return null;
  const range = encodeURIComponent("IntegracionesPrivadas!A1:B50");
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(financeSheetId)}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  try {
    const response = await fetcher(endpoint, { headers: { Authorization: "Bearer " + token } });
    if (!response.ok) return null;
    const rows = (await response.json())?.values || [];
    const entry = rows.find((row) => String(row?.[0] || "").trim() === "MIDAS_RESEARCH_SHEET_ID");
    const value = String(entry?.[1] || "").trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

async function resolveResearchSpreadsheetId(env, token, fetcher = fetch) {
  if (env?.MIDAS_RESEARCH_SHEET_ID) return String(env.MIDAS_RESEARCH_SHEET_ID).trim();
  if (researchCache.spreadsheetId && researchCache.spreadsheetIdExpiresAt > Date.now()) {
    return researchCache.spreadsheetId;
  }

  const privateRegistryId = await resolveResearchIdFromPrivateRegistry(env, token, fetcher);
  if (privateRegistryId) {
    researchCache.spreadsheetId = privateRegistryId;
    researchCache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
    return privateRegistryId;
  }

  const params = new URLSearchParams({
    q: "name = 'MIDAS - TESIS Y WATCHLIST' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "10"
  });
  const response = await fetcher("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("MIDAS_RESEARCH_DRIVE_" + response.status);
  const files = (await response.json())?.files || [];
  const sheet = files.find((item) => item?.name === "MIDAS - TESIS Y WATCHLIST");
  if (!sheet?.id) throw new Error("MIDAS_RESEARCH_SHEET_NOT_FOUND");
  researchCache.spreadsheetId = sheet.id;
  researchCache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
  return sheet.id;
}

function cleanText(value, max = 800) {
  if (value === null || value === undefined || value === "") return null;
  return String(value).slice(0, max);
}

function parseSheetNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || value === "") return null;
  let raw = String(value).trim().replace(/[^0-9,+.\-]/g, "");
  if (!raw) return null;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    raw = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (comma >= 0) {
    raw = raw.replace(",", ".");
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value) {
  const parsed = parseSheetNumber(value);
  return parsed === null ? null : parsed / 100;
}

function fiveYearTarget(referencePrice, cagr) {
  const price = parseSheetNumber(referencePrice);
  const rate = parsePercent(cagr);
  if (price === null || price < 0 || rate === null || rate <= -1) return null;
  const target = price * ((1 + rate) ** 5);
  return Number.isFinite(target) ? Math.round(target * 100) / 100 : null;
}

function normalizeResearch(valueRanges = []) {
  const thesisRows = tableRows(valueRanges[0]?.values || []);
  const cagrRows = tableRows(valueRanges[1]?.values || []);
  const trackingRows = tableRows(valueRanges[2]?.values || []);

  const theses = thesisRows.map((row) => ({
    ticker: cleanText(row.ticker, 40),
    company: cleanText(row.empresa, 180),
    theme: cleanText(row.tema, 220),
    studyType: cleanText(row.tipo_estudio, 180),
    lastReview: cleanText(row.ultima_revision, 20),
    summary: cleanText(row.tesis_resumida, 1200),
    drivers: cleanText(row.drivers_clave, 1000),
    risks: cleanText(row.riesgos_clave, 1000),
    horizon: cleanText(row.horizonte, 80),
    status: cleanText(row.estado, 120),
    rule: cleanText(row.regla_de_uso, 500),
    thesisUrl: cleanText(row.artefacto_drive, 700),
    origin: cleanText(row.origen_recuperado, 500)
  })).filter((row) => row.ticker && row.company);

  const cagr2031 = cagrRows.map((row) => ({
    ticker: cleanText(row.ticker, 40),
    company: cleanText(row.empresa, 180),
    theme: cleanText(row.tema, 220),
    studyDate: cleanText(row.fecha_estudio, 20),
    target: cleanText(row.objetivo, 20) || "2031",
    bear: cleanText(row.cagr_bear_2031, 80),
    base: cleanText(row.cagr_base_2031, 80),
    bull: cleanText(row.cagr_bull_2031, 80),
    originalHorizon: cleanText(row.horizonte_original, 80),
    originalBear: cleanText(row.cagr_bear_original, 80),
    originalBase: cleanText(row.cagr_base_original, 80),
    originalBull: cleanText(row.cagr_bull_original, 80),
    status: cleanText(row.estado, 120),
    note: cleanText(row.nota, 600)
  })).filter((row) => row.ticker && row.company);

  const cagrByTicker = new Map(cagr2031.map((row) => [row.ticker, row]));
  const tracking = trackingRows.map((row) => {
    const cagr = cagrByTicker.get(cleanText(row.ticker, 40)) || {};
    const referencePrice = parseSheetNumber(row.precio_referencia_estudio);
    const bearPrice5y = parseSheetNumber(row.precio_bear_5a) ?? fiveYearTarget(referencePrice, cagr.bear);
    const basePrice5y = parseSheetNumber(row.precio_base_5a) ?? fiveYearTarget(referencePrice, cagr.base);
    const bullPrice5y = parseSheetNumber(row.precio_bull_5a) ?? fiveYearTarget(referencePrice, cagr.bull);
    const explicit15 = parseSheetNumber(row.precio_15pct_5a);
    const priceFor15 = explicit15 ?? (basePrice5y === null ? null : Math.round((basePrice5y / (1.15 ** 5)) * 100) / 100);
    return {
      ticker: cleanText(row.ticker, 40),
      market: cleanText(row.mercado, 120),
      currency: cleanText(row.divisa, 12),
      currentPrice: parseSheetNumber(row.precio_actual),
      currentPriceDate: cleanText(row.precio_actual_fecha, 20),
      referencePrice,
      bearPrice5y,
      basePrice5y,
      bullPrice5y,
      priceFor15,
      nextEarnings: cleanText(row.proximos_resultados, 30),
      lastUpdated: cleanText(row.ultima_actualizacion, 20),
      note: cleanText(row.nota, 500)
    };
  }).filter((row) => row.ticker);

  return {
    status: "ok",
    theses,
    cagr2031,
    tracking,
    counts: {
      theses: theses.length,
      cagr2031: cagr2031.length,
      cagrComplete: cagr2031.filter((row) => row.bear && row.base && row.bull).length,
      tracking: tracking.length,
      trackingComplete: tracking.filter((row) =>
        row.currentPrice !== null && row.bearPrice5y !== null && row.basePrice5y !== null && row.bullPrice5y !== null
      ).length
    }
  };
}

export async function fetchMidasResearch(env, getGoogleAccessToken, fetcher = fetch, now = Date.now()) {
  if (!getGoogleAccessToken) {
    return { status: "not-configured", theses: [], cagr2031: [], tracking: [],
      counts: { theses: 0, cagr2031: 0, cagrComplete: 0, tracking: 0, trackingComplete: 0 } };
  }
  if (researchCache.value && researchCache.expiresAt > now) return researchCache.value;

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveResearchSpreadsheetId(env, token, fetcher);
  const ranges = ["TESIS!A1:P500", "CAGR2031!A1:N500", "SEGUIMIENTO!A1:M500"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "FORMATTED_VALUE");
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params.toString()}`;
  const response = await fetcher(endpoint, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("MIDAS_RESEARCH_SHEETS_" + response.status);
  const normalized = normalizeResearch((await response.json())?.valueRanges || []);
  researchCache.value = normalized;
  researchCache.expiresAt = now + 60_000;
  return normalized;
}

export async function addPrivateGeneticDiary(db, dashboard) {
  if (!db) return dashboard;
  const snapshots = {};
  for (const id of ["genetic_sp500_legacy", "genetic_sp500_forward"]) {
    try {
      const stored = await db.prepare("SELECT payload FROM midas_legacy_snapshot WHERE strategy_id = ?")
        .bind(id).first();
      if (stored?.payload) snapshots[id] = JSON.parse(stored.payload);
    } catch {
      // Missing or malformed private data must never create a fictitious return.
    }
  }
  const valid = (snapshot, id, quality, minimum) => {
    const history = snapshot?.equity_history;
    return snapshot?.strategy_id === id && snapshot?.quality === quality &&
      Array.isArray(history) && history.length >= minimum &&
      Number.isFinite(snapshot.initial_capital) && snapshot.initial_capital > 0 &&
      history.every((point, index) => Array.isArray(point) && point.length === 2 &&
        /^\d{4}-\d{2}-\d{2}$/.test(point[0]) && Number.isFinite(point[1]) && point[1] >= 0 &&
        (index === 0 || point[0] > history[index - 1][0])) &&
      history[0][0] === snapshot.first_session && history.at(-1)[0] === snapshot.last_session;
  };
  const legacy = snapshots.genetic_sp500_legacy;
  const forward = snapshots.genetic_sp500_forward;
  const tracks = dashboard.tracks.map((row) => {
    if (row.id !== "genetic_sp500_legacy" || !valid(legacy, row.id, "legacy_same_close_model", 2)) return row;
    const history = legacy.equity_history;
    const first = history[0];
    const previous = history.at(-2);
    const last = history.at(-1);
    const equityHistory = history.slice(-520).map((point) => ({ date: point[0], nav: point[1] }));
    return {
      ...row, status: "diario_heredado_observado", first_session: first[0], last_session: last[0],
      currency: "USD", last_equity: last[1],
      equity_history: equityHistory,
      return_pct: Math.round((last[1] / legacy.initial_capital - 1) * 100_000_000) / 1_000_000,
      day_return_pct: previous[1] > 0 ? Math.round((last[1] / previous[1] - 1) * 100_000_000) / 1_000_000 : null,
      ...riskMetricsFromHistory(equityHistory),
      note: `Diario ficticio desde ${first[0]}; la fecha mostrada es la del asiento, que puede ser posterior a la vela usada. Las operaciones se contabilizaban al mismo cierre que generaba la señal: no son ejecuciones verificadas ni rentabilidad alcanzable.`
    };
  });
  const forwardRow = {
    id: "genetic_sp500_forward", label: "Genético original S&P 500 · versión corregida",
    group: "diario_heredado", provenance: "Agente genético original · campaña prospectiva 2026",
    status: "programada_sin_diario", first_session: null, last_session: null, currency: "USD",
    last_equity: null, return_pct: null, day_return_pct: null,
    note: "Aún sin primera sesión. Señal al cierre; órdenes simuladas en la apertura posterior con costes. No son operaciones de bróker."
  };
  if (valid(forward, "genetic_sp500_forward", "next_open_raw_ohlc_v1", 1)) {
    const history = forward.equity_history;
    const first = history[0];
    const previous = history.at(-2);
    const last = history.at(-1);
    const equityHistory = history.slice(-520).map((point) => ({ date: point[0], nav: point[1] }));
    Object.assign(forwardRow, {
      status: "demo_con_diario", first_session: first[0], last_session: last[0], last_equity: last[1],
      equity_history: equityHistory,
      return_pct: Math.round((last[1] / forward.initial_capital - 1) * 100_000_000) / 1_000_000,
      day_return_pct: previous && previous[1] > 0
        ? Math.round((last[1] / previous[1] - 1) * 100_000_000) / 1_000_000 : null,
      ...riskMetricsFromHistory(equityHistory),
      note: "Patrimonio ficticio al cierre de la sesión indicada; fills modelados en la siguiente apertura con comisión, deslizamiento y stops OHLC. No hay confirmación de bróker."
    });
  }
  if (!tracks.some((row) => row.id === forwardRow.id)) tracks.push(forwardRow);
  return { ...dashboard, tracks };
}
