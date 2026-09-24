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

function finite(value, min = 0, max = 1000000) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function cleanEnergy(value) {
  return finite(value, 0, 20000);
}

function cleanSteps(value) {
  const number = finite(value, 0, 200000);
  return number === null ? null : Math.round(number);
}

function cleanMinutes(value) {
  return finite(value, 0, 1440);
}

function cleanIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

const BODY_TYPES = new Set([
  "bodyMass",
  "bodyFatPercentage",
  "bodyMassIndex",
  "leanBodyMass"
]);

function cleanBodySample(sample) {
  const type = String(sample?.type || "").trim();
  if (!BODY_TYPES.has(type)) return null;
  const ranges = {
    bodyMass: [20, 400],
    bodyFatPercentage: [0, 100],
    bodyMassIndex: [5, 100],
    leanBodyMass: [5, 300]
  };
  const [min, max] = ranges[type];
  const value = finite(sample?.value, min, max);
  const measuredAt = cleanIso(sample?.measuredAt);
  if (value === null || !measuredAt) return null;
  return {
    type,
    value,
    unit: String(sample?.unit || (type === "bodyFatPercentage" ? "%" : type === "bodyMassIndex" ? "count" : "kg")).slice(0, 24),
    measuredAt,
    source: String(sample?.source || "apple_health").trim().slice(0, 120) || "apple_health"
  };
}

function cleanWorkout(item) {
  const startAt = cleanIso(item?.startAt);
  const endAt = cleanIso(item?.endAt);
  if (!startAt) return null;
  return {
    activityType: String(item?.activityType || "workout").trim().slice(0, 100),
    startAt,
    endAt,
    durationMinutes: cleanMinutes(item?.durationMinutes),
    activeKcal: cleanEnergy(item?.activeKcal),
    source: String(item?.source || "apple_health").trim().slice(0, 120) || "apple_health"
  };
}

function normalizePayload(body, path) {
  const legacy = path === "/v1/energy";
  const hasNestedActivity = body?.activity && typeof body.activity === "object" && !Array.isArray(body.activity);
  const activityRaw = legacy ? body : (hasNestedActivity ? body.activity : body);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || activityRaw?.date || ""))
    ? String(body?.date || activityRaw.date)
    : madridDateKey();

  const activeKcal = cleanEnergy(activityRaw?.activeKcal);
  const restingKcal = cleanEnergy(activityRaw?.restingKcal);
  const explicitTotal = cleanEnergy(activityRaw?.totalKcal);
  const totalKcal = explicitTotal ?? (
    activeKcal !== null && restingKcal !== null ? activeKcal + restingKcal : null
  );

  const workouts = Array.isArray(activityRaw?.workouts)
    ? activityRaw.workouts.map(cleanWorkout).filter(Boolean).slice(0, 50)
    : [];

  const activity = {
    date,
    activeKcal,
    restingKcal,
    totalKcal,
    steps: cleanSteps(activityRaw?.steps),
    exerciseMinutes: cleanMinutes(activityRaw?.exerciseMinutes),
    sampledAt: cleanIso(activityRaw?.sampledAt) || new Date().toISOString(),
    sourceDetails: Array.isArray(activityRaw?.sources)
      ? activityRaw.sources.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
      : [],
    workouts
  };

  const bodySamples = Array.isArray(body?.bodySamples)
    ? body.bodySamples.map(cleanBodySample).filter(Boolean).slice(0, 100)
    : [];

  const flatBodySpecs = [
    ["bodyMass", body?.bodyMass, body?.bodyMassMeasuredAt, body?.bodyMassSource, "kg"],
    ["bodyFatPercentage", body?.bodyFatPercentage, body?.bodyFatMeasuredAt, body?.bodyFatSource, "%"],
    ["bodyMassIndex", body?.bodyMassIndex, body?.bodyMassIndexMeasuredAt, body?.bodyMassIndexSource, "count"],
    ["leanBodyMass", body?.leanBodyMass, body?.leanBodyMassMeasuredAt, body?.leanBodyMassSource, "kg"]
  ];

  for (const [type, value, measuredAt, source, unit] of flatBodySpecs) {
    if (value === null || value === undefined || value === "") continue;
    const sample = cleanBodySample({ type, value, measuredAt, source, unit });
    if (sample) bodySamples.push(sample);
  }

  const listSpecs = [
    ["bodyMass", body?.bodyMassValues, body?.bodyMassMeasuredAts, body?.bodyMassSources, "kg"],
    ["bodyFatPercentage", body?.bodyFatPercentageValues, body?.bodyFatPercentageMeasuredAts, body?.bodyFatPercentageSources, "%"],
    ["bodyMassIndex", body?.bodyMassIndexValues, body?.bodyMassIndexMeasuredAts, body?.bodyMassIndexSources, "count"],
    ["leanBodyMass", body?.leanBodyMassValues, body?.leanBodyMassMeasuredAts, body?.leanBodyMassSources, "kg"]
  ];

  for (const [type, valuesRaw, measuredRaw, sourcesRaw, unit] of listSpecs) {
    const values = Array.isArray(valuesRaw) ? valuesRaw : [];
    const measured = Array.isArray(measuredRaw) ? measuredRaw : [];
    const sources = Array.isArray(sourcesRaw) ? sourcesRaw : [];
    const length = Math.min(values.length, measured.length, 100);
    for (let index = 0; index < length; index += 1) {
      const sample = cleanBodySample({
        type,
        value: values[index],
        measuredAt: measured[index],
        source: sources[index] || "apple_health",
        unit
      });
      if (sample) bodySamples.push(sample);
    }
  }

  return { activity, bodySamples };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "segundo-cerebro-health-ingest", version: 2 });
    }

    if (!["/v1/energy", "/v1/sync"].includes(url.pathname)) {
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

    const normalized = normalizePayload(body, url.pathname);
    const { activity, bodySamples } = normalized;
    const hasActivity = [
      activity.activeKcal,
      activity.restingKcal,
      activity.totalKcal,
      activity.steps,
      activity.exerciseMinutes
    ].some((value) => value !== null) || activity.workouts.length > 0;

    if (!hasActivity && bodySamples.length === 0) {
      return json({ ok: false, code: "EMPTY_HEALTH_SYNC" }, 400);
    }

    const internalRequest = new Request("https://segundo-cerebro.internal/api/health/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        activity: hasActivity ? {
          ...activity,
          source: "apple_health",
          note: String(body?.note || "Apple Shortcuts").slice(0, 500)
        } : null,
        bodySamples
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
      date: activity.date,
      activity: hasActivity ? {
        activeKcal: activity.activeKcal,
        restingKcal: activity.restingKcal,
        totalKcal: activity.totalKcal,
        steps: activity.steps,
        exerciseMinutes: activity.exerciseMinutes,
        workoutCount: activity.workouts.length
      } : null,
      bodySamplesAccepted: bodySamples.length
    }, 201);
  }
};
