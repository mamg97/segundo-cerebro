// A HealthKit instant can arrive as UTC or with a local offset. Its logical
// identity is the instant, metric and source, not the original text format.
export function canonicalHealthTimestamp(value) {
  const date = new Date(String(value || ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function deduplicateHealthBodySamples(samples = []) {
  const byIdentity = new Map();
  for (const sample of samples) {
    const measuredAt = canonicalHealthTimestamp(sample?.measuredAt);
    if (!measuredAt) continue;
    const normalized = { ...sample, measuredAt };
    const key = JSON.stringify([sample.type, measuredAt, sample.source]);
    const previous = byIdentity.get(key);
    if (!previous || String(sample.importedAt || "") >= String(previous.importedAt || "")) {
      byIdentity.set(key, normalized);
    }
  }
  return [...byIdentity.values()].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}
