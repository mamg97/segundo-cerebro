// Public paper telemetry only. No private financial data or credentials enter this contract.
const CONSUMERS = ["classic_sp500", "buy_the_dip_strategy", "capital_cycle", "weekly_ml_daily", "timesfm_daily", "timesfm_one_day"];
const HASH = /^[a-f0-9]{64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const BOOKS = [9, 1, 1, 9, 2, 2];
const utc = value => typeof value === "string" && /(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value));
const SYMBOL = /^[A-Z0-9.^=-]{1,20}$/;
const ROOT = "https://raw.githubusercontent.com/mamg97/midas-paper-lab/main/market_data/snapshots/XNYS/";
const count = value => Number.isInteger(value) && value >= 0 && value <= 10000;

export function normalizeMidasSourceHealth(data, now = Date.now(), observedSession = null) {
  const unavailable = { status: "unavailable", overall: "unknown", source_ok: false,
    consumers_ok: false, scheduled_proof: false, hash_verification: "not_checked", issues: ["source_health_missing"] };
  if (!data) return unavailable;
  const invalid = code => ({ ...unavailable, status: "invalid", overall: "attention", issues: [code] });
  if (data.schema !== "midas.xnys_source_health.v1" || data.market !== "XNYS" ||
      !DAY.test(data.expected_session || "") || !HASH.test(data.sha256 || "") ||
      !HASH.test(data.effective_sha256 || "") || !Array.isArray(data.revision_hashes) ||
      data.revision_hashes.length > 64 || data.revision_hashes.some(x => !HASH.test(x)) ||
      new Set(data.revision_hashes).size !== data.revision_hashes.length ||
      data.effective_sha256 !== (data.revision_hashes.at(-1) || data.sha256)) return invalid("source_identity_invalid");
  const coverage = data.coverage;
  const missing = data.missing_symbols;
  if (!coverage || coverage.requested !== 504 || !count(coverage.observed) || !count(coverage.missing) ||
      coverage.observed + coverage.missing !== 504 || !count(coverage.frozen_constituents_observed) ||
      coverage.frozen_constituents_observed > 503 || ![0, 1].includes(coverage.observed - coverage.frozen_constituents_observed) ||
      !Array.isArray(missing) || missing.length !== coverage.missing || new Set(missing).size !== missing.length ||
      missing.some(s => typeof s !== "string" || !SYMBOL.test(s))) return invalid("source_coverage_invalid");
  const captured = Date.parse(data.captured_at_utc);
  if (!utc(data.captured_at_utc) || !utc(data.checked_at_utc) ||
      !/^\d{1,16}$/.test(String(data.run_id || "")) ||
      !["schedule", "workflow_dispatch"].includes(data.trigger_event) ||
      Date.parse(data.checked_at_utc) < captured || Date.parse(data.checked_at_utc) > now ||
      data.expected_session > new Date(now).toISOString().slice(0, 10) || captured > now || now - captured > 96 * 3600000) return invalid("source_capture_stale_or_future");
  if (observedSession && data.expected_session !== observedSession) return invalid("source_diary_session_mismatch");
  const issues = [];
  const sourceOk = data.status === "snapshot_verified" && coverage.frozen_constituents_observed >= 453;
  if (!sourceOk) issues.push("source_unverified_or_outage");
  const consumers = {};
  for (const [index, name] of CONSUMERS.entries()) {
    const item = data.consumers?.[name];
    if (!item || item.ledger_status !== "observed" || !count(item.updated_books) || !count(item.paused_books) ||
        !["success", "failure", "cancelled", "skipped", "not_observed"].includes(item.workflow_outcome)) {
      issues.push("consumer_telemetry_missing");
      consumers[name] = { status: "unknown", updated_books: null, paused_books: null };
      continue;
    }
    const total = item.updated_books + item.paused_books;
    const dates = Object.values(item.valuation_sessions || {});
    const ok = total === BOOKS[index] && dates.length === total && dates.every(d => DAY.test(d || "")) &&
      item.workflow_outcome === "success" && item.paused_books === 0 && dates.every(d => d === data.expected_session);
    if (!ok) issues.push("consumer_failed_paused_or_stale");
    consumers[name] = { status: ok ? "current" : "attention", workflow_outcome: item.workflow_outcome,
      updated_books: item.updated_books, paused_books: item.paused_books };
  }
  return { schema: data.schema, market: "XNYS", status: "available",
    overall: !sourceOk || issues.length ? "attention" : coverage.missing ? "partial" : "healthy",
    source_ok: sourceOk, consumers_ok: !issues.length, hash_verification: "producer_reported",
    scheduled_proof: data.trigger_event === "schedule" && sourceOk && !issues.length,
    expected_session: data.expected_session, sha256: data.sha256, effective_sha256: data.effective_sha256,
    revision_hashes: data.revision_hashes.slice(), captured_at_utc: data.captured_at_utc,
    run_id: String(data.run_id), checked_at_utc: data.checked_at_utc,
    age_seconds: Math.floor((now - captured) / 1000), coverage: { requested: 504, observed: coverage.observed,
      missing: coverage.missing, frozen_constituents_observed: coverage.frozen_constituents_observed },
    missing_symbols: missing.slice(), policy: "common_raw_daily_primary", consumers,
    trigger_event: data.trigger_event === "schedule" ? "schedule" : "workflow_dispatch",
    issues: [...new Set(issues)] };
}

