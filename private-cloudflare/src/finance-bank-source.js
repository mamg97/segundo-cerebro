// Dedicated, read-only lookup of the two canonical bank workspace ranges.
// The full finance summary loads many unrelated tabs; a failed optional range
// must not be represented as a successful, empty transaction history.
export class FinanceBankSourceError extends Error {
  constructor(code) {
    super(code);
    this.name = "FinanceBankSourceError";
    this.code = code;
  }
}

function sourceErrorCode(status) {
  if (status === 401 || status === 403) return "FINANCE_BANK_SOURCE_AUTH";
  if (status === 429 || status >= 500) return "FINANCE_BANK_SOURCE_UPSTREAM";
  return "FINANCE_BANK_SOURCE_READ";
}

export async function readFinanceBankSource(env, getAccessToken, fetcher = fetch) {
  const token = await getAccessToken(env);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE"
  });
  params.append("ranges", "Cuentas!A1:J200");
  params.append("ranges", "MovimientosCuenta!A1:M5000");
  const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(env.FINANCE_SHEET_ID) + "/values:batchGet?" + params.toString();

  const response = await fetcher(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new FinanceBankSourceError(sourceErrorCode(response.status));

  let valueRanges;
  try {
    valueRanges = (await response.json())?.valueRanges;
  } catch {
    throw new FinanceBankSourceError("FINANCE_BANK_SOURCE_CONTRACT");
  }
  if (!Array.isArray(valueRanges) || valueRanges.length !== 2 ||
      !valueRanges.every((range) => range && Array.isArray(range.values))) {
    // An empty tab can legitimately have no values; its range entry must still
    // be present, so an omitted or truncated upstream result cannot masquerade
    // as a valid zero-row source.
    if (Array.isArray(valueRanges) && valueRanges.length === 2 &&
        valueRanges.every((range) => range && (range.values == null || Array.isArray(range.values)))) {
      return {
        accountRows: valueRanges[0].values || [],
        movementRows: valueRanges[1].values || []
      };
    }
    throw new FinanceBankSourceError("FINANCE_BANK_SOURCE_CONTRACT");
  }
  return {
    accountRows: valueRanges[0].values,
    movementRows: valueRanges[1].values
  };
}
