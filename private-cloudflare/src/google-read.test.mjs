import assert from "node:assert/strict";
import test from "node:test";
import {
  googleReadFetch,
  isRetryableGoogleReadStatus,
  retryDelayMs,
  sheetsBatchGet
} from "./google-read.js";

test("retryable Google read statuses are limited to throttling/server failures", () => {
  for (const status of [429, 500, 502, 503, 504]) assert.equal(isRetryableGoogleReadStatus(status), true);
  for (const status of [200, 400, 401, 403, 404]) assert.equal(isRetryableGoogleReadStatus(status), false);
});

test("GET retries transient Google failure and recovers", async () => {
  let calls = 0;
  const sleeps = [];
  const result = await googleReadFetch("https://example.test", {}, {
    attempts: 3,
    baseDelayMs: 10,
    sleepImpl: async (ms) => { sleeps.push(ms); },
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return new Response("temporary", { status: 503 });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
  assert.equal(result.status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [10, 20]);
});

test("non retryable auth failure returns immediately", async () => {
  let calls = 0;
  const result = await googleReadFetch("https://example.test", {}, {
    attempts: 3,
    sleepImpl: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return new Response("forbidden", { status: 403 });
    }
  });
  assert.equal(result.status, 403);
  assert.equal(calls, 1);
});

test("Retry-After header caps deterministic delay", () => {
  assert.equal(retryDelayMs(1, "1", 10), 1000);
  assert.equal(retryDelayMs(1, "99", 10), 2500);
});

test("batchGet preserves requested range order", async () => {
  const result = await sheetsBatchGet("sheet-id", ["A!A1:B2", "B!A1:C2"], "token", {
    sleepImpl: async () => {},
    fetchImpl: async (url) => {
      assert.match(String(url), /values%3AbatchGet|values:batchGet/);
      return new Response(JSON.stringify({
        valueRanges: [
          { range: "A!A1:B2", values: [["h"], ["a"]] },
          { range: "B!A1:C2", values: [["h"], ["b"]] }
        ]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].values[1][0], "a");
  assert.equal(result[1].values[1][0], "b");
});
