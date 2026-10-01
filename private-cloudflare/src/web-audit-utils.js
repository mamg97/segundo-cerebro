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
