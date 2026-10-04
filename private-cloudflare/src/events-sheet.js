import { googleReadFetch, sheetsBatchGet } from "./google-read.js";

const SHEET_TITLE = "SEGUNDO CEREBRO - EVENTOS";
const SOURCE_KEY = "EVENTS_SHEET_ID";
const CACHE_MS = 15_000;

const EVENT_STATUSES = new Set(["PROPUESTO", "PENDIENTE", "CONFIRMADO", "EN_CURSO", "CERRADO", "CANCELADO"]);
const EVENT_FACT_TYPES = new Set(["PLAN", "GASTO", "COMIDA", "NUTRICION", "TRANSPORTE", "LUGAR", "INCIDENCIA", "DECISION", "NOTA"]);
const EVENT_REF_PROVIDERS = new Set(["calendar", "finance", "objects", "health", "gmail", "outlook", "drive", "airbnb", "transport", "other"]);

const EVENT_HEADERS = [
  "evento_id", "title", "kind", "status", "starts_at", "ends_at", "location", "participants",
  "calendar_ref", "finance_ref", "objects_list_ref", "summary", "final_summary", "sensitivity",
  "source_provider", "source_updated_at", "updated_at"
];
const FACT_HEADERS = ["fact_id", "evento_id", "fact_type", "summary", "happened_at", "source_provider", "source_ref", "created_at"];
const REF_HEADERS = ["ref_id", "evento_id", "ref_type", "source_provider", "source_ref", "label", "created_at"];

let cache = {
  value: null,
  expiresAt: 0,
  spreadsheetId: null,
  spreadsheetIdExpiresAt: 0,
  sourceMissingUntil: 0
};

function trim(value, max = 1000) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function nullable(value, max = 1000) {
  const valueClean = trim(value, max);
  return valueClean || null;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

function list(value) {
  if (value == null || value === "") return [];
  return String(value).split(/[|;]/).map((item) => item.trim()).filter(Boolean);
}

function bool(value) {
  return !["0", "false", "no"].includes(String(value ?? "true").trim().toLowerCase());
}

function dateOrNull(value) {
  const clean = trim(value, 100);
  if (!clean) return null;
  const parsed = new Date(clean);
  return Number.isFinite(parsed.getTime()) ? clean : null;
}

function currentStatus(item, now = Date.now()) {
  const base = String(item.status || "CONFIRMADO").toUpperCase();
  if (base === "CANCELADO") return "CANCELADO";
  const start = item.startsAt ? new Date(item.startsAt).getTime() : NaN;
  const end = (item.endsAt || item.startsAt) ? new Date(item.endsAt || item.startsAt).getTime() : NaN;
  if (Number.isFinite(end) && end < now) return "CERRADO";
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) return "EN_CURSO";
  if (base === "PROPUESTO" || base === "PENDIENTE") return base;
  return "CONFIRMADO";
}

function tableWithRows(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map(({ row, rowNumber }) => ({
      rowNumber,
      record: Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null]))
    }));
}

function eventFromRecord(record, rowNumber = null) {
  const item = {
    id: trim(record.evento_id, 500),
    title: trim(record.title, 240) || "Evento",
    kind: trim(record.kind || "important", 40).toLowerCase(),
    status: trim(record.status || "CONFIRMADO", 24).toUpperCase(),
    startsAt: dateOrNull(record.starts_at),
    endsAt: dateOrNull(record.ends_at),
    location: nullable(record.location, 500),
    participants: list(record.participants),
    calendarRef: nullable(record.calendar_ref, 1000),
    financeRef: nullable(record.finance_ref, 500),
    objectsListRef: nullable(record.objects_list_ref, 500),
    summary: nullable(record.summary, 4000),
    finalSummary: nullable(record.final_summary, 8000),
    sensitivity: nullable(record.sensitivity, 40) || "confidencial",
    sourceProvider: nullable(record.source_provider, 40),
    sourceUpdatedAt: nullable(record.source_updated_at, 100),
    updatedAt: nullable(record.updated_at, 100),
    _rowNumber: rowNumber
  };
  item.status = currentStatus(item);
  return item;
}

