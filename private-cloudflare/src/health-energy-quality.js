// Pure, privacy-preserving selection of daily Apple Health energy snapshots.
// Prefer complete observations to partial ones regardless of which private store holds them.

const COVERAGE = new Set(["full", "live", "partial", "low", "no_watch", "phone_only", "unknown"]);

export function healthCoverageQuality(row) {
  const details = Array.isArray(row?.sourceDetails) ? row.sourceDetails : [];
  for (const detail of details) {
    if (detail && typeof detail === "object" && detail.kind === "coverage") {
      const quality = String(detail.quality || "").toLowerCase();
      if (COVERAGE.has(quality)) return quality;
    }
    if (typeof detail === "string") {
      const match = detail.match(/(?:^|[;,\\s])coverage\\s*=\\s*([a-z_]+)/i);
      if (match && COVERAGE.has(match[1].toLowerCase())) return match[1].toLowerCase();
    }
  }
  const note = String(row?.note || "");
  if (/cobertura[^.]*parcial|día en curso, no usar como cierre/i.test(note)) return "partial";
  const source = String(row?.source || "");
  if (source.includes("history_partial") || source.includes("export_partial")) return "partial";
  if (source.includes("export_watch") || source.includes("export_recovery")) return "full";
  if (source.includes("export_phone")) return "phone_only";
  if (source.includes("screenshot")) return "unknown";
  if (source.includes("apple_health")) return "live";
  return "unknown";
}

export function isHealthEnergyComparable(row) {
  return ["full", "live"].includes(healthCoverageQuality(row));
}

export function selectHealthEnergyRow(d1, sheet) {
  if (!d1) return sheet || null;
  if (!sheet) return d1;
  const d1Comparable = isHealthEnergyComparable(d1);
  const sheetComparable = isHealthEnergyComparable(sheet);
  if (sheetComparable && !d1Comparable) return sheet;
  if (d1Comparable && !sheetComparable) return d1;
  // Preserve the existing recency rule for recovered Apple Health exports.
  if (String(sheet.source || "") === "apple_health_export_recovery") {
    if (
      String(d1.source || "") !== "apple_health_export_recovery" ||
      !d1.importedAt ||
      String(sheet.importedAt || "") >= String(d1.importedAt || "")
    ) return sheet;
  }
  return d1;
}
