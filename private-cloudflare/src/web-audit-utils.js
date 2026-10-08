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

export function canonicalMenuMoment(item) {
  const raw = String(item?.moment || "Otro").trim() || "Otro";
  const moment = normalizeAuditValue(raw);
  const context = normalizeAuditValue([raw, item?.name || item?.itemName, item?.note].filter(Boolean).join(" "));

  if (/^postre\b/.test(moment)) {
    if (/\b(comida|almuerzo|mediodia)\b/.test(context)) return "Comida";
    return "Cena";
  }

  if (/^snack\b/.test(moment)) {
    if (/\b(media manana|manana)\b/.test(context) && !/\b(despues oficina|tarde|merienda)\b/.test(context)) {
      return "Media mañana";
    }
    return "Merienda";
  }

  if (/^(cena\s*·?\s*complemento|complemento\s+cena)$/.test(moment)) return "Cena";
  if (/^cierre\b/.test(moment)) return "Cena";
  return raw;
}

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

// The production bars track confirmed consumption, not the full planned menu.
// Keep the planned-vs-consumed helper above for other historical callers.
export function confirmedMenuTotals(items) {
  const consumed = (Array.isArray(items) ? items : []).filter((item) => consumedMenuStatus(item?.status));
  return {
    kcal: consumed.reduce((sum, item) => sum + (item?.kcal == null ? 0 : Number(item.kcal) || 0), 0),
    protein: consumed.reduce((sum, item) => sum + (item?.protein == null ? 0 : Number(item.protein) || 0), 0),
    incomplete: consumed.some((item) => item?.kcal == null || item?.protein == null)
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
