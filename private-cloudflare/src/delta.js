function tableRows(values = []) {
  if (!Array.isArray(values) || !values.length) return [];
  const headers = (values[0] || []).map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function symbolAndName(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s+\((.*)\)$/);
  return match
    ? { ticker: match[1].trim(), assetName: match[2].trim() }
    : { ticker: raw, assetName: "" };
}

function isDeltaAdjustment(row) {
  const sync = String(row["Sync Base Holding"] || "").trim().toLowerCase() === "true";
  const notes = String(row.Notes || "").trim();
  return sync ||
    notes.startsWith("SYNC-BASE-HOLDINGS") ||
    notes.startsWith("Automatically generated transaction to adjust balance");
}

function leverageKind(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("MARGIN_OPEN")) return "MARGIN_OPEN";
  if (raw.startsWith("MARGIN_CLOSE")) return "MARGIN_CLOSE";
  return "OTHER";
}

export function normalizeDeltaSummary(values = [], sourceUrl = null) {
  const rows = tableRows(values);
  const section = (name) => rows.filter((item) => String(item.section || "").trim() === name);
  const findMetric = (name, metric) => {
    const row = section(name).find((item) => String(item.metric || "").trim() === metric);
    return row ? row.value : null;
  };
  const toPairs = (name) => section(name).map((item) => ({
    key: String(item.metric || "").trim(),
    value: numberOrNull(item.value) ?? item.value ?? null,
    unit: item.unit || null,
    note: item.note || null
  })).filter((item) => item.key);

  const summary = {
    rowsTotal: numberOrNull(findMetric("IMPORT", "rows_total")),
    rowsOperational: numberOrNull(findMetric("IMPORT", "rows_operational")),
    adjustments: numberOrNull(findMetric("IMPORT", "sync_adjustments")),
    firstRecord: findMetric("IMPORT", "first_record") || null,
    lastRecord: findMetric("IMPORT", "last_record") || null,
    marketTrades: numberOrNull(findMetric("TRADING", "market_trades")),
    buys: numberOrNull(findMetric("TRADING", "buys")),
    sells: numberOrNull(findMetric("TRADING", "sells")),
    uniqueAssets: numberOrNull(findMetric("TRADING", "unique_assets")),
    activeTradingDays: numberOrNull(findMetric("TRADING", "active_trading_days")),
    leveragedRows: numberOrNull(findMetric("TRADING", "leveraged_rows")),
    firstMarketTrade: findMetric("TRADING", "first_market_trade") || null,
    lastMarketTrade: findMetric("TRADING", "last_market_trade") || null,
    nonTradeMovements: numberOrNull(findMetric("MOVEMENTS", "non_trade_movements")),
    bankLinkedFiatMovements: numberOrNull(findMetric("MOVEMENTS", "bank_linked_fiat_movements"))
  };

  return {
    status: "ok",
    summary,
    assetTypes: toPairs("ASSET_TYPE").map((item) => ({ type: item.key, operations: item.value })),
    years: toPairs("YEAR").map((item) => ({ year: item.key, operations: item.value, note: item.note })),
    turnover: toPairs("TURNOVER").map((item) => ({ currency: item.key, amount: item.value, note: item.note })),
    topAssets: toPairs("TOP_ASSET").map((item) => ({ ticker: item.key, operations: item.value, note: item.note })),
    brokers: toPairs("BROKER").map((item) => ({ broker: item.key, operations: item.value, note: item.note })),
    source: {
      kind: "delta-export",
      url: sourceUrl,
      title: "SEGUNDO CEREBRO - DELTA OPERACIONES HISTORICAS"
    }
  };
}

export function deltaPageRange(totalRows, offset = 0, limit = 100) {
  const total = Math.max(0, Math.floor(Number(totalRows) || 0));
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 100)));
  if (!total || safeOffset >= total) return null;

  const endRow = total + 1 - safeOffset;
  const startRow = Math.max(2, endRow - safeLimit + 1);
  const count = Math.max(0, endRow - startRow + 1);
  return {
    startRow,
    endRow,
    count,
    nextOffset: safeOffset + count,
    hasMore: safeOffset + count < total,
    a1: `A${startRow}:P${endRow}`
  };
}

export function normalizeDeltaOperations(values = []) {
  const rows = tableRows(values);
  return rows.map((row) => {
    const { ticker, assetName } = symbolAndName(row["Base currency (name)"]);
    const baseAmount = numberOrNull(row["Base amount"]);
    const quoteAmount = numberOrNull(row["Quote amount"]);
    const feeAmount = numberOrNull(row["Fee amount"]);
    const adjustment = isDeltaAdjustment(row);
    const marketTrade = ["BUY", "SELL"].includes(String(row.Way || "").trim()) && quoteAmount !== null && !adjustment;
    return {
      timestamp: row.Date || null,
      way: row.Way || null,
      ticker: ticker || null,
      assetName: assetName || null,
      baseAmount,
      baseCurrencyName: row["Base currency (name)"] || null,
      baseType: row["Base type"] || null,
      quoteAmount,
      quoteCurrency: row["Quote currency"] || null,
      impliedPrice: quoteAmount !== null && baseAmount ? quoteAmount / baseAmount : null,
      exchange: row.Exchange || null,
      broker: row.Broker || null,
      from: row["Sent/Received from"] || null,
      to: row["Sent to"] || null,
      feeAmount,
      feeCurrency: row["Fee currency (name)"] || null,
      leverageKind: leverageKind(row["Leverage Metadata"]),
      leverageMetadata: row["Leverage Metadata"] || null,
      adjustment,
      marketTrade,
      notes: row.Notes || null
    };
  }).reverse();
}
