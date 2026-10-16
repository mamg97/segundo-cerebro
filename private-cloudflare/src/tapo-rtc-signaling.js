// Experimental single-presenter/single-viewer WebRTC signaling for HOME.
// No images/audio/video in Worker or D1. Disabled by default and requires Cloudflare Access on ALL traffic.
// SDP contains private network metadata: short TTL, no caches, no logs, no copy to Git.
const SESSION_TTL_MS = 15 * 60_000;
const SESSION_LIMIT = 3;
const MAX_SDP_CHARS = 60_000;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_RE = /^[0-9a-f]{64}$/;

export const tapoRtcLimits = Object.freeze({ SESSION_TTL_MS, SESSION_LIMIT, MAX_SDP_CHARS });

export function validTapoSdp(description, type) {
  return Boolean(description && typeof description === "object" && !Array.isArray(description) &&
    Object.keys(description).length === 2 &&
    description.type === type &&
    typeof description.sdp === "string" &&
    description.sdp.length >= 64 && description.sdp.length <= MAX_SDP_CHARS &&
    /^v=0\r?\n/.test(description.sdp) &&
    /(?:^|\n)m=video /m.test(description.sdp) &&
    /(?:^|\n)a=fingerprint:/m.test(description.sdp));
}

export function sameOriginTapoWrite(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  return origin === url.origin && (!site || site === "same-origin");
}

export function tapoRtcRoute(path, method) {
  const root = "/api/home/tapo/rtc";
  if (path === root && method === "POST") return { operation: "create" };
  if (path === root) return null;
  const match = path.match(/^\/api\/home\/tapo\/rtc\/([0-9a-f-]{36})(?:\/(offer|answer|poll))?$/i);
  if (!match || !ID_RE.test(match[1])) return null;
  const sessionId = match[1].toLowerCase();
  if (!match[2] && method === "DELETE") return { operation: "close", sessionId };
  if (match[2] === "offer" && method === "PUT") return { operation: "offer", sessionId };
  if (match[2] === "answer" && method === "PUT") return { operation: "answer", sessionId };
  if (match[2] === "poll" && method === "GET") return { operation: "poll", sessionId };
  return null;
}

function reply(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}
function fail(code, status) { return reply({ ok: false, code }, status); }
function secretHex() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function hashSecret(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
}
async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS home_tapo_rtc_sessions (" +
    "id TEXT PRIMARY KEY, presenter_hash TEXT NOT NULL, viewer_hash TEXT NOT NULL, " +
    "created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, offer TEXT, answer TEXT)"
  ).run();
}
async function readSession(env, id, key, now) {
  if (!HEX_RE.test(key || "")) return null;
  const row = await env.DB.prepare(
    "SELECT presenter_hash, viewer_hash, expires_at, offer, answer FROM home_tapo_rtc_sessions WHERE id = ? AND expires_at > ?"
  ).bind(id, now).first();
  if (!row) return null;
  const digest = await hashSecret(key.toLowerCase());
  const role = digest === row.presenter_hash ? "presenter" : digest === row.viewer_hash ? "viewer" : null;
  return role ? { row, role } : null;
}
async function readDescription(request, type) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(request.headers.get("Content-Length") || 0) > MAX_SDP_CHARS + 500) return null;
  let body;
  try { body = await request.text(); }
  catch { return null; }
  if (body.length > MAX_SDP_CHARS + 500) return null;
  try {
    const parsed = JSON.parse(body);
    return validTapoSdp(parsed, type) ? parsed : null;
  } catch { return null; }
}

/** Relays SDP metadata only; NEVER relays video or audio. */
export async function handleTapoRtcSignaling(request, env, now = Date.now()) {
  if (env?.TAPO_RTC_EXPERIMENTAL !== "true" || !env?.DB) return fail("TAPO_RTC_DISABLED", 404);
  const url = new URL(request.url);
  const route = tapoRtcRoute(url.pathname, request.method);
  if (!route) return fail("NOT_FOUND", 404);
  if (request.method !== "GET" && !sameOriginTapoWrite(request)) return fail("INVALID_ORIGIN", 403);

  try {
    await ensureTable(env);
    // Delete expired metadata opportunistically on *every* request.
    // No background cron: a room abandoned without further traffic can remain at rest until the next request.
    await env.DB.prepare("DELETE FROM home_tapo_rtc_sessions WHERE expires_at <= ?").bind(now).run();
    if (route.operation === "create") {
      // Bounded active sessions; no background polling/cron.
      const count = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM home_tapo_rtc_sessions WHERE expires_at > ?"
      ).bind(now).first();
      if (Number(count?.total || 0) >= SESSION_LIMIT) return fail("TAPO_TOO_MANY_SESSIONS", 429);

      const id = crypto.randomUUID();
      const presenterKey = secretHex();
      const viewerKey = secretHex();
      const expiresAt = now + SESSION_TTL_MS;
      await env.DB.prepare(
        "INSERT INTO home_tapo_rtc_sessions(id, presenter_hash, viewer_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, await hashSecret(presenterKey), await hashSecret(viewerKey), now, expiresAt).run();
      return reply({
        ok: true, sessionId: id, presenterKey, viewerKey,
        expiresAt: new Date(expiresAt).toISOString()
      }, 201);
    }

    const credential = request.headers.get("X-Tapo-Session-Key");
    const session = await readSession(env, route.sessionId, credential, now);
    if (!session) return fail("TAPO_SESSION_DENIED", 403);

    if (route.operation === "poll") {
      // Viewer must never read answer; presenter must never read offer.
      const type = session.role === "viewer" ? "offer" : "answer";
      let description = null;
      try { description = JSON.parse(session.row[type] || "null"); }
      catch { /* Fail closed; malformed source never echoed. */ }
      return reply({ ok: true, type, description, expiresAt: new Date(session.row.expires_at).toISOString() });
    }

    if (route.operation === "close") {
      if (session.role !== "presenter") return fail("TAPO_ROLE_DENIED", 403);
      await env.DB.prepare("DELETE FROM home_tapo_rtc_sessions WHERE id = ? AND presenter_hash = ?")
        .bind(route.sessionId, session.row.presenter_hash).run();
      return reply({ ok: true });
    }

    const roleNeeded = route.operation === "offer" ? "presenter" : "viewer";
    if (session.role !== roleNeeded) return fail("TAPO_ROLE_DENIED", 403);
    if (route.operation === "answer" && !session.row.offer) return fail("TAPO_OFFER_REQUIRED", 409);
    const description = await readDescription(request, route.operation);
    if (!description) return fail("TAPO_SDP_INVALID", 400);

    const column = route.operation === "offer" ? "offer" : "answer";
    // No user-provided SQL: both column names come from the fixed route allowlist.
    const result = await env.DB.prepare(
      "UPDATE home_tapo_rtc_sessions SET " + column + " = ? WHERE id = ? AND " +
      column + " IS NULL AND expires_at > ?"
    ).bind(JSON.stringify(description), route.sessionId, now).run();
    if (Number(result.meta?.changes || 0) !== 1) return fail("TAPO_ALREADY_SET", 409);
    return reply({ ok: true }, 201);
  } catch {
    // Error details could contain SDP/network identifiers; never log request or exception body.
    return fail("TAPO_SIGNALING_FAILED", 502);
  }
}
