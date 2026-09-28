const DASHBOARD_URL = "https://raw.githubusercontent.com/mamg97/midas-paper-lab/main/strategy_state/dashboard.json";
const CACHE_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;
let researchCache = { value: null, expiresAt: 0, spreadsheetId: null, spreadsheetIdExpiresAt: 0 };

const GROUPS = new Set(["paper_nuevo", "tfm_demo_adaptado", "diario_heredado", "historica_pendiente"]);

function optionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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


function tableRows(values = []) {
  if (!Array.isArray(values) || !values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

async function resolveResearchSpreadsheetId(env, token, fetcher = fetch) {
  if (env?.MIDAS_RESEARCH_SHEET_ID) return String(env.MIDAS_RESEARCH_SHEET_ID).trim();
  if (researchCache.spreadsheetId && researchCache.spreadsheetIdExpiresAt > Date.now()) {
    return researchCache.spreadsheetId;
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

function normalizeResearch(valueRanges = []) {
  const thesisRows = tableRows(valueRanges[0]?.values || []);
  const cagrRows = tableRows(valueRanges[1]?.values || []);

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
    rule: cleanText(row.regla_de_uso, 500)
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

  return {
    status: "ok",
    theses,
    cagr2031,
    counts: {
      theses: theses.length,
      cagr2031: cagr2031.length,
      cagrComplete: cagr2031.filter((row) => row.bear && row.base && row.bull).length
    }
  };
}

export async function fetchMidasResearch(env, getGoogleAccessToken, fetcher = fetch, now = Date.now()) {
  if (!getGoogleAccessToken) return { status: "not-configured", theses: [], cagr2031: [], counts: { theses: 0, cagr2031: 0, cagrComplete: 0 } };
  if (researchCache.value && researchCache.expiresAt > now) return researchCache.value;

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveResearchSpreadsheetId(env, token, fetcher);
  const ranges = ["TESIS!A1:P500", "CAGR2031!A1:N500"];
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
  let stored;
  try {
    stored = await db.prepare("SELECT payload FROM midas_legacy_snapshot WHERE strategy_id = ?")
      .bind("genetic_sp500_legacy").first();
  } catch {
    return dashboard;
  }
  if (!stored?.payload) return dashboard;
  let snapshot;
  try {
    snapshot = JSON.parse(stored.payload);
  } catch {
    return dashboard;
  }
  const history = snapshot?.equity_history;
  if (snapshot?.quality !== "legacy_same_close_model" ||
      !Array.isArray(history) || history.length < 2 ||
      !Number.isFinite(snapshot.initial_capital) || snapshot.initial_capital <= 0 ||
      history.some((point) => !Array.isArray(point) || point.length !== 2 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(point[0]) || !Number.isFinite(point[1]) || point[1] < 0)) return dashboard;
  const first = history[0];
  const previous = history.at(-2);
  const last = history.at(-1);
  if (first[0] !== snapshot.first_session || last[0] !== snapshot.last_session ||
      history.some((point, index) => index > 0 && point[0] <= history[index - 1][0])) return dashboard;
  const tracks = dashboard.tracks.map((row) => row.id !== "genetic_sp500_legacy" ? row : {
    ...row,
    status: "diario_heredado_observado",
    first_session: first[0],
    last_session: last[0],
    currency: "USD",
    last_equity: last[1],
    return_pct: Math.round((last[1] / snapshot.initial_capital - 1) * 100_000_000) / 1_000_000,
    day_return_pct: previous[1] > 0 ? Math.round((last[1] / previous[1] - 1) * 100_000_000) / 1_000_000 : null,
    note: `Diario ficticio desde ${first[0]}; la fecha mostrada es la del asiento, que puede ser posterior a la vela usada. Las operaciones se contabilizaban al mismo cierre que generaba la señal: no son ejecuciones verificadas ni rentabilidad alcanzable.`
  });
  return { ...dashboard, tracks };
}
