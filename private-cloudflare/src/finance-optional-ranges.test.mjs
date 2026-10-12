import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFinanceOptionalRanges } from "./finance-optional-ranges.js";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const ranges = [
  "Cuentas!A1:J200", "ReservasCuenta!A1:J500", "PatrimonioDetalle!A1:J500",
  "PatrimonioDiario!A1:M1000", "CuentasCredito!A1:R200", "ECIProductos!A1:R200",
  "ECIHistorico!A1:N300", "ECIMovimientos!A1:N300", "ECIFuturo!A1:O300",
  "EtoroAsignaciones!A1:M200", "PrestamoVsInversion!A1:X200",
  "MovimientosCuenta!A1:M5000", "Regalos!A1:P300"
];

test("all 13 canonical optional Finance tabs require one Sheets batch request", async () => {
  let calls = 0;
  const result = await readFinanceOptionalRanges({
    spreadsheetId: "synthetic-id", token: "fake-token", ranges,
    fetcher: async (url, opts) => {
      calls++;
      assert.deepEqual(new URL(url).searchParams.getAll("ranges"), ranges);
      assert.equal(opts.headers.Authorization, "Bearer fake-token");
      return { ok: true, status: 200, json: async () => ({
        valueRanges: ranges.map((_, index) => ({ values: index === 0 ? [["account_id"], ["example"]] : [] }))
      }) };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.length, 13);
  assert.equal(result[0].length, 2);
  assert.deepEqual(result[1], []);
});

test("missing optional tabs retain legacy bounded per-tab fallback", async () => {
  let retries = 0;
  const result = await readFinanceOptionalRanges({
    spreadsheetId: "synthetic-id", token: "fake-token", ranges,
    fetcher: async () => ({ ok: false, status: 400 }),
    missingTabFallback: async () => { retries++; return []; }
  });
  assert.equal(retries, 13);
  assert.equal(result.length, 13);
});

test("transient upstream errors cannot become false empty Finance data", async () => {
  await assert.rejects(readFinanceOptionalRanges({
    spreadsheetId: "synthetic-id", token: "fake-token", ranges,
    fetcher: async () => ({ ok: false, status: 429 }),
    missingTabFallback: async () => []
  }), { code: "FINANCE_OPTIONAL_UPSTREAM" });
  await assert.rejects(readFinanceOptionalRanges({
    spreadsheetId: "synthetic-id", token: "fake-token", ranges,
    fetcher: async () => ({ ok: true, status: 200, json: async () => ({ valueRanges: [{}] }) })
  }), { code: "FINANCE_OPTIONAL_CONTRACT" });
});

test("Worker consumes batched optional ranges and avoids uncontrolled fanout", () => {
  assert.match(worker, /readFinanceOptionalRanges\(\{/);
  assert.match(worker, /missingTabFallback: fetchOptionalFinanceRows/);
  assert.match(worker, /"MovimientosCuenta!A1:M5000"/);
  assert.match(worker, /"PrestamoVsInversion!A1:X200"/);
  assert.match(worker, /"Regalos!A1:P300"/);
  assert.doesNotMatch(worker, /console\.warn\("Optional finance range read failed", range, String\(/);
});
