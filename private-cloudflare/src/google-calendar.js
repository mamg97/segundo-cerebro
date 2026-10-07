import { googleReadFetch } from "./google-read.js";

const GOOGLE_CALENDAR_CACHE_MS = 60_000;
const GOOGLE_CALENDAR_FALLBACK_CACHE_MS = 15_000;
const GOOGLE_CALENDAR_SNAPSHOT_KEY = "google-calendar-last-known-good";

let googleCalendarCache = { value: null, expiresAt: 0 };

function safeText(value, max = 500) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function eventTimes(event) {
  const start = event?.start?.dateTime
    ? String(event.start.dateTime)
    : event?.start?.date
      ? String(event.start.date) + "T00:00:00"
      : null;
  const end = event?.end?.dateTime
    ? String(event.end.dateTime)
    : event?.end?.date
      ? String(event.end.date) + "T00:00:00"
      : start;
  return { start, end };
}

function normalizeEvent(event, calendar) {
  if (!event || event.status === "cancelled") return null;
  const { start, end } = eventTimes(event);
  if (!start) return null;
  const calendarName = safeText(calendar?.summaryOverride || calendar?.summary || "Google Calendar", 160);
  const title = safeText(event.summary || (event.transparency === "transparent" ? "Disponible" : "Ocupado"), 240);
  return {
    id: "google-" + stableHash(calendar?.id) + "-" + safeText(event.id, 400),
    title,
    startsAt: start,
    endsAt: end || start,
    location: safeText(event.location, 500),
    locationRef: safeText(event.location, 500),
    areaId: "area-general",
    sensitivity: event.visibility === "private" ? "confidencial" : "personal",
    sourceRefs: ["source-google-calendar"],
    calendarName,
    sourceProvider: "google-calendar"
  };
}

async function ensureSnapshotTable(env) {
  if (!env?.DB) return false;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS calendar_snapshots (" +
      "cache_key TEXT PRIMARY KEY, content_json TEXT NOT NULL, event_count INTEGER NOT NULL DEFAULT 0, " +
      "created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
  ).run();
  return true;
}

async function loadSnapshot(env) {
  try {
    if (!(await ensureSnapshotTable(env))) return null;
    const row = await env.DB.prepare(
      "SELECT content_json FROM calendar_snapshots WHERE cache_key = ? LIMIT 1"
    ).bind(GOOGLE_CALENDAR_SNAPSHOT_KEY).first();
    if (!row?.content_json) return null;
    const parsed = JSON.parse(row.content_json);
    return parsed && Array.isArray(parsed.events) ? parsed : null;
  } catch (error) {
    console.warn("Google calendar snapshot read failed", String(error?.message || error));
    return null;
  }
}

async function saveSnapshot(env, value) {
  try {
    if (!(await ensureSnapshotTable(env))) return;
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO calendar_snapshots (cache_key, content_json, event_count, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET " +
      "content_json = excluded.content_json, event_count = excluded.event_count, updated_at = excluded.updated_at"
    ).bind(
      GOOGLE_CALENDAR_SNAPSHOT_KEY,
      JSON.stringify(value),
      Array.isArray(value?.events) ? value.events.length : 0,
      now,
      now
    ).run();
  } catch (error) {
    console.warn("Google calendar snapshot write failed", String(error?.message || error));
  }
}

async function fetchJson(endpoint, token, code) {
  const response = await googleReadFetch(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error(code + "_" + response.status);
  return response.json();
}

async function listCalendars(token) {
  const calendars = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      maxResults: "250",
      minAccessRole: "reader",
      showDeleted: "false",
      showHidden: "false"
    });
    if (pageToken) params.set("pageToken", pageToken);
    const payload = await fetchJson(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?" + params.toString(),
      token,
      "GOOGLE_CALENDAR_LIST"
    );
    calendars.push(...(Array.isArray(payload?.items) ? payload.items : []));
    pageToken = String(payload?.nextPageToken || "");
  } while (pageToken);
  return calendars.filter((item) => item?.id && item?.deleted !== true);
}

async function listCalendarEvents(token, calendar, timeMin, timeMax) {
  const events = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "2500",
      timeZone: "Europe/Madrid"
    });
    if (pageToken) params.set("pageToken", pageToken);
    const endpoint =
      "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendar.id) +
      "/events?" + params.toString();
    const payload = await fetchJson(endpoint, token, "GOOGLE_CALENDAR_EVENTS");
    events.push(...(Array.isArray(payload?.items) ? payload.items : []));
    pageToken = String(payload?.nextPageToken || "");
  } while (pageToken);
  return events.map((event) => normalizeEvent(event, calendar)).filter(Boolean);
}

