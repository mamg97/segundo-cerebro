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

function madridDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function safeEqual(a, b) {
  if (!a || !b) return false;
  const [left, right] = await Promise.all([sha256(a), sha256(b)]);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function cleanEnergy(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 20000) return null;
  return number;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "segundo-cerebro-health-ingest" });
    }

    if (url.pathname !== "/v1/energy") {
      return json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    if (request.method !== "POST") {
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }

    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!await safeEqual(token, env.HEALTH_INGEST_TOKEN || "")) {
      return json({ ok: false, code: "UNAUTHORIZED" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || ""))
      ? String(body.date)
      : madridDateKey();
    const activeKcal = cleanEnergy(body?.activeKcal);
    const restingKcal = cleanEnergy(body?.restingKcal);
    const explicitTotal = cleanEnergy(body?.totalKcal);
    const totalKcal = explicitTotal ?? (
      activeKcal !== null && restingKcal !== null
        ? activeKcal + restingKcal
        : null
    );

    if (activeKcal === null && restingKcal === null && totalKcal === null) {
      return json({ ok: false, code: "EMPTY_ENERGY_SAMPLE" }, 400);
    }

    const internalRequest = new Request("https://segundo-cerebro.internal/api/nutrition/energy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        date,
        activeKcal,
        restingKcal,
        totalKcal,
        source: "apple_health",
        note: String(body?.note || "Apple Shortcuts").slice(0, 500)
      })
    });

    const response = await env.SEGUNDO_CEREBRO.fetch(internalRequest);
    const payload = await response.json().catch(() => ({ ok: false, code: "UPSTREAM_INVALID_RESPONSE" }));

    if (!response.ok) {
      return json({
        ok: false,
        code: payload?.code || "UPSTREAM_FAILED"
      }, response.status >= 400 && response.status < 600 ? response.status : 502);
    }

    return json({
      ok: true,
      date,
      activeKcal,
      restingKcal,
      totalKcal
    }, 201);
  }
};
