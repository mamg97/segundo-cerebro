import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function extractFunction(begin, next) {
  const start = app.indexOf("function " + begin + "(");
  const end = app.indexOf("function " + next + "(", start + 1);
  assert.ok(start >= 0 && end > start, "found adjacent finance functions " + begin);
  return app.slice(start, end);
}

const model = new Function(
  "numberOrZero", "firstFinite", "allocationColorClass", "quantizeBarSegments",
  extractFunction("liquidityVisualModel", "visibleLiquidityAccounts") + "return liquidityVisualModel;"
)(
  (value) => Number(value) || 0,
  (value) => value === null || value === undefined || value === "" ? null : Number(value),
  () => "allocation-1",
  (segments) => segments
);
const visible = new Function(
  "numberOrZero",
  extractFunction("visibleLiquidityAccounts", "orderedLiquidityAccounts") + "return visibleLiquidityAccounts;"
)((value) => Number(value) || 0);

test("zero cash bars disappear while other zero accounts and nonzero cash remain", () => {
  const accounts = [
    { id: "efectivo-miguel", bank: "Efectivo", balance: 0 },
    { id: "efectivo-comun", bank: "Efectivo", balance: 2 },
    { id: "openbank-andrea", bank: "Openbank", balance: 0 }
  ];
  assert.deepEqual(visible(accounts).map((x) => x.id), ["efectivo-comun", "openbank-andrea"]);
  assert.match(extractFunction("orderedLiquidityAccounts", "renderHomeLiquidityOverview"), /visibleLiquidityAccounts\(accounts\)/);
  assert.match(extractFunction("renderLiquidityAccounts", "renderWealthAllocation"), /visibleLiquidityAccounts\(accounts\)/);
});

test("unclassified personal remainder is visibly provisional, never canonical free", () => {
  const result = model({
    id: "openbank-andrea", bank: "Openbank", owner: "Andrea",
    balance: 100, free: 0, allocations: [{ label: "Curso", amount: 15 }]
  });
  assert.equal(result.provisionalFree, 85);
  assert.equal(result.free, 0);
  assert.equal(result.internalFree, 0);
  assert.equal(result.pendingBreakdown, 85);
  assert.equal(result.rawSegments.find(x => x.kind === "provisional_free").amount, 85);
  assert.match(result.rawSegments.find(x => x.kind === "provisional_free").label, /Libre provisional/);
  assert.match(css, /\.allocation-provisional-free/);
  assert.match(css, /repeating-linear-gradient/);
});

test("shared budget remainder stays earmarked and never classified as provisional personal cash", () => {
  const result = model({ id: "santander-comun", owner: "Común", balance: 100, free: 0, allocations: [] });
  assert.equal(result.provisionalFree, 0);
  assert.equal(result.free, 0);
  assert.equal(result.pendingBreakdown, 100);
  assert.equal(result.rawSegments.find(x => x.kind === "undetailed").amount, 100);
  assert.equal(result.rawSegments.some(x => x.kind === "provisional_free"), false);
});

test("personal free confirmed remains distinct when an explicit free amount is recorded", () => {
  const result = model({
    id: "openbank-miguel", bank: "Openbank", owner: "Miguel",
    balance: 100, free: 30, allocations: [{label: "Cuota", amount: 40}]
  });
  assert.equal(result.free, 30);
  assert.equal(result.provisionalFree, 30);
  assert.equal(result.pendingBreakdown, 30);
  assert.equal(result.rawSegments.find(x => x.kind === "free").amount, 30);
});

test("overflow charts preserve equal nominal bands and disclose the correct denominator", () => {
  const quantizer = new Function(
    extractFunction("quantizeBarSegments", "allocationColorClass") + "return quantizeBarSegments;"
  )();
  const proportionalModel = new Function(
    "numberOrZero", "firstFinite", "allocationColorClass", "quantizeBarSegments",
    extractFunction("liquidityVisualModel", "visibleLiquidityAccounts") + "return liquidityVisualModel;"
  )(
    (value) => Number(value) || 0,
    (value) => value === null || value === undefined || value === "" ? null : Number(value),
    (_label, index) => `allocation-${index + 1}`,
    quantizer
  );
  const actual = proportionalModel({
    id: "shared-test", owner: "Común", balance: 100, free: 0,
    allocations: [
      { label: "Reservation A", amount: 25 },
      { label: "Reservation B", amount: 25 },
      { label: "Obligation C", amount: 70 }
    ]
  });
  assert.equal(actual.chartOverAllocated, true);
  assert.equal(actual.chartTotal, 120);
  assert.equal(actual.excess, 20);
  assert.equal(actual.segments[0].visibleAmount, 25);
  assert.equal(actual.segments[1].visibleAmount, 25);
  assert.equal(actual.segments[0].visiblePct, actual.segments[1].visiblePct);
  assert.equal(actual.segments.reduce((sum, row) => sum + row.visiblePct, 0), 100);
  assert.match(extractFunction("renderLiquidityAccounts", "renderWealthAllocation"), /liquidity-legend-meter-fill/);
  assert.match(css, /\.liquidity-legend-meter\s*\{/);
});
