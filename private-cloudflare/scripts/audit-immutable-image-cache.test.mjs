import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createAuditImmutableImageCache } from "./audit-immutable-image-cache.mjs";

const origin = "https://audit-private.example";
const look = origin + "/api/objects/look/private-look/image?v=12345678";
const thumbnail = origin + "/api/objects/garment/image/thumbnail?v=abcdefgh";
const headers = { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=31536000, immutable" };
const auditCode = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

test("only same-origin, GET, versioned object media may use audit memory cache", () => {
  const cache = createAuditImmutableImageCache();
  assert.equal(cache.canHandle(look, origin), true);
  assert.equal(cache.canHandle(thumbnail, origin), true);
  assert.equal(cache.canHandle(look + "&delivery=hex1", origin), true);
  assert.equal(cache.canHandle(look + "&delivery=other", origin), false);
  assert.equal(cache.canHandle(look + "&delivery=hex1&delivery=hex1", origin), false);
  assert.equal(cache.canHandle(thumbnail + "&delivery=hex1", origin), false);
  assert.equal(cache.canHandle(look + "&delivery=hex1&token=private", origin), false);
  assert.equal(cache.canHandle(look, origin, "POST"), false);
  assert.equal(cache.canHandle(origin + "/api/health/overview", origin), false);
  assert.equal(cache.canHandle(origin + "/api/objects/look/private-look/image", origin), false);
  assert.equal(cache.canHandle(origin + "/api/objects/look/private-look/image?v=12345678&token=private", origin), false);
  assert.equal(cache.canHandle("https://outside.example/api/objects/look/x/image?v=12345678", origin), false);
});

test("first immutable 200 image can be reused, but nonimages and errors cannot be cached", () => {
  const cache = createAuditImmutableImageCache();
  const body = Buffer.from([1, 2, 3, 4, 5]);
  assert.equal(cache.get(look), null, "first request must visit real production");
  assert.equal(cache.put(look, 200, headers, body), true);
  assert.deepEqual(cache.get(look).body, body);
  assert.equal(cache.stats().hits, 1);
  assert.equal(cache.put(thumbnail, 502, headers, body), false);
  assert.equal(cache.get(thumbnail), null);
  assert.equal(cache.put(thumbnail, 200, { ...headers, "cache-control": "public, max-age=300" }, body), false);
  assert.equal(cache.put(thumbnail, 200, { ...headers, "content-type": "application/json" }, body), false);
  assert.equal(cache.get(thumbnail), null);
});

test("the cache is strictly memory bounded per image and across images", () => {
  const cache = createAuditImmutableImageCache({ maxEntryBytes: 8, maxTotalBytes: 10 });
  assert.equal(cache.put(look, 200, headers, Buffer.alloc(8)), true);
  assert.equal(cache.put(thumbnail, 200, { "content-type": "image/webp", "cache-control": headers["Cache-Control"] }, Buffer.alloc(5)), false);
  assert.deepEqual(cache.stats(), { hits: 0, misses: 0, shared: 0, entries: 1, bytes: 8 });
});

test("simultaneous requests share one live fetch without persisting errors", async () => {
  const cache = createAuditImmutableImageCache();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetcher = async () => { calls++; await gate; return { status: 502 }; };
  const first = cache.once(thumbnail, fetcher);
  const second = cache.once(thumbnail, fetcher);
  release();
  assert.deepEqual(await Promise.all([first, second]), [{ status: 502 }, { status: 502 }]);
  assert.equal(calls, 1);
  assert.equal(cache.stats().shared, 1);
  assert.deepEqual(await cache.once(thumbnail, fetcher), { status: 502 });
  assert.equal(calls, 2, "failed responses must be retried on the next independent request");
  assert.equal(cache.stats().entries, 0);
});

test("production audit never caches failures or drops real first-image fetch", () => {
  assert.match(auditCode, /const immutableImageCache = createAuditImmutableImageCache\(\)/);
  assert.match(auditCode, /immutableImageCache\.once\(request\.url\(\), async \(\) =>/);
  assert.match(auditCode, /const response = await route\.fetch\(\{ headers, timeout: 25000 \}\)/);
  assert.match(auditCode, /const body = await response\.body\(\)/);
  assert.match(auditCode, /immutableImageCache\.put\(request\.url\(\), response\.status\(\), response\.headers\(\), body\)/);
  assert.match(auditCode, /await route\.fulfill\(live\)/);
  assert.match(auditCode, /await route\.abort\("failed"\)/);
  assert.doesNotMatch(auditCode, /console\.log\([^)]*cached\.body/);
});

test("gateway-proven private images are reused in RAM without relaxing browser no-store", () => {
  const cache = createAuditImmutableImageCache();
  const bytes = Buffer.from([10, 12, 14]);
  const proxyHeaders = {
    "content-type": "image/webp",
    "cache-control": "no-store",
    "x-segundo-cerebro-audit-private-immutable": "1"
  };
  assert.equal(cache.put(look, 200, { ...proxyHeaders, "x-segundo-cerebro-audit-private-immutable": "0" }, bytes), false);
  assert.equal(cache.put(look, 200, { "content-type": "image/webp", "cache-control": "no-store" }, bytes), false);
  assert.equal(cache.put(look, 502, proxyHeaders, bytes), false);
  assert.equal(cache.put(origin + "/api/state?v=12345678", 200, proxyHeaders, bytes), false);
  assert.equal(cache.put(look + "&secret=example", 200, proxyHeaders, bytes), false);
  assert.equal(cache.put(look, 200, proxyHeaders, bytes), true);
  assert.deepEqual(cache.get(look).body, bytes);
  assert.equal(cache.get(look).headers["cache-control"], "no-store");
  assert.equal(cache.stats().entries, 1);
});
