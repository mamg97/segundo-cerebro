import assert from "node:assert/strict";
import test from "node:test";
import { fetchMidasDashboard, addPrivateGeneticDiary } from "../src/midas.js";
import { normalizeSnapshot, verifyGitHubOidc } from "../src/midas-ingest.js";

test("MIDAS dashboard validates, caches and labels a stale fallback", async () => {
  const row = {
    id: "benchmark_spy", label: "Referencia SPY", provenance: "Campaña nueva 2026 · referencia SPY",
    group: "paper_nuevo", status: "demo_con_diario",
    first_session: "2026-09-28", last_session: "2026-09-29", currency: "USD",
    last_equity: 101000, day_return_pct: 1, return_pct: 1, note: "Demo"
  };
  const dashboard = { schema_version: 1, generated_at_utc: "2026-09-29T23:45:00Z", tracks: [row] };
  let requests = 0;
  const fetcher = async (url) => {
    requests += 1;
    assert.match(url, /^https:\/\/raw\.githubusercontent\.com\/mamg97\/midas-paper-lab\//);
    return { ok: true, json: async () => dashboard };
  };
  const first = await fetchMidasDashboard(fetcher, 1_000_000);
  assert.equal(first.dashboard.tracks[0].day_return_pct, 1);
  assert.equal(first.dashboard.tracks[0].provenance, row.provenance);
  assert.equal(first.stale, false);
  await fetchMidasDashboard(fetcher, 1_001_000);
  assert.equal(requests, 1);
  const stale = await fetchMidasDashboard(async () => { throw new Error("offline"); }, 1_400_000);
  assert.equal(stale.stale, true);
  assert.equal(stale.dashboard.tracks[0].label, "Referencia SPY");
});

test("private genetic diary uses recorded valuations and keeps a quality warning", async () => {
  const dashboard = { generated_at_utc: "2026-09-28T09:00:00Z", tracks: [
    { id: "genetic_sp500_legacy", status: "sin_diario_disponible", last_equity: null }
  ] };
  const payload = JSON.stringify({ quality: "legacy_same_close_model", initial_capital: 100000,
    first_session: "2026-09-24", last_session: "2026-09-25",
    equity_history: [["2026-09-24", 104000], ["2026-09-25", 104382.9253805104]] });
  const db = { prepare: () => ({ bind: () => ({ first: async () => ({ payload }) }) }) };
  const merged = await addPrivateGeneticDiary(db, dashboard);
  assert.equal(merged.tracks[0].return_pct, 4.382925);
  assert.equal(merged.tracks[0].last_session, "2026-09-25");
  assert.equal(merged.tracks[0].day_return_pct, .368197);
  assert.match(merged.tracks[0].note, /no son ejecuciones verificadas/);
  assert.equal(dashboard.tracks[0].last_equity, null);
  assert.equal(await addPrivateGeneticDiary(null, dashboard), dashboard);
});

test("OIDC signature and workflow claims gate the private snapshot", async () => {
  const keyPair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", keyPair.publicKey), kid: "test-key", use: "sig" };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = 1_800_000_000_000;
  const claims = { iss: "https://token.actions.githubusercontent.com",
    aud: "segundo-cerebro-midas-legacy-ingest", repository: "mamg97/personal_mamg",
    ref: "refs/heads/main", workflow_ref: "mamg97/personal_mamg/.github/workflows/trading_bot.yml@refs/heads/main",
    event_name: "schedule", run_id: "123", iat: now / 1000 - 30, exp: now / 1000 + 300 };
  const sign = async (payload) => {
    const signed = `${encode({ alg: "RS256", kid: "test-key" })}.${encode(payload)}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, new TextEncoder().encode(signed));
    return `${signed}.${Buffer.from(signature).toString("base64url")}`;
  };
  const fetcher = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
  assert.equal((await verifyGitHubOidc(await sign(claims), fetcher, now)).run_id, "123");
  assert.equal(await verifyGitHubOidc(await sign({ ...claims, ref: "refs/heads/other" }), fetcher, now), null);
  assert.equal(await verifyGitHubOidc(await sign({ ...claims, exp: now / 1000 - 1 }), fetcher, now), null);
  const body = { schema_version: 1, strategy_id: "genetic_sp500_legacy", quality: "legacy_same_close_model",
    initial_capital: 100000, ledger_sha256: "a".repeat(64),
    equity_history: [["2026-02-27", 99638], ["2026-09-25", 104382]] };
  assert.equal(normalizeSnapshot(body, "123").last_session, "2026-09-25");
  assert.equal(normalizeSnapshot({ ...body, equity_history: body.equity_history.toReversed() }, "123"), null);
});
