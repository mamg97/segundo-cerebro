const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "segundo-cerebro-web-audit";
const REPOSITORY = "mamg97/segundo-cerebro";
const WORKFLOW_REF = "mamg97/segundo-cerebro/.github/workflows/web-audit.yml@refs/heads/main";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}

function decodePart(part) {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function validateAuditClaims(claims, now = Date.now()) {
  const epoch = Math.floor(now / 1000);
  return Boolean(
    claims &&
    claims.iss === ISSUER &&
    claims.aud === AUDIENCE &&
    claims.repository === REPOSITORY &&
    claims.ref === "refs/heads/main" &&
    claims.workflow_ref === WORKFLOW_REF &&
    ["schedule", "workflow_dispatch"].includes(claims.event_name) &&
    Number.isInteger(claims.iat) &&
    Number.isInteger(claims.exp) &&
    claims.iat <= epoch + 60 &&
    claims.exp >= epoch &&
    claims.exp - claims.iat <= 600 &&
    /^\d+$/.test(String(claims.run_id || ""))
  );
}

export async function verifyAuditOidc(token, fetcher = fetch, now = Date.now()) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3 || token.length > 12000) return null;
    const header = JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodePart(parts[1])));
    if (header.alg !== "RS256" || typeof header.kid !== "string" || !validateAuditClaims(claims, now)) return null;

    const response = await fetcher(JWKS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const jwks = await response.json();
    const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA" && key.use === "sig");
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodePart(parts[2]),
      signed
    );
    return verified ? claims : null;
  } catch {
    return null;
  }
}

function cloneProxyHeaders(headers) {
  const next = new Headers(headers);
  next.delete("authorization");
  next.delete("host");
  next.delete("cookie");
  next.set("X-Segundo-Cerebro-Audit", "github-actions");
  return next;
}

function secureProxyResponse(response, publicOrigin) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  const location = headers.get("Location");
  if (location?.startsWith("https://segundo-cerebro.internal/")) {
    headers.set("Location", location.replace("https://segundo-cerebro.internal", publicOrigin));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "segundo-cerebro-web-audit", version: 1 });
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      return json({ ok: false, code: "READ_ONLY_AUDIT" }, 405);
    }

    const bearer = /^Bearer (.+)$/.exec(request.headers.get("Authorization") || "");
    const claims = bearer ? await verifyAuditOidc(bearer[1]) : null;
    if (!claims) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

    const upstreamUrl = new URL(url.pathname + url.search, "https://segundo-cerebro.internal");
    const upstream = new Request(upstreamUrl, {
      method: request.method,
      headers: cloneProxyHeaders(request.headers),
      redirect: "manual"
    });

    try {
      const response = await env.SEGUNDO_CEREBRO.fetch(upstream);
      return secureProxyResponse(response, url.origin);
    } catch {
      return json({ ok: false, code: "UPSTREAM_FAILED" }, 502);
    }
  }
};
