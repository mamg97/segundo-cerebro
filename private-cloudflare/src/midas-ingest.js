const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "segundo-cerebro-midas-legacy-ingest";
const WORKFLOW_REF = "mamg97/personal_mamg/.github/workflows/trading_bot.yml@refs/heads/main";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}

function decodePart(part) {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function verifyGitHubOidc(token, fetcher = fetch, now = Date.now()) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || token.length > 12000) return null;
    const header = JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodePart(parts[1])));
    const epoch = Math.floor(now / 1000);
    if (header.alg !== "RS256" || typeof header.kid !== "string" ||
        claims.iss !== ISSUER || claims.aud !== AUDIENCE ||
        claims.repository !== "mamg97/personal_mamg" ||
        claims.ref !== "refs/heads/main" || claims.workflow_ref !== WORKFLOW_REF ||
        !["schedule", "workflow_dispatch"].includes(claims.event_name) ||
        !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
        claims.iat > epoch + 60 || claims.exp < epoch || claims.exp - claims.iat > 600 ||
        !/^\d+$/.test(String(claims.run_id || ""))) return null;
    const response = await fetcher(JWKS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const jwks = await response.json();
    const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA" && key.use === "sig");
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodePart(parts[2]), signed)) return null;
    return claims;
  } catch {
    return null;
  }
}

const isoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const money = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;

export function normalizeSnapshot(body, runId) {
  const legacy = body?.strategy_id === "genetic_sp500_legacy" && body.quality === "legacy_same_close_model";
  const forward = body?.strategy_id === "genetic_sp500_forward" && body.quality === "next_open_raw_ohlc_v1";
  if (body?.schema_version !== 1 || (!legacy && !forward) || !money(body.initial_capital) ||
      body.initial_capital === 0 || !Array.isArray(body.equity_history) ||
      body.equity_history.length < (legacy ? 2 : 1) || body.equity_history.length > 1000 ||
      !/^[a-f0-9]{64}$/.test(body.ledger_sha256 || "")) return null;
  let previous = "";
  for (const point of body.equity_history) {
    if (!Array.isArray(point) || point.length !== 2 || !isoDate(point[0]) ||
        point[0] <= previous || !money(point[1])) return null;
    previous = point[0];
  }
  const first = body.equity_history[0][0];
  if (previous > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) return null;
  return {
    schema_version: 1,
    strategy_id: body.strategy_id,
    quality: body.quality,
    initial_capital: body.initial_capital,
    first_session: first,
    last_session: previous,
    equity_history: body.equity_history,
    ledger_sha256: body.ledger_sha256,
    source_run_id: String(runId)
  };
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/health") return json({ ok: true, service: "segundo-cerebro-midas-ingest" });
    if (path !== "/v1/snapshot") return json({ ok: false, code: "NOT_FOUND" }, 404);
    if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    const bearer = /^Bearer (.+)$/.exec(request.headers.get("Authorization") || "");
    const claims = bearer ? await verifyGitHubOidc(bearer[1]) : null;
    if (!claims) return json({ ok: false, code: "UNAUTHORIZED" }, 401);
    if (Number(request.headers.get("Content-Length")) > 100_000) return json({ ok: false, code: "TOO_LARGE" }, 413);
    let snapshot;
    try {
      const raw = await request.text();
      if (raw.length > 100_000) return json({ ok: false, code: "TOO_LARGE" }, 413);
      snapshot = normalizeSnapshot(JSON.parse(raw), claims.run_id);
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }
    if (!snapshot) return json({ ok: false, code: "INVALID_SNAPSHOT" }, 400);
    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS midas_legacy_snapshot (
        strategy_id TEXT PRIMARY KEY, last_session TEXT NOT NULL,
        source_run_id INTEGER NOT NULL, payload TEXT NOT NULL, ingested_at TEXT NOT NULL
      )`).run();
      const existing = await env.DB.prepare("SELECT last_session, source_run_id FROM midas_legacy_snapshot WHERE strategy_id = ?")
        .bind(snapshot.strategy_id).first();
      if (existing && (snapshot.last_session < existing.last_session ||
          (snapshot.last_session === existing.last_session && Number(snapshot.source_run_id) < Number(existing.source_run_id)))) {
        return json({ ok: false, code: "STALE_SNAPSHOT" }, 409);
      }
      await env.DB.prepare(`INSERT INTO midas_legacy_snapshot
        (strategy_id, last_session, source_run_id, payload, ingested_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(strategy_id) DO UPDATE SET last_session = excluded.last_session,
          source_run_id = excluded.source_run_id, payload = excluded.payload,
          ingested_at = excluded.ingested_at`)
        .bind(snapshot.strategy_id, snapshot.last_session, Number(snapshot.source_run_id),
              JSON.stringify(snapshot), new Date().toISOString()).run();
      return json({ ok: true, strategy_id: snapshot.strategy_id, last_session: snapshot.last_session });
    } catch {
      return json({ ok: false, code: "STORE_FAILED" }, 503);
    }
  }
};
