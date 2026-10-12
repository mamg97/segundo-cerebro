import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFinanceBankSource, FinanceBankSourceError } from "./finance-bank-source.js";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");

const fake = { FINANCE_SHEET_ID: "synthetic-sheet-example" };
const responseWith = (ranges) => ({ ok: true, json: async () => ({ valueRanges: ranges }) });

test("bank reader requests only two canonical ranges in one read", async () => {
  let requests = 0;
  const fakeAccounts = [["account_id", "name"], ["account-1", "First bank"]];
  const fakeMovements = [["movement_id", "account_id"], ["movement-1", "account-1"]];
  const rows = await readFinanceBankSource(fake, async () => "fake-token", async (url, opts) => {
    requests++;
    const parsed = new URL(url);
    assert.deepEqual(parsed.searchParams.getAll("ranges"), [
      "Cuentas!A1:J200", "MovimientosCuenta!A1:M5000"
    ]);
    assert.equal(opts.headers.Authorization, "Bearer fake-token");
    return responseWith([{ values: fakeAccounts }, { values: fakeMovements }]);
  });
  assert.equal(requests, 1);
  assert.deepEqual(rows.accountRows, fakeAccounts);
  assert.deepEqual(rows.movementRows, fakeMovements);
});

test("empty bank history is never confused with missing upstream response", async () => {
  const rows = await readFinanceBankSource(fake, async () => "fake-token", async () =>
    responseWith([{ values: [["account_id"], ["account-2"]] }, {}]));
  assert.equal(rows.accountRows.length, 2);
  assert.deepEqual(rows.movementRows, []);
  await assert.rejects(() => readFinanceBankSource(fake, async () => "fake-token", async () =>
    responseWith([{}])), { code: "FINANCE_BANK_SOURCE_CONTRACT" });
});

test("upstream failures have fixed codes and never expose response bodies", async () => {
  await assert.rejects(() => readFinanceBankSource(fake, async () => "fake-token", async () =>
    ({ ok: false, status: 403 })), { code: "FINANCE_BANK_SOURCE_AUTH" });
  await assert.rejects(() => readFinanceBankSource(fake, async () => "fake-token", async () =>
    ({ ok: false, status: 502 })), { code: "FINANCE_BANK_SOURCE_UPSTREAM" });
});

test("Worker and UI read bank workspace separately from full Finance and preserve unknown balances", () => {
  assert.match(worker, /if \(url\.pathname === "\/api\/finance\/accounts"\)/);
  assert.match(worker, /await fetchFinanceBankWorkspace\(env\)/);
  assert.match(worker, /return json\(\{ ok: true, \.\.\.workspace, sourceStatus: "ok" \}\)/);
  assert.match(worker, /bankWorkspaceAccounts: financeBankAccountCatalog\(accountRows/);
  assert.match(worker, /id: row\.account_id \|\| row\.id \|\| null/);
  assert.match(worker, /function financeBankTransactions\(/);
  assert.match(app, /fetch\("\/api\/finance\/accounts",/);
  assert.match(app, /bankWorkspaceAccounts: workspace\.accounts/);
  assert.match(app, /accountTransactions: workspace\.transactions/);
  assert.match(app, /renderAccountTransactionsWorkspace\(accountTransactions, workspaceAccounts, currency\)/);
  assert.doesNotMatch(worker, /console\.warn\("Finance bank workspace read failed", String\(/);
});
