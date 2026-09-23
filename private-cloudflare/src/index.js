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
let habitsCache = { value: null, expiresAt: 0 };
let healthCache = { value: null, expiresAt: 0, date: null };

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

function hasGoogleOauthConfig(env) {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REFRESH_TOKEN
  );
}

function hasFinanceGoogleConfig(env) {
  return Boolean(hasGoogleOauthConfig(env) && env.FINANCE_SHEET_ID);
}

function hasHabitQuestGoogleConfig(env) {
  return Boolean(hasGoogleOauthConfig(env) && env.HABITQUEST_SHEET_ID);
}

function hasHealthGoogleConfig(env) {
  return Boolean(hasGoogleOauthConfig(env) && env.HEALTH_SHEET_ID);
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
  const ranges = ["Resumen!A1:B100", "Categorias!A1:K500", "Compromisos!A1:I500", "Deudas!A1:K500", "Patrimonio!A1:H500", "EventosImportantes!A1:G200", "GimnasioPlan!A1:N500", "Nutricion!A1:G500"];
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


function habitDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addHabitDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00+02:00`);
  date.setDate(date.getDate() + amount);
  return habitDateKey(date);
}

function habitWeekday(dateKey) {
  return new Date(`${dateKey}T12:00:00+02:00`).getDay();
}

function habitIsScheduled(habit, dateKey) {
  if (!habit.active) return false;
  const weekday = habitWeekday(dateKey);
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return weekday >= 1 && weekday <= 5;
  return habit.days.includes(weekday);
}

function buildHabitStateMap(history, syncStates) {
  const stateMap = new Map();

  for (const completion of history) {
    const key = `${completion.habitId}|${completion.date}`;
    const existing = stateMap.get(key) || {
      habitId: completion.habitId,
      date: completion.date,
      count: 0,
      updatedAt: completion.at || `${completion.date}T12:00:00.000Z`
    };
    existing.count += 1;
    const timestamp = completion.at || `${completion.date}T12:00:00.000Z`;
    if (timestamp > existing.updatedAt) existing.updatedAt = timestamp;
    stateMap.set(key, existing);
  }

  for (const state of syncStates) {
    const key = `${state.habitId}|${state.date}`;
    const previous = stateMap.get(key);
    if (!previous || state.updatedAt >= previous.updatedAt) {
      stateMap.set(key, state);
    }
  }

  return stateMap;
}

function computeHabitStreak(stateMap, todayKey) {
  const completedDates = new Set(
    [...stateMap.values()]
      .filter((item) => Number(item.count) > 0)
      .map((item) => item.date)
  );

  let current = 0;
  for (let offset = 0; offset < 400; offset += 1) {
    const key = addHabitDays(todayKey, -offset);
    if (completedDates.has(key)) current += 1;
    else if (offset === 0) continue;
    else break;
  }

  let longest = 0;
  let run = 0;
  for (let offset = 400; offset >= 0; offset -= 1) {
    const key = addHabitDays(todayKey, -offset);
    if (completedDates.has(key)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  return { current, longest: Math.max(current, longest) };
}

function habitLevelFromXp(xp) {
  const xpForLevel = (level) => {
    if (level <= 1) return 0;
    let total = 0;
    let step = 100;
    for (let current = 2; current <= level; current += 1) {
      total += step;
      step += 50;
    }
    return total;
  };

  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    currentLevelXp: xp - current,
    levelSpan: next - current,
    progress: next > current ? Math.min(1, Math.max(0, (xp - current) / (next - current))) : 0
  };
}

async function fetchHabitQuestSummary(env, options = {}) {
  if (!hasHabitQuestGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || ""))
    ? String(options.date)
    : habitDateKey();

  if (!options.force && habitsCache.value && habitsCache.expiresAt > Date.now() && habitsCache.value.date === dateKey) {
    return { status: "ok-cache", value: habitsCache.value };
  }

  const token = await getGoogleAccessToken(env);
  const ranges = ["Habits!A1:M1200", "History!A1:F6000", "Meta!A1:B100", "SyncState!A1:D6000"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HABITQUEST_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  const habitRows = parseTableRows(valueRanges[0]?.values || []);
  const historyRows = parseTableRows(valueRanges[1]?.values || []);
  const metaRows = valueRanges[2]?.values || [];
  const syncRows = parseTableRows(valueRanges[3]?.values || []);

  const habits = habitRows.map((item) => ({
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    icon: String(item.icon || "✓"),
    category: String(item.category || "personal"),
    frequency: String(item.frequency || "daily"),
    days: String(item.days || "")
      .split(/[,;\s]+/)
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    reminder: String(item.reminder || ""),
    difficulty: String(item.difficulty || "easy"),
    xpReward: Math.max(0, Number(item.xpReward) || 0),
    timesPerDay: Math.max(1, Number(item.timesPerDay) || 1),
    active: String(item.active || "yes").toLowerCase() !== "no",
    archivedAt: item.archivedAt || null,
    createdAt: item.createdAt || null
  })).filter((habit) => habit.id && habit.name);

  const history = historyRows
    .map((item) => ({
      id: String(item.id || "").trim(),
      habitId: String(item.habitId || "").trim(),
      habitName: String(item.habitName || "").trim(),
      date: String(item.date || "").trim(),
      at: String(item.at || "").trim() || null,
      xpEarned: Math.max(0, Number(item.xpEarned) || 0)
    }))
    .filter((item) => item.habitId && /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  const syncStates = syncRows
    .map((item) => ({
      habitId: String(item.habitId || "").trim(),
      date: String(item.date || "").trim(),
      count: Math.max(0, Math.floor(Number(item.count) || 0)),
      updatedAt: String(item.updatedAt || "").trim()
    }))
    .filter((item) => item.habitId && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.updatedAt);

  const stateMap = buildHabitStateMap(history, syncStates);
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const scheduled = habits.filter((habit) => habitIsScheduled(habit, dateKey));
  const todayHabits = scheduled.map((habit) => {
    const state = stateMap.get(`${habit.id}|${dateKey}`);
    const count = Math.max(0, Number(state?.count) || 0);
    return {
      ...habit,
      count,
      target: habit.timesPerDay,
      done: count >= habit.timesPerDay
    };
  });

  let xp = 0;
  for (const item of stateMap.values()) {
    const habit = habitById.get(item.habitId);
    if (!habit || item.count <= 0) continue;
    xp += item.count * habit.xpReward;
  }

  const streak = computeHabitStreak(stateMap, dateKey);
  const meta = parseKeyValueRows(metaRows);
  let user = {};
  try {
    const parsed = JSON.parse(String(meta.user || "{}"));
    user = {
      name: parsed.name || "Miguel",
      avatar: parsed.avatar || "✓",
      streakFreezes: Number(parsed.streakFreezes) || 0,
      habitView: parsed.habitView || "compact",
      habitSort: parsed.habitSort || "manual"
    };
  } catch {}

  const activeHabits = habits.filter((habit) => habit.active);
  const progress = activeHabits.map((habit) => {
    let scheduledDays = 0;
    let completedDays = 0;
    const points = [];
    for (let offset = 59; offset >= 0; offset -= 1) {
      const key = addHabitDays(dateKey, -offset);
      if (!habitIsScheduled(habit, key)) continue;
      scheduledDays += 1;
      const count = Math.max(0, Number(stateMap.get(`${habit.id}|${key}`)?.count) || 0);
      const done = count >= habit.timesPerDay;
      if (done) completedDays += 1;
      points.push({ date: key, count, target: habit.timesPerDay, done });
    }

    let totalCompletions = 0;
    for (const item of stateMap.values()) {
      if (item.habitId === habit.id) totalCompletions += Math.max(0, Number(item.count) || 0);
    }

    let currentStreak = 0;
    for (let offset = 0; offset < 400; offset += 1) {
      const key = addHabitDays(dateKey, -offset);
      const count = Math.max(0, Number(stateMap.get(`${habit.id}|${key}`)?.count) || 0);
      if (count > 0) currentStreak += 1;
      else if (offset === 0) continue;
      else break;
    }

    return {
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      category: habit.category,
      scheduledDays,
      completedDays,
      rate: scheduledDays ? completedDays / scheduledDays : 0,
      totalCompletions,
      currentStreak,
      points
    };
  });

  const doneByDate = new Map();
  for (const item of stateMap.values()) {
    const habit = habitById.get(item.habitId);
    if (!habit || !habit.active || Number(item.count) < Math.max(1, Number(habit.timesPerDay) || 1)) continue;
    if (!doneByDate.has(item.date)) doneByDate.set(item.date, new Set());
    doneByDate.get(item.date).add(item.habitId);
  }

  const mondayOffset = (habitWeekday(dateKey) + 6) % 7;
  const weekLabels = ["L", "M", "X", "J", "V", "S", "D"];
  const weekly = weekLabels.map((label, index) => {
    const key = addHabitDays(dateKey, index - mondayOffset);
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    const doneSet = doneByDate.get(key) || new Set();
    const done = scheduledForDay.filter((habit) => doneSet.has(habit.id)).length;
    return {
      label,
      date: key,
      scheduled: scheduledForDay.length,
      done,
      rate: scheduledForDay.length ? Math.min(1, done / scheduledForDay.length) : 0,
      future: key > dateKey
    };
  });

  let scheduled90 = 0;
  let done90 = 0;
  for (let offset = 0; offset < 90; offset += 1) {
    const key = addHabitDays(dateKey, -offset);
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    scheduled90 += scheduledForDay.length;
    const doneSet = doneByDate.get(key) || new Set();
    done90 += scheduledForDay.filter((habit) => doneSet.has(habit.id)).length;
  }
  const completionRate = scheduled90 ? done90 / scheduled90 : 0;

  const toSunday = 6 - mondayOffset;
  const heatMonths = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const heat = Array.from({ length: 35 }, (_, index) => {
    const key = addHabitDays(dateKey, toSunday - (34 - index));
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    const doneSet = doneByDate.get(key) || new Set();
    const done = scheduledForDay.filter((habit) => doneSet.has(habit.id)).length;
    const date = new Date(`${key}T12:00:00+02:00`);
    return {
      date: key,
      day: date.getDate(),
      month: heatMonths[date.getMonth()] || "",
      label: key,
      firstOfMonth: date.getDate() === 1,
      future: key > dateKey,
      level: scheduledForDay.length ? Math.min(1, done / scheduledForDay.length) : 0,
      done
    };
  });

  let totalCompletions = 0;
  for (const item of stateMap.values()) totalCompletions += Math.max(0, Number(item.count) || 0);

  let morning = 0;
  let night = 0;
  for (const item of history) {
    const finalState = stateMap.get(`${item.habitId}|${item.date}`);
    if (!finalState || Number(finalState.count) <= 0) continue;
    const habit = habitById.get(item.habitId);
    const fallbackHour = Number(String(habit?.reminder || "12:00").split(":")[0] || 12);
    const parsedHour = item.at
      ? Number(new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Madrid",
          hour: "2-digit",
          hour12: false,
          hourCycle: "h23"
        }).format(new Date(item.at)))
      : fallbackHour;
    if (parsedHour < 10) morning += 1;
    if (parsedHour >= 20) night += 1;
  }

  let perfectRun = 0;
  for (let offset = 1; offset <= 60; offset += 1) {
    const key = addHabitDays(dateKey, -offset);
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    const doneSet = doneByDate.get(key) || new Set();
    if (scheduledForDay.length > 0 && scheduledForDay.every((habit) => doneSet.has(habit.id))) perfectRun += 1;
    else break;
  }

  const achievementDefs = [
    ["first-step", 1, totalCompletions],
    ["on-fire", 7, Math.max(streak.current, streak.longest)],
    ["unstoppable", 30, Math.max(streak.current, streak.longest)],
    ["century", 100, totalCompletions],
    ["early-bird", 7, morning],
    ["night-owl", 7, night],
    ["perfect-week", 7, perfectRun],
    ["half-k", 500, totalCompletions]
  ];
  const achievements = achievementDefs.map(([id, target, rawValue]) => ({
    id,
    target,
    value: Math.min(Number(rawValue) || 0, Number(target) || 0),
    unlocked: Number(rawValue) >= Number(target)
  }));
  const achievementsUnlocked = achievements.filter((item) => item.unlocked).length;
  const bestHabit = [...progress].sort((a, b) => b.rate - a.rate || b.totalCompletions - a.totalCompletions)[0] || null;
  const value = {
    date: dateKey,
    user,
    habits,
    todayHabits,
    summary: {
      total: todayHabits.length,
      done: todayHabits.filter((habit) => habit.done).length,
      xp,
      level: habitLevelFromXp(xp),
      streak: streak.current,
      longestStreak: streak.longest,
      completionRate,
      totalCompletions
    },
    progress,
    insights: {
      weekly,
      heat,
      completionRate,
      totalCompletions,
      bestHabit,
      achievements,
      achievementsUnlocked
    },
    source: {
      kind: "google-sheet",
      title: "HabitQuest Data",
      updatedAt: meta.updatedAt || null
    }
  };

  habitsCache = { value, expiresAt: Date.now() + 15_000 };
  return { status: "ok", value };
}

async function toggleHabitQuest(request, env) {
  if (!hasHabitQuestGoogleConfig(env)) {
    return json({ ok: false, code: "HABITQUEST_NOT_CONFIGURED" }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const habitId = String(payload?.habitId || "").trim();
  const date = String(payload?.date || "").trim();
  if (!habitId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ ok: false, code: "INVALID_HABIT_ACTION" }, 400);
  }

  const current = await fetchHabitQuestSummary(env, { date, force: true });
  const habit = current.value?.habits?.find((item) => item.id === habitId);
  const todayHabit = current.value?.todayHabits?.find((item) => item.id === habitId);
  if (!habit) return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
  if (!todayHabit) return json({ ok: false, code: "HABIT_NOT_SCHEDULED" }, 409);

  const currentCount = Math.max(0, Number(todayHabit.count) || 0);
  const target = Math.max(1, Number(habit.timesPerDay) || 1);
  const nextCount = currentCount >= target ? 0 : currentCount + 1;
  const updatedAt = new Date().toISOString();

  const token = await getGoogleAccessToken(env);
  const range = encodeURIComponent("SyncState!A:D");
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [[habitId, date, nextCount, updatedAt]] })
  });

  if (!response.ok) throw new Error(`HABITQUEST_WRITE_${response.status}`);

  habitsCache = { value: null, expiresAt: 0 };
  const refreshed = await fetchHabitQuestSummary(env, { date, force: true });
  return json({
    ok: true,
    habitId,
    date,
    count: nextCount,
    summary: refreshed.value
  });
}


const HABITQUEST_HABIT_HEADER = [
  "id", "name", "icon", "category", "frequency", "days", "reminder",
  "difficulty", "xpReward", "timesPerDay", "active", "archivedAt", "createdAt"
];
const HABITQUEST_HISTORY_HEADER = ["id", "habitId", "habitName", "date", "at", "xpEarned"];
const HABITQUEST_SYNC_HEADER = ["habitId", "date", "count", "updatedAt"];
const HABITQUEST_CATEGORIES = new Set([
  "fitness", "learning", "mind", "work", "finance", "health", "sleep", "creativity", "social", "personal"
]);
const HABITQUEST_DIFFICULTY_XP = { easy: 10, medium: 20, hard: 30 };

async function fetchHabitQuestTables(env) {
  const token = await getGoogleAccessToken(env);
  const ranges = ["Habits!A1:M1200", "History!A1:F6000", "Meta!A1:B100", "SyncState!A1:D6000"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HABITQUEST_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  return {
    token,
    habits: parseTableRows(valueRanges[0]?.values || []),
    history: parseTableRows(valueRanges[1]?.values || []),
    metaRows: valueRanges[2]?.values || [],
    syncStates: parseTableRows(valueRanges[3]?.values || [])
  };
}

function normalizeHabitQuestDays(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[,;\s]+/);
  return [...new Set(raw.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => a - b);
}

function normalizeHabitQuestInput(input = {}, existing = null) {
  const name = String(input.name ?? existing?.name ?? "").trim().slice(0, 120);
  if (!name) throw new Error("HABIT_NAME_REQUIRED");

  const frequencyRaw = String(input.frequency ?? existing?.frequency ?? "daily");
  const frequency = ["daily", "weekdays", "custom"].includes(frequencyRaw) ? frequencyRaw : "daily";
  const difficultyRaw = String(input.difficulty ?? existing?.difficulty ?? "medium");
  const difficulty = ["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium";
  const categoryRaw = String(input.category ?? existing?.category ?? "personal");
  const category = HABITQUEST_CATEGORIES.has(categoryRaw) ? categoryRaw : "personal";
  const reminderRaw = String(input.reminder ?? existing?.reminder ?? "").trim();
  const reminder = /^\d{2}:\d{2}$/.test(reminderRaw) ? reminderRaw : "";
  const timesPerDay = Math.min(12, Math.max(1, Math.floor(Number(input.timesPerDay ?? existing?.timesPerDay ?? 1) || 1)));
  const icon = String(input.icon ?? existing?.icon ?? "✓").trim().slice(0, 8) || "✓";
  const days = normalizeHabitQuestDays(input.days ?? existing?.days ?? []);

  return {
    id: String(existing?.id || input.id || `sc-${crypto.randomUUID().slice(0, 8)}`),
    name,
    icon,
    category,
    frequency,
    days,
    reminder,
    difficulty,
    xpReward: HABITQUEST_DIFFICULTY_XP[difficulty],
    timesPerDay,
    active: input.active === undefined ? (existing?.active !== false) : Boolean(input.active),
    archivedAt: input.archivedAt === undefined ? (existing?.archivedAt || null) : (input.archivedAt || null),
    createdAt: String(existing?.createdAt || input.createdAt || habitDateKey())
  };
}

function habitQuestRowToHabit(item) {
  return {
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    icon: String(item.icon || "✓"),
    category: String(item.category || "personal"),
    frequency: String(item.frequency || "daily"),
    days: normalizeHabitQuestDays(item.days),
    reminder: String(item.reminder || ""),
    difficulty: String(item.difficulty || "medium"),
    xpReward: Math.max(0, Number(item.xpReward) || 0),
    timesPerDay: Math.max(1, Number(item.timesPerDay) || 1),
    active: String(item.active || "yes").toLowerCase() !== "no",
    archivedAt: item.archivedAt || null,
    createdAt: item.createdAt || habitDateKey()
  };
}

function habitQuestHabitRow(habit) {
  return [
    habit.id,
    habit.name,
    habit.icon,
    habit.category,
    habit.frequency,
    (habit.days || []).join(","),
    habit.reminder || "",
    habit.difficulty,
    String(habit.xpReward),
    String(habit.timesPerDay),
    habit.active ? "yes" : "no",
    habit.archivedAt || "",
    habit.createdAt
  ];
}

function habitQuestHistoryRow(item) {
  return [
    item.id || "",
    item.habitId || "",
    item.habitName || "",
    item.date || "",
    item.at || "",
    String(item.xpEarned ?? "")
  ];
}

function habitQuestSyncRow(item) {
  return [
    item.habitId || "",
    item.date || "",
    String(item.count ?? 0),
    item.updatedAt || ""
  ];
}

async function rewriteHabitQuestRanges(env, token, { habits, history = null, syncStates = null, updatedAt }) {
  const clearRanges = ["Habits!A2:M1200"];
  const data = [{
    range: "Habits!A1",
    majorDimension: "ROWS",
    values: [HABITQUEST_HABIT_HEADER, ...habits.map(habitQuestHabitRow)]
  }];

  if (history) {
    clearRanges.push("History!A2:F6000");
    data.push({
      range: "History!A1",
      majorDimension: "ROWS",
      values: [HABITQUEST_HISTORY_HEADER, ...history.map(habitQuestHistoryRow)]
    });
  }

  if (syncStates) {
    clearRanges.push("SyncState!A2:D6000");
    data.push({
      range: "SyncState!A1",
      majorDimension: "ROWS",
      values: [HABITQUEST_SYNC_HEADER, ...syncStates.map(habitQuestSyncRow)]
    });
  }

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchClear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ranges: clearRanges })
    }
  );
  if (!clearResponse.ok) throw new Error(`HABITQUEST_CLEAR_${clearResponse.status}`);

  data.push({
    range: "Meta!B3",
    majorDimension: "ROWS",
    values: [[updatedAt]]
  });

  const writeResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data
      })
    }
  );
  if (!writeResponse.ok) throw new Error(`HABITQUEST_MANAGE_WRITE_${writeResponse.status}`);
}

async function manageHabitQuest(request, env) {
  if (!hasHabitQuestGoogleConfig(env)) {
    return json({ ok: false, code: "HABITQUEST_NOT_CONFIGURED" }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const action = String(payload?.action || "").trim();
  const tables = await fetchHabitQuestTables(env);
  let habits = tables.habits.map(habitQuestRowToHabit).filter((habit) => habit.id && habit.name);
  let history = tables.history;
  let syncStates = tables.syncStates;
  const updatedAt = new Date().toISOString();

  if (action === "create") {
    const habit = normalizeHabitQuestInput(payload.habit || {});
    habits.push(habit);
  } else if (action === "update") {
    const habitId = String(payload?.habitId || "").trim();
    const index = habits.findIndex((habit) => habit.id === habitId);
    if (index < 0) return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
    habits[index] = normalizeHabitQuestInput(payload.habit || {}, habits[index]);
  } else if (action === "archive" || action === "restore") {
    const habitId = String(payload?.habitId || "").trim();
    const index = habits.findIndex((habit) => habit.id === habitId);
    if (index < 0) return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
    const archived = action === "archive";
    habits[index] = {
      ...habits[index],
      active: !archived,
      archivedAt: archived ? habitDateKey() : null
    };
  } else if (action === "delete") {
    const habitId = String(payload?.habitId || "").trim();
    if (!habits.some((habit) => habit.id === habitId)) {
      return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
    }
    habits = habits.filter((habit) => habit.id !== habitId);
    history = history.filter((item) => String(item.habitId || "").trim() !== habitId);
    syncStates = syncStates.filter((item) => String(item.habitId || "").trim() !== habitId);
  } else if (action === "reorder") {
    const order = Array.isArray(payload?.order) ? payload.order.map(String) : [];
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean);
    const seen = new Set(ordered.map((habit) => habit.id));
    habits = [...ordered, ...habits.filter((habit) => !seen.has(habit.id))];
  } else {
    return json({ ok: false, code: "INVALID_HABIT_MANAGEMENT_ACTION" }, 400);
  }

  const deleting = action === "delete";
  await rewriteHabitQuestRanges(env, tables.token, {
    habits,
    history: deleting ? history : null,
    syncStates: deleting ? syncStates : null,
    updatedAt
  });

  habitsCache = { value: null, expiresAt: 0 };
  const refreshed = await fetchHabitQuestSummary(env, { force: true });
  return json({ ok: true, action, summary: refreshed.value });
}



function localHealthDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function healthAddDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00+02:00`);
  date.setDate(date.getDate() + amount);
  return localHealthDateKey(date);
}

