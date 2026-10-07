
let calendarCache = { value: null, expiresAt: 0 };

const CALENDAR_SNAPSHOT_KEY = "icloud-calendar-last-known-good";
const CALENDAR_LIVE_TIMEOUT_MS = 5500;
const CALENDAR_LIVE_CACHE_MS = 60_000;
const CALENDAR_FALLBACK_CACHE_MS = 15_000;

export function normalizeIcloudCalendarName(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchIcloudCalendar(available, configuredName) {
  const items = Array.isArray(available) ? available : [];
  const exact = items.find((item) => item && item.name === configuredName);
  if (exact) return exact;
  const target = normalizeIcloudCalendarName(configuredName);
  if (!target) return null;
  const normalizedMatches = items.filter((item) => normalizeIcloudCalendarName(item && item.name) === target);
  return normalizedMatches.length === 1 ? normalizedMatches[0] : null;
}

function sortCalendarEvents(events) {
  return [...(Array.isArray(events) ? events : [])]
    .sort((a, b) => new Date(a?.startsAt || 0) - new Date(b?.startsAt || 0));
}

function lastGoodTimestamp(value) {
  return value?.source?.lastGoodAt || value?.source?.updatedAt || null;
}

export function resolveIcloudCalendarRead(liveValue, lastGood) {
  const liveEvents = Array.isArray(liveValue?.events) ? liveValue.events : [];
  const previousEvents = Array.isArray(lastGood?.events) ? lastGood.events : [];
  const source = liveValue?.source || {};
  const selected = Number(source.selectedCalendarCount || 0);
  const matched = Number(source.matchedCalendarCount || 0);
  const missing = Array.isArray(source.missingCalendars) ? source.missingCalendars.filter(Boolean) : [];
  const attemptedAt = source.updatedAt || new Date().toISOString();

  if (previousEvents.length && liveEvents.length === 0) {
    return {
      shouldPersist: false,
      value: {
        ...lastGood,
        source: {
          ...(lastGood?.source || {}),
          selectedCalendarCount: selected || lastGood?.source?.selectedCalendarCount || 0,
          matchedCalendarCount: matched,
          missingCalendars: missing,
          freshness: "fallback",
          fallbackReason: "empty-live-read",
          attemptedAt,
          lastGoodAt: lastGoodTimestamp(lastGood)
        }
      }
    };
  }

  if (previousEvents.length && selected > 0 && matched < selected) {
    const missingNames = new Set(missing.map(normalizeIcloudCalendarName));
    const byId = new Map(liveEvents.map((event) => [String(event?.id || ""), event]));
    for (const event of previousEvents) {
      if (!missingNames.has(normalizeIcloudCalendarName(event?.calendarName))) continue;
      const key = String(event?.id || "");
      if (!key || byId.has(key)) continue;
      byId.set(key, event);
    }
    return {
      shouldPersist: false,
      value: {
        ...liveValue,
        events: sortCalendarEvents([...byId.values()]),
        source: {
          ...source,
          freshness: "mixed",
          fallbackReason: "missing-calendars",
          attemptedAt,
          lastGoodAt: lastGoodTimestamp(lastGood)
        }
      }
    };
  }

  const complete = selected > 0 && matched === selected;
  const healthy = complete && liveEvents.length > 0;
  return {
    shouldPersist: healthy,
    value: {
      ...liveValue,
      events: sortCalendarEvents(liveEvents),
      source: {
        ...source,
        freshness: healthy ? "live" : "degraded",
        attemptedAt,
        lastGoodAt: healthy ? attemptedAt : lastGoodTimestamp(lastGood)
      }
    }
  };
}

async function ensureCalendarSnapshotTable(env) {
  if (!env?.DB) return false;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS calendar_snapshots (" +
      "cache_key TEXT PRIMARY KEY," +
      "content_json TEXT NOT NULL," +
      "event_count INTEGER NOT NULL DEFAULT 0," +
      "created_at TEXT NOT NULL," +
      "updated_at TEXT NOT NULL" +
    ")"
  ).run();
  return true;
}

async function loadCalendarSnapshot(env) {
  try {
    if (!(await ensureCalendarSnapshotTable(env))) return null;
    const row = await env.DB.prepare(
      "SELECT content_json FROM calendar_snapshots WHERE cache_key = ? LIMIT 1"
    ).bind(CALENDAR_SNAPSHOT_KEY).first();
    if (!row?.content_json) return null;
    const parsed = JSON.parse(row.content_json);
    return parsed && Array.isArray(parsed.events) ? parsed : null;
  } catch (error) {
    console.warn("iCloud calendar snapshot read failed", String(error?.message || error));
    return null;
  }
}

async function saveCalendarSnapshot(env, value) {
  try {
    if (!(await ensureCalendarSnapshotTable(env))) return;
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO calendar_snapshots (cache_key, content_json, event_count, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT(cache_key) DO UPDATE SET " +
        "content_json = excluded.content_json, event_count = excluded.event_count, updated_at = excluded.updated_at"
    ).bind(
      CALENDAR_SNAPSHOT_KEY,
      JSON.stringify(value),
      Array.isArray(value?.events) ? value.events.length : 0,
      now,
      now
    ).run();
  } catch (error) {
    console.warn("iCloud calendar snapshot write failed", String(error?.message || error));
  }
}

function seedCalendarSnapshot(seedEvents, selected) {
  const events = (Array.isArray(seedEvents) ? seedEvents : [])
    .filter((event) => event?.startsAt && (event?.calendarName || (Array.isArray(event?.sourceRefs) && event.sourceRefs.includes("source-icloud-calendar"))));
  if (!events.length) return null;
  const updatedAt = events.reduce((latest, event) => {
    const value = String(event?.updatedAt || "");
    return value && (!latest || value > latest) ? value : latest;
  }, "") || new Date().toISOString();
  return {
    events: sortCalendarEvents(events),
    source: {
      kind: "icloud-caldav",
      mode: "read-only",
      horizonDays: 550,
      selectedCalendarCount: selected.length,
      matchedCalendarCount: 0,
      missingCalendars: [],
      freshness: "seed",
      fallbackReason: "state-snapshot-seed",
      updatedAt,
      lastGoodAt: updatedAt
    }
  };
}

async function withCalendarTimeout(promise, timeoutMs = CALENDAR_LIVE_TIMEOUT_MS) {
  let timeoutId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("ICLOUD_LIVE_TIMEOUT")), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

export function hasIcloudCalendarConfig(env) {
  return Boolean(env.ICLOUD_APPLE_ID && env.ICLOUD_APP_PASSWORD && env.ICLOUD_CALENDAR_CONFIG);
}

function basicAuth(user, password) {
  return "Basic " + btoa(user + ":" + password);
}

function decodeXml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function extractXmlTag(xml, localName) {
  const pattern = new RegExp("<(?:(?:[A-Za-z0-9_-]+):)?" + localName + "\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z0-9_-]+):)?" + localName + ">", "i");
  const match = xml.match(pattern);
  return match ? decodeXml(match[1].trim()) : null;
}

function extractXmlResponses(xml) {
  return [...xml.matchAll(/<(?:(?:[A-Za-z0-9_-]+):)?response\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?response>/gi)]
    .map((match) => match[1]);
}

function extractPropertyHref(xml, propertyName) {
  const pattern = new RegExp("<(?:(?:[A-Za-z0-9_-]+):)?" + propertyName + "\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z0-9_-]+):)?" + propertyName + ">", "i");
  const match = xml.match(pattern);
  return match ? extractXmlTag(match[1], "href") : null;
}

async function caldavRequest(env, url, options = {}) {
  const method = options.method || "PROPFIND";
  const depth = options.depth || "0";
  const body = options.body || "";
  let currentUrl = url;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(currentUrl, {
      method,
      redirect: "manual",
      headers: {
        "Authorization": basicAuth(env.ICLOUD_APPLE_ID, env.ICLOUD_APP_PASSWORD),
        "Depth": depth,
        "Content-Type": "application/xml; charset=utf-8"
      },
      body: body || undefined
    });

    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (!location) throw new Error("ICLOUD_REDIRECT_WITHOUT_LOCATION");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const text = await response.text();
    if (!response.ok && response.status !== 207) {
      throw new Error("ICLOUD_CALDAV_" + response.status);
    }
    return { response, text };
  }

  throw new Error("ICLOUD_TOO_MANY_REDIRECTS");
}

