const DASHBOARD_URL = "https://raw.githubusercontent.com/mamg97/midas-paper-lab/main/strategy_state/dashboard.json";
const CACHE_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;

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
    note: "Resultado registrado por el simulador original. Las órdenes se contabilizaban al mismo cierre que generaba la señal; no son ejecuciones verificadas ni una rentabilidad alcanzable."
  });
  return { ...dashboard, tracks };
}
