import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const from = app.indexOf("function liquidityVisualModel(");
const to = app.indexOf("function orderedLiquidityAccounts(", from);
assert.ok(from > 0 && to > from, "extract active shared liquidity model");

const model = new Function("firstFinite", "numberOrZero", "allocationColorClass", "quantizeBarSegments",
  app.slice(from, to) + "\nreturn liquidityVisualModel;"
)(
  (...values) => {
    for (const x of values) if (x !== null && x !== undefined && x !== "" && Number.isFinite(Number(x))) return Number(x);
    return null;
  },
  value => Number(value) || 0,
  (label, index) => "allocation-" + (index + 1),
  segments => segments.map(item => ({...item, visiblePct: 100, pctClass: "pct-100"}))
);

const sumSegments = result => result.rawSegments.reduce((sum, item) => sum + item.amount, 0);
const freeSlice = result => result.rawSegments.filter(item => item.label === "Libre");

test("common Santander funds are NOT libre when canonical free_amount is zero", () => {
  const x = model({ id: "santander-comun", owner: "Común", balance: 1000, free: 0,
    allocations: [{ label: "Recibo", amount: 200, kind: "direct_debit" }] });
  assert.equal(x.free, 0);
  assert.equal(x.internalFree, 0);
  assert.equal(x.pendingBreakdown, 800);
  assert.equal(sumSegments(x), 1000);
  assert.equal(freeSlice(x).length, 0);
  assert.ok(x.rawSegments.some(y => y.kind === "undetailed" && y.label.startsWith("Presupuesto común") && y.amount === 800));
});

test("shared accounts default to no discretionary cash if free field is absent", () => {
  for (const id of ["santander-comun", "bbva-comun"]) {
    const x = model({ id, balance: 500, allocations: [] });
    assert.equal(x.free, 0);
    assert.equal(x.pendingBreakdown, 500);
    assert.equal(sumSegments(x), 500);
  }
});

test("string zero from Sheets remains zero rather than being treated as missing", () => {
  const x = model({ id: "santander-comun", balance: 250, free: "0", allocations: [] });
  assert.equal(x.free, 0);
  assert.equal(x.pendingBreakdown, 250);
});

test("personal accounts retain available funds, respecting explicitly restricted amounts", () => {
  const x = model({ id: "openbank-miguel", owner: "Miguel", balance: 175, free: 135,
    allocations: [{ label: "Reserved", amount: 40, kind: "event_reserve" }] });
  assert.equal(x.free, 135);
  assert.equal(x.pendingBreakdown, 0);
  assert.equal(freeSlice(x)[0].amount, 135);
  assert.equal(sumSegments(x), 175);
});

test("missing free field in personal accounts preserves fallback behavior", () => {
  const x = model({ id: "openbank-andrea", owner: "Andrea", balance: 180, allocations: [] });
  assert.equal(x.free, 180);
  assert.equal(x.pendingBreakdown, 0);
});

test("overcommitted account never fabricates free or unclassified cash", () => {
  const x = model({ id: "santander-comun", balance: 100, free: 0,
    allocations: [{label:"Bills",amount:140,kind:"budget"}] });
  assert.equal(x.free, 0);
  assert.equal(x.pendingBreakdown, 0);
  assert.equal(x.excess, 40);
});

test("UI renders undetailed allocation in neutral color, not the green Libre slice", () => {
  assert.match(css, /\.allocation-undetailed\s*\{[^}]*background:/);
  assert.match(app, /className: "allocation-undetailed"/);
  assert.match(app, /Sin desglosar <b>/);
  assert.match(app, /Presupuesto sin desglose <b>/);
});