function absoluteCaldavUrl(base, href) {
  return new URL(href, base).toString();
}

function parseCalendarConfig(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.name && item.areaId) : [];
  } catch {
    return [];
  }
}

function formatCalDavTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z";
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function unescapeIcs(value = "") {
  return value
    .replaceAll("\\n", "\n")
    .replaceAll("\\N", "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\");
}

function getIcsProperty(block, property) {
  const line = block.split(/\r?\n/).find((item) => {
    const head = item.split(":", 1)[0] || "";
    return head.split(";")[0].toUpperCase() === property.toUpperCase();
  });
  if (!line) return null;
  const index = line.indexOf(":");
  return index >= 0 ? line.slice(index + 1) : null;
}

function parseIcsDate(value) {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) {
    return value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8) + "T00:00:00";
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return null;
  const year = match[1];
  const month = match[2];
  const day = match[3];
  const hour = match[4];
  const minute = match[5];
  const second = match[6];
  const zulu = match[7];
  return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + (zulu ? "Z" : "");
}

function parseCalendarData(ics, calendar) {
  const unfolded = unfoldIcs(ics);
  const blocks = [...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g)].map((match) => match[1]);

  return blocks.flatMap((block) => {
    const status = String(getIcsProperty(block, "STATUS") || "").toUpperCase();
    if (status === "CANCELLED") return [];

    const start = parseIcsDate(getIcsProperty(block, "DTSTART"));
    if (!start) return [];

    const uid = unescapeIcs(getIcsProperty(block, "UID") || crypto.randomUUID());
    const recurrence = unescapeIcs(getIcsProperty(block, "RECURRENCE-ID") || "");
    const title = unescapeIcs(getIcsProperty(block, "SUMMARY") || "Sin título");
    const end = parseIcsDate(getIcsProperty(block, "DTEND")) || start;
    const location = unescapeIcs(getIcsProperty(block, "LOCATION") || "");

    return [{
      id: "icloud-" + uid + "-" + (recurrence || start),
      type: "EVENT",
      title,
      areaId: calendar.areaId,
      status: "confirmed",
      startsAt: start,
      endsAt: end,
      locationRef: location || "Sin ubicación",
      sensitivity: calendar.sensitivity || "personal",
      sourceRefs: ["source-icloud-calendar"],
      calendarName: calendar.name,
      updatedAt: new Date().toISOString()
    }];
  });
}

