const EVENT_STATUSES = new Set(["PROPUESTO", "PENDIENTE", "CONFIRMADO", "EN_CURSO", "CERRADO", "CANCELADO"]);
const EVENT_FACT_TYPES = new Set(["PLAN", "GASTO", "COMIDA", "NUTRICION", "TRANSPORTE", "LUGAR", "INCIDENCIA", "DECISION", "NOTA"]);
const EVENT_REF_PROVIDERS = new Set(["calendar", "finance", "objects", "health", "gmail", "outlook", "drive", "airbnb", "transport", "other"]);

function trim(value, max = 1000) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function nullable(value, max = 1000) {
  const clean = trim(value, max);
  return clean || null;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

function dateOrNull(value) {
  const clean = trim(value, 100);
  if (!clean) return null;
  const parsed = new Date(clean);
  return Number.isFinite(parsed.getTime()) ? clean : null;
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function currentStatus(item, now = Date.now()) {
  const base = String(item.status || "CONFIRMADO").toUpperCase();
  if (base === "CANCELADO") return "CANCELADO";
  const startValue = item.startsAt || item.starts_at;
  const endValue = item.endsAt || item.ends_at || startValue;
  const start = startValue ? new Date(startValue).getTime() : NaN;
  const end = endValue ? new Date(endValue).getTime() : NaN;

  if (Number.isFinite(end) && end < now) return "CERRADO";
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) return "EN_CURSO";
  if (base === "PROPUESTO" || base === "PENDIENTE") return base;
  return "CONFIRMADO";
}

function fromRow(row) {
  const item = {
    id: row.id,
    title: row.title,
    kind: row.kind || "important",
    status: row.status || "CONFIRMADO",
    startsAt: row.starts_at,
    endsAt: row.ends_at || null,
    location: row.location || null,
    participants: parseJsonArray(row.participants_json),
    calendarRef: row.calendar_ref || null,
    financeRef: row.finance_ref || null,
    objectsListRef: row.objects_list_ref || null,
    summary: row.summary || null,
    finalSummary: row.final_summary || null,
    sensitivity: row.sensitivity || "confidencial",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
  item.status = currentStatus(item);
  return item;
}

export async function ensureEventTables(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS event_records (" +
      "id TEXT PRIMARY KEY," +
      "title TEXT NOT NULL," +
      "kind TEXT NOT NULL DEFAULT 'important'," +
      "status TEXT NOT NULL DEFAULT 'CONFIRMADO'," +
      "starts_at TEXT NOT NULL," +
      "ends_at TEXT," +
      "location TEXT," +
      "participants_json TEXT," +
      "calendar_ref TEXT," +
      "finance_ref TEXT," +
      "objects_list_ref TEXT," +
      "summary TEXT," +
      "final_summary TEXT," +
      "sensitivity TEXT NOT NULL DEFAULT 'confidencial'," +
      "created_at TEXT NOT NULL," +
      "updated_at TEXT NOT NULL" +
    ")"
  ).run();

  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS event_facts (" +
      "id TEXT PRIMARY KEY," +
      "event_id TEXT NOT NULL," +
      "fact_type TEXT NOT NULL," +
      "summary TEXT NOT NULL," +
      "happened_at TEXT NOT NULL," +
      "source_provider TEXT," +
      "source_ref TEXT," +
      "created_at TEXT NOT NULL," +
      "FOREIGN KEY(event_id) REFERENCES event_records(id) ON DELETE CASCADE" +
    ")"
  ).run();

  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS event_refs (" +
      "id TEXT PRIMARY KEY," +
      "event_id TEXT NOT NULL," +
      "ref_type TEXT," +
      "source_provider TEXT NOT NULL," +
      "source_ref TEXT NOT NULL," +
      "label TEXT," +
      "created_at TEXT NOT NULL," +
      "FOREIGN KEY(event_id) REFERENCES event_records(id) ON DELETE CASCADE" +
    ")"
  ).run();

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_event_records_dates ON event_records(starts_at, ends_at)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_event_facts_event_time ON event_facts(event_id, happened_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_event_refs_event ON event_refs(event_id)").run();
}

function matchRule(event, rules) {
  const title = normalize(event && event.title);
  return (Array.isArray(rules) ? rules : []).find((candidate) => {
    const terms = Array.isArray(candidate && candidate.matchTerms) ? candidate.matchTerms : [];
    if (!terms.length) return false;
    const included = terms.every((term) => title.includes(normalize(term)));
    const excluded = Array.isArray(candidate.excludeTerms)
      && candidate.excludeTerms.some((term) => title.includes(normalize(term)));
    return included && !excluded;
  }) || null;
}

function findFinanceRef(displayTitle, originalTitle, financeSummary) {
  const targets = [displayTitle, originalTitle].map(normalize).filter(Boolean);
  const commitments = Array.isArray(financeSummary && financeSummary.upcomingCommitments)
    ? financeSummary.upcomingCommitments
    : [];
  const match = commitments.find((item) => {
    const value = normalize(item && item.title);
    return targets.some((target) =>
      value === target ||
      (target.length >= 5 && value.includes(target)) ||
      (value.length >= 5 && target.includes(value))
    );
  });
  return match && match.id ? match.id : null;
}

export async function syncImportantEventRecords(env, calendarEvents, rules, financeSummary) {
  await ensureEventTables(env);
  const matched = (Array.isArray(calendarEvents) ? calendarEvents : [])
    .map((event) => ({ event, rule: matchRule(event, rules) }))
    .filter((item) => item.rule && item.event && item.event.id && item.event.startsAt);

  if (!matched.length) return 0;

  const now = new Date().toISOString();
  const statements = matched.map(({ event, rule }) => {
    const title = trim(rule.displayTitle || event.title || "Evento", 240);
    const kind = trim(rule.kind || "important", 40).toLowerCase();
    const financeRef = findFinanceRef(title, event.title, financeSummary);
    const location = nullable(event.location || event.locationRef, 500);
    return env.DB.prepare(
      "INSERT INTO event_records (" +
        "id, title, kind, status, starts_at, ends_at, location, participants_json, calendar_ref, " +
        "finance_ref, objects_list_ref, summary, final_summary, sensitivity, created_at, updated_at" +
      ") VALUES (?, ?, ?, 'CONFIRMADO', ?, ?, ?, NULL, ?, ?, NULL, ?, NULL, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET " +
        "title = excluded.title, " +
        "kind = excluded.kind, " +
        "starts_at = excluded.starts_at, " +
        "ends_at = excluded.ends_at, " +
        "location = excluded.location, " +
        "calendar_ref = excluded.calendar_ref, " +
        "finance_ref = COALESCE(excluded.finance_ref, event_records.finance_ref), " +
        "summary = COALESCE(event_records.summary, excluded.summary), " +
        "sensitivity = excluded.sensitivity, " +
        "status = CASE " +
          "WHEN event_records.status IN ('PROPUESTO','PENDIENTE','CANCELADO') THEN event_records.status " +
          "ELSE 'CONFIRMADO' END, " +
        "updated_at = excluded.updated_at"
    ).bind(
      event.id,
      title,
      kind,
      event.startsAt,
      event.endsAt || event.startsAt,
      location,
      event.id,
      financeRef,
      nullable(rule.note, 2000),
      nullable(event.sensitivity, 40) || "confidencial",
      now,
      now
    );
  });

  await env.DB.batch(statements);
  return statements.length;
}

export async function fetchEventRecords(env, options = {}) {
  await ensureEventTables(env);
  const scope = options.scope || "all";
  const year = options.year || null;
  const kind = options.kind || null;

  const result = await env.DB.prepare(
    "SELECT id, title, kind, status, starts_at, ends_at, location, participants_json, calendar_ref, " +
           "finance_ref, objects_list_ref, summary, final_summary, sensitivity, created_at, updated_at " +
    "FROM event_records ORDER BY starts_at ASC"
  ).all();

  let events = (result.results || []).map(fromRow);
  if (scope === "active") events = events.filter((item) => !["CERRADO", "CANCELADO"].includes(item.status));
  if (scope === "history") events = events.filter((item) => ["CERRADO", "CANCELADO"].includes(item.status));
  if (year && /^\d{4}$/.test(String(year))) {
    events = events.filter((item) => String(item.startsAt || "").startsWith(String(year)));
  }
  if (kind) events = events.filter((item) => normalize(item.kind) === normalize(kind));

  events.sort((a, b) => {
    const aTime = new Date(a.startsAt || 0).getTime();
    const bTime = new Date(b.startsAt || 0).getTime();
    return scope === "history" ? bTime - aTime : aTime - bTime;
  });
  return events;
}

export async function fetchEventHomeSummary(env) {
  const events = await fetchEventRecords(env, { scope: "all" });
  return {
    activeCount: events.filter((item) => !["CERRADO", "CANCELADO"].includes(item.status)).length,
    historyCount: events.filter((item) => ["CERRADO", "CANCELADO"].includes(item.status)).length,
    inProgressCount: events.filter((item) => item.status === "EN_CURSO").length,
    updatedAt: events.reduce((latest, item) => {
      const value = String(item.updatedAt || "");
      return !latest || value > latest ? value : latest;
    }, null)
  };
}

export async function fetchEventDetail(env, eventId) {
  await ensureEventTables(env);
  const id = trim(eventId, 500);
  if (!id) return null;

  const row = await env.DB.prepare(
    "SELECT id, title, kind, status, starts_at, ends_at, location, participants_json, calendar_ref, " +
           "finance_ref, objects_list_ref, summary, final_summary, sensitivity, created_at, updated_at " +
    "FROM event_records WHERE id = ? LIMIT 1"
  ).bind(id).first();
  if (!row) return null;

  const results = await Promise.all([
    env.DB.prepare(
      "SELECT id, event_id, fact_type, summary, happened_at, source_provider, source_ref, created_at " +
      "FROM event_facts WHERE event_id = ? ORDER BY happened_at ASC, created_at ASC"
    ).bind(id).all(),
    env.DB.prepare(
      "SELECT id, event_id, ref_type, source_provider, source_ref, label, created_at " +
      "FROM event_refs WHERE event_id = ? ORDER BY created_at ASC"
    ).bind(id).all()
  ]);

  return {
    event: fromRow(row),
    facts: (results[0].results || []).map((item) => ({
      id: item.id,
      eventId: item.event_id,
      type: item.fact_type,
      summary: item.summary,
      happenedAt: item.happened_at,
      sourceProvider: item.source_provider || null,
      sourceRef: item.source_ref || null,
      createdAt: item.created_at || null
    })),
    references: (results[1].results || []).map((item) => ({
      id: item.id,
      eventId: item.event_id,
      type: item.ref_type || null,
      sourceProvider: item.source_provider,
      sourceRef: item.source_ref,
      label: item.label || null,
      createdAt: item.created_at || null
    }))
  };
}

export async function createEventRecord(env, payload) {
  await ensureEventTables(env);
  const title = trim(payload && payload.title, 240);
  const startsAt = dateOrNull(payload && payload.startsAt);
  const endsAt = dateOrNull(payload && payload.endsAt) || startsAt;
  const status = trim((payload && payload.status) || "PROPUESTO", 24).toUpperCase();
  if (!title || !startsAt || !EVENT_STATUSES.has(status)) throw new Error("INVALID_EVENT");

  const id = trim(payload && payload.id, 500) || "event-" + crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO event_records (" +
      "id, title, kind, status, starts_at, ends_at, location, participants_json, calendar_ref, " +
      "finance_ref, objects_list_ref, summary, final_summary, sensitivity, created_at, updated_at" +
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    title,
    trim((payload && payload.kind) || "important", 40).toLowerCase(),
    status,
    startsAt,
    endsAt,
    nullable(payload && payload.location, 500),
    JSON.stringify(Array.isArray(payload && payload.participants) ? payload.participants.slice(0, 50) : []),
    nullable(payload && payload.calendarRef, 1000),
    nullable(payload && payload.financeRef, 500),
    nullable(payload && payload.objectsListRef, 500),
    nullable(payload && payload.summary, 4000),
    nullable(payload && payload.finalSummary, 8000),
    nullable(payload && payload.sensitivity, 40) || "confidencial",
    now,
    now
  ).run();

  return { id, ...(await fetchEventDetail(env, id)) };
}

export async function updateEventRecord(env, eventId, payload) {
  await ensureEventTables(env);
  const existing = await fetchEventDetail(env, eventId);
  if (!existing) throw new Error("EVENT_NOT_FOUND");

  const fields = [];
  const values = [];
  const push = (column, value) => {
    fields.push(column + " = ?");
    values.push(value);
  };

  if (Object.hasOwn(payload || {}, "title")) {
    const value = trim(payload.title, 240);
    if (!value) throw new Error("INVALID_EVENT_TITLE");
    push("title", value);
  }
  if (Object.hasOwn(payload || {}, "kind")) push("kind", trim(payload.kind || "important", 40).toLowerCase());
  if (Object.hasOwn(payload || {}, "status")) {
    const value = trim(payload.status, 24).toUpperCase();
    if (!EVENT_STATUSES.has(value)) throw new Error("INVALID_EVENT_STATUS");
    push("status", value);
  }
  if (Object.hasOwn(payload || {}, "startsAt")) {
    const value = dateOrNull(payload.startsAt);
    if (!value) throw new Error("INVALID_EVENT_DATE");
    push("starts_at", value);
  }
  if (Object.hasOwn(payload || {}, "endsAt")) push("ends_at", dateOrNull(payload.endsAt));
  if (Object.hasOwn(payload || {}, "location")) push("location", nullable(payload.location, 500));
  if (Object.hasOwn(payload || {}, "participants")) {
    push("participants_json", JSON.stringify(Array.isArray(payload.participants) ? payload.participants.slice(0, 50) : []));
  }
  if (Object.hasOwn(payload || {}, "financeRef")) push("finance_ref", nullable(payload.financeRef, 500));
  if (Object.hasOwn(payload || {}, "objectsListRef")) push("objects_list_ref", nullable(payload.objectsListRef, 500));
  if (Object.hasOwn(payload || {}, "summary")) push("summary", nullable(payload.summary, 4000));
  if (Object.hasOwn(payload || {}, "finalSummary")) push("final_summary", nullable(payload.finalSummary, 8000));

  if (!fields.length) return existing;
  push("updated_at", new Date().toISOString());
  values.push(existing.event.id);
  await env.DB.prepare("UPDATE event_records SET " + fields.join(", ") + " WHERE id = ?").bind(...values).run();
  return await fetchEventDetail(env, existing.event.id);
}

export async function appendEventFact(env, eventId, payload) {
  const existing = await fetchEventDetail(env, eventId);
  if (!existing) throw new Error("EVENT_NOT_FOUND");

  const type = trim((payload && payload.type) || "NOTA", 32).toUpperCase();
  const summary = trim(payload && payload.summary, 4000);
  if (!EVENT_FACT_TYPES.has(type) || !summary) throw new Error("INVALID_EVENT_FACT");

  const happenedAt = dateOrNull(payload && payload.happenedAt) || new Date().toISOString();
  const provider = nullable(payload && payload.sourceProvider, 40);
  const id = "event-fact-" + crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO event_facts (id, event_id, fact_type, summary, happened_at, source_provider, source_ref, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      existing.event.id,
      type,
      summary,
      happenedAt,
      provider ? provider.toLowerCase() : null,
      nullable(payload && payload.sourceRef, 1200),
      now
    ),
    env.DB.prepare("UPDATE event_records SET updated_at = ? WHERE id = ?").bind(now, existing.event.id)
  ]);

  return { id, ...(await fetchEventDetail(env, existing.event.id)) };
}

export async function appendEventReference(env, eventId, payload) {
  const existing = await fetchEventDetail(env, eventId);
  if (!existing) throw new Error("EVENT_NOT_FOUND");

  const provider = trim(payload && payload.sourceProvider, 40).toLowerCase();
  const sourceRef = trim(payload && payload.sourceRef, 1200);
  if (!EVENT_REF_PROVIDERS.has(provider) || !sourceRef) throw new Error("INVALID_EVENT_REFERENCE");

  const id = "event-ref-" + crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO event_refs (id, event_id, ref_type, source_provider, source_ref, label, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      existing.event.id,
      nullable(payload && payload.type, 80),
      provider,
      sourceRef,
      nullable(payload && payload.label, 500),
      now
    ),
    env.DB.prepare("UPDATE event_records SET updated_at = ? WHERE id = ?").bind(now, existing.event.id)
  ]);

  return { id, ...(await fetchEventDetail(env, existing.event.id)) };
}
