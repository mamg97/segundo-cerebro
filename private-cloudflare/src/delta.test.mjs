import assert from "node:assert/strict";
import test from "node:test";
import { deltaPageRange, normalizeDeltaOperations, normalizeDeltaSummary } from "./delta.js";

test("normalizes Delta summary sections", () => {
  const values = [
    ["section","metric","value","unit","note"],
    ["IMPORT","rows_total",2748,"rows",""],
    ["IMPORT","sync_adjustments",119,"rows",""],
    ["TRADING","market_trades",1210,"operations",""],
    ["TRADING","unique_assets",159,"assets",""],
    ["TOP_ASSET","PLTR",116,"operations","rank=1"],
    ["TURNOVER","USD",183520.25,"USD","gross"]
  ];
  const result = normalizeDeltaSummary(values, "https://example.test");
  assert.equal(result.summary.rowsTotal, 2748);
  assert.equal(result.summary.adjustments, 119);
  assert.equal(result.summary.marketTrades, 1210);
  assert.equal(result.summary.uniqueAssets, 159);
  assert.deepEqual(result.topAssets[0], { ticker: "PLTR", operations: 116, note: "rank=1" });
  assert.equal(result.turnover[0].amount, 183520.25);
});

test("builds newest-first page range from chronological source", () => {
  assert.deepEqual(deltaPageRange(2748, 0, 100), {
    startRow: 2650,
    endRow: 2749,
    count: 100,
    nextOffset: 100,
    hasMore: true,
    a1: "A2650:P2749"
  });
  const tail = deltaPageRange(2748, 2700, 100);
  assert.equal(tail.startRow, 2);
  assert.equal(tail.endRow, 49);
  assert.equal(tail.count, 48);
  assert.equal(tail.hasMore, false);
});

test("normalizes and reverses Delta operations", () => {
  const values = [
    ["Date","Way","Base amount","Base currency (name)","Base type","Quote amount","Quote currency","Exchange","Sent/Received from","Sent to","Fee amount","Fee currency (name)","Broker","Notes","Sync Base Holding","Leverage Metadata"],
    ["2026-09-01T10:00:00.000Z","BUY",2,"PLTR (Palantir Technologies Inc)","STOCK",300,"USD","Nasdaq","","","","","eToro","","false",""],
    ["2026-09-02T10:00:00.000Z","SELL",1,"PLTR (Palantir Technologies Inc)","STOCK",160,"USD","Nasdaq","","","","","eToro","","false",""]
  ];
  const result = normalizeDeltaOperations(values);
  assert.equal(result[0].way, "SELL");
  assert.equal(result[0].ticker, "PLTR");
  assert.equal(result[0].marketTrade, true);
  assert.equal(result[0].impliedPrice, 160);
  assert.equal(result[1].impliedPrice, 150);
});

test("marks sync rows as adjustments", () => {
  const values = [
    ["Date","Way","Base amount","Base currency (name)","Base type","Quote amount","Quote currency","Exchange","Sent/Received from","Sent to","Fee amount","Fee currency (name)","Broker","Notes","Sync Base Holding","Leverage Metadata"],
    ["2023-01-01T00:00:00.000Z","BUY",1,"BTC (Bitcoin)","CRYPTO",100,"EUR","Coinbase","","","","","","SYNC-BASE-HOLDINGS_BUY_BTC/EUR","false",""]
  ];
  const result = normalizeDeltaOperations(values);
  assert.equal(result[0].adjustment, true);
  assert.equal(result[0].marketTrade, false);
});