function factFromRecord(record, rowNumber = null) {
  return {
    id: trim(record.fact_id, 500),
    eventId: trim(record.evento_id, 500),
    type: trim(record.fact_type || "NOTA", 32).toUpperCase(),
    summary: trim(record.summary, 4000),
    happenedAt: dateOrNull(record.happened_at),
    sourceProvider: nullable(record.source_provider, 40),
    sourceRef: nullable(record.source_ref, 1200),
    createdAt: nullable(record.created_at, 100),
    _rowNumber: rowNumber
  };
}

function refFromRecord(record, rowNumber = null) {
  return {
    id: trim(record.ref_id, 500),
    eventId: trim(record.evento_id, 500),
    type: nullable(record.ref_type, 80),
    sourceProvider: trim(record.source_provider, 40).toLowerCase(),
    sourceRef: trim(record.source_ref, 1200),
    label: nullable(record.label, 500),
    createdAt: nullable(record.created_at, 100),
    _rowNumber: rowNumber
  };
}

function rulesFromRows(values = []) {
  return tableWithRows(values)
    .map(({ record }) => ({
      id: nullable(record.id, 200),
      matchTerms: list(record.match_terms).map((term) => normalize(term)),
      displayTitle: nullable(record.display_title, 240),
      kind: trim(record.kind || "important", 40).toLowerCase(),
      enabled: bool(record.enabled),
      note: nullable(record.note, 2000),
      excludeTerms: list(record.exclude_terms).map((term) => normalize(term))
    }))
    .filter((item) => item.enabled && item.matchTerms.length);
}

function matchRule(event, rules) {
  const title = normalize(event?.title);
  return (Array.isArray(rules) ? rules : []).find((candidate) => {
    const included = candidate.matchTerms.every((term) => title.includes(normalize(term)));
    const excluded = candidate.excludeTerms.some((term) => title.includes(normalize(term)));
    return included && !excluded;
  }) || null;
}

function isNonEventOperationalReminder(event) {
  const text = normalize([event?.title, event?.location, event?.locationRef].filter(Boolean).join(" "));
  return /(^|\b)(cobro|pago|pagar|ingresar|cuota|recibo|cargo|transferencia|transferir|saldo|paypal|tarjeta)(\b|$)/.test(text)
    || /check[ -]?in|facturacion|recordatorio/.test(text);
}

function inferCalendarEventKind(event) {
  const text = normalize([event?.title, event?.location, event?.locationRef].filter(Boolean).join(" "));
  if (isNonEventOperationalReminder(event)) return null;
  if (/boda|preboda|celebracion|aniversario|brunch|comida|cena|concierto|teatro|fiesta|quedada/.test(text)) return "social";
  if (/viaje|vuelo|escapada|marbella|valencia|puy du fou|airbnb/.test(text)) return "travel";
  return null;
}

function isSimpleBirthdayReminder(event) {
  const text = normalize([event?.title, event?.summary].filter(Boolean).join(" "));
  if (!/cumple|cumpleanos/.test(text)) return false;
  return !/comida|cena|fiesta|quedada|celebracion|brunch|reserva|restaurante/.test(text);
}

function findFinanceRef(displayTitle, originalTitle, financeSummary) {
  const targets = [displayTitle, originalTitle].map(normalize).filter(Boolean);
  const commitments = Array.isArray(financeSummary?.upcomingCommitments) ? financeSummary.upcomingCommitments : [];
  const match = commitments.find((item) => {
    const value = normalize(item?.title);
    return targets.some((target) =>
      value === target ||
      (target.length >= 5 && value.includes(target)) ||
      (value.length >= 5 && target.includes(value))
    );
  });
  return match?.id || null;
}

function eventDay(value) {
  const date = dateOrNull(value);
  return date ? date.slice(0, 10) : null;
}

function eventIdForCalendar(event, rule) {
  if (rule?.id && eventDay(event?.startsAt)) return trim(rule.id, 200) + "-" + eventDay(event.startsAt);
  return trim(event?.id, 500);
}