function sumNutrition(entries, status) {
  const selected = entries.filter((entry) => !status || entry.status === status);
  return selected.reduce((acc, entry) => {
    acc.kcal += Number(entry.kcal || 0);
    acc.protein += Number(entry.protein || 0);
    acc.carbs += Number(entry.carbs || 0);
    acc.fat += Number(entry.fat || 0);
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

async function ensureD1Column(env, table, column, definition) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  const exists = (info.results || []).some((item) => item.name === column);
  if (!exists) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

async function ensureHealthBodyTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_body_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_type TEXT NOT NULL,
      metric_value REAL NOT NULL,
      unit TEXT NOT NULL,
      sample_date TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'apple_health',
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metric_type, measured_at, source)
    )
  `).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_health_body_date_type ON health_body_samples(sample_date, metric_type)"
  ).run();
}

async function fetchHealthBodySamples(env, startDate, endDate) {
  await ensureHealthBodyTable(env);
  const result = await env.DB.prepare(`
    SELECT metric_type, metric_value, unit, sample_date, measured_at, source, imported_at
    FROM health_body_samples
    WHERE sample_date BETWEEN ? AND ?
    ORDER BY measured_at ASC
  `).bind(startDate, endDate).all();

  return (result.results || []).map((row) => ({
    type: row.metric_type,
    value: toNumber(row.metric_value),
    unit: row.unit || null,
    date: row.sample_date,
    measuredAt: row.measured_at,
    source: row.source || "apple_health",
    importedAt: row.imported_at || null
  }));
}

async function ensureHealthEnergyTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_energy_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      energy_date TEXT NOT NULL,
      active_kcal REAL,
      resting_kcal REAL,
      total_kcal REAL,
      source TEXT NOT NULL DEFAULT 'manual',
      note TEXT,
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      steps INTEGER,
      exercise_minutes REAL,
      workout_count INTEGER,
      sampled_at TEXT,
      source_details TEXT,
      workouts_json TEXT
    )
  `).run();
  await ensureD1Column(env, "health_energy_daily", "steps", "INTEGER");
  await ensureD1Column(env, "health_energy_daily", "exercise_minutes", "REAL");
  await ensureD1Column(env, "health_energy_daily", "workout_count", "INTEGER");
  await ensureD1Column(env, "health_energy_daily", "sampled_at", "TEXT");
  await ensureD1Column(env, "health_energy_daily", "source_details", "TEXT");
  await ensureD1Column(env, "health_energy_daily", "workouts_json", "TEXT");
  // Deduplicate historical rows before enforcing one energy snapshot per day.
  await env.DB.prepare(`
    DELETE FROM health_energy_daily
    WHERE EXISTS (
      SELECT 1
      FROM health_energy_daily AS newer
      WHERE newer.energy_date = health_energy_daily.energy_date
        AND (
          newer.recorded_at > health_energy_daily.recorded_at
          OR (
            newer.recorded_at = health_energy_daily.recorded_at
            AND newer.id > health_energy_daily.id
          )
        )
    )
  `).run();
  await env.DB.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_health_energy_date ON health_energy_daily(energy_date)"
  ).run();
}