function sortEvents(events) {
  return [...events].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)
    || String(a.title || "").localeCompare(String(b.title || ""), "es"));
}

export function hasGoogleCalendarConfig(env) {
  return Boolean(env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET && env?.GOOGLE_REFRESH_TOKEN);
}

export function safeGoogleCalendarErrorCode(error) {
  const value = String(error?.message || error || "GOOGLE_CALENDAR_ERROR");
  return value.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 120);
}

export async function fetchGoogleCalendarSummary(env, getGoogleAccessToken) {
  if (!hasGoogleCalendarConfig(env)) return { status: "not-configured", value: null };
  if (googleCalendarCache.value && googleCalendarCache.expiresAt > Date.now()) {
    return { status: "ok-cache", value: googleCalendarCache.value };
  }

  const lastGood = await loadSnapshot(env);
  try {
    const token = await getGoogleAccessToken(env);
    const calendars = await listCalendars(token);
    const now = new Date();
    const from = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const horizonDays = 550;
    const to = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
    const missingCalendars = [];
    const results = await Promise.all(calendars.map(async (calendar) => {
      try {
        return await listCalendarEvents(token, calendar, from.toISOString(), to.toISOString());
      } catch (error) {
        missingCalendars.push(safeText(calendar.summaryOverride || calendar.summary || "Calendario", 160));
        console.warn("Google calendar read failed", safeGoogleCalendarErrorCode(error));
        return [];
      }
    }));
    const live = {
      events: sortEvents(results.flat().filter((event) => new Date(event.endsAt || event.startsAt).getTime() >= from.getTime())),
      source: {
        kind: "google-calendar",
        mode: "read-only",
        horizonDays,
        selectedCalendarCount: calendars.length,
        matchedCalendarCount: Math.max(0, calendars.length - missingCalendars.length),
        missingCalendars,
        freshness: missingCalendars.length ? "degraded" : "live",
        updatedAt: new Date().toISOString()
      }
    };

    const suspiciousEmpty = Boolean(lastGood?.events?.length) && live.events.length === 0 && calendars.length > 0;
    const partial = missingCalendars.length > 0;
    if (suspiciousEmpty) {
      const fallback = {
        ...lastGood,
        source: {
          ...(lastGood.source || {}),
          freshness: "fallback",
          fallbackReason: "empty-live-read",
          selectedCalendarCount: calendars.length,
          matchedCalendarCount: live.source.matchedCalendarCount,
          missingCalendars,
          checkedAt: new Date().toISOString()
        }
      };
      googleCalendarCache = { value: fallback, expiresAt: Date.now() + GOOGLE_CALENDAR_FALLBACK_CACHE_MS };
      return { status: "fallback", value: fallback };
    }

    if (!partial) await saveSnapshot(env, live);
    const value = partial && lastGood?.events?.length
      ? {
          ...live,
          events: sortEvents([...live.events, ...lastGood.events.filter((oldEvent) =>
            missingCalendars.includes(oldEvent.calendarName) &&
            !live.events.some((item) => item.id === oldEvent.id)
          )]),
          source: {
            ...live.source,
            freshness: "mixed",
            fallbackReason: "missing-calendars"
          }
        }
      : live;
    googleCalendarCache = {
      value,
      expiresAt: Date.now() + (partial ? GOOGLE_CALENDAR_FALLBACK_CACHE_MS : GOOGLE_CALENDAR_CACHE_MS)
    };
    return { status: partial ? "degraded" : "ok", value };
  } catch (error) {
    if (lastGood?.events?.length) {
      const value = {
        ...lastGood,
        source: {
          ...(lastGood.source || {}),
          freshness: "fallback",
          fallbackReason: safeGoogleCalendarErrorCode(error),
          checkedAt: new Date().toISOString()
        }
      };
      googleCalendarCache = { value, expiresAt: Date.now() + GOOGLE_CALENDAR_FALLBACK_CACHE_MS };
      return { status: "fallback", value };
    }
    throw error;
  }
}

export function invalidateGoogleCalendarCache() {
  googleCalendarCache = { value: null, expiresAt: 0 };
}