function eventToRow(item) {
  return EVENT_HEADERS.map((header) => {
    const values = {
      evento_id: item.id,
      title: item.title,
      kind: item.kind,
      status: item.status,
      starts_at: item.startsAt,
      ends_at: item.endsAt,
      location: item.location,
      participants: Array.isArray(item.participants) ? item.participants.join("|") : item.participants,
      calendar_ref: item.calendarRef,
      finance_ref: item.financeRef,
      objects_list_ref: item.objectsListRef,
      summary: item.summary,
      final_summary: item.finalSummary,
      sensitivity: item.sensitivity,
      source_provider: item.sourceProvider,
      source_updated_at: item.sourceUpdatedAt,
      updated_at: item.updatedAt
    };
    return values[header] ?? "";
  });
}

function factToRow(item) {
  const values = {
    fact_id: item.id,
    evento_id: item.eventId,
    fact_type: item.type,
    summary: item.summary,
    happened_at: item.happenedAt,
    source_provider: item.sourceProvider,
    source_ref: item.sourceRef,
    created_at: item.createdAt
  };
  return FACT_HEADERS.map((header) => values[header] ?? "");
}

function refToRow(item) {
  const values = {
    ref_id: item.id,
    evento_id: item.eventId,
    ref_type: item.type,
    source_provider: item.sourceProvider,
    source_ref: item.sourceRef,
    label: item.label,
    created_at: item.createdAt
  };
  return REF_HEADERS.map((header) => values[header] ?? "");
}

export function hasEventsGoogleConfig(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}

