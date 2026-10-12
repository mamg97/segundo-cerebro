import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createFinanceBankWorkspaceCache } from "./finance-bank-workspace-cache.js";

const envA = { FINANCE_SHEET_ID: "synthetic-a" };
const envB = { FINANCE_SHEET_ID: "synthetic-b" };

test("reuse is isolated to the same Sheet and expires after 30 seconds", async () => {
  let clock = 1000;
  let reads = 0;
  const load = createFinanceBankWorkspaceCache(async () => ({ accounts: [++reads], transactions: [] }), {
    now: () => clock
  });
  const first = await load(envA);
  assert.strictEqual(await load(envA), first);
  assert.equal(reads, 1);
  clock += 29_999;
  assert.strictEqual(await load(envA), first);
  clock += 1;
  assert.notStrictEqual(await load(envA), first);
  assert.equal(reads, 2);
  await load(envB);
  assert.equal(reads, 3);
  await load(envA);
  assert.equal(reads, 4, "a different Sheet may not reuse another source");
});

test("concurrent reads share one promise and never persist failures", async () => {
  let reads = 0;
  let release;
  const load = createFinanceBankWorkspaceCache(async () => {
    reads++;
    await new Promise((resolve) => { release = resolve; });
    return { accounts: [], transactions: [] };
  });
  const first = load(envA);
  const second = load(envA);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(reads, 1);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.strictEqual(a, b);
  assert.strictEqual(await load(envA), a);

  let attempts = 0;
  const flaky = createFinanceBankWorkspaceCache(async () => {
    if (++attempts === 1) throw new Error("synthetic upstream failure");
    return { accounts: [{ id: "synthetic" }], transactions: [] };
  });
  await assert.rejects(flaky(envA), /synthetic upstream failure/);
  assert.equal((await flaky(envA)).accounts.length, 1);
  assert.equal(attempts, 2);
});

test("an older concurrent source never overwrites a newer source", async () => {
  let releaseA;
  const load = createFinanceBankWorkspaceCache(async (env) => {
    if (env.FINANCE_SHEET_ID === "synthetic-a") {
      await new Promise((resolve) => { releaseA = resolve; });
    }
    return { accounts: [env.FINANCE_SHEET_ID], transactions: [] };
  });
  const older = load(envA);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal((await load(envB)).accounts[0], "synthetic-b");
  releaseA();
  assert.equal((await older).accounts[0], "synthetic-a");
  assert.equal((await load(envB)).accounts[0], "synthetic-b");
});

test("the real Worker uses only the bounded private cache for bank accounts", () => {
  const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const bankReader = readFileSync(new URL("./finance-bank-source.js", import.meta.url), "utf8");
  assert.ok(bankReader.includes("createFinanceBankWorkspaceCache("));
  assert.match(worker, /const rows = await readFinanceBankSource\(env, getGoogleAccessToken\)/);
  assert.match(worker, /await fetchFinanceBankWorkspace\(env\)/);
  assert.doesNotMatch(worker, /caches\.default\.put.*finance/);
});
