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