async function readRegistry(env, token) {
  if (!env.FINANCE_SHEET_ID) return null;
  const range = encodeURIComponent("IntegracionesPrivadas!A1:B50");
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(String(env.FINANCE_SHEET_ID).trim()) +
    "/values/" +
    range +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  try {
    const response = await googleReadFetch(endpoint, { headers: { Authorization: "Bearer " + token } });
    if (!response.ok) return null;
    const rows = (await response.json())?.values || [];
    const entry = rows.find((row) => String(row?.[0] || "").trim() === SOURCE_KEY);
    const value = String(entry?.[1] || "").trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

async function resolveSpreadsheetId(env, token) {
  if (env.EVENTS_SHEET_ID) return String(env.EVENTS_SHEET_ID).trim();
  if (cache.spreadsheetId && cache.spreadsheetIdExpiresAt > Date.now()) return cache.spreadsheetId;
  if (cache.sourceMissingUntil > Date.now()) return null;

  const registered = await readRegistry(env, token);
  if (registered) {
    cache.spreadsheetId = registered;
    cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
    return registered;
  }

  const params = new URLSearchParams({
    q: "name = '" + SHEET_TITLE + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "10"
  });
  const response = await googleReadFetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("GOOGLE_DRIVE_" + response.status);
  const files = (await response.json())?.files || [];
  const sheet = files.find((item) => item?.name === SHEET_TITLE);
  if (!sheet?.id) {
    cache.sourceMissingUntil = Date.now() + 5 * 60_000;
    return null;
  }

  cache.spreadsheetId = sheet.id;
  cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
  return sheet.id;
}

export async function resolveEventsSpreadsheetId(env, getGoogleAccessToken) {
  if (!hasEventsGoogleConfig(env)) throw new Error("EVENTS_SHEET_NOT_CONFIGURED");
  const token = await getGoogleAccessToken(env);
  const id = await resolveSpreadsheetId(env, token);
  if (!id) throw new Error("EVENTS_SHEET_NOT_FOUND");
  return id;
}

export function buildEventsSheetPayload(valueRanges = []) {
  const eventRows = tableWithRows(valueRanges[0]?.values || []);
  const factRows = tableWithRows(valueRanges[1]?.values || []);
  const refRows = tableWithRows(valueRanges[2]?.values || []);
  const rules = rulesFromRows(valueRanges[3]?.values || []);

  const events = eventRows.map(({ record, rowNumber }) => eventFromRecord(record, rowNumber)).filter((item) => item.id && item.startsAt);
  const facts = factRows.map(({ record, rowNumber }) => factFromRecord(record, rowNumber)).filter((item) => item.id && item.eventId && item.summary);
  const references = refRows.map(({ record, rowNumber }) => refFromRecord(record, rowNumber)).filter((item) => item.id && item.eventId && item.sourceProvider && item.sourceRef);

  events.sort((a, b) => new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime());
  facts.sort((a, b) => new Date(a.happenedAt || 0).getTime() - new Date(b.happenedAt || 0).getTime());

  const updatedAt = events.map((item) => item.updatedAt).filter(Boolean).sort().at(-1) || null;
  return {
    events,
    facts,
    references,
    rules,
    summary: {
      activeCount: events.filter((item) => !["CERRADO", "CANCELADO"].includes(item.status)).length,
      historyCount: events.filter((item) => ["CERRADO", "CANCELADO"].includes(item.status)).length,
      inProgressCount: events.filter((item) => item.status === "EN_CURSO").length,
      updatedAt
    },
    source: {
      kind: "private-sheet",
      name: SHEET_TITLE,
      available: true,
      contractVersion: "1.0"
    }
  };
}

export async function fetchEventsSheetSource(env, getGoogleAccessToken, options = {}) {
  if (!hasEventsGoogleConfig(env)) return { status: "not-configured", value: null };
  if (!options.force && cache.value && cache.expiresAt > Date.now()) return { status: "ok-cache", value: cache.value };

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSpreadsheetId(env, token);
  if (!spreadsheetId) return {
    status: "source-pending",
    value: { events: [], facts: [], references: [], rules: [], summary: null, source: { kind: "private-sheet", name: SHEET_TITLE, available: false, contractVersion: "1.0" } }
  };

  const ranges = await sheetsBatchGet(spreadsheetId, [
    "Eventos!A1:Q5000",
    "EventoHechos!A1:H10000",
    "EventoRefs!A1:G10000",
    "EventosImportantes!A1:G1000"
  ], token);

  const value = buildEventsSheetPayload(ranges);
  value.spreadsheetId = spreadsheetId;
  cache.value = value;
  cache.expiresAt = Date.now() + CACHE_MS;
  return { status: "ok-live", value };
}

export function invalidateEventsSheetCache() {
  cache.value = null;
  cache.expiresAt = 0;
}

function filterEvents(events, options = {}) {
  const scope = options.scope || "all";
  const year = options.year || null;
  const kind = options.kind || null;
  let rows = Array.isArray(events) ? [...events] : [];
  if (scope === "active") rows = rows.filter((item) => !["CERRADO", "CANCELADO"].includes(item.status));
  if (scope === "history") rows = rows.filter((item) => ["CERRADO", "CANCELADO"].includes(item.status));
  if (year && /^\d{4}$/.test(String(year))) rows = rows.filter((item) => String(item.startsAt || "").startsWith(String(year)));
  if (kind) rows = rows.filter((item) => normalize(item.kind) === normalize(kind));
  rows.sort((a, b) => {
    const aTime = new Date(a.startsAt || 0).getTime();
    const bTime = new Date(b.startsAt || 0).getTime();
    return scope === "history" ? bTime - aTime : aTime - bTime;
  });
  return rows.map(({ _rowNumber, ...item }) => item);
}

export async function fetchEventSheetRecords(env, getGoogleAccessToken, options = {}) {
  const source = await fetchEventsSheetSource(env, getGoogleAccessToken);
  return filterEvents(source.value?.events || [], options);
}

export async function fetchEventSheetHomeSummary(env, getGoogleAccessToken) {
  const source = await fetchEventsSheetSource(env, getGoogleAccessToken);
  return source.value?.summary || { activeCount: 0, historyCount: 0, inProgressCount: 0, updatedAt: null };
}

export async function fetchEventSheetDetail(env, getGoogleAccessToken, eventId) {
  const id = trim(eventId, 500);
  if (!id) return null;
  const source = await fetchEventsSheetSource(env, getGoogleAccessToken);
  const event = (source.value?.events || []).find((item) => item.id === id);
  if (!event) return null;
  const cleanEvent = { ...event };
  delete cleanEvent._rowNumber;
  return {
    event: cleanEvent,
    facts: (source.value?.facts || []).filter((item) => item.eventId === id).map(({ _rowNumber, ...item }) => item),
    references: (source.value?.references || []).filter((item) => item.eventId === id).map(({ _rowNumber, ...item }) => item)
  };
}

async function sheetsWrite(endpoint, token, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error("GOOGLE_SHEETS_WRITE_" + response.status);
  if (response.status === 204) return null;
  return response.json();
}

async function updateRow(spreadsheetId, token, tab, rowNumber, values, endColumn) {
  const range = tab + "!A" + rowNumber + ":" + endColumn + rowNumber;
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values/" + encodeURIComponent(range) + "?valueInputOption=RAW";
  await sheetsWrite(endpoint, token, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values: [values] })
  });
}