// Preserve numeric lexemes from the Python-produced JSON (100.0 differs from 100
// for its checksum). Parse/sort structure without reserializing numbers as JS.
export function canonicalSnapshotText(text) {
  if (typeof text !== "string" || text.length > 2_000_000) throw new Error("SOURCE_SIZE_INVALID");
  JSON.parse(text);
  let i = 0;
  const space = () => { while (/\s/.test(text[i] || "") && i < text.length) i++; };
  function string() {
    space(); const start = i++;
    while (i < text.length) {
      if (text[i] === "\\") { i += 2; continue; }
      if (text[i++] === '"') return JSON.parse(text.slice(start, i));
    }
    throw new Error("SOURCE_JSON_INVALID");
  }
  function value(depth = 0) {
    if (depth > 12) throw new Error("SOURCE_JSON_DEPTH");
    space();
    if (text[i] === '"') return JSON.stringify(string());
    if (text[i] === "{") {
      i++; const pairs = []; const keys = new Set(); space();
      while (text[i] !== "}") {
        const key = string(); space(); i++; // colon; JSON.parse already validated syntax
        const data = value(depth + 1);
        if (keys.has(key)) throw new Error("SOURCE_DUPLICATE_KEY");
        keys.add(key);
        if (depth !== 0 || key !== "sha256") pairs.push([key, data]);
        space(); if (text[i] !== ",") break; i++;
      }
      i++;
      return "{" + pairs.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, data]) => JSON.stringify(key) + ":" + data).join(",") + "}";
    }
    if (text[i] === "[") {
      i++; const items = []; space();
      while (text[i] !== "]") { items.push(value(depth + 1)); space(); if (text[i] !== ",") break; i++; }
      i++; return "[" + items.join(",") + "]";
    }
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
    if (!match) throw new Error("SOURCE_JSON_INVALID");
    i += match[0].length; return match[0];
  }
  const output = value(); space();
  if (i !== text.length) throw new Error("SOURCE_JSON_TRAILING");
  return output;
}

export async function sourceDigest(text) {
  const bytes = new TextEncoder().encode(canonicalSnapshotText(text));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
}