async function fetchHealthEnergyRows(env, startDate, endDate) {
  await ensureHealthEnergyTable(env);
  const result = await env.DB.prepare(`
    SELECT energy_date, active_kcal, resting_kcal, total_kcal, source, note, recorded_at,
           steps, exercise_minutes, workout_count, sampled_at, source_details, workouts_json
    FROM health_energy_daily
    WHERE energy_date BETWEEN ? AND ?
    ORDER BY energy_date ASC
  `).bind(startDate, endDate).all();

  return new Map((result.results || []).map((row) => [row.energy_date, {
    date: row.energy_date,
    activeKcal: toNumber(row.active_kcal),
    restingKcal: toNumber(row.resting_kcal),
    totalKcal: toNumber(row.total_kcal),
    source: row.source || "manual",
    note: row.note || null,
    importedAt: row.recorded_at || null,
    steps: row.steps === null || row.steps === undefined ? null : Number(row.steps),
    exerciseMinutes: toNumber(row.exercise_minutes),
    workoutCount: row.workout_count === null || row.workout_count === undefined ? null : Number(row.workout_count),
    sampledAt: row.sampled_at || null,
    sourceDetails: row.source_details ? (() => { try { return JSON.parse(row.source_details); } catch { return []; } })() : [],
    workouts: row.workouts_json ? (() => { try { return JSON.parse(row.workouts_json); } catch { return []; } })() : []
  }]));
}

