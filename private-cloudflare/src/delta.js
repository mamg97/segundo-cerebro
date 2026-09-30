const CACHE_MS = 5 * 60 * 1000;
let cache = { value: null, expiresAt: 0 };

function parseTableRows(values = []) {
  if (!Array.isArray(values) || !values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function deltaSymbol(value) {
  return String(value || "").split(" (", 1)[0].trim();
}

export function isDeltaSyncAdjustment(row) {
  const note = String(row?.Notes || "");
  return String(row?.["Sync Base Holding"] || "").trim().toLowerCase() === "true" ||
    note.startsWith("SYNC-BASE-HOLDINGS_") ||
    note.includes("Automatically generated transaction to adjust balance");
}

export function normalizeDeltaOperation(row) {
  const way = String(row?.Way || "").trim().toUpperCase();
  const quoteAmount = toNumber(row?.["Quote amount"]);
  const baseAmount = toNumber(row?.["Base amount"]);
  const synthetic = isDeltaSyncAdjustment(row);
  return {
    date: String(row?.Date || "").trim() || null,
    way,
    symbol: deltaSymbol(row?.["Base currency (name)"]),
    asset: String(row?.["Base currency (name)"] || "").trim() || null,
    baseAmount,
    baseType: String(row?.["Base type"] || "").trim() || null,
    quoteAmount,
    quoteCurrency: String(row?.["Quote currency"] || "").trim() || null,
    exchange: String(row?.Exchange || "").trim() || null,
    broker: String(row?.Broker || "").trim() || null,
    feeAmount: toNumber(row?.["Fee amount"]),
    feeCurrency: String(row?.["Fee currency (name)"] || "").trim() || null,
    sentReceivedFrom: String(row?.["Sent/Received from"] || "").trim() || null,
    sentTo: String(row?.["Sent to"] || "").trim() || null,
    notes: String(row?.Notes || "").trim() || null,
    syncBaseHolding: String(row?.["Sync Base Holding"] || "").trim().toLowerCase() === "true",
    leverageMetadata: String(row?.["Leverage Metadata"] || "").trim() || null,
    synthetic,
    operational: !synthetic,
    marketTrade: !synthetic && (way === "BUY" || way === "SELL") && quoteAmount !== null
  };
}

function summaryRowsToObject(rows) {
  const parsed = parseTableRows(rows);
  const metrics = {};
  const years = [];
  const topAssets = [];
  const turnover = [];
  const brokers = [];
  const analysis = [];
  for (const row of parsed) {
    const section = String(row.section || "").trim().toUpperCase();
    const metric = String(row.metric || "").trim();
    const value = row.value ?? null;
    const unit = row.unit || null;
    const note = row.note || null;
    if (!metric) continue;
    if (["IMPORT", "TRADING", "MOVEMENTS"].includes(section)) metrics[metric] = { value, unit, note };
    else if (section === "YEAR") years.push({ year: metric, operations: toNumber(value), note });
    else if (section === "TOP_ASSET") topAssets.push({ symbol: metric, operations: toNumber(value), note });
    else if (section === "TURNOVER") turnover.push({ currency: metric, amount: toNumber(value), unit, note });
    else if (section === "BROKER") brokers.push({ broker: metric, operations: toNumber(value), note });
    else if (section === "ANALYSIS" || section === "DATA_QUALITY") analysis.push({ section, metric, value, unit, note });
  }
  return { metrics, years, topAssets, turnover, brokers, analysis };
}

async function readSheetRange(spreadsheetId, range, token) {
  const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(range) +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("DELTA_SHEETS_" + response.status);
  return (await response.json())?.values || [];
}

async function resolveDeltaSpreadsheetId(env, token) {
  if (!env.FINANCE_SHEET_ID) throw new Error("DELTA_FINANCE_SHEET_MISSING");
  const rows = await readSheetRange(env.FINANCE_SHEET_ID, "IntegracionesPrivadas!A1:D50", token);
  const parsed = parseTableRows(rows);
  const hit = parsed.find((row) => String(row.clave || "").trim() === "DELTA_OPERATIONS_SHEET_ID");
  const id = String(hit?.valor || "").trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error("DELTA_SHEET_ID_MISSING");
  return id;
}

export async function fetchDeltaHistory(env, getGoogleAccessToken, now = Date.now()) {
  if (cache.value && cache.expiresAt > now) return cache.value;
  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveDeltaSpreadsheetId(env, token);
  const [summaryRows, operationRows] = await Promise.all([
    readSheetRange(spreadsheetId, "DeltaResumen!A1:H200", token),
    readSheetRange(spreadsheetId, "Operaciones!A1:P4000", token)
  ]);

  const summary = summaryRowsToObject(summaryRows);
  const operations = parseTableRows(operationRows)
    .map(normalizeDeltaOperation)
    .filter((item) => item.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const value = {
    spreadsheetId,
    summary,
    operations,
    counts: {
      rows: operations.length,
      operational: operations.filter((item) => item.operational).length,
      marketTrades: operations.filter((item) => item.marketTrade).length,
      syncAdjustments: operations.filter((item) => item.synthetic).length
    },
    generatedAt: new Date(now).toISOString()
  };
  cache = { value, expiresAt: now + CACHE_MS };
  return value;
}

export function paginateDeltaOperations(history, options = {}) {
  const kind = options.kind === "all" ? "all" : "trade";
  const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
  const limit = Math.min(200, Math.max(1, Math.floor(Number(options.limit) || 50)));
  const source = kind === "all"
    ? history.operations
    : history.operations.filter((item) => item.marketTrade);
  return {
    kind,
    offset,
    limit,
    total: source.length,
    hasMore: offset + limit < source.length,
    items: source.slice(offset, offset + limit)
  };
}
