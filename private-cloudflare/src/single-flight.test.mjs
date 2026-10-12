import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSingleFlight } from "./single-flight.js";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");

test("cold concurrent finance reads share one real source call", async () => {
  const share = createSingleFlight();
  let requests = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const loader = async () => {
    requests++;
    await gate;
    return { status: "ok", value: { example: true } };
  };
  const a = share(loader);
  const b = share(loader);
  const c = share(loader);
  release();
  const result = await Promise.all([a, b, c]);
  assert.equal(requests, 1);
  assert.deepEqual(result, Array(3).fill({ status: "ok", value: { example: true } }));
  await share(loader);
  assert.equal(requests, 2, "a separate later source read must not reuse an in-flight promise");
});

test("a failed source read is not cached and the next call can recover", async () => {
  const share = createSingleFlight();
  let attempts = 0;
  const failing = async () => {
    attempts++;
    throw new Error("fictional upstream failure");
  };
  const settled = await Promise.allSettled([share(failing), share(failing)]);
  assert.equal(attempts, 1);
  assert.equal(settled.every((item) => item.status === "rejected"), true);
  const recovered = await share(async () => { attempts++; return "ok"; });
  assert.equal(recovered, "ok");
  assert.equal(attempts, 2);
});

test("Finance code shares only in-flight loads and preserves normal success TTL", () => {
  assert.match(worker, /const shareFinanceSourceRead = createSingleFlight\(\)/);
  assert.match(worker, /async function fetchFinanceSummary\(env\)/);
  assert.match(worker, /financeCache\.value && financeCache\.expiresAt > Date\.now\(\)/);
  assert.match(worker, /return shareFinanceSourceRead\(\(\) => fetchFinanceSummaryUncached\(env\)\)/);
  assert.match(worker, /async function fetchFinanceSummaryUncached\(env\)/);
  assert.match(worker, /financeCache = \{[\s\S]*?expiresAt: Date\.now\(\) \+ 30_000/);
});
