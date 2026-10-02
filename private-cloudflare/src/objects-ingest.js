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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "segundo-cerebro-objects-ingest", version: 1 });
    }

    const objectMatch = url.pathname.match(/^\/api\/internal\/objects\/([^/]+)\/image$/);
    const lookMatch = url.pathname.match(/^\/api\/internal\/objects\/look\/([^/]+)\/image$/);
    const lookRenderMatch = url.pathname.match(/^\/api\/internal\/objects\/look\/([^/]+)\/render$/);
    if (!objectMatch && !lookMatch && !lookRenderMatch) return json({ ok: false, code: "NOT_FOUND" }, 404);
    if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

    const upstream = new Request(
      "https://segundo-cerebro.internal" + url.pathname,
      request
    );

    const response = await env.SEGUNDO_CEREBRO.fetch(upstream);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
