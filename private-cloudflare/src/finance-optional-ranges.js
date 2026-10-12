// One Google Sheets batch request for independent derived Finance tabs.
// A failed batch is never silently represented as thirteen empty tables.
export class FinanceOptionalSourceError extends Error {
  constructor(code) {
    super(code);
    this.name = "FinanceOptionalSourceError";
    this.code = code;
  }
}

export async function readFinanceOptionalRanges({
  spreadsheetId,
  token,
  ranges,
  fetcher = fetch,
  missingTabFallback
}) {
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE"
  });
  for (const range of ranges) params.append("ranges", range);
  const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) + "/values:batchGet?" + params;
  const response = await fetcher(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if ((response.status === 400 || response.status === 404) &&
      typeof missingTabFallback === "function") {
    // Compatibility with older derived Sheets which omit optional tabs.
    return Promise.all(ranges.map((range) => missingTabFallback(range)));
  }
  if (!response.ok) {
    throw new FinanceOptionalSourceError(
      response.status === 401 || response.status === 403
        ? "FINANCE_OPTIONAL_AUTH"
        : "FINANCE_OPTIONAL_UPSTREAM"
    );
  }
  let valueRanges;
  try {
    valueRanges = (await response.json())?.valueRanges;
  } catch {
    throw new FinanceOptionalSourceError("FINANCE_OPTIONAL_CONTRACT");
  }
  if (!Array.isArray(valueRanges) || valueRanges.length !== ranges.length ||
      valueRanges.some((range) => !range || (range.values != null && !Array.isArray(range.values)))) {
    throw new FinanceOptionalSourceError("FINANCE_OPTIONAL_CONTRACT");
  }
  return valueRanges.map((range) => range.values || []);
}
