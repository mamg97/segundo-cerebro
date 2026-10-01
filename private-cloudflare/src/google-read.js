const RETRYABLE_GOOGLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export function isRetryableGoogleReadStatus(status) {
  return RETRYABLE_GOOGLE_STATUSES.has(Number(status));
}

export function retryDelayMs(attempt, retryAfterHeader = null, baseDelayMs = 180) {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(2500, Math.max(0, retryAfter * 1000));
  }
  const ordinal = Math.max(1, Number(attempt) || 1);
  return Math.min(1800, Math.max(0, Number(baseDelayMs) || 0) * ordinal);
}

export async function googleReadFetch(url, options = {}, retryOptions = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return (retryOptions.fetchImpl || fetch)(url, options);
  }

  const attempts = Math.max(1, Number(retryOptions.attempts || 3));
  const fetchImpl = retryOptions.fetchImpl || fetch;
  const sleepImpl = retryOptions.sleepImpl || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const baseDelayMs = Math.max(0, Number(retryOptions.baseDelayMs ?? 180));
  let response = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetchImpl(url, options);
    } catch (error) {
      if (attempt === attempts) throw error;
      await sleepImpl(retryDelayMs(attempt, null, baseDelayMs));
      continue;
    }

    if (response.ok || !isRetryableGoogleReadStatus(response.status) || attempt === attempts) {
      return response;
    }

    await sleepImpl(retryDelayMs(attempt, response.headers?.get?.("Retry-After"), baseDelayMs));
  }

  return response;
}

export async function sheetsBatchGet(spreadsheetId, ranges, token, retryOptions = {}) {
  const normalized = (Array.isArray(ranges) ? ranges : []).filter(Boolean);
  if (!normalized.length) return [];

  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE"
  });
  normalized.forEach((range) => params.append("ranges", range));

  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(String(spreadsheetId)) +
    "/values:batchGet?" +
    params.toString();

  const response = await googleReadFetch(
    endpoint,
    { headers: { Authorization: "Bearer " + token } },
    retryOptions
  );

  if (!response.ok) {
    throw new Error("GOOGLE_SHEETS_BATCH_" + response.status);
  }

  const payload = await response.json();
  const valueRanges = Array.isArray(payload?.valueRanges) ? payload.valueRanges : [];
  return normalized.map((range, index) => ({
    range,
    values: valueRanges[index]?.values || []
  }));
}