export async function verifyMidasSourceBytes(source, fetcher = fetch) {
  try {
    if (!source?.source_ok || !DAY.test(source.expected_session || "") || !HASH.test(source.sha256 || "")) throw new Error("SOURCE_NOT_VERIFIABLE");
    async function read(url, expectedHash) {
      const response = await fetcher(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("SOURCE_HTTP_FAILURE");
      const text = await response.text();
      const record = JSON.parse(text);
      if (record.sha256 !== expectedHash || await sourceDigest(text) !== expectedHash) throw new Error("SOURCE_HASH_MISMATCH");
      return record;
    }
    const base = await read(ROOT + source.expected_session + ".json", source.sha256);
    if (base.schema !== "midas.xnys_ohlc.v1" || base.market !== "XNYS" || base.session !== source.expected_session ||
        base.frozen_universe_size !== 503 || base.requested_symbols?.length !== 504 ||
        new Set(base.requested_symbols).size !== 504 || !base.requested_symbols.includes("SPY")) throw new Error("SOURCE_CONTRACT_INVALID");
    const bars = { ...base.bars }, missing = new Set(Object.keys(base.missing || {}));
    if (!utc(base.captured_at_utc) || base.captured_at_utc !== source.captured_at_utc ||
        missing.size + Object.keys(bars).length !== 504 ||
        [...missing].some(symbol => !base.requested_symbols.includes(symbol))) throw new Error("SOURCE_CONTRACT_INVALID");
    let captured = Date.parse(base.captured_at_utc);
    let head = source.sha256;
    for (const hash of source.revision_hashes) {
      const revision = await read(ROOT + source.expected_session + ".revisions/" + hash + ".json", hash);
      if (revision.schema !== "midas.xnys_missing_revision.v1" || revision.session !== base.session ||
          revision.base_sha256 !== source.sha256 || revision.parent_sha256 !== head ||
          canonicalSnapshotText(JSON.stringify(revision.source)) !== canonicalSnapshotText(JSON.stringify(base.source)) || !Object.keys(revision.bars || {}).length ||
          !utc(revision.captured_at_utc) || Date.parse(revision.captured_at_utc) < captured ||
          Date.parse(revision.captured_at_utc) > Date.parse(source.checked_at_utc)) throw new Error("SOURCE_REVISION_IDENTITY");
      for (const [symbol, bar] of Object.entries(revision.bars || {})) {
        if (!missing.has(symbol) || bar.dividend || bar.split) throw new Error("SOURCE_REVISION_OVERWRITE");
        bars[symbol] = bar; missing.delete(symbol);
      }
      head = hash; captured = Date.parse(revision.captured_at_utc);
    }
    for (const [symbol, row] of Object.entries(bars)) {
      if (!base.requested_symbols.includes(symbol) || row.date !== base.session || missing.has(symbol) ||
          ["open", "high", "low", "close"].some(k => !Number.isFinite(row[k]) || row[k] <= 0) ||
          row.low > Math.min(row.open, row.close) || row.high < Math.max(row.open, row.close) ||
          !Number.isFinite(row.volume) || row.volume < 0 || !Number.isFinite(row.dividend) || row.dividend < 0 ||
          !Number.isFinite(row.split) || row.split < 0 || typeof row.provider_symbol !== "string") throw new Error("SOURCE_BAR_INVALID");
    }
    if (head !== source.effective_sha256 || Object.keys(bars).length !== source.coverage.observed ||
        missing.size !== source.coverage.missing ||
        Object.keys(bars).filter(symbol => symbol !== "SPY").length !== source.coverage.frozen_constituents_observed || [...missing].sort().join(",") !== source.missing_symbols.slice().sort().join(",")) throw new Error("SOURCE_EFFECTIVE_COVERAGE");
    return { ok: true, hash_verification: "verified_bytes", observed: Object.keys(bars).length, missing: missing.size };
  } catch (error) {
    return { ok: false, hash_verification: "rejected", code: /^SOURCE_[A-Z_]+$/.test(error?.message || "") ? error.message : "SOURCE_VERIFICATION_FAILED" };
  }
}
