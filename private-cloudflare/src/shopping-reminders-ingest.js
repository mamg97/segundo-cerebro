const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive"
  }
});

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || ""))));
}

async function safeEqual(left, right) {
  if (!left || !right) return false;
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true, service: "segundo-cerebro-shopping-sync", version: 1 });
    }
    if (!url.pathname.startsWith("/v1/shopping-list/")) {
      return json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    if (!env.SECOND_BRAIN || !env.SHOPPING_SYNC_TOKEN) {
      return json({ ok: false, code: "SERVICE_NOT_CONFIGURED" }, 503);
    }
    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!(await safeEqual(token, env.SHOPPING_SYNC_TOKEN))) {
      return json({ ok: false, code: "UNAUTHORIZED" }, 401);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 1_000_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);

    const headers = new Headers();
    headers.set("Authorization", authorization);
    headers.set("Accept", "application/json");
    if (request.headers.get("Content-Type")) headers.set("Content-Type", request.headers.get("Content-Type"));
    const upstream = new Request("https://second-brain.internal" + url.pathname + url.search, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body
    });
    return env.SECOND_BRAIN.fetch(upstream);
  }
};
