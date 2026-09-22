
let calendarCache = { value: null, expiresAt: 0 };

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
  const authBase = "https://caldav.icloud.com/";
  const principalQuery = '<?xml version="1.0" encoding="utf-8"?>\n<D:propfind xmlns:D="DAV:">\n  <D:prop><D:current-user-principal/></D:prop>\n</D:propfind>';
  const principalResult = await caldavRequest(env, authBase, {
    method: "PROPFIND",
    depth: "0",
    body: principalQuery
  });
  const principalHref = extractPropertyHref(principalResult.text, "current-user-principal");
  if (!principalHref) throw new Error("ICLOUD_PRINCIPAL_NOT_FOUND");

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

export async function fetchIcloudCalendarSummary(env) {
  if (!hasIcloudCalendarConfig(env)) {
    return { status: "not-configured", value: null };
  }

  if (calendarCache.value && calendarCache.expiresAt > Date.now()) {
    return { status: "ok-cache", value: calendarCache.value };
  }

  const selected = parseCalendarConfig(env.ICLOUD_CALENDAR_CONFIG);
  if (!selected.length) throw new Error("ICLOUD_CALENDAR_CONFIG_INVALID");

  const available = await discoverIcloudCalendars(env);
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const start = formatCalDavTimestamp(from);
  const end = formatCalDavTimestamp(to);

  const events = [];
  const missingCalendars = [];

  for (const calendarConfig of selected) {
    const matched = available.find((item) => item.name === calendarConfig.name);
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

    const report = await caldavRequest(env, matched.url, {
      method: "REPORT",
      depth: "1",
      body: reportBody
    });

    for (const responseBlock of extractXmlResponses(report.text)) {
      const calendarData = extractXmlTag(responseBlock, "calendar-data");
      if (!calendarData) continue;
      events.push(...parseCalendarData(calendarData, calendarConfig));
    }
  }

  const value = {
    events: events
      .filter((event) => new Date(event.endsAt).getTime() >= from.getTime())
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    source: {
      kind: "icloud-caldav",
      mode: "read-only",
      horizonDays: 90,
      selectedCalendarCount: selected.length,
      matchedCalendarCount: selected.length - missingCalendars.length,
      missingCalendars,
      updatedAt: new Date().toISOString()
    }
  };

  calendarCache = {
    value,
    expiresAt: Date.now() + 60_000
  };

  return { status: "ok", value };
}
