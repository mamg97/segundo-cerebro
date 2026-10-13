import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAuditImageReadGate } from "../scripts/audit-image-read-gate.mjs";

test("private image cold reads are at most three simultaneous", async () => {
  const gate = createAuditImageReadGate(3);
  let live = 0;
  let max = 0;
  const pending = [];
  const jobs = Array.from({ length: 9 }, (_, i) => gate.run(async () => {
    live++;
    max = Math.max(max, live);
    await new Promise((resolve) => { pending.push(resolve); });
    live--;
    return i;
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(live, 3);
  assert.equal(gate.stats().waiting, 6);
  for (let i = 0; i < 9; i += 3) {
    while (pending.length) pending.shift()();
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.deepEqual(await Promise.all(jobs), [0,1,2,3,4,5,6,7,8]);
  assert.equal(max, 3);
  assert.deepEqual(gate.stats(), { active: 0, peak: 3, waiting: 0, limit: 3 });
});

test("a failed image read never blocks the next read or masks its 502", async () => {
  const gate = createAuditImageReadGate(1);
  const first = gate.run(() => { throw new Error("GATEWAY_UPSTREAM_FAILED"); });
  const second = gate.run(() => ({ status: 502 }));
  await assert.rejects(first, /GATEWAY_UPSTREAM_FAILED/);
  assert.deepEqual(await second, { status: 502 });
  await new Promise((resolve) => setImmediate(resolve)); // allow finally() to release the slot
  assert.equal(gate.stats().active, 0);
});

test("the audit uses capped reads only for eligible immutable private images", () => {
  const code = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");
  assert.match(code, /const imageReadGate = createAuditImageReadGate\(3\)/);
  assert.match(code, /immutableImageCache\.once\(request\.url\(\), async \(\) => imageReadGate\.run/);
  assert.match(code, /if \(!immutableImageCache\.canHandle\(request\.url\(\), auditOrigin, request\.method\(\)\)\)/);
  assert.match(code, /const response = await route\.fetch\(\{ headers, timeout: 25000 \}\)/);
  assert.match(code, /if \(response\.status\(\) === 200\)/);
  assert.match(code, /await route\.fulfill\(live\)/);
  assert.match(code, /await route\.abort\("failed"\)/);
  assert.doesNotMatch(code, /route\.fulfill\(\{ status: 200[^}]*502/);
});

test("concurrency limits reject zero and excessive caps", () => {
  assert.throws(() => createAuditImageReadGate(0), /INVALID_AUDIT_IMAGE_CONCURRENCY/);
  assert.throws(() => createAuditImageReadGate(20), /INVALID_AUDIT_IMAGE_CONCURRENCY/);
});
