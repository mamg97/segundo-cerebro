import { deduplicateHealthBodySamples } from "./health-body-identity.js";

// D1 remains the automatic source; the manual Sheet provides independent observations.
// The same Zepp/HealthKit instant, even with a different timezone encoding, is
// one measurement, not two data points in the trend.
export function mergeHealthBodySources(d1Samples = [], sheetSamples = []) {
  return deduplicateHealthBodySamples([...d1Samples, ...sheetSamples].filter(
    (sample) => sample && sample.value !== null && sample.value !== undefined && sample.value !== "" && Number.isFinite(Number(sample.value))
  ));
}

export function latestHealthBodyMetric(samples = [], type, endDate, exactDate = false) {
  const matches = samples.filter((sample) =>
    sample?.type === type &&
    sample.value !== null && sample.value !== undefined && sample.value !== "" && Number.isFinite(Number(sample.value)) &&
    (!endDate || (exactDate ? sample.date === endDate : sample.date <= endDate))
  );
  return matches.length
    ? [...matches].sort((a, b) => String(a.measuredAt || "").localeCompare(String(b.measuredAt || ""))).at(-1)
    : null;
}

function dayOffset(date, daysBack) {
  const ts = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(ts) ? new Date(ts - daysBack * 86400000).toISOString().slice(0, 10) : null;
}

export function healthBodyWeightStats(samples = [], endDate) {
  const weights = mergeHealthBodySources(samples).filter((s) =>
    s.type === "bodyMass" && /^\d{4}-\d{2}-\d{2}$/.test(String(s.date || "")) &&
    (!endDate || s.date <= endDate)
  );
  const daily = new Map();
  for (const sample of weights) {
    if (!daily.has(sample.date)) daily.set(sample.date, []);
    daily.get(sample.date).push(Number(sample.value));
  }
  const avg = (from, to) => {
    const dailyMeans = [];
    for (let d = from; d <= to; d += 1) {
      const key = dayOffset(endDate, d);
      const measurements = daily.get(key) || [];
      if (measurements.length) dailyMeans.push(measurements.reduce((a, b) => a + b, 0) / measurements.length);
    }
    return dailyMeans.length ? dailyMeans.reduce((a, b) => a + b, 0) / dailyMeans.length : null;
  };
  const current7d = avg(0, 6);
  const previous7d = avg(7, 13);
  return {
    latest: latestHealthBodyMetric(weights, "bodyMass", endDate)?.value ?? null,
    current7d,
    previous7d,
    weeklyChange: current7d !== null && previous7d !== null ? current7d - previous7d : null
  };
}
