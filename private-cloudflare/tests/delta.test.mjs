import assert from "node:assert/strict";
import test from "node:test";
import { isDeltaSyncAdjustment, normalizeDeltaOperation, paginateDeltaOperations } from "../src/delta.js";

test("Delta sync rows are excluded from real operations", () => {
  const automatic = {
    Way: "WITHDRAW",
    Notes: "Automatically generated transaction to adjust balance, since the balance reported by Coinbase changed.",
    "Sync Base Holding": "false"
  };
  const synced = {
    Way: "BUY",
    Notes: "",
    "Sync Base Holding": "true"
  };
  const real = {
    Date: "2026-08-19T15:47:17.000Z",
    Way: "SELL",
    "Base amount": "0.653061",
    "Base currency (name)": "META (Meta Platforms Inc)",
    "Base type": "STOCK",
    "Quote amount": "360.92069226",
    "Quote currency": "USD",
    Exchange: "Nasdaq",
    Broker: "eToro",
    Notes: "",
    "Sync Base Holding": "false"
  };

  assert.equal(isDeltaSyncAdjustment(automatic), true);
  assert.equal(isDeltaSyncAdjustment(synced), true);
  const normalized = normalizeDeltaOperation(real);
  assert.equal(normalized.symbol, "META");
  assert.equal(normalized.marketTrade, true);
  assert.equal(normalized.synthetic, false);
  assert.equal(normalized.quoteAmount, 360.92069226);
});

test("Delta pagination returns only market trades by default", () => {
  const history = {
    operations: [
      { marketTrade: true, date: "2026-01-03", symbol: "AAA" },
      { marketTrade: false, date: "2026-01-02", symbol: "EUR" },
      { marketTrade: true, date: "2026-01-01", symbol: "BBB" }
    ]
  };
  const page = paginateDeltaOperations(history, { limit: 1, offset: 1 });
  assert.equal(page.kind, "trade");
  assert.equal(page.total, 2);
  assert.equal(page.items[0].symbol, "BBB");
  assert.equal(page.hasMore, false);

  const all = paginateDeltaOperations(history, { kind: "all", limit: 10 });
  assert.equal(all.total, 3);
});