async function appendRows(spreadsheetId, token, tab, values, endColumn) {
  if (!values.length) return;
  const range = tab + "!A:" + endColumn;
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values/" + encodeURIComponent(range) + ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
  await sheetsWrite(endpoint, token, {
    method: "POST",
    body: JSON.stringify({ range, majorDimension: "ROWS", values })
  });
}

export async function syncCalendarEventsToEventsSheet(env, getGoogleAccessToken, calendarEvents, rules, financeSummary) {
  if (!hasEventsGoogleConfig(env)) return 0;
  const source = await fetchEventsSheetSource(env, getGoogleAccessToken);
  if (!source.value?.source?.available) return 0;

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = source.value.spreadsheetId || await resolveSpreadsheetId(env, token);
  const existing = source.value.events || [];
  const matched = (Array.isArray(calendarEvents) ? calendarEvents : [])
    .map((event) => ({ event, rule: matchRule(event, rules), inferredKind: inferCalendarEventKind(event) }))
    .filter((item) => (item.rule || item.inferredKind) && item.event?.id && item.event?.startsAt);

  if (!matched.length) return 0;

  const now = new Date().toISOString();
  const appends = [];
  let changed = 0;

  for (const { event, rule, inferredKind } of matched) {
    const candidateId = eventIdForCalendar(event, rule);
    const dateKey = eventDay(event.startsAt);
    const targetTitle = trim(rule?.displayTitle || event.title || "Evento", 240);
    const targetKind = trim(rule?.kind || inferredKind || "important", 40).toLowerCase();
    let row = existing.find((item) => item.calendarRef === event.id)
      || existing.find((item) => item.id === candidateId)
      || existing.find((item) =>
        eventDay(item.startsAt) === dateKey &&
        normalize(item.title) === normalize(targetTitle)
      );

    const financeRef = findFinanceRef(targetTitle, event.title, financeSummary);
    const baseStatus = String(row?.status || "CONFIRMADO").toUpperCase();
    const preservedStatus = ["PROPUESTO", "PENDIENTE", "CANCELADO"].includes(baseStatus) ? baseStatus : "CONFIRMADO";
    const next = {
      id: row?.id || candidateId,
      title: row?.title || targetTitle,
      kind: row?.kind || targetKind,
      status: preservedStatus,
      startsAt: event.startsAt,
      endsAt: event.endsAt || event.startsAt,
      location: nullable(event.location || event.locationRef, 500) || row?.location || null,
      participants: row?.participants || [],
      calendarRef: event.id,
      financeRef: financeRef || row?.financeRef || null,
      objectsListRef: row?.objectsListRef || null,
      summary: row?.summary || nullable(rule?.note, 4000),
      finalSummary: row?.finalSummary || null,
      sensitivity: row?.sensitivity || nullable(event.sensitivity, 40) || "confidencial",
      sourceProvider: "calendar",
      sourceUpdatedAt: now,
      updatedAt: now
    };

    if (row?._rowNumber) {
      await updateRow(spreadsheetId, token, "Eventos", row._rowNumber, eventToRow(next), "Q");
      Object.assign(row, next);
    } else {
      appends.push(eventToRow(next));
      existing.push({ ...next, _rowNumber: null });
    }
    changed += 1;
  }

  if (appends.length) await appendRows(spreadsheetId, token, "Eventos", appends, "Q");
  invalidateEventsSheetCache();
  return changed;
}

