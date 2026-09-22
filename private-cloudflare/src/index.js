const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

function withSecurityHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(payload, status = 200) {
  return withSecurityHeaders(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    })
  );
}

export default {
  async fetch(request, env) {
    if (env.PRIVATE_APP_ENABLED !== "true") {
      return json({
        ok: false,
        code: "PRIVATE_APP_DISABLED",
        message: "La aplicación privada todavía no está habilitada."
      }, 503);
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return withSecurityHeaders(Response.redirect(new URL("/app/", request.url), 302));
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const row = await env.DB.prepare(
        "SELECT id, schema_version, created_at FROM state_snapshots WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
      ).first();

      return json({
        ok: true,
        mode: "private-remote",
        snapshotAvailable: Boolean(row),
        schemaVersion: row?.schema_version ?? null,
        snapshotCreatedAt: row?.created_at ?? null
      });
    }

    if (url.pathname === "/api/state") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

      const row = await env.DB.prepare(
        "SELECT id, schema_version, created_at, content_json FROM state_snapshots WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
      ).first();

      if (!row) {
        return json({
          ok: false,
          code: "STATE_NOT_INITIALIZED",
          message: "Todavía no existe una instantánea privada remota."
        }, 503);
      }

      let state;
      try {
        state = JSON.parse(row.content_json);
      } catch {
        return json({ ok: false, code: "INVALID_STATE_JSON" }, 500);
      }

      state.meta = {
        ...(state.meta || {}),
        mode: "private-remote",
        remoteSnapshotId: row.id,
        schemaVersion: row.schema_version,
        remoteSnapshotCreatedAt: row.created_at
      };

      return json(state);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse, {
      "Cache-Control": "private, max-age=0, must-revalidate"
    });
  }
};
