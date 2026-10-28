import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { normalizeMidasSourceHealth, sourceDigest, canonicalSnapshotText, verifyMidasSourceBytes } from "./midas-market-data-health.js";
const date = "2026-10-27", stamp = "2026-10-28T07:00:00Z", now = Date.parse("2026-10-28T12:00:00Z");
const names = ["classic_sp500", "buy_the_dip_strategy", "capital_cycle", "weekly_ml_daily", "timesfm_daily", "timesfm_one_day"];
const counts = [9, 1, 1, 9, 2, 2];
function health(hash = "a".repeat(64)) {
  return { schema: "midas.xnys_source_health.v1", market: "XNYS", status: "snapshot_verified", expected_session: date,
    sha256: hash, effective_sha256: hash, revision_hashes: [], captured_at_utc: stamp, checked_at_utc: stamp,
    run_id: "123456", trigger_event: "workflow_dispatch", coverage: { requested: 504, observed: 491, missing: 13, frozen_constituents_observed: 490 },
    missing_symbols: Array.from({ length: 13 }, (_, i) => `M${i}`),
    consumers: Object.fromEntries(names.map((name, i) => [name, { ledger_status: "observed", workflow_outcome: "success", updated_books: counts[i], paused_books: 0,
      valuation_sessions: Object.fromEntries(Array.from({ length: counts[i] }, (_, j) => [`book${j}`, date])) }])) };
}
const normalized = data => normalizeMidasSourceHealth(data, now, date);
test("partial coverage, engine execution and scheduled proof remain separate", () => {
  const h = health(); h.coverage.unexpected_private_field = "must be dropped";
  const d = normalized(h);
  assert.equal(d.overall, "partial"); assert.equal(d.source_ok, true); assert.equal(d.consumers_ok, true);
  assert.equal(d.scheduled_proof, false); assert.equal(d.hash_verification, "producer_reported");
  assert.equal(d.coverage.unexpected_private_field, undefined);
  h.trigger_event = "schedule"; assert.equal(normalized(h).scheduled_proof, true);
  h.consumers.classic_sp500.workflow_outcome = "failure";
  assert.equal(normalized(h).source_ok, true); assert.equal(normalized(h).consumers_ok, false);
  assert.equal(normalized(h).scheduled_proof, false);
});
test("unknown, false counters, future and stale dates never become green", () => {
  assert.equal(normalized(null).overall, "unknown");
  for (const mutate of [h => h.coverage.missing++, h => h.missing_symbols.push("SPY"), h => h.revision_hashes.push("b".repeat(64)),
    h => h.captured_at_utc = "2026-10-29T00:00:00Z", h => h.captured_at_utc = "2026-10-20T00:00:00Z",
    h => h.captured_at_utc = "2026-10-28T07:00:00", h => h.consumers.classic_sp500.updated_books = 8,
    h => h.consumers.capital_cycle.valuation_sessions.book0 = "2026-10-26", h => delete h.consumers.timesfm_daily]) {
    const h = health(); mutate(h); const d = normalized(h);
    assert.ok(!d.source_ok || !d.consumers_ok); assert.equal(d.scheduled_proof, false);
  }
  assert.equal(normalizeMidasSourceHealth(health(), now, "2026-10-26").status, "invalid");
});
test("Python numeric lexemes and nested sha256 survive canonicalization", async () => {
  const raw = '{"z":100.0,"a":{"sha256":"keep","n":1e-07},"sha256":"omit"}';
  const canonical = '{"a":{"n":1e-07,"sha256":"keep"},"z":100.0}';
  assert.equal(canonicalSnapshotText(raw), canonical);
  assert.equal(await sourceDigest(raw), createHash("sha256").update(canonical).digest("hex"));
  assert.throws(() => canonicalSnapshotText('{"a":1,"a":2}'), /DUPLICATE/);
  assert.throws(() => canonicalSnapshotText("[NaN]"));
});
async function fixtures() {
  const symbols = [...Array.from({ length: 503 }, (_, i) => `T${i}`), "SPY"];
  const bar = { date, open: 100, high: 102, low: 99, close: 101, volume: 1000, dividend: 0, split: 0, provider_symbol: "T0" };
  const base = { schema: "midas.xnys_ohlc.v1", market: "XNYS", session: date, frozen_universe_size: 503,
    requested_symbols: symbols, captured_at_utc: stamp, source: { vendor: "Yahoo Finance", auto_adjust: false },
    bars: Object.fromEntries(symbols.slice(0, 490).concat("SPY").map(s => [s, { ...bar, provider_symbol: s }])),
    missing: Object.fromEntries(symbols.slice(490, 503).map(s => [s, { reason: "missing" }])) };
  base.sha256 = await sourceDigest(JSON.stringify(base));
  const h = health(base.sha256); h.missing_symbols = symbols.slice(490, 503);
  return { base, source: normalized(h), bar };
}
test("verifier independently hashes bytes and permits only linked missing-bar additions", async () => {
  const { base, source, bar } = await fixtures();
  const fetcher = async url => { assert.match(url, /^https:\/\/raw\.githubusercontent\.com\/mamg97\/midas-paper-lab\/main\/market_data\/snapshots\/XNYS\//); return new Response(JSON.stringify(base)); };
  assert.equal((await verifyMidasSourceBytes(source, fetcher)).ok, true);
  const broken = structuredClone(base); broken.bars.T0.close++;
  assert.equal((await verifyMidasSourceBytes(source, async () => new Response(JSON.stringify(broken)))).code, "SOURCE_HASH_MISMATCH");
  const revision = { schema: "midas.xnys_missing_revision.v1", session: date, base_sha256: base.sha256, parent_sha256: base.sha256,
    captured_at_utc: stamp, source: base.source, bars: { T490: { ...bar, provider_symbol: "T490" } } };
  revision.sha256 = await sourceDigest(JSON.stringify(revision));
  const revised = { ...source, effective_sha256: revision.sha256, revision_hashes: [revision.sha256],
    coverage: { requested: 504, observed: 492, missing: 12, frozen_constituents_observed: 491 }, missing_symbols: source.missing_symbols.slice(1) };
  const read = async url => new Response(JSON.stringify(url.includes(".revisions/") ? revision : base));
  assert.equal((await verifyMidasSourceBytes(revised, read)).ok, true);
  revision.parent_sha256 = "b".repeat(64); revision.sha256 = await sourceDigest(JSON.stringify(revision));
  revised.effective_sha256 = revision.sha256; revised.revision_hashes = [revision.sha256];
  assert.equal((await verifyMidasSourceBytes(revised, read)).code, "SOURCE_REVISION_IDENTITY");
});
test("a valid new hash cannot hide an overwrite, corporate action or wrong date", async () => {
  for (const mutate of [r => { r.bars = { T0: r.bars.T490 }; }, r => { r.bars.T490.dividend = 1; },
    r => { r.bars.T490.date = "2026-10-26"; }, r => { r.captured_at_utc = "2026-10-27T00:00:00Z"; }]) {
    const { base, source, bar } = await fixtures();
    const r = { schema: "midas.xnys_missing_revision.v1", session: date, base_sha256: base.sha256, parent_sha256: base.sha256,
      captured_at_utc: stamp, source: base.source, bars: { T490: { ...bar, provider_symbol: "T490" } } };
    mutate(r); r.sha256 = await sourceDigest(JSON.stringify(r));
    const result = await verifyMidasSourceBytes({ ...source, effective_sha256: r.sha256, revision_hashes: [r.sha256] },
      async url => new Response(JSON.stringify(url.includes(".revisions/") ? r : base)));
    assert.equal(result.ok, false);
  }
});