export async function migrateLegacyEventLedgerToSheet(env, getGoogleAccessToken, legacySnapshot) {
  if (!legacySnapshot || !hasEventsGoogleConfig(env)) return { events: 0, facts: 0, references: 0 };

  const source = await fetchEventsSheetSource(env, getGoogleAccessToken, { force: true });
  if (!source.value?.source?.available) return { events: 0, facts: 0, references: 0 };

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = source.value.spreadsheetId || await resolveSpreadsheetId(env, token);
  const existingEvents = source.value.events || [];
  const existingFacts = new Set((source.value.facts || []).map((item) => item.id));
  const existingRefs = new Set((source.value.references || []).map((item) => item.id));
  const idMap = new Map();

  const eventAppends = [];
  const factAppends = [];
  const refAppends = [];
  let updatedEvents = 0;

  for (const legacy of Array.isArray(legacySnapshot.events) ? legacySnapshot.events : []) {
    if (!legacy?.id || !legacy?.startsAt || isNonEventOperationalReminder(legacy) || isSimpleBirthdayReminder(legacy)) continue;
    const day = eventDay(legacy.startsAt);
    let target = existingEvents.find((item) => item.id === legacy.id)
      || (legacy.calendarRef && existingEvents.find((item) => item.calendarRef === legacy.calendarRef))
      || existingEvents.find((item) =>
        eventDay(item.startsAt) === day &&
        normalize(item.title) === normalize(legacy.title)
      )
      || existingEvents.find((item) =>
        eventDay(item.startsAt) === day &&
        normalize(item.kind) === normalize(legacy.kind) &&
        normalize(item.kind) === "travel" &&
        /^viaje\b/.test(normalize(item.title)) &&
        /^viaje\b/.test(normalize(legacy.title))
      );

    if (!target) {
      const next = {
        id: trim(legacy.id, 500),
        title: trim(legacy.title || "Evento", 240),
        kind: trim(legacy.kind || "important", 40).toLowerCase(),
        status: trim(legacy.status || "CONFIRMADO", 24).toUpperCase(),
        startsAt: dateOrNull(legacy.startsAt),
        endsAt: dateOrNull(legacy.endsAt) || dateOrNull(legacy.startsAt),
        location: nullable(legacy.location, 500),
        participants: Array.isArray(legacy.participants) ? legacy.participants.slice(0, 50) : [],
        calendarRef: nullable(legacy.calendarRef, 1000),
        financeRef: nullable(legacy.financeRef, 500),
        objectsListRef: nullable(legacy.objectsListRef, 500),
        summary: nullable(legacy.summary, 4000),
        finalSummary: nullable(legacy.finalSummary, 8000),
        sensitivity: nullable(legacy.sensitivity, 40) || "confidencial",
        sourceProvider: "d1-migration",
        sourceUpdatedAt: nullable(legacy.updatedAt, 100),
        updatedAt: nullable(legacy.updatedAt, 100) || new Date().toISOString()
      };
      eventAppends.push(eventToRow(next));
      target = { ...next, _rowNumber: null };
      existingEvents.push(target);
    } else if (target._rowNumber) {
      const next = {
        ...target,
        calendarRef: target.calendarRef || nullable(legacy.calendarRef, 1000),
        financeRef: target.financeRef || nullable(legacy.financeRef, 500),
        objectsListRef: target.objectsListRef || nullable(legacy.objectsListRef, 500),
        summary: target.summary || nullable(legacy.summary, 4000),
        finalSummary: target.finalSummary || nullable(legacy.finalSummary, 8000),
        participants: target.participants?.length ? target.participants : (Array.isArray(legacy.participants) ? legacy.participants.slice(0, 50) : []),
        updatedAt: target.updatedAt || nullable(legacy.updatedAt, 100) || new Date().toISOString()
      };
      const changed = JSON.stringify(eventToRow(next)) !== JSON.stringify(eventToRow(target));
      if (changed) {
        await updateRow(spreadsheetId, token, "Eventos", target._rowNumber, eventToRow(next), "Q");
        Object.assign(target, next);
        updatedEvents += 1;
      }
    }

    idMap.set(legacy.id, target.id);
  }

  for (const fact of Array.isArray(legacySnapshot.facts) ? legacySnapshot.facts : []) {
    if (!fact?.id || existingFacts.has(fact.id)) continue;
    const targetEventId = idMap.get(fact.eventId);
    if (!targetEventId) continue;
    factAppends.push(factToRow({
      id: fact.id,
      eventId: targetEventId,
      type: fact.type || "NOTA",
      summary: fact.summary,
      happenedAt: fact.happenedAt,
      sourceProvider: fact.sourceProvider,
      sourceRef: fact.sourceRef,
      createdAt: fact.createdAt
    }));
    existingFacts.add(fact.id);
  }

  for (const ref of Array.isArray(legacySnapshot.references) ? legacySnapshot.references : []) {
    if (!ref?.id || existingRefs.has(ref.id)) continue;
    const targetEventId = idMap.get(ref.eventId);
    if (!targetEventId) continue;
    refAppends.push(refToRow({
      id: ref.id,
      eventId: targetEventId,
      type: ref.type,
      sourceProvider: ref.sourceProvider || "other",
      sourceRef: ref.sourceRef,
      label: ref.label,
      createdAt: ref.createdAt
    }));
    existingRefs.add(ref.id);
  }

  await appendRows(spreadsheetId, token, "Eventos", eventAppends, "Q");
  await appendRows(spreadsheetId, token, "EventoHechos", factAppends, "H");
  await appendRows(spreadsheetId, token, "EventoRefs", refAppends, "G");

  if (eventAppends.length || factAppends.length || refAppends.length || updatedEvents) invalidateEventsSheetCache();
  return {
    events: eventAppends.length + updatedEvents,
    facts: factAppends.length,
    references: refAppends.length
  };
}