async function fetchHealthNutritionSummary(env, options = {}) {
  if (!hasHealthGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || ""))
    ? String(options.date)
    : localHealthDateKey();

  if (!options.force && healthCache.value && healthCache.expiresAt > Date.now() && healthCache.date === date) {
    return { status: "ok-cache", value: healthCache.value };
  }

  const token = await getGoogleAccessToken(env);
  const ranges = ["Comidas!A1:K2000", "Registro!A1:N6000", "Objetivos!A1:H500", "EnergiaDiaria!A1:G2000"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HEALTH_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];

  const foods = parseTableRows(valueRanges[0]?.values || []).map((item) => ({
    id: String(item.id || "").trim(),
    name: String(item.nombre || "").trim(),
    serving: toNumber(item.racion),
    unit: item.unidad || null,
    kcal: toNumber(item.kcal_racion),
    protein: toNumber(item.proteinas_g),
    carbs: toNumber(item.carbohidratos_g),
    fat: toNumber(item.grasas_g),
    source: item.fuente || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null
  })).filter((item) => item.id && item.name);

  const foodById = new Map(foods.map((food) => [food.id, food]));
  const entries = parseTableRows(valueRanges[1]?.values || []).map((item, index) => {
    const itemId = item.item_id || null;
    const linkedFood = itemId ? foodById.get(String(itemId)) : null;
    const quantity = toNumber(item.cantidad);
    const serving = linkedFood?.serving;
    const factor = linkedFood && quantity !== null && serving !== null && serving > 0
      ? quantity / serving
      : linkedFood ? 1 : null;
    const derived = (field) => linkedFood && factor !== null && linkedFood[field] !== null
      ? Number(linkedFood[field]) * factor
      : null;
    return {
      id: `row-${index + 2}`,
      date: String(item.fecha || "").trim(),
      moment: String(item.momento || "Otro").trim(),
      itemId,
      itemName: String(item.item_nombre || linkedFood?.name || "").trim(),
      quantity,
      unit: item.unidad || linkedFood?.unit || null,
      kcal: toNumber(item.kcal) ?? derived("kcal") ?? 0,
      protein: toNumber(item.proteinas_g) ?? derived("protein") ?? 0,
      carbs: toNumber(item.carbohidratos_g) ?? derived("carbs") ?? 0,
      fat: toNumber(item.grasas_g) ?? derived("fat") ?? 0,
      status: String(item.estado || "consumido").toLowerCase() === "planificado" ? "planificado" : "consumido",
      source: item.fuente || (linkedFood ? "base_comidas" : null),
      note: item.nota || null,
      updatedAt: item.updated_at || null
    };
  }).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.itemName);

  const objectives = parseTableRows(valueRanges[2]?.values || []).map((item) => ({
    effectiveDate: String(item.effective_date || "").trim(),
    kcal: toNumber(item.target_kcal),
    protein: toNumber(item.target_protein_g),
    carbs: toNumber(item.target_carbs_g),
    fat: toNumber(item.target_fat_g),
    note: item.nota || null,
    active: String(item.active ?? "TRUE").toUpperCase() !== "FALSE",
    updatedAt: item.updated_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.effectiveDate) && item.active)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const energyRows = parseTableRows(valueRanges[3]?.values || []).map((item) => ({
    date: String(item.fecha || "").trim(),
    activeKcal: toNumber(item.active_kcal),
    restingKcal: toNumber(item.resting_kcal),
    totalKcal: toNumber(item.total_kcal),
    source: item.fuente || null,
    note: item.nota || null,
    importedAt: item.imported_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  const historyStart = healthAddDays(date, -13);
  const d1EnergyByDate = await fetchHealthEnergyRows(env, historyStart, date);
  const sheetEnergyByDate = new Map();
  for (const row of [...energyRows].sort((a, b) => String(b.importedAt || "").localeCompare(String(a.importedAt || "")))) {
    if (!sheetEnergyByDate.has(row.date)) sheetEnergyByDate.set(row.date, row);
  }
  const energyForDate = (dateKey) => d1EnergyByDate.get(dateKey) || sheetEnergyByDate.get(dateKey) || null;

  const dayEntries = entries.filter((item) => item.date === date);
  const consumed = sumNutrition(dayEntries, "consumido");
  const planned = sumNutrition(dayEntries, "planificado");
  const objective = objectives.find((item) => item.effectiveDate <= date) || null;

  const energyForDay = energyForDate(date);
  const totalBurn = energyForDay
    ? (energyForDay.totalKcal ?? (
      energyForDay.activeKcal !== null && energyForDay.restingKcal !== null
        ? energyForDay.activeKcal + energyForDay.restingKcal
        : null
    ))
    : null;

  const history = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const historyDate = healthAddDays(date, -offset);
    const dayRows = entries.filter((item) => item.date === historyDate);
    const dayConsumed = sumNutrition(dayRows, "consumido");
    const dayEnergy = energyForDate(historyDate);
    const burn = dayEnergy
      ? (dayEnergy.totalKcal ?? (
        dayEnergy.activeKcal !== null && dayEnergy.restingKcal !== null
          ? dayEnergy.activeKcal + dayEnergy.restingKcal
          : null
      ))
      : null;
    history.push({
      date: historyDate,
      consumedKcal: dayConsumed.kcal,
      burnedKcal: burn,
      balanceKcal: burn === null ? null : dayConsumed.kcal - burn
    });
  }

  const value = {
    date,
    foods,
    entries: dayEntries,
    objective,
    energy: energyForDay,
    summary: {
      consumed,
      planned,
      totalBurn,
      balanceKcal: totalBurn === null ? null : consumed.kcal - totalBurn,
      remainingToTargetKcal: objective?.kcal === null || objective?.kcal === undefined
        ? null
        : objective.kcal - consumed.kcal
    },
    history,
    source: {
      kind: "google-sheet",
      title: "SEGUNDO CEREBRO - SALUD"
    }
  };

  healthCache = { value, expiresAt: Date.now() + 20_000, date };
  return { status: "ok", value };
}

async function appendHealthSheetRow(env, range, values) {
  const token = await getGoogleAccessToken(env);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [values] })
  });
  if (!response.ok) throw new Error(`HEALTH_WRITE_${response.status}`);
  healthCache = { value: null, expiresAt: 0, date: null };
}