async function discoverIcloudCalendars(env) {
  const principalQuery = '<?xml version="1.0" encoding="utf-8"?>\n<D:propfind xmlns:D="DAV:">\n  <D:prop><D:current-user-principal/></D:prop>\n</D:propfind>';
  const discoveryBases = [
    "https://caldav.icloud.com/",
    "https://caldav.icloud.com/.well-known/caldav"
  ];

  let principalResult = null;
  let principalHref = null;
  let authBase = discoveryBases[0];

  for (const candidate of discoveryBases) {
    try {
      const result = await caldavRequest(env, candidate, {
        method: "PROPFIND",
        depth: "0",
        body: principalQuery
      });
      const href = extractPropertyHref(result.text, "current-user-principal");
      if (href) {
        principalResult = result;
        principalHref = href;
        authBase = candidate;
        break;
      }
    } catch (error) {
      const code = String(error?.message || "");
      if (code === "ICLOUD_CALDAV_401" || code === "ICLOUD_CALDAV_403") throw error;
    }
  }

  if (!principalResult || !principalHref) throw new Error("ICLOUD_PRINCIPAL_NOT_FOUND");

  const principalUrl = absoluteCaldavUrl(principalResult.response.url || authBase, principalHref);
  const homeQuery = '<?xml version="1.0" encoding="utf-8"?>\n<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n  <D:prop><C:calendar-home-set/></D:prop>\n</D:propfind>';
  const homeResult = await caldavRequest(env, principalUrl, {
    method: "PROPFIND",
    depth: "0",
    body: homeQuery
  });
  const homeHref = extractPropertyHref(homeResult.text, "calendar-home-set");
  if (!homeHref) throw new Error("ICLOUD_CALENDAR_HOME_NOT_FOUND");

  const homeUrl = absoluteCaldavUrl(homeResult.response.url || principalUrl, homeHref);
  const listQuery = '<?xml version="1.0" encoding="utf-8"?>\n<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n  <D:prop><D:displayname/><D:resourcetype/></D:prop>\n</D:propfind>';
  const listResult = await caldavRequest(env, homeUrl, {
    method: "PROPFIND",
    depth: "1",
    body: listQuery
  });

  return extractXmlResponses(listResult.text)
    .map((block) => ({
      href: extractXmlTag(block, "href"),
      name: extractXmlTag(block, "displayname"),
      isCalendar: /<(?:(?:[A-Za-z0-9_-]+):)?calendar\b/i.test(block)
    }))
    .filter((item) => item.href && item.name && item.isCalendar)
    .map((item) => ({
      ...item,
      url: absoluteCaldavUrl(listResult.response.url || homeUrl, item.href)
    }));
}

