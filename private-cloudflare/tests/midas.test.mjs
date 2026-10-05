import assert from "node:assert/strict";
import test from "node:test";
import { fetchMidasDashboard, addPrivateGeneticDiary, fetchMidasResearch, fetchMidasWeeklyBootstrap, fetchMidasWorkflowHealth } from "../src/midas.js";
import { normalizeSnapshot, verifyGitHubOidc } from "../src/midas-ingest.js";

test("MIDAS dashboard validates, caches and labels a stale fallback", async () => {
  const row = {
    id: "benchmark_spy", label: "Referencia SPY", provenance: "Campaña nueva 2026 · referencia SPY",
    group: "paper_nuevo", status: "demo_con_diario",
    first_session: "2026-09-28", last_session: "2026-09-29", currency: "USD",
    last_equity: 101000, day_return_pct: 1, return_pct: 1,
    equity_history: [{ date: "2026-09-28", nav: 100000 }, { date: "2026-09-29", nav: 101000 }],
    activity_state: "active", activity_label: "1 posición abierta", activity_tickers: ["SPY"],
    open_positions_count: 1, pending_orders_count: 0, note: "Demo"
  };
  const tfg = {
    id: "tfg_corrected_2026", label: "TFG corregido 2026", provenance: "TFG 2021 · arquitectura portada",
    group: "tfg_demo_adaptado", status: "demo_con_diario",
    first_session: "2026-10-02", last_session: "2026-10-09", currency: "USD",
    last_equity: 100500, day_return_pct: .5, return_pct: .5,
    equity_history: [{ date: "2026-10-02", nav: 100000 }, { date: "2026-10-09", nav: 100500 }], note: "Paper"
  };
  const btd = {
    id: "buy_the_dip_corpus_2026_v0", label: "Buy The Dip corpus v0", provenance: "Corpus Buy The Dip",
    group: "buy_the_dip_demo", status: "demo_con_diario",
    first_session: "2026-10-01", last_session: "2026-10-05", currency: "USD",
    last_equity: 99000, day_return_pct: -2.94, return_pct: -1,
    annualized_volatility_pct: 31.2, max_drawdown_pct: -2.94, sharpe_0rf: -0.4, risk_observations: 3,
    equity_history: [{ date: "2026-10-01", nav: 100000 }, { date: "2026-10-02", nav: 102000 }, { date: "2026-10-05", nav: 99000 }], note: "Paper"
  };
  const dashboard = { schema_version: 1, generated_at_utc: "2026-09-29T23:45:00Z", tracks: [row, tfg, btd] };
  let requests = 0;
  const fetcher = async (url) => {
    requests += 1;
    assert.match(url, /^https:\/\/raw\.githubusercontent\.com\/mamg97\/midas-paper-lab\//);
    return { ok: true, json: async () => dashboard };
  };
  const first = await fetchMidasDashboard(fetcher, 1_000_000);
  assert.equal(first.dashboard.tracks[0].day_return_pct, 1);
  assert.equal(first.dashboard.tracks[0].provenance, row.provenance);
  assert.deepEqual(first.dashboard.tracks[0].equity_history, row.equity_history);
  assert.equal(first.dashboard.tracks[0].activity_label, "1 posición abierta");
  assert.deepEqual(first.dashboard.tracks[0].activity_tickers, ["SPY"]);
  assert.equal(first.dashboard.tracks[0].open_positions_count, 1);
  assert.equal(first.dashboard.tracks[1].group, "tfg_demo_adaptado");
  assert.equal(first.dashboard.tracks[1].return_pct, .5);
  assert.equal(first.dashboard.tracks[2].group, "buy_the_dip_demo");
  assert.equal(first.dashboard.tracks[2].annualized_volatility_pct, 31.2);
  assert.equal(first.dashboard.tracks[2].max_drawdown_pct, -2.94);
  assert.equal(first.dashboard.tracks[2].sharpe_0rf, -0.4);
  assert.equal(first.dashboard.tracks[2].risk_observations, 3);
  assert.equal(first.stale, false);
  await fetchMidasDashboard(fetcher, 1_001_000);
  assert.equal(requests, 1);
  const stale = await fetchMidasDashboard(async () => { throw new Error("offline"); }, 1_400_000);
  assert.equal(stale.stale, true);
  assert.equal(stale.dashboard.tracks[0].label, "Referencia SPY");
});


test("weekly ML bootstrap is normalized and explicitly non-forward", async () => {
  const payload = {
    schema_version: 1,
    kind: "NON_PROSPECTIVE_BOOTSTRAP",
    excluded_from_forward_performance: true,
    signal_asof: "2026-09-25",
    entry_date: "2026-09-28",
    mark_date: "2026-09-28",
    strategies: {
      ensemble_consensus: {
        mark_to_market_nav: 98657.04,
        mark_to_market_return_pct: -1.343,
        positions: [{ ticker: "SMCI", predicted_return: 0.0087, score: 0.86, buy_price: 42.77, mark_close: 41.78, mtm_pnl: -228.55 }]
      }
    },
    ensemble_top20: [{ ticker: "SMCI", score: 0.86, predicted_return: 0.0087, positive_votes: 5, rank_dispersion: 0.17 }]
  };
  const result = await fetchMidasWeeklyBootstrap(async () => ({ ok: true, json: async () => payload }), 20_000_000);
  assert.equal(result.status, "bootstrap_only");
  assert.equal(result.signal_asof, "2026-09-25");
  assert.equal(result.strategies.ensemble_consensus.positions[0].ticker, "SMCI");
  assert.equal(result.ensemble[0].positive_votes, 5);
});

test("MIDAS research resolves its private sheet through IntegracionesPrivadas", async () => {
  const env = { FINANCE_SHEET_ID: "10hS1pdS8oaQURmIo6nUZX9eo551gFh0b_qwWPIWQRww" };
  const researchId = "15yXCjLP7Cg6N88lW88yo4duZEmoga-w7WniAl1bLXws";
  const seen = [];
  const fetcher = async (url) => {
    seen.push(url);
    if (url.includes("/spreadsheets/" + env.FINANCE_SHEET_ID + "/values/")) {
      return { ok: true, json: async () => ({ values: [
        ["clave", "valor"],
        ["MIDAS_RESEARCH_SHEET_ID", researchId]
      ] }) };
    }
    if (url.includes("/spreadsheets/" + researchId + "/values:batchGet")) {
      return { ok: true, json: async () => ({ valueRanges: [
        { values: [
          ["ticker","empresa","tema","tipo_estudio","ultima_revision","tesis_resumida","drivers_clave","riesgos_clave","escenario_bear","escenario_base","escenario_bull","horizonte","estado","regla_de_uso"],
          ["NVEC","NVE Corporation","Sensores","CAGR","2026-09-23","Tesis","Driver","Riesgo","","","","2026–2031","RECUPERADA","Actualizar"]
        ] },
        { values: [
          ["ticker","empresa","tema","fecha_estudio","objetivo","cagr_bear_2031","cagr_base_2031","cagr_bull_2031","horizonte_original","cagr_bear_original","cagr_base_original","cagr_bull_original","estado","nota"],
          ["NVEC","NVE Corporation","Sensores","2026-09-23","2031","-6,9%","+12,8%","+34,3%","2026–2031","-6,9%","+12,8%","+34,3%","COMPLETO","Recuperado"]
        ] }
      ] }) };
    }
    throw new Error("unexpected URL " + url);
  };
  const result = await fetchMidasResearch(env, async () => "token", fetcher, 9_000_000);
  assert.equal(result.status, "ok");
  assert.equal(result.counts.theses, 1);
  assert.equal(result.counts.cagrComplete, 1);
  assert.equal(result.cagr2031[0].base, "+12,8%");
  assert.equal(seen.some((url) => url.includes("IntegracionesPrivadas")), true);
  assert.equal(seen.some((url) => url.includes("/drive/v3/files")), false);
});

test("private genetic diary uses recorded valuations and keeps a quality warning", async () => {
  const dashboard = { generated_at_utc: "2026-09-28T09:00:00Z", tracks: [
    { id: "genetic_sp500_legacy", status: "sin_diario_disponible", last_equity: null }
  ] };
  const payload = JSON.stringify({ strategy_id: "genetic_sp500_legacy", quality: "legacy_same_close_model", initial_capital: 100000,
    first_session: "2026-09-24", last_session: "2026-09-25",
    equity_history: [["2026-09-24", 104000], ["2026-09-25", 104382.9253805104]] });
  const db = { prepare: () => ({ bind: () => ({ first: async () => ({ payload }) }) }) };
  const merged = await addPrivateGeneticDiary(db, dashboard);
  assert.equal(merged.tracks[0].return_pct, 4.382925);
  assert.equal(merged.tracks[0].last_session, "2026-09-25");
  assert.equal(merged.tracks[0].day_return_pct, .368197);
  assert.equal(merged.tracks[0].risk_observations, 2);
  assert.equal(merged.tracks[0].max_drawdown_pct, 0);
  assert.match(merged.tracks[0].note, /no son ejecuciones verificadas/);
  assert.equal(dashboard.tracks[0].last_equity, null);
  assert.equal(await addPrivateGeneticDiary(null, dashboard), dashboard);
});

test("forward genetic campaign stays separate and never inherits legacy returns", async () => {
  const dashboard = { generated_at_utc: "2026-09-28T09:00:00Z", tracks: [
    { id: "genetic_sp500_legacy", status: "sin_diario_disponible", last_equity: null }
  ] };
  const forward = { strategy_id: "genetic_sp500_forward", quality: "next_open_raw_ohlc_v1",
    initial_capital: 100000, first_session: "2026-09-28", last_session: "2026-09-28",
    equity_history: [["2026-09-28", 100000]] };
  const db = { prepare: () => ({ bind: (id) => ({ first: async () =>
    id === "genetic_sp500_forward" ? { payload: JSON.stringify(forward) } : null }) }) };
  const merged = await addPrivateGeneticDiary(db, dashboard);
  assert.equal(merged.tracks[0].last_equity, null);
  assert.equal(merged.tracks[1].status, "demo_con_diario");
  assert.equal(merged.tracks[1].last_equity, 100000);
  assert.equal(merged.tracks[1].day_return_pct, null);
  assert.equal(merged.tracks[1].risk_observations, 1);
  assert.equal(merged.tracks[1].max_drawdown_pct, 0);
  assert.match(merged.tracks[1].note, /siguiente apertura/);
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
  const prospective = { ...body, strategy_id: "genetic_sp500_forward", quality: "next_open_raw_ohlc_v1",
    equity_history: [["2026-09-28", 100000]] };
  assert.equal(normalizeSnapshot(prospective, "123").last_session, "2026-09-28");
  assert.equal(normalizeSnapshot({ ...prospective, quality: "legacy_same_close_model" }, "123"), null);
});


test("MIDAS workflow health reads persisted runtime artifacts and treats missing future jobs as not due", async () => {
  const payloads = new Map([
    ["paper_us", {
      schema_version: 1, workflow_name: "MIDAS paper comparison", event: "schedule",
      outcome: "success", recorded_at_utc: "2026-10-01T02:19:28Z", run_number: 4
    }],
    ["tfm_es", {
      schema_version: 1, workflow_name: "MIDAS TFM shadow forecasts", event: "schedule",
      outcome: "failure", recorded_at_utc: "2026-09-30T23:05:37Z", run_number: 4
    }],
    ["capital_cycle", {
      schema_version: 1, workflow_name: "MIDAS capital cycle paper", event: "schedule",
      outcome: "failure", recorded_at_utc: "2026-10-01T03:49:10Z", run_number: 4
    }]
  ]);
  let requests = 0;
  const fetcher = async (url) => {
    requests += 1;
    const key = url.match(/strategy_runtime\/([^/]+)\.json$/)?.[1];
    if (!payloads.has(key)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => payloads.get(key) };
  };
  const now = Date.parse("2026-10-01T16:00:00Z");
  const first = await fetchMidasWorkflowHealth(fetcher, now);
  assert.equal(first.status, "ok");
  assert.equal(first.source, "strategy_runtime");
  assert.equal(first.overall, "attention");
  assert.equal(first.workflows.find((row) => row.name === "MIDAS TFM shadow forecasts").state, "failed");
  assert.equal(first.workflows.find((row) => row.name === "MIDAS capital cycle paper").state, "failed");
  assert.equal(first.workflows.find((row) => row.name === "MIDAS Buy The Dip paper").state, "not_due_yet");
  assert.equal(first.workflows.find((row) => row.name === "MIDAS weekly ML paper").state, "not_due_yet");
  assert.equal("html_url" in first.workflows[0], false);
  assert.equal(requests, 6);
  await fetchMidasWorkflowHealth(fetcher, now + 60_000);
  assert.equal(requests, 6);
});