async function saveNutritionEntry(request, env) {
  if (!hasHealthGoogleConfig(env)) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const date = String(payload?.date || "").trim();
  const itemName = String(payload?.itemName || "").trim().slice(0, 160);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !itemName) {
    return json({ ok: false, code: "INVALID_NUTRITION_ENTRY" }, 400);
  }
  const status = String(payload?.status || "consumido").toLowerCase() === "planificado" ? "planificado" : "consumido";
  const now = new Date().toISOString();
  await appendHealthSheetRow(env, "Registro!A:N", [
    date,
    String(payload?.moment || "Otro").slice(0, 40),
    String(payload?.itemId || "").slice(0, 80),
    itemName,
    toNumber(payload?.quantity),
    String(payload?.unit || "").slice(0, 30),
    toNumber(payload?.kcal) ?? 0,
    toNumber(payload?.protein) ?? 0,
    toNumber(payload?.carbs) ?? 0,
    toNumber(payload?.fat) ?? 0,
    status,
    String(payload?.source || "web").slice(0, 40),
    String(payload?.note || "").slice(0, 500),
    now
  ]);
  return json({ ok: true }, 201);
}

async function saveNutritionFood(request, env) {
  if (!hasHealthGoogleConfig(env)) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  const name = String(payload?.name || "").trim().slice(0, 160);
  if (!name) return json({ ok: false, code: "INVALID_FOOD" }, 400);
  const id = String(payload?.id || `food-${crypto.randomUUID().slice(0, 8)}`);
  await appendHealthSheetRow(env, "Comidas!A:K", [
    id,
    name,
    toNumber(payload?.serving),
    String(payload?.unit || "ración").slice(0, 30),
    toNumber(payload?.kcal) ?? 0,
    toNumber(payload?.protein) ?? 0,
    toNumber(payload?.carbs) ?? 0,
    toNumber(payload?.fat) ?? 0,
    String(payload?.source || "web").slice(0, 40),
    String(payload?.note || "").slice(0, 500),
    new Date().toISOString()
  ]);
  return json({ ok: true, id }, 201);
}

