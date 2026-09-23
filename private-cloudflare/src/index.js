import { fetchIcloudCalendarSummary, hasIcloudCalendarConfig } from "./icloud-calendar.js";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

let googleTokenCache = { token: null, expiresAt: 0 };
let financeCache = { value: null, expiresAt: 0 };

function withSecurityHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(payload, status = 200) {
  return withSecurityHeaders(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    })
  );
}

function safeIcloudErrorCode(error) {
  const message = String(error?.message || "");
  return /^ICLOUD_[A-Z0-9_]+$/.test(message) ? message : "ICLOUD_UNKNOWN";
}

function hasFinanceGoogleConfig(env) {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REFRESH_TOKEN &&
    env.FINANCE_SHEET_ID
  );
}

async function getGoogleAccessToken(env) {
  if (googleTokenCache.token && googleTokenCache.expiresAt > Date.now() + 60_000) {
    return googleTokenCache.token;
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_TOKEN_${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error("GOOGLE_TOKEN_MISSING");

  googleTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600) - 120) * 1000
  };
  return googleTokenCache.token;
}

function parseKeyValueRows(values = []) {
  const out = {};
  for (const row of values.slice(1)) {
    const key = String(row?.[0] ?? "").trim();
    if (!key) continue;
    out[key] = row?.[1] ?? null;
  }
  return out;
}

