import assert from "node:assert/strict";
import test from "node:test";
import { fetchMidasDashboard } from "../src/midas.js";

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