async function saveNutritionEnergy(request, env) {
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const date = String(payload?.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, code: "INVALID_ENERGY_DATE" }, 400);

  const active = toNumber(payload?.activeKcal);
  const resting = toNumber(payload?.restingKcal);
  const suppliedTotal = toNumber(payload?.totalKcal);
  const total = suppliedTotal ?? (active !== null && resting !== null ? active + resting : null);

  if (active === null && resting === null && total === null) {
    return json({ ok: false, code: "EMPTY_ENERGY_SAMPLE" }, 400);
  }

  const values = [active, resting, total].filter((value) => value !== null);
  if (values.some((value) => value < 0 || value > 20000)) {
    return json({ ok: false, code: "INVALID_ENERGY_VALUE" }, 400);
  }

  await ensureHealthEnergyTable(env);
  await env.DB.prepare(`
    INSERT INTO health_energy_daily (
      energy_date, active_kcal, resting_kcal, total_kcal, source, note, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(energy_date) DO UPDATE SET
      active_kcal = excluded.active_kcal,
      resting_kcal = excluded.resting_kcal,
      total_kcal = excluded.total_kcal,
      source = excluded.source,
      note = excluded.note,
      recorded_at = excluded.recorded_at
  `).bind(
    date,
    active,
    resting,
    total,
    String(payload?.source || "manual").trim().slice(0, 40) || "manual",
    String(payload?.note || "").trim().slice(0, 500) || null,
    new Date().toISOString()
  ).run();

  healthCache = { value: null, expiresAt: 0, date: null };
  return json({ ok: true, date, activeKcal: active, restingKcal: resting, totalKcal: total }, 201);
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

      let habitSync = hasHabitQuestGoogleConfig(env) ? "configured" : "not-configured";
      let habitCount = null;
      let habitTodayCount = null;
      if (hasHabitQuestGoogleConfig(env)) {
        try {
          const habits = await fetchHabitQuestSummary(env);
          habitSync = habits.status;
          habitCount = Array.isArray(habits.value?.habits) ? habits.value.habits.length : null;
          habitTodayCount = Array.isArray(habits.value?.todayHabits) ? habits.value.todayHabits.length : null;
        } catch {
          habitSync = "error";
        }
      }

      let nutritionSync = hasHealthGoogleConfig(env) ? "configured" : "not-configured";
      let nutritionFoodCount = null;
      if (hasHealthGoogleConfig(env)) {
        try {
          const nutrition = await fetchHealthNutritionSummary(env);
          nutritionSync = nutrition.status;
          nutritionFoodCount = Array.isArray(nutrition.value?.foods) ? nutrition.value.foods.length : null;
        } catch {
          nutritionSync = "error";
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
        habitSync,
        habitCount,
        habitTodayCount,
        nutritionSync,
        nutritionFoodCount,
        calendarSync,
        calendarError,
        calendarMatchedCount,
        calendarSelectedCount,
        calendarEventCount
      });
    }

    if (url.pathname === "/api/habits") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const date = url.searchParams.get("date") || undefined;
      try {
        const habits = await fetchHabitQuestSummary(env, { date });
        if (!habits.value) return json({ ok: false, code: "HABITQUEST_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: habits.status, ...habits.value });
      } catch (error) {
        console.warn("HabitQuest read failed", String(error?.message || error));
        return json({ ok: false, code: "HABITQUEST_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/habits/toggle") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        return await toggleHabitQuest(request, env);
      } catch (error) {
        console.warn("HabitQuest toggle failed", String(error?.message || error));
        return json({ ok: false, code: "HABITQUEST_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/habits/manage") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        return await manageHabitQuest(request, env);
      } catch (error) {
        const code = String(error?.message || "");
        console.warn("HabitQuest manage failed", code || error);
        if (code === "HABIT_NAME_REQUIRED") {
          return json({ ok: false, code }, 400);
        }
        return json({ ok: false, code: "HABITQUEST_MANAGE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const date = url.searchParams.get("date") || undefined;
      try {
        const nutrition = await fetchHealthNutritionSummary(env, { date });
        if (!nutrition.value) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: nutrition.status, ...nutrition.value });
      } catch (error) {
        console.warn("Nutrition read failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/entry") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveNutritionEntry(request, env); }
      catch (error) {
        console.warn("Nutrition entry write failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/food") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveNutritionFood(request, env); }
      catch (error) {
        console.warn("Nutrition food write failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/energy") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveNutritionEnergy(request, env); }
      catch (error) {
        console.warn("Nutrition energy write failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_ENERGY_WRITE_FAILED" }, 502);
      }
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

      let habitSync = "not-configured";
      if (hasHabitQuestGoogleConfig(env)) {
        try {
          const habits = await fetchHabitQuestSummary(env);
          if (habits.value) state.habitsSummary = habits.value;
          habitSync = habits.status;
        } catch (error) {
          habitSync = "error";
          console.warn("HabitQuest sync failed", String(error?.message || error));
        }
      }

      let nutritionSync = "not-configured";
      if (hasHealthGoogleConfig(env)) {
        try {
          const nutrition = await fetchHealthNutritionSummary(env);
          if (nutrition.value) state.nutritionSummary = nutrition.value;
          nutritionSync = nutrition.status;
        } catch (error) {
          nutritionSync = "error";
          console.warn("Nutrition sync failed", String(error?.message || error));
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
        habitSync,
        nutritionSync,
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