function parseTableRows(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function moneyOrNull(value) {
  return toNumber(value);
}

function formatPeriodLabel(start, end) {
  if (!start || !end) return null;
  const formatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
  const a = new Date(`${start}T12:00:00Z`);
  const b = new Date(`${end}T12:00:00Z`);
  return `${formatter.format(a)} – ${formatter.format(b)}`.replaceAll(".", "");
}

async function fetchFinanceSummary(env) {
  if (!hasFinanceGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  if (financeCache.value && financeCache.expiresAt > Date.now()) {
    return { status: "ok-cache", value: financeCache.value };
  }

  const token = await getGoogleAccessToken(env);
  const ranges = ["Resumen!A1:B100", "Categorias!A1:J500", "Compromisos!A1:I500", "Deudas!A1:K500", "Patrimonio!A1:H500", "EventosImportantes!A1:G200", "GimnasioPlan!A1:N500", "Nutricion!A1:G500"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.FINANCE_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_SHEETS_${response.status}`);
  }

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  const summaryRows = valueRanges[0]?.values || [];
  const categoryRows = valueRanges[1]?.values || [];
  const commitmentRows = valueRanges[2]?.values || [];
  const debtRows = valueRanges[3]?.values || [];
  const wealthRows = valueRanges[4]?.values || [];
  const importantEventRows = valueRanges[5]?.values || [];
  const gymPlanRows = valueRanges[6]?.values || [];
  const nutritionRows = valueRanges[7]?.values || [];

  const summary = parseKeyValueRows(summaryRows);
  const categories = parseTableRows(categoryRows).map((item) => ({
    id: item.id || null,
    group: item.group || item.owner || "Común",
    owner: item.owner || item.group || "Común",
    title: item.title || item.id || "Partida",
    budgeted: moneyOrNull(item.budgeted),
    spent: moneyOrNull(item.spent),
    committed: moneyOrNull(item.committed),
    remaining: moneyOrNull(item.remaining),
    trackingMode: item.tracking_mode || "variable",
    sourceStatus: item.source_status || null,
    updatedAt: item.updated_at || null,
    note: item.note || null
  }));

  const commitments = parseTableRows(commitmentRows).map((item) => ({
    id: item.id || null,
    title: item.title || item.id || "Compromiso",
    date: item.date || null,
    totalBudget: moneyOrNull(item.total_budget),
    reserved: moneyOrNull(item.reserved),
    needed: moneyOrNull(item.needed),
    currency: item.currency || summary.currency || "EUR",
    sourceStatus: item.source_status || null,
    note: item.note || null
  }));

  const debts = parseTableRows(debtRows).map((item) => ({
    id: item.id || null,
    title: item.title || item.id || "Deuda",
    balance: moneyOrNull(item.balance),
    monthlyPayment: moneyOrNull(item.monthly_payment),
    paymentDay: item.payment_day === "" || item.payment_day == null ? null : Number(item.payment_day),
    interestRate: item.interest_rate === "" || item.interest_rate == null ? null : Number(item.interest_rate),
    status: item.status || "active",
    owner: item.owner || null,
    sourceStatus: item.source_status || null,
    updatedAt: item.updated_at || null,
    note: item.note || null
  }));

  const debtSummaryRow = debts.find((item) =>
    item.id === "__summary__" || String(item.status || "").toLowerCase() === "summary"
  ) || null;
  const activeDebts = debts.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return status !== "closed" && status !== "summary" && item.id !== "__summary__";
  });
  const knownBalanceValues = activeDebts.map((item) => item.balance).filter((value) => value !== null);
  const knownPaymentValues = activeDebts.map((item) => item.monthlyPayment).filter((value) => value !== null);
  const debtSummary = {
    currency: summary.currency || "EUR",
    count: moneyOrNull(summary.debt_count) ?? activeDebts.length,
    totalBalance: moneyOrNull(summary.debt_total_balance) ?? debtSummaryRow?.balance ?? (
      knownBalanceValues.length === activeDebts.length && activeDebts.length
        ? knownBalanceValues.reduce((sum, value) => sum + value, 0)
        : null
    ),
    monthlyPayment: moneyOrNull(summary.debt_monthly_payment) ?? debtSummaryRow?.monthlyPayment ?? (
      knownPaymentValues.length
        ? knownPaymentValues.reduce((sum, value) => sum + value, 0)
        : null
    ),
    debts: activeDebts,
    sourceUpdatedAt: summary.debt_source_updated_at || null,
    sourceSummaryNote: debtSummaryRow?.note || null
  };

  const wealthHistory = parseTableRows(wealthRows)
    .map((item) => ({
      date: item.snapshot_date || null,
      period: item.period || null,
      salaryMiguel: moneyOrNull(item.salary_miguel),
      salaryAndrea: moneyOrNull(item.salary_andrea),
      salaryTotal: moneyOrNull(item.salary_total),
      patrimony: moneyOrNull(item.patrimony),
      sourceStatus: item.source_status || null,
      note: item.note || null
    }))
    .filter((item) => item.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentWealth = [...wealthHistory]
    .reverse()
    .find((item) => item.date <= todayKey && item.patrimony !== null) || null;

  const wealthSummary = {
    currency: summary.currency || "EUR",
    currentPatrimony: currentWealth?.patrimony ?? null,
    currentDate: currentWealth?.date ?? null,
    currentSalaryMiguel: currentWealth?.salaryMiguel ?? null,
    currentSalaryAndrea: currentWealth?.salaryAndrea ?? null,
    history: wealthHistory
  };

  const importantEventRules = parseTableRows(importantEventRows)
    .map((item) => ({
      id: item.id || null,
      matchTerms: String(item.match_terms || "")
        .split("|")
        .map((term) => term.trim().toLocaleLowerCase("es"))
        .filter(Boolean),
      displayTitle: item.display_title || null,
      kind: item.kind || "important",
      enabled: String(item.enabled ?? "TRUE").toUpperCase() !== "FALSE",
      note: item.note || null,
      excludeTerms: String(item.exclude_terms || "")
        .split("|")
        .map((term) => term.trim().toLocaleLowerCase("es"))
        .filter(Boolean)
    }))
    .filter((item) => item.enabled && item.matchTerms.length);

  const gymRows = parseTableRows(gymPlanRows)
    .map((item) => ({
      dayId: item.day_id || null,
      dayOrder: toNumber(item.day_order),
      dayTitle: item.day_title || null,
      focus: item.focus || null,
      restSeconds: toNumber(item.rest_seconds),
      exerciseOrder: toNumber(item.exercise_order),
      exerciseId: item.exercise_id || null,
      exerciseName: item.exercise_name || null,
      setsTarget: toNumber(item.sets_target),
      repsTarget: item.reps_target == null ? null : String(item.reps_target),
      loadValue: toNumber(item.load_value),
      loadUnit: item.load_unit || null,
      loadNote: item.load_note || null,
      coachingNote: item.coaching_note || null
    }))
    .filter((item) => item.dayId && item.exerciseId && item.exerciseName);

  const gymDayMap = new Map();
  for (const row of gymRows) {
    if (!gymDayMap.has(row.dayId)) {
      gymDayMap.set(row.dayId, {
        id: row.dayId,
        order: row.dayOrder,
        title: row.dayTitle || row.dayId,
        focus: row.focus,
        restSeconds: row.restSeconds,
        exercises: []
      });
    }
    gymDayMap.get(row.dayId).exercises.push({
      id: row.exerciseId,
      order: row.exerciseOrder,
      name: row.exerciseName,
      setsTarget: row.setsTarget,
      repsTarget: row.repsTarget,
      loadValue: row.loadValue,
      loadUnit: row.loadUnit,
      loadNote: row.loadNote,
      coachingNote: row.coachingNote
    });
  }
  const gymPlan = [...gymDayMap.values()]
    .map((day) => ({
      ...day,
      exercises: day.exercises.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    }))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const nutritionPlan = parseTableRows(nutritionRows)
    .map((item) => ({
      section: item.section || null,
      order: toNumber(item.item_order),
      title: item.title || null,
      target: item.target || null,
      unit: item.unit || null,
      note: item.note || null,
      enabled: String(item.enabled ?? "TRUE").toUpperCase() !== "FALSE"
    }))
    .filter((item) => item.enabled && item.title);

  const miguelIncome = moneyOrNull(summary.miguel_income);
  const andreaIncome = moneyOrNull(summary.andrea_income);
  const commonBudget = moneyOrNull(summary.common_budget);
  const withSavings = moneyOrNull(summary.common_budget_with_savings);

  const value = {
    monthlyBudget: {
      period: summary.period_start && summary.period_end
        ? `${summary.period_start}/${summary.period_end}`
        : null,
      periodLabel: formatPeriodLabel(summary.period_start, summary.period_end),
      currency: summary.currency || "EUR",
      income: miguelIncome !== null && andreaIncome !== null ? miguelIncome + andreaIncome : null,
      plannedOutflows: withSavings,
      commonBudget,
      personalNet: moneyOrNull(summary.miguel_net_free),
      miguelNet: moneyOrNull(summary.miguel_net_free),
      andreaNet: moneyOrNull(summary.andrea_net_free),
      jointNet: moneyOrNull(summary.joint_net_free),
      savingsTarget: commonBudget !== null && withSavings !== null ? withSavings - commonBudget : null,
      categories
    },
    upcomingCommitments: commitments,
    debts: debtSummary,
    wealth: wealthSummary,
    importantEventRules,
    health: { gymPlan, nutritionPlan },
    source: {
      kind: "google-sheet-derived",
      status: summary.status || "DERIVADO",
      sourceOfTruth: summary.source_of_truth || "ASUNTOS v3.xlsx",
      intermediary: summary.intermediary || "GESTOR FINANZAS PERSONALES",
      updatedAt: summary.updated_at || null
    }
  };

  financeCache = {
    value,
    expiresAt: Date.now() + 30_000
  };
  return { status: "ok", value };
}


async function ensureGymTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS gym_sessions (
      id TEXT PRIMARY KEY,
      session_date TEXT NOT NULL,
      day_id TEXT NOT NULL,
      day_title TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS gym_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      sets_done INTEGER,
      reps_done TEXT,
      load_value REAL,
      load_unit TEXT,
      notes TEXT,
      FOREIGN KEY(session_id) REFERENCES gym_sessions(id) ON DELETE CASCADE
    )
  `).run();

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_gym_entries_exercise ON gym_entries(exercise_id)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_gym_sessions_date ON gym_sessions(session_date DESC)").run();
}

async function fetchGymHistory(env) {
  await ensureGymTables(env);
  const sessionsResult = await env.DB.prepare(`
    SELECT id, session_date, day_id, day_title, notes, created_at
    FROM gym_sessions
    ORDER BY session_date DESC, created_at DESC
    LIMIT 40
  `).all();

  const entriesResult = await env.DB.prepare(`
    SELECT id, session_id, exercise_id, exercise_name, sets_done, reps_done, load_value, load_unit, notes
    FROM gym_entries
    ORDER BY id ASC
  `).all();

  const entriesBySession = new Map();
  for (const entry of entriesResult.results || []) {
    if (!entriesBySession.has(entry.session_id)) entriesBySession.set(entry.session_id, []);
    entriesBySession.get(entry.session_id).push({
      id: entry.id,
      exerciseId: entry.exercise_id,
      exerciseName: entry.exercise_name,
      setsDone: entry.sets_done,
      repsDone: entry.reps_done,
      loadValue: entry.load_value,
      loadUnit: entry.load_unit,
      notes: entry.notes
    });
  }

  const sessions = (sessionsResult.results || []).map((session) => ({
    id: session.id,
    sessionDate: session.session_date,
    dayId: session.day_id,
    dayTitle: session.day_title,
    notes: session.notes,
    createdAt: session.created_at,
    entries: entriesBySession.get(session.id) || []
  }));

  const progressMap = new Map();
  for (const session of [...sessions].reverse()) {
    for (const entry of session.entries) {
      if (entry.loadValue == null || !Number.isFinite(Number(entry.loadValue))) continue;
      if (!progressMap.has(entry.exerciseId)) progressMap.set(entry.exerciseId, []);
      progressMap.get(entry.exerciseId).push({
        date: session.sessionDate,
        value: Number(entry.loadValue),
        unit: entry.loadUnit || null
      });
    }
  }

  return {
    sessions,
    progress: Object.fromEntries(progressMap)
  };
}

async function saveGymSession(request, env) {
  await ensureGymTables(env);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const sessionDate = String(payload?.sessionDate || "").trim();
  const dayId = String(payload?.dayId || "").trim();
  const dayTitle = String(payload?.dayTitle || "").trim();
  const notes = String(payload?.notes || "").trim().slice(0, 1000);
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || !dayId || !entries.length) {
    return json({ ok: false, code: "INVALID_GYM_SESSION" }, 400);
  }

  const cleanEntries = entries
    .map((entry) => ({
      exerciseId: String(entry?.exerciseId || "").trim(),
      exerciseName: String(entry?.exerciseName || "").trim().slice(0, 160),
      setsDone: toNumber(entry?.setsDone),
      repsDone: String(entry?.repsDone ?? "").trim().slice(0, 80),
      loadValue: toNumber(entry?.loadValue),
      loadUnit: String(entry?.loadUnit || "").trim().slice(0, 40),
      notes: String(entry?.notes || "").trim().slice(0, 500)
    }))
    .filter((entry) => entry.exerciseId && entry.exerciseName);

  if (!cleanEntries.length) return json({ ok: false, code: "EMPTY_GYM_SESSION" }, 400);

  const sessionId = crypto.randomUUID();
  const statements = [
    env.DB.prepare(`
      INSERT INTO gym_sessions (id, session_date, day_id, day_title, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(sessionId, sessionDate, dayId, dayTitle || dayId, notes || null)
  ];

  for (const entry of cleanEntries) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO gym_entries (
          session_id, exercise_id, exercise_name, sets_done, reps_done, load_value, load_unit, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        entry.exerciseId,
        entry.exerciseName,
        entry.setsDone,
        entry.repsDone || null,
        entry.loadValue,
        entry.loadUnit || null,
        entry.notes || null
      )
    );
  }

  await env.DB.batch(statements);
  return json({ ok: true, sessionId }, 201);
}


async function deleteGymSession(sessionId, env) {
  await ensureGymTables(env);
  const id = String(sessionId || "").trim();
  if (!id) return json({ ok: false, code: "INVALID_SESSION_ID" }, 400);

  const existing = await env.DB.prepare(
    "SELECT id FROM gym_sessions WHERE id = ? LIMIT 1"
  ).bind(id).first();

  if (!existing) return json({ ok: false, code: "GYM_SESSION_NOT_FOUND" }, 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM gym_entries WHERE session_id = ?").bind(id),
    env.DB.prepare("DELETE FROM gym_sessions WHERE id = ?").bind(id)
  ]);

  return json({ ok: true, deletedSessionId: id });
}


export default {
  async fetch(request, env) {
    if (env.PRIVATE_APP_ENABLED !== "true") {
      return json({
        ok: false,
        code: "PRIVATE_APP_DISABLED",
        message: "La aplicación privada todavía no está habilitada."
      }, 503);
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return withSecurityHeaders(Response.redirect(new URL("/app/", request.url), 302));
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const row = await env.DB.prepare(
        "SELECT id, schema_version, created_at FROM state_snapshots WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
      ).first();

      let financeSync = hasFinanceGoogleConfig(env) ? "configured" : "not-configured";
      if (hasFinanceGoogleConfig(env)) {
        try {
          const finance = await fetchFinanceSummary(env);
          financeSync = finance.status;
        } catch {
          financeSync = "error";
        }
      }

      let calendarSync = hasIcloudCalendarConfig(env) ? "configured" : "not-configured";
      let calendarError = null;
      let calendarMatchedCount = null;
      let calendarSelectedCount = null;
      let calendarEventCount = null;
      if (hasIcloudCalendarConfig(env)) {
        try {
          const calendar = await fetchIcloudCalendarSummary(env);
          calendarSync = calendar.status;
          calendarMatchedCount = calendar.value?.source?.matchedCalendarCount ?? null;
          calendarSelectedCount = calendar.value?.source?.selectedCalendarCount ?? null;
          calendarEventCount = Array.isArray(calendar.value?.events) ? calendar.value.events.length : null;
        } catch (error) {
          calendarSync = "error";
          calendarError = safeIcloudErrorCode(error);
        }
      }

      return json({
        ok: true,
        mode: "private-remote",
        snapshotAvailable: Boolean(row),
        schemaVersion: row?.schema_version ?? null,
        snapshotCreatedAt: row?.created_at ?? null,
        financeSync,
        calendarSync,
        calendarError,
        calendarMatchedCount,
        calendarSelectedCount,
        calendarEventCount
      });
    }

    if (url.pathname === "/api/gym") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      let gymPlan = [];
      if (hasFinanceGoogleConfig(env)) {
        try {
          const finance = await fetchFinanceSummary(env);
          gymPlan = finance.value?.health?.gymPlan || [];
        } catch {}
      }
      const history = await fetchGymHistory(env);
      return json({ ok: true, plan: gymPlan, ...history });
    }

    if (url.pathname === "/api/gym/session") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      return saveGymSession(request, env);
    }

    if (url.pathname.startsWith("/api/gym/session/")) {
      if (request.method !== "DELETE") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const sessionId = decodeURIComponent(url.pathname.slice("/api/gym/session/".length));
      return deleteGymSession(sessionId, env);
    }

    if (url.pathname === "/api/state") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

      const row = await env.DB.prepare(
        "SELECT id, schema_version, created_at, content_json FROM state_snapshots WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
      ).first();

      if (!row) {
        return json({
          ok: false,
          code: "STATE_NOT_INITIALIZED",
          message: "Todavía no existe una instantánea privada remota."
        }, 503);
      }

      let state;
      try {
        state = JSON.parse(row.content_json);
      } catch {
        return json({ ok: false, code: "INVALID_STATE_JSON" }, 500);
      }

      let financeSync = "not-configured";
      if (hasFinanceGoogleConfig(env)) {
        try {
          const finance = await fetchFinanceSummary(env);
          if (finance.value) {
            state.financeSummary = finance.value;
            state.importantEventRules = finance.value.importantEventRules || [];
            state.healthSummary = finance.value.health || { gymPlan: [], nutritionPlan: [] };
          }
          financeSync = finance.status;
        } catch (error) {
          financeSync = "error";
          console.warn("Finance sync failed", String(error?.message || error));
        }
      }

      let calendarSync = "not-configured";
      if (hasIcloudCalendarConfig(env)) {
        try {
          const calendar = await fetchIcloudCalendarSummary(env);
          if (calendar.value) {
            state.calendarSummary = calendar.value;
            state.events = calendar.value.events;
          }
          calendarSync = calendar.status;
        } catch (error) {
          calendarSync = "error";
          console.warn("iCloud calendar sync failed", String(error?.message || error));
        }
      }

      state.meta = {
        ...(state.meta || {}),
        mode: "private-remote",
        remoteSnapshotId: row.id,
        schemaVersion: row.schema_version,
        remoteSnapshotCreatedAt: row.created_at,
        financeSync,
        calendarSync
      };

      return json(state);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse, {
      "Cache-Control": "private, max-age=0, must-revalidate"
    });
  }
};
