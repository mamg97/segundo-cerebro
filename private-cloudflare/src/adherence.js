const CACHE_MS = 30000;

const RULES = Object.freeze({
  nutritionMinimumCoverage: 0.55,
  kcalPassLow: 0.90,
  kcalPassHigh: 1.10,
  kcalPartialLow: 0.80,
  kcalPartialHigh: 1.20,
  proteinPassRatio: 0.94,
  proteinPartialRatio: 0.75,
  stepsPartialRatio: 0.70,
  habitsPassRatio: 0.80,
  habitsPartialRatio: 0.50,
  minimumJudgedDimensions: 2,
  fulfilledScore: 0.76,
  failedScore: 0.40
});

let cache = { key: null, value: null, expiresAt: 0 };

function table(values) {
  values = values || [];
  if (!values.length) return [];
  const headers = values[0].map(function (value) { return String(value == null ? "" : value).trim(); });
  return values.slice(1)
    .filter(function (row) { return row.some(function (value) { return value !== "" && value !== null && value !== undefined; }); })
    .map(function (row) {
      return Object.fromEntries(headers.map(function (header, index) { return [header, row[index] == null ? null : row[index]]; }));
    });
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function monthBounds(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return null;
  const parts = String(month).split("-").map(Number);
  const year = parts[0];
  const monthNumber = parts[1];
  if (monthNumber < 1 || monthNumber > 12) return null;
  const start = year + "-" + String(monthNumber).padStart(2, "0") + "-01";
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const end = year + "-" + String(monthNumber).padStart(2, "0") + "-" + String(last).padStart(2, "0");
  return { year: year, monthNumber: monthNumber, start: start, end: end, days: last };
}

function dateKey(year, monthNumber, day) {
  return year + "-" + String(monthNumber).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function weekday(date) {
  return new Date(String(date) + "T12:00:00Z").getUTCDay();
}

function sumConsumed(rows) {
  return (rows || [])
    .filter(function (row) { return String(row.estado || "consumido").toLowerCase() !== "planificado"; })
    .reduce(function (acc, row) {
      acc.kcal += numberOrNull(row.kcal) || 0;
      acc.protein += numberOrNull(row.proteinas_g) || 0;
      acc.carbs += numberOrNull(row.carbohidratos_g) || 0;
      acc.fat += numberOrNull(row.grasas_g) || 0;
      acc.count += 1;
      acc.moments.add(String(row.momento || "Otro"));
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0, moments: new Set() });
}

function effectiveRow(rows, date, dateField) {
  dateField = dateField || "effective_date";
  return (rows || [])
    .filter(function (row) {
      const key = String((row && row[dateField]) || "").trim();
      const active = String(row && row.active !== undefined ? row.active : "TRUE").toUpperCase() !== "FALSE";
      return /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= date && active;
    })
    .sort(function (a, b) { return String(b[dateField]).localeCompare(String(a[dateField])); })[0] || null;
}

function normalizeManualStatus(value) {
  const status = String(value || "").trim().toUpperCase().replace(/\s+/g, "_");
  return ["CUMPLIDO", "PARCIAL", "NO_CUMPLIDO", "SIN_DATOS"].includes(status) ? status : null;
}

function dim(key, label, state, actual, target, note) {
  return {
    key: key,
    label: label,
    state: state,
    actual: actual == null ? null : actual,
    target: target == null ? null : target,
    note: note || null
  };
}

function scoreState(state) {
  if (state === "pass") return 1;
  if (state === "partial") return 0.55;
  if (state === "fail") return 0;
  return null;
}

function evaluateDay(input) {
  const date = input.date;
  const today = input.today;
  const consumed = input.consumed;
  const nutritionGoal = input.nutritionGoal;
  const activityGoal = input.activityGoal;
  const energy = input.energy;
  const gymSessions = input.gymSessions || [];
  const gymPlanned = input.gymPlanned || null;
  const habitStats = input.habitStats || null;
  const manual = input.manual || null;

  if (date > today) {
    return {
      date: date,
      status: "FUTURO",
      score: null,
      manual: false,
      reasons: [],
      dimensions: [],
      details: { consumed: consumed, energy: energy, gymSessions: gymSessions, gymPlanned: gymPlanned, habitStats: habitStats }
    };
  }

  const dimensions = [];
  const reasons = [];
  const targetKcal = numberOrNull(nutritionGoal && nutritionGoal.target_kcal);
  const targetProtein = numberOrNull(nutritionGoal && nutritionGoal.target_protein_g);
  const nutritionCoverage = targetKcal && targetKcal > 0 ? consumed.kcal / targetKcal : null;
  const nutritionComplete = consumed.count > 0 && targetKcal !== null && nutritionCoverage >= RULES.nutritionMinimumCoverage;

  if (targetKcal === null) {
    dimensions.push(dim("kcal", "Nutrición kcal", "unknown", consumed.kcal || null, null, "Objetivo no definido para esta fecha"));
  } else if (!nutritionComplete) {
    dimensions.push(dim("kcal", "Nutrición kcal", "unknown", consumed.kcal || null, targetKcal, consumed.count ? "Registro insuficiente para juzgar el día completo" : "Sin ingestas registradas"));
    reasons.push(consumed.count ? "Registro nutricional incompleto" : "Sin ingestas registradas");
  } else {
    const ratio = consumed.kcal / targetKcal;
    const state = ratio >= RULES.kcalPassLow && ratio <= RULES.kcalPassHigh
      ? "pass"
      : ratio >= RULES.kcalPartialLow && ratio <= RULES.kcalPartialHigh
        ? "partial"
        : "fail";
    dimensions.push(dim("kcal", "Nutrición kcal", state, consumed.kcal, targetKcal, null));
    if (state === "partial") reasons.push("Calorías algo fuera del rango objetivo");
    if (state === "fail") reasons.push("Calorías claramente fuera del rango objetivo");
  }

  if (targetProtein === null) {
    dimensions.push(dim("protein", "Proteína", "unknown", consumed.protein || null, null, "Objetivo no definido para esta fecha"));
  } else if (!nutritionComplete) {
    dimensions.push(dim("protein", "Proteína", "unknown", consumed.protein || null, targetProtein, "Registro nutricional incompleto"));
  } else {
    const ratio = consumed.protein / targetProtein;
    const state = ratio >= RULES.proteinPassRatio ? "pass" : ratio >= RULES.proteinPartialRatio ? "partial" : "fail";
    dimensions.push(dim("protein", "Proteína", state, consumed.protein, targetProtein, null));
    if (state === "partial") reasons.push("Proteína por debajo del objetivo");
    if (state === "fail") reasons.push("Proteína claramente insuficiente");
  }

  const steps = numberOrNull(energy && energy.steps);
  const stepsFloor = numberOrNull(activityGoal && activityGoal.steps_floor);
  const stepsTarget = numberOrNull(activityGoal && activityGoal.steps_target);
  const stepReference = stepsFloor !== null ? stepsFloor : stepsTarget;
  if (stepReference === null) {
    dimensions.push(dim("steps", "Pasos", "unknown", steps, null, "Objetivo de pasos no definido"));
  } else if (steps === null) {
    dimensions.push(dim("steps", "Pasos", "unknown", null, stepReference, "Sin datos de actividad"));
    reasons.push("Sin datos de pasos");
  } else {
    const state = steps >= stepReference ? "pass" : steps >= stepReference * RULES.stepsPartialRatio ? "partial" : "fail";
    dimensions.push(dim("steps", "Pasos", state, steps, stepReference, stepsTarget && steps >= stepsTarget ? "Objetivo de pasos alcanzado" : null));
    if (state === "partial") reasons.push("Pasos por debajo del suelo diario");
    if (state === "fail") reasons.push("Actividad diaria baja");
  }

  const workoutCount = Math.max(Number(energy && energy.workoutCount || 0), gymSessions.length);
  if (gymPlanned) {
    const state = workoutCount > 0 ? "pass" : "fail";
    dimensions.push(dim("gym", "Entreno", state, workoutCount, 1, gymPlanned));
    if (state === "fail") reasons.push("Falta entrenamiento en día previsto");
  } else if (workoutCount > 0) {
    dimensions.push(dim("gym", "Entreno", "pass", workoutCount, null, "Entreno realizado sin obligación diaria explícita"));
  } else {
    dimensions.push(dim("gym", "Entreno", "ignored", 0, null, "No había sesión diaria explícitamente programada"));
  }

  if (habitStats && habitStats.scheduled > 0) {
    const habitRatio = habitStats.done / habitStats.scheduled;
    const state = habitRatio >= RULES.habitsPassRatio ? "pass" : habitRatio >= RULES.habitsPartialRatio ? "partial" : "fail";
    dimensions.push(dim("habits", "Hábitos", state, habitStats.done, habitStats.scheduled, Math.round(habitRatio * 100) + "% completado"));
    if (state === "partial") reasons.push("Hábitos parcialmente completados");
    if (state === "fail") reasons.push("Pocos hábitos completados");
  } else if (habitStats && habitStats.available) {
    dimensions.push(dim("habits", "Hábitos", "ignored", 0, 0, "Sin hábitos programados"));
  } else {
    dimensions.push(dim("habits", "Hábitos", "unknown", null, null, "Fuente de hábitos no disponible"));
  }

  if (manual && manual.status) {
    const manualScore = manual.status === "CUMPLIDO" ? 1 : manual.status === "PARCIAL" ? 0.5 : manual.status === "NO_CUMPLIDO" ? 0 : null;
    return {
      date: date,
      status: manual.status,
      score: manualScore,
      manual: true,
      reasons: [manual.reason || "Estado indicado manualmente"],
      dimensions: dimensions,
      details: { consumed: consumed, energy: energy, gymSessions: gymSessions, gymPlanned: gymPlanned, habitStats: habitStats }
    };
  }

  const judged = dimensions.filter(function (item) { return ["pass", "partial", "fail"].includes(item.state); });
  if (judged.length < RULES.minimumJudgedDimensions) {
    return {
      date: date,
      status: "SIN_DATOS",
      score: null,
      manual: false,
      reasons: reasons.length ? Array.from(new Set(reasons)) : ["No hay suficiente información para juzgar el día"],
      dimensions: dimensions,
      details: { consumed: consumed, energy: energy, gymSessions: gymSessions, gymPlanned: gymPlanned, habitStats: habitStats }
    };
  }

  const weights = { kcal: 0.30, protein: 0.25, steps: 0.25, gym: 0.10, habits: 0.10 };
  let weightSum = 0;
  let weighted = 0;
  let failures = 0;
  judged.forEach(function (item) {
    const weight = weights[item.key] || 0.10;
    weighted += scoreState(item.state) * weight;
    weightSum += weight;
    if (item.state === "fail") failures += 1;
  });
  const score = weightSum ? weighted / weightSum : null;
  let status = "PARCIAL";
  if (failures === 0 && score >= RULES.fulfilledScore) status = "CUMPLIDO";
  else if ((failures >= 2 && score < 0.50) || score < RULES.failedScore) status = "NO_CUMPLIDO";

  if (!reasons.length && status === "CUMPLIDO") reasons.push("Objetivos principales razonablemente cubiertos");
  if (!reasons.length && status === "PARCIAL") reasons.push("Cumplimiento mixto entre las dimensiones disponibles");
  if (!reasons.length && status === "NO_CUMPLIDO") reasons.push("Varias dimensiones principales quedaron lejos del objetivo");

  return {
    date: date,
    status: status,
    score: score,
    manual: false,
    reasons: Array.from(new Set(reasons)),
    dimensions: dimensions,
    details: { consumed: consumed, energy: energy, gymSessions: gymSessions, gymPlanned: gymPlanned, habitStats: habitStats }
  };
}

function summarize(days, today) {
  const elapsed = days.filter(function (day) { return day.date <= today && day.status !== "FUTURO"; });
  const known = elapsed.filter(function (day) { return ["CUMPLIDO", "PARCIAL", "NO_CUMPLIDO"].includes(day.status); });
  const fulfilled = known.filter(function (day) { return day.status === "CUMPLIDO"; }).length;
  const partial = known.filter(function (day) { return day.status === "PARCIAL"; }).length;
  const failed = known.filter(function (day) { return day.status === "NO_CUMPLIDO"; }).length;
  const noData = elapsed.filter(function (day) { return day.status === "SIN_DATOS"; }).length;
  const adherencePct = known.length
    ? Math.round((known.reduce(function (sum, day) { return sum + (day.status === "CUMPLIDO" ? 1 : day.status === "PARCIAL" ? 0.5 : 0); }, 0) / known.length) * 100)
    : null;

  let currentStreak = 0;
  const past = elapsed.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  for (const day of past) {
    if (day.status === "CUMPLIDO") currentStreak += 1;
    else break;
  }

  let bestStreak = 0;
  let run = 0;
  elapsed.forEach(function (day) {
    if (day.status === "CUMPLIDO") {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  });

  function segmentScore(predicate) {
    const items = known.filter(predicate);
    if (!items.length) return null;
    return Math.round((items.reduce(function (sum, day) { return sum + (day.status === "CUMPLIDO" ? 1 : day.status === "PARCIAL" ? 0.5 : 0); }, 0) / items.length) * 100);
  }

  return {
    fulfilled: fulfilled,
    partial: partial,
    failed: failed,
    noData: noData,
    adherencePct: adherencePct,
    coveragePct: elapsed.length ? Math.round((known.length / elapsed.length) * 100) : null,
    currentStreak: currentStreak,
    bestStreak: bestStreak,
    weekdayAdherencePct: segmentScore(function (day) { return !day.weekend; }),
    weekendAdherencePct: segmentScore(function (day) { return day.weekend; }),
    evaluatedDays: known.length,
    elapsedDays: elapsed.length
  };
}

async function readHealthTables(env, token) {
  const ranges = [
    "Registro!A1:N6000",
    "Objetivos!A1:H500",
    "EnergiaDiaria!A1:M2000",
    "ObjetivosActividad!A1:R500",
    "MenuSemanal!A1:P2000",
    "AdherenciaManual!A1:E2000"
  ];
  const params = new URLSearchParams();
  ranges.forEach(function (range) { params.append("ranges", range); });
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");
  const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(env.HEALTH_SHEET_ID) + "/values:batchGet?" + params.toString();
  const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("HEALTH_ADHERENCE_SHEETS_" + response.status);
  const payload = await response.json();
  const values = payload.valueRanges || [];
  return {
    register: table(values[0] && values[0].values || []),
    objectives: table(values[1] && values[1].values || []),
    sheetEnergy: table(values[2] && values[2].values || []),
    activityObjectives: table(values[3] && values[3].values || []),
    menu: table(values[4] && values[4].values || []),
    manual: table(values[5] && values[5].values || [])
  };
}

async function readD1Activity(env, start, end) {
  try {
    const sql = "SELECT energy_date, active_kcal, resting_kcal, total_kcal, steps, exercise_minutes, workout_count, workouts_json, source, sampled_at " +
      "FROM health_energy_daily WHERE energy_date BETWEEN ? AND ? ORDER BY energy_date ASC";
    const result = await env.DB.prepare(sql).bind(start, end).all();
    return new Map((result.results || []).map(function (row) {
      let workouts = [];
      try { workouts = row.workouts_json ? JSON.parse(row.workouts_json) : []; } catch {}
      return [row.energy_date, {
        date: row.energy_date,
        activeKcal: numberOrNull(row.active_kcal),
        restingKcal: numberOrNull(row.resting_kcal),
        totalKcal: numberOrNull(row.total_kcal),
        steps: numberOrNull(row.steps),
        exerciseMinutes: numberOrNull(row.exercise_minutes),
        workoutCount: numberOrNull(row.workout_count),
        workouts: workouts,
        source: row.source || "d1",
        sampledAt: row.sampled_at || null
      }];
    }));
  } catch {
    return new Map();
  }
}

async function readGymSessions(env, start, end) {
  try {
    const sql = "SELECT id, session_date, day_id, day_title, notes, created_at FROM gym_sessions " +
      "WHERE session_date BETWEEN ? AND ? ORDER BY session_date ASC, created_at ASC";
    const result = await env.DB.prepare(sql).bind(start, end).all();
    const map = new Map();
    (result.results || []).forEach(function (row) {
      if (!map.has(row.session_date)) map.set(row.session_date, []);
      map.get(row.session_date).push({
        id: row.id,
        dayId: row.day_id,
        dayTitle: row.day_title,
        notes: row.notes,
        createdAt: row.created_at
      });
    });
    return map;
  } catch {
    return new Map();
  }
}

async function readHabitMonth(env, token, start, end) {
  if (!env.HABITQUEST_SHEET_ID) return new Map();
  try {
    const ranges = ["Habits!A1:M1200", "History!A1:F6000", "SyncState!A1:D6000"];
    const params = new URLSearchParams();
    ranges.forEach(function (range) { params.append("ranges", range); });
    params.set("majorDimension", "ROWS");
    params.set("valueRenderOption", "UNFORMATTED_VALUE");
    const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(env.HABITQUEST_SHEET_ID) + "/values:batchGet?" + params.toString();
    const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
    if (!response.ok) return new Map();
    const payload = await response.json();
    const values = payload.valueRanges || [];

    const habits = table(values[0] && values[0].values || []).map(function (row) {
      return {
        id: String(row.id || "").trim(),
        frequency: String(row.frequency || "daily"),
        days: String(row.days || "").split(/[,;\s]+/).map(Number).filter(function (day) { return Number.isInteger(day) && day >= 0 && day <= 6; }),
        timesPerDay: Math.max(1, Number(row.timesPerDay) || 1),
        active: String(row.active || "yes").toLowerCase() !== "no"
      };
    }).filter(function (habit) { return habit.id && habit.active; });

    const history = table(values[1] && values[1].values || []).map(function (row) {
      return { habitId: String(row.habitId || "").trim(), date: String(row.date || "").trim(), at: String(row.at || "").trim() };
    }).filter(function (row) { return row.habitId && row.date >= start && row.date <= end; });

    const sync = table(values[2] && values[2].values || []).map(function (row) {
      return {
        habitId: String(row.habitId || "").trim(),
        date: String(row.date || "").trim(),
        count: Math.max(0, Math.floor(Number(row.count) || 0)),
        updatedAt: String(row.updatedAt || "").trim()
      };
    }).filter(function (row) { return row.habitId && row.date >= start && row.date <= end && row.updatedAt; });

    const stateMap = new Map();
    history.forEach(function (item) {
      const key = item.habitId + "|" + item.date;
      const existing = stateMap.get(key) || { count: 0, updatedAt: item.at || item.date + "T12:00:00.000Z" };
      existing.count += 1;
      const timestamp = item.at || item.date + "T12:00:00.000Z";
      if (timestamp > existing.updatedAt) existing.updatedAt = timestamp;
      stateMap.set(key, existing);
    });
    sync.forEach(function (item) {
      const key = item.habitId + "|" + item.date;
      const previous = stateMap.get(key);
      if (!previous || item.updatedAt >= previous.updatedAt) stateMap.set(key, item);
    });

    function scheduled(habit, date) {
      const day = weekday(date);
      if (habit.frequency === "daily") return true;
      if (habit.frequency === "weekdays") return day >= 1 && day <= 5;
      return habit.days.includes(day);
    }

    const result = new Map();
    let cursor = new Date(start + "T12:00:00Z");
    const finish = new Date(end + "T12:00:00Z");
    while (cursor <= finish) {
      const date = cursor.toISOString().slice(0, 10);
      const due = habits.filter(function (habit) { return scheduled(habit, date); });
      const done = due.filter(function (habit) {
        return Number((stateMap.get(habit.id + "|" + date) || {}).count || 0) >= habit.timesPerDay;
      }).length;
      result.set(date, { available: true, scheduled: due.length, done: done });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  } catch {
    return new Map();
  }
}

export async function fetchHealthAdherence(env, getGoogleAccessToken, options) {
  options = options || {};
  if (!env.HEALTH_SHEET_ID || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    return { status: "not-configured", value: null };
  }

  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(options.today || ""))
    ? String(options.today)
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const month = /^\d{4}-\d{2}$/.test(String(options.month || "")) ? String(options.month) : today.slice(0, 7);
  const bounds = monthBounds(month);
  if (!bounds) throw new Error("INVALID_ADHERENCE_MONTH");

  const cacheKey = month + "|" + today;
  if (!options.force && cache.key === cacheKey && cache.value && cache.expiresAt > Date.now()) {
    return { status: "ok-cache", value: cache.value };
  }

  const token = await getGoogleAccessToken(env);
  const results = await Promise.all([
    readHealthTables(env, token),
    readD1Activity(env, bounds.start, bounds.end),
    readGymSessions(env, bounds.start, bounds.end),
    readHabitMonth(env, token, bounds.start, bounds.end)
  ]);
  const health = results[0];
  const d1Activity = results[1];
  const gymByDate = results[2];
  const habitsByDate = results[3];

  const sheetEnergy = new Map();
  health.sheetEnergy.forEach(function (row) {
    const date = String(row.fecha || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let workouts = [];
    try { workouts = row.workouts_json ? JSON.parse(row.workouts_json) : []; } catch {}
    sheetEnergy.set(date, {
      date: date,
      activeKcal: numberOrNull(row.active_kcal),
      restingKcal: numberOrNull(row.resting_kcal),
      totalKcal: numberOrNull(row.total_kcal),
      steps: numberOrNull(row.steps),
      exerciseMinutes: numberOrNull(row.exercise_minutes),
      workoutCount: numberOrNull(row.workout_count),
      workouts: workouts,
      source: row.fuente || "health_sheet"
    });
  });

  const registerByDate = new Map();
  health.register.forEach(function (row) {
    const date = String(row.fecha || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (!registerByDate.has(date)) registerByDate.set(date, []);
    registerByDate.get(date).push(row);
  });

  const menuByDate = new Map();
  health.menu.forEach(function (row) {
    const date = String(row.fecha || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (!menuByDate.has(date)) menuByDate.set(date, []);
    menuByDate.get(date).push(row);
  });

  const manualByDate = new Map();
  health.manual.forEach(function (row) {
    const date = String(row.fecha || "").trim();
    const status = normalizeManualStatus(row.estado);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !status) return;
    const updatedAt = String(row.updated_at || "");
    const previous = manualByDate.get(date);
    if (!previous || updatedAt >= previous.updatedAt) {
      manualByDate.set(date, {
        status: status,
        reason: String(row.motivo || "").trim() || null,
        source: String(row.fuente || "manual").trim() || "manual",
        updatedAt: updatedAt
      });
    }
  });

  const days = [];
  for (let day = 1; day <= bounds.days; day += 1) {
    const date = dateKey(bounds.year, bounds.monthNumber, day);
    const consumed = sumConsumed(registerByDate.get(date) || []);
    const nutritionGoal = effectiveRow(health.objectives, date);
    const activityGoal = effectiveRow(health.activityObjectives, date);
    const energy = d1Activity.get(date) || sheetEnergy.get(date) || null;
    const gymSessions = gymByDate.get(date) || [];
    const menuRows = menuByDate.get(date) || [];
    const planned = menuRows.map(function (row) { return String(row.sesion_gym || "").trim(); }).find(Boolean) || null;
    const habitStats = habitsByDate.get(date) || { available: habitsByDate.size > 0, scheduled: 0, done: 0 };
    const evaluated = evaluateDay({
      date: date,
      today: today,
      consumed: consumed,
      nutritionGoal: nutritionGoal,
      activityGoal: activityGoal,
      energy: energy,
      gymSessions: gymSessions,
      gymPlanned: planned,
      habitStats: habitStats,
      manual: manualByDate.get(date) || null
    });
    evaluated.day = day;
    evaluated.weekday = weekday(date);
    evaluated.weekend = [0, 6].includes(evaluated.weekday);
    evaluated.target = {
      kcal: numberOrNull(nutritionGoal && nutritionGoal.target_kcal),
      protein: numberOrNull(nutritionGoal && nutritionGoal.target_protein_g),
      stepsFloor: numberOrNull(activityGoal && activityGoal.steps_floor),
      stepsTarget: numberOrNull(activityGoal && activityGoal.steps_target)
    };
    days.push(evaluated);
  }

  const value = {
    month: month,
    today: today,
    rulesVersion: "1.0",
    summary: summarize(days, today),
    days: days,
    source: {
      health: "SEGUNDO CEREBRO - SALUD",
      activity: "Apple Health / D1 with Sheet fallback",
      gym: "D1 gym_sessions",
      habits: habitsByDate.size ? "HabitQuest" : null,
      manualOverrides: "AdherenciaManual"
    },
    policy: {
      adherenceFormula: "Cumplido=1 · Parcial=0,5 · No cumplido=0 · Sin datos excluido",
      futureDaysExcluded: true,
      manualOverrideWins: true,
      thresholds: RULES
    }
  };

  cache = { key: cacheKey, value: value, expiresAt: Date.now() + CACHE_MS };
  return { status: "ok-live", value: value };
}
