export const normalizeAuditValue = (value) => String(value || "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .toLowerCase();

export const hiddenMenuStatus = (status) =>
  /^(omitid[oa]|retirad[oa]|cancelad[oa]|cancelled|skipped)$/.test(normalizeAuditValue(status));

export function logicalMenuKey(item) {
  const identity = item?.recipeId
    ? "recipe:" + normalizeAuditValue(item.recipeId)
    : item?.foodId
      ? "food:" + normalizeAuditValue(item.foodId)
      : "name:" + normalizeAuditValue(item?.name);
  return [normalizeAuditValue(item?.date), normalizeAuditValue(item?.moment || "otro"), identity].join("|");
}

export function visibleMenuRow(item) {
  if (!item || hiddenMenuStatus(item.status)) return false;
  const hasKcal = item.kcal !== null && item.kcal !== undefined && item.kcal !== "";
  const hasProtein = item.protein !== null && item.protein !== undefined && item.protein !== "";
  return !(hasKcal && hasProtein && Number(item.kcal) === 0 && Number(item.protein) === 0);
}


export const consumedMenuStatus = (status) =>
  /^(consumid[oa]|hech[oa]|completad[oa]|done|completed)$/.test(normalizeAuditValue(status));

export function menuDisplayTotals(items, date, today, objective = {}) {
  const rows = Array.isArray(items) ? items : [];
  const useConsumed = String(date || "") <= String(today || "") && rows.some((item) => consumedMenuStatus(item?.status));
  const selected = useConsumed ? rows.filter((item) => consumedMenuStatus(item?.status)) : rows;
  const kcal = selected.reduce((sum, item) => sum + (Number.isFinite(Number(item?.kcal)) ? Number(item.kcal) : 0), 0);
  const protein = selected.reduce((sum, item) => sum + (Number.isFinite(Number(item?.protein)) ? Number(item.protein) : 0), 0);
  return {
    useConsumed,
    kcal,
    protein,
    kcalTarget: Number(objective?.kcal),
    proteinTarget: Number(objective?.protein)
  };
}

export function qualityStep(metric, value, target) {
  const numericValue = Number(value);
  const numericTarget = Number(target);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericTarget) || numericTarget <= 0) return null;
  const ratio = Math.max(0, numericValue / numericTarget);
  let quality;
  if (metric === "kcal") {
    quality = ratio <= 1
      ? (ratio - 0.70) / 0.30
      : 1 - ((ratio - 1) / 0.10);
  } else {
    quality = ratio >= 1 ? 1 : (ratio - 0.70) / 0.30;
  }
  quality = Math.max(0, Math.min(1, quality));
  return {
    width: Math.max(0, Math.min(100, Math.round(ratio * 100))),
    step: Math.max(0, Math.min(10, Math.round(quality * 10)))
  };
}

export function classifyRequestFailure({ url, errorText, auditOrigin }) {
  if (!String(url || "").startsWith(auditOrigin)) return { track: false, ignored: false };
  const path = new URL(url).pathname;
  const error = String(errorText || "unknown");
  if (error === "net::ERR_ABORTED") {
    const critical = new Set(["/api/state", "/api/health", "/api/nutrition"]);
    if (!critical.has(path)) {
      return { track: false, ignored: true, path, errorText: error, reason: "expected-navigation-abort" };
    }
  }
  return { track: true, ignored: false, path, errorText: error };
}


const MIDAS_WORKFLOW_SPECS = [
  { name: "MIDAS paper comparison", weekdays: [1,2,3,4,5], hour: 23, minute: 37, graceHours: 6, activeFrom: "2026-09-28T00:00:00Z" },
  { name: "MIDAS TFM shadow forecasts", weekdays: [1,2,3,4,5], hour: 19, minute: 23, graceHours: 10, activeFrom: "2026-09-28T00:00:00Z" },
  { name: "MIDAS capital cycle paper", weekdays: [1,2,3,4,5], hour: 23, minute: 57, graceHours: 6, activeFrom: "2026-09-30T00:00:00Z" },
  { name: "MIDAS weekly ML paper", weekdays: [5], hour: 23, minute: 17, graceHours: 8, activeFrom: "2026-10-02T00:00:00Z" },
  { name: "MIDAS TFG corrected paper", weekdays: [5], hour: 23, minute: 47, graceHours: 8, activeFrom: "2026-10-02T00:00:00Z" }
];

function latestDueOccurrence(spec, nowMs) {
  const activeFrom = Date.parse(spec.activeFrom);
  if (!Number.isFinite(activeFrom) || nowMs < activeFrom) return null;
  const now = new Date(nowMs);
  for (let offset = 0; offset <= 10; offset += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset, spec.hour, spec.minute));
    if (!spec.weekdays.includes(day.getUTCDay()) || day.getTime() < activeFrom) continue;
    if (nowMs >= day.getTime() + spec.graceHours * 3600_000) return day.getTime();
  }
  return null;
}

export function evaluateMidasWorkflowRuns(runs, now = Date.now()) {
  const list = Array.isArray(runs) ? runs : [];
  const workflows = MIDAS_WORKFLOW_SPECS.map((spec) => {
    const due = latestDueOccurrence(spec, now);
    const scheduled = list
      .filter((run) => run?.name === spec.name && run?.event === "schedule")
      .filter((run) => Number.isFinite(Date.parse(run?.created_at || "")))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const latest = scheduled[0] || null;
    if (due === null) {
      return { name: spec.name, ok: true, state: "not_due_yet", latest };
    }
    if (!latest || Date.parse(latest.created_at) < due) {
      return {
        name: spec.name, ok: false, state: "missing_due_run", latest,
        detail: "no existe ejecución schedule para la última ventana debida"
      };
    }
    if (latest.status !== "completed") {
      return { name: spec.name, ok: true, state: "running", latest };
    }
    if (latest.conclusion !== "success") {
      return {
        name: spec.name, ok: false, state: "failed", latest,
        detail: "última ejecución schedule terminó " + String(latest.conclusion || "sin conclusión")
      };
    }
    return { name: spec.name, ok: true, state: "success", latest };
  });
  return {
    ok: workflows.every((item) => item.ok),
    workflows,
    issues: workflows.filter((item) => !item.ok)
  };
}