export async function createEventSheetRecord(env, getGoogleAccessToken, payload) {
  const title = trim(payload?.title, 240);
  const startsAt = dateOrNull(payload?.startsAt);
  const endsAt = dateOrNull(payload?.endsAt) || startsAt;
  const status = trim(payload?.status || "PROPUESTO", 24).toUpperCase();
  if (!title || !startsAt || !EVENT_STATUSES.has(status)) throw new Error("INVALID_EVENT");

  const source = await fetchEventsSheetSource(env, getGoogleAccessToken, { force: true });
  if (!source.value?.source?.available) throw new Error("EVENTS_SHEET_NOT_FOUND");
  const id = trim(payload?.id, 500) || "event-" + crypto.randomUUID();
  if ((source.value.events || []).some((item) => item.id === id)) throw new Error("INVALID_EVENT_DUPLICATE");

  const now = new Date().toISOString();
  const item = {
    id,
    title,
    kind: trim(payload?.kind || "important", 40).toLowerCase(),
    status,
    startsAt,
    endsAt,
    location: nullable(payload?.location, 500),
    participants: Array.isArray(payload?.participants) ? payload.participants.slice(0, 50) : [],
    calendarRef: nullable(payload?.calendarRef, 1000),
    financeRef: nullable(payload?.financeRef, 500),
    objectsListRef: nullable(payload?.objectsListRef, 500),
    summary: nullable(payload?.summary, 4000),
    finalSummary: nullable(payload?.finalSummary, 8000),
    sensitivity: nullable(payload?.sensitivity, 40) || "confidencial",
    sourceProvider: nullable(payload?.sourceProvider, 40) || "events",
    sourceUpdatedAt: now,
    updatedAt: now
  };
  const token = await getGoogleAccessToken(env);
  await appendRows(source.value.spreadsheetId, token, "Eventos", [eventToRow(item)], "Q");
  invalidateEventsSheetCache();
  return { id, ...(await fetchEventSheetDetail(env, getGoogleAccessToken, id)) };
}

