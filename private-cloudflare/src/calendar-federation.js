function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalTime(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value || "");
}

function eventKey(event) {
  return [
    normalizeText(event?.title),
    canonicalTime(event?.startsAt),
    canonicalTime(event?.endsAt || event?.startsAt)
  ].join("|");
}

export function filterGoogleEventsByVisibility(googleEvents, calendarVisibility = []) {
  const hidden = (Array.isArray(calendarVisibility) ? calendarVisibility : [])
    .filter((item) => item?.provider === "google-calendar" && item?.visible === false);
  const hiddenIds = new Set(hidden.map((item) => String(item.calendarId || "").trim()).filter(Boolean));
  const hiddenNames = new Set(hidden.map((item) => normalizeText(item.calendarName)).filter(Boolean));
  const events = (Array.isArray(googleEvents) ? googleEvents : []).filter((event) => {
    if (event?.calendarId) return !hiddenIds.has(String(event.calendarId).trim());
    // Cached events from before calendarId was introduced still respect hidden sources.
    return !hiddenNames.has(normalizeText(event?.calendarName));
  });
  return { events, hiddenCalendarCount: hidden.length };
}

function mergeEvents(icloudEvents, googleEvents) {
  const merged = [];
  const byKey = new Map();

  for (const event of [...(icloudEvents || []), ...(googleEvents || [])]) {
    if (!event?.startsAt) continue;
    const key = eventKey(event);
    const existing = byKey.get(key);
    if (!existing) {
      const copy = { ...event, sourceRefs: [...new Set(event.sourceRefs || [])] };
      byKey.set(key, copy);
      merged.push(copy);
      continue;
    }
    existing.sourceRefs = [...new Set([...(existing.sourceRefs || []), ...(event.sourceRefs || [])])];
    if (!existing.location && event.location) existing.location = event.location;
  }

  return merged.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)
    || String(a.title || "").localeCompare(String(b.title || ""), "es"));
}

function providerInfo(result, kind) {
  const source = result?.value?.source || {};
  return {
    kind,
    status: result?.status || "not-configured",
    freshness: source.freshness || null,
    selectedCalendarCount: Number(source.selectedCalendarCount || 0),
    matchedCalendarCount: Number(source.matchedCalendarCount || 0),
    missingCalendarCount: Array.isArray(source.missingCalendars) ? source.missingCalendars.length : 0,
    updatedAt: source.updatedAt || source.checkedAt || null
  };
}

function overallFreshness(providers) {
  const enabled = Object.values(providers).filter((provider) => provider.status !== "not-configured");
  if (!enabled.length) return "unavailable";
  if (enabled.every((provider) => ["ok", "ok-cache"].includes(provider.status) && provider.freshness !== "fallback")) return "live";
  if (enabled.some((provider) => provider.status === "fallback" || provider.freshness === "fallback")) return "mixed";
  return "degraded";
}

export function mergeCalendarSources(icloudResult, googleResult, calendarVisibility = []) {
  const icloudEvents = Array.isArray(icloudResult?.value?.events) ? icloudResult.value.events : [];
  const filteredGoogle = filterGoogleEventsByVisibility(googleResult?.value?.events, calendarVisibility);
  const googleEvents = filteredGoogle.events;
  const providers = {
    icloud: providerInfo(icloudResult, "icloud-caldav"),
    google: providerInfo(googleResult, "google-calendar")
  };
  const configured = Object.values(providers).some((provider) => provider.status !== "not-configured");
  if (!configured && !icloudEvents.length && !googleEvents.length) return null;

  const selectedCalendarCount = Object.values(providers)
    .reduce((sum, provider) => sum + provider.selectedCalendarCount, 0);
  const matchedCalendarCount = Object.values(providers)
    .reduce((sum, provider) => sum + provider.matchedCalendarCount, 0);
  const updatedAt = Object.values(providers)
    .map((provider) => provider.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    events: mergeEvents(icloudEvents, googleEvents),
    source: {
      kind: "federated-calendar",
      mode: "read-only",
      freshness: overallFreshness(providers),
      selectedCalendarCount,
      matchedCalendarCount,
      hiddenCalendarCount: filteredGoogle.hiddenCalendarCount,
      providers,
      updatedAt
    }
  };
}