async function fetchLiveIcloudCalendarSummary(env, selected) {
  const available = await discoverIcloudCalendars(env);
  const now = new Date();
  const from = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const horizonDays = 550;
  const to = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const start = formatCalDavTimestamp(from);
  const end = formatCalDavTimestamp(to);

  const events = [];
  const missingCalendars = [];

  for (const calendarConfig of selected) {
    const matched = matchIcloudCalendar(available, calendarConfig.name);
    if (!matched) {
      missingCalendars.push(calendarConfig.name);
      continue;
    }

    const reportBody =
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n' +
      '  <D:prop><D:getetag/><C:calendar-data><C:expand start="' + start + '" end="' + end + '"/></C:calendar-data></D:prop>\n' +
      '  <C:filter><C:comp-filter name="VCALENDAR"><C:comp-filter name="VEVENT"><C:time-range start="' + start + '" end="' + end + '"/></C:comp-filter></C:comp-filter></C:filter>\n' +
      '</C:calendar-query>';

    const report = await caldavRequest(env, matched.url, { method: "REPORT", depth: "1", body: reportBody });
    for (const responseBlock of extractXmlResponses(report.text)) {
      const calendarData = extractXmlTag(responseBlock, "calendar-data");
      if (!calendarData) continue;
      events.push(...parseCalendarData(calendarData, calendarConfig));
    }
  }

  return {
    events: events
      .filter((event) => new Date(event.endsAt).getTime() >= from.getTime())
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    source: {
      kind: "icloud-caldav", mode: "read-only", horizonDays,
      selectedCalendarCount: selected.length,
      matchedCalendarCount: selected.length - missingCalendars.length,
      missingCalendars,
      updatedAt: new Date().toISOString()
    }
  };
}

export async function fetchIcloudCalendarSummary(env, options = {}) {
  if (!hasIcloudCalendarConfig(env)) return { status: "not-configured", value: null };
  if (calendarCache.value && calendarCache.expiresAt > Date.now()) return { status: "ok-cache", value: calendarCache.value };

  const selected = parseCalendarConfig(env.ICLOUD_CALENDAR_CONFIG);
  if (!selected.length) throw new Error("ICLOUD_CALENDAR_CONFIG_INVALID");

  let lastGood = await loadCalendarSnapshot(env);
  if (!lastGood) {
    const seeded = seedCalendarSnapshot(options.seedEvents, selected);
    if (seeded) {
      lastGood = seeded;
      await saveCalendarSnapshot(env, seeded);
    }
  }

  try {
    const liveValue = await withCalendarTimeout(fetchLiveIcloudCalendarSummary(env, selected));
    const resolved = resolveIcloudCalendarRead(liveValue, lastGood);
    if (resolved.shouldPersist) await saveCalendarSnapshot(env, resolved.value);
    const fallback = resolved.value?.source?.freshness !== "live";
    calendarCache = { value: resolved.value, expiresAt: Date.now() + (fallback ? CALENDAR_FALLBACK_CACHE_MS : CALENDAR_LIVE_CACHE_MS) };
    return { status: fallback ? "ok-degraded" : "ok", value: resolved.value };
  } catch (error) {
    if (!lastGood) throw error;
    const attemptedAt = new Date().toISOString();
    const value = {
      ...lastGood,
      source: {
        ...(lastGood.source || {}),
        freshness: "fallback",
        fallbackReason: String(error?.message || "ICLOUD_READ_FAILED"),
        attemptedAt,
        lastGoodAt: lastGoodTimestamp(lastGood)
      }
    };
    calendarCache = { value, expiresAt: Date.now() + CALENDAR_FALLBACK_CACHE_MS };
    return { status: "ok-fallback", value };
  }
}