export async function updateEventSheetRecord(env, getGoogleAccessToken, eventId, payload) {
  const id = trim(eventId, 500);
  const source = await fetchEventsSheetSource(env, getGoogleAccessToken, { force: true });
  const existing = (source.value?.events || []).find((item) => item.id === id);
  if (!existing) throw new Error("EVENT_NOT_FOUND");

  const next = { ...existing };
  delete next._rowNumber;
  if (Object.hasOwn(payload || {}, "title")) {
    const value = trim(payload.title, 240);
    if (!value) throw new Error("INVALID_EVENT_TITLE");
    next.title = value;
  }
  if (Object.hasOwn(payload || {}, "kind")) next.kind = trim(payload.kind || "important", 40).toLowerCase();
  if (Object.hasOwn(payload || {}, "status")) {
    const value = trim(payload.status, 24).toUpperCase();
    if (!EVENT_STATUSES.has(value)) throw new Error("INVALID_EVENT_STATUS");
    next.status = value;
  }
  if (Object.hasOwn(payload || {}, "startsAt")) {
    const value = dateOrNull(payload.startsAt);
    if (!value) throw new Error("INVALID_EVENT_DATE");
    next.startsAt = value;
  }
  if (Object.hasOwn(payload || {}, "endsAt")) next.endsAt = dateOrNull(payload.endsAt);
  if (Object.hasOwn(payload || {}, "location")) next.location = nullable(payload.location, 500);
  if (Object.hasOwn(payload || {}, "participants")) next.participants = Array.isArray(payload.participants) ? payload.participants.slice(0, 50) : [];
  if (Object.hasOwn(payload || {}, "calendarRef")) next.calendarRef = nullable(payload.calendarRef, 1000);
  if (Object.hasOwn(payload || {}, "financeRef")) next.financeRef = nullable(payload.financeRef, 500);
  if (Object.hasOwn(payload || {}, "objectsListRef")) next.objectsListRef = nullable(payload.objectsListRef, 500);
  if (Object.hasOwn(payload || {}, "summary")) next.summary = nullable(payload.summary, 4000);
  if (Object.hasOwn(payload || {}, "finalSummary")) next.finalSummary = nullable(payload.finalSummary, 8000);
  next.sourceProvider = nullable(payload?.sourceProvider, 40) || next.sourceProvider || "events";
  next.sourceUpdatedAt = new Date().toISOString();
  next.updatedAt = next.sourceUpdatedAt;

  const token = await getGoogleAccessToken(env);
  await updateRow(source.value.spreadsheetId, token, "Eventos", existing._rowNumber, eventToRow(next), "Q");
  invalidateEventsSheetCache();
  return await fetchEventSheetDetail(env, getGoogleAccessToken, id);
}

export async function appendEventSheetFact(env, getGoogleAccessToken, eventId, payload) {
  const detail = await fetchEventSheetDetail(env, getGoogleAccessToken, eventId);
  if (!detail) throw new Error("EVENT_NOT_FOUND");
  const type = trim(payload?.type || "NOTA", 32).toUpperCase();
  const summary = trim(payload?.summary, 4000);
  if (!EVENT_FACT_TYPES.has(type) || !summary) throw new Error("INVALID_EVENT_FACT");

  const now = new Date().toISOString();
  const item = {
    id: "event-fact-" + crypto.randomUUID(),
    eventId: detail.event.id,
    type,
    summary,
    happenedAt: dateOrNull(payload?.happenedAt) || now,
    sourceProvider: nullable(payload?.sourceProvider, 40),
    sourceRef: nullable(payload?.sourceRef, 1200),
    createdAt: now
  };

  const source = await fetchEventsSheetSource(env, getGoogleAccessToken);
  const token = await getGoogleAccessToken(env);
  await appendRows(source.value.spreadsheetId, token, "EventoHechos", [factToRow(item)], "H");
  invalidateEventsSheetCache();
  return { id: item.id, ...(await fetchEventSheetDetail(env, getGoogleAccessToken, detail.event.id)) };
}

export async function appendEventSheetReference(env, getGoogleAccessToken, eventId, payload) {
  const detail = await fetchEventSheetDetail(env, getGoogleAccessToken, eventId);
  if (!detail) throw new Error("EVENT_NOT_FOUND");
  const provider = trim(payload?.sourceProvider, 40).toLowerCase();
  const sourceRef = trim(payload?.sourceRef, 1200);
  if (!EVENT_REF_PROVIDERS.has(provider) || !sourceRef) throw new Error("INVALID_EVENT_REFERENCE");

  const now = new Date().toISOString();
  const item = {
    id: "event-ref-" + crypto.randomUUID(),
    eventId: detail.event.id,
    type: nullable(payload?.type, 80),
    sourceProvider: provider,
    sourceRef,
    label: nullable(payload?.label, 500),
    createdAt: now
  };

  const source = await fetchEventsSheetSource(env, getGoogleAccessToken);
  const token = await getGoogleAccessToken(env);
  await appendRows(source.value.spreadsheetId, token, "EventoRefs", [refToRow(item)], "G");
  invalidateEventsSheetCache();
  return { id: item.id, ...(await fetchEventSheetDetail(env, getGoogleAccessToken, detail.event.id)) };
}
