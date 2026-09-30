import assert from "node:assert/strict";
import test from "node:test";
import { isObjectsBridgeAuthenticated, sha256Hex } from "./objects-bridge-auth.js";

test("bridge bearer auth accepts the configured token hash", async () => {
  const token = "test-secret-123";
  const env = { OBJECTS_BRIDGE_UPSTREAM_SHA256: await sha256Hex(token) };
  const request = new Request("https://example.test/api/internal/objects/x/image", {
    headers: { Authorization: "Bearer " + token }
  });
  assert.equal(await isObjectsBridgeAuthenticated(request, env), true);
});

test("bridge bearer auth rejects missing or wrong tokens", async () => {
  const env = { OBJECTS_BRIDGE_UPSTREAM_SHA256: await sha256Hex("right-secret") };
  assert.equal(await isObjectsBridgeAuthenticated(new Request("https://example.test/"), env), false);
  assert.equal(await isObjectsBridgeAuthenticated(new Request("https://example.test/", {
    headers: { Authorization: "Bearer wrong-secret" }
  }), env), false);
});

test("bridge bearer auth stays disabled without a valid configured hash", async () => {
  const request = new Request("https://example.test/", {
    headers: { Authorization: "Bearer anything" }
  });
  assert.equal(await isObjectsBridgeAuthenticated(request, {}), false);
  assert.equal(await isObjectsBridgeAuthenticated(request, { OBJECTS_BRIDGE_UPSTREAM_SHA256: "bad" }), false);
});
